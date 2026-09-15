import { db } from "./firebase";
import {
    doc, collection, setDoc, updateDoc, onSnapshot, addDoc, getDoc, deleteDoc, getDocs,
    Unsubscribe
} from "firebase/firestore";

// ─── ICE Servers ────────────────────────────────────────────
const ICE_SERVERS: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
];

const PC_CONFIG: RTCConfiguration = { iceServers: ICE_SERVERS };

// ─── Types ──────────────────────────────────────────────────
export type CallType = "audio" | "video";
export type CallStatus = "calling" | "ringing" | "answered" | "ended" | "rejected" | "missed";

export interface CallDoc {
    callerId: string;
    callerName: string;
    callerAvatar: string | null;
    calleeId: string;
    calleeName: string;
    calleeAvatar: string | null;
    type: CallType;
    status: CallStatus;
    offer?: RTCSessionDescriptionInit;
    answer?: RTCSessionDescriptionInit;
    createdAt: string;
}

// ─── Helpers ────────────────────────────────────────────────

/** Get user media stream — checks permissions first for a better UX */
export async function getMediaStream(type: CallType): Promise<MediaStream> {
    // Pre-check permissions where the API is supported (Chrome/Android)
    try {
        const micStatus = await navigator.permissions.query({ name: "microphone" as PermissionName });
        if (micStatus.state === "denied") {
            throw new Error(
                "Microphone access is blocked.\n\nTo fix this:\n1. Tap the lock/info icon in your browser address bar\n2. Set Microphone to Allow\n3. Refresh the page and try calling again"
            );
        }
        if (type === "video") {
            const camStatus = await navigator.permissions.query({ name: "camera" as PermissionName });
            if (camStatus.state === "denied") {
                throw new Error(
                    "Camera access is blocked.\n\nTo fix this:\n1. Tap the lock/info icon in your browser address bar\n2. Set Camera to Allow\n3. Refresh the page and try calling again"
                );
            }
        }
    } catch (permErr: unknown) {
        // Re-throw our own descriptive errors; ignore unsupported Permissions API errors
        if (permErr instanceof Error && permErr.message.startsWith("Microphone") || 
            permErr instanceof Error && permErr.message.startsWith("Camera")) {
            throw permErr;
        }
        // Permissions API not available — proceed and let getUserMedia handle it
    }

    const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === "video" ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    };

    try {
        return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err: unknown) {
        const name = err instanceof Error ? (err as MediaError & { name?: string }).name || err.message : String(err);
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
            throw new Error(
                "Permission denied.\n\nPlease allow microphone" + (type === "video" ? " and camera" : "") +
                " access in your browser settings, then refresh and try again."
            );
        }
        if (name === "NotFoundError" || name === "DevicesNotFoundError") {
            throw new Error("No microphone" + (type === "video" ? "/camera" : "") + " was found on this device.");
        }
        throw err;
    }
}

/** Create a new RTCPeerConnection */
export function createPeerConnection(): RTCPeerConnection {
    return new RTCPeerConnection(PC_CONFIG);
}

// ─── Caller Flow ────────────────────────────────────────────

export async function createCallOffer(
    pc: RTCPeerConnection,
    callId: string,
    callDoc: Omit<CallDoc, "offer" | "createdAt">
): Promise<void> {
    const callRef = doc(db, "calls", callId);

    // Collect ICE candidates into subcollection
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            const candidatesCol = collection(db, "calls", callId, "callerCandidates");
            addDoc(candidatesCol, event.candidate.toJSON());
        }
    };

    // Create offer
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    // Write the call document with the offer
    await setDoc(callRef, {
        ...callDoc,
        offer: { type: offerDescription.type, sdp: offerDescription.sdp },
        createdAt: new Date().toISOString(),
    });
}

/** Listen for the answer from the callee */
export function listenForAnswer(
    pc: RTCPeerConnection,
    callId: string,
    onAnswered: () => void,
    onRejected: () => void,
    onEnded: () => void,
    onRinging?: () => void
): Unsubscribe {
    const callRef = doc(db, "calls", callId);
    return onSnapshot(callRef, async (snapshot) => {
        const data = snapshot.data() as CallDoc | undefined;
        if (!data) return;

        if (data.status === "ringing" && onRinging) {
            onRinging();
        }

        if (data.status === "answered" && data.answer && !pc.currentRemoteDescription) {
            const answerDescription = new RTCSessionDescription(data.answer);
            await pc.setRemoteDescription(answerDescription);
            onAnswered();
        }

        if (data.status === "rejected") {
            onRejected();
        }

        if (data.status === "ended") {
            onEnded();
        }
    });
}

/** Listen for callee ICE candidates */
export function listenForCalleeCandidates(
    pc: RTCPeerConnection,
    callId: string
): Unsubscribe {
    const candidatesCol = collection(db, "calls", callId, "calleeCandidates");
    return onSnapshot(candidatesCol, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const candidate = new RTCIceCandidate(change.doc.data());
                pc.addIceCandidate(candidate).catch(console.error);
            }
        });
    });
}

// ─── Callee Flow ────────────────────────────────────────────

export async function answerCallOffer(
    pc: RTCPeerConnection,
    callId: string
): Promise<void> {
    const callRef = doc(db, "calls", callId);
    const callSnap = await getDoc(callRef);
    const callData = callSnap.data() as CallDoc;

    // Collect ICE candidates into subcollection
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            const candidatesCol = collection(db, "calls", callId, "calleeCandidates");
            addDoc(candidatesCol, event.candidate.toJSON());
        }
    };

    // Set the offer as remote description
    const offerDescription = new RTCSessionDescription(callData.offer!);
    await pc.setRemoteDescription(offerDescription);

    // Create answer
    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    // Write the answer to Firestore
    await updateDoc(callRef, {
        answer: { type: answerDescription.type, sdp: answerDescription.sdp },
        status: "answered",
    });
}

/** Listen for caller ICE candidates */
export function listenForCallerCandidates(
    pc: RTCPeerConnection,
    callId: string
): Unsubscribe {
    const candidatesCol = collection(db, "calls", callId, "callerCandidates");
    return onSnapshot(candidatesCol, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const candidate = new RTCIceCandidate(change.doc.data());
                pc.addIceCandidate(candidate).catch(console.error);
            }
        });
    });
}

// ─── Shared ─────────────────────────────────────────────────

/** End/reject a call */
export async function updateCallStatus(callId: string, status: CallStatus): Promise<void> {
    const callRef = doc(db, "calls", callId);
    await updateDoc(callRef, { status });
}

/** Listen for the call doc status changes (used by callee to detect hangup) */
export function listenForCallStatus(
    callId: string,
    onStatusChange: (status: CallStatus) => void
): Unsubscribe {
    const callRef = doc(db, "calls", callId);
    return onSnapshot(callRef, (snapshot) => {
        const data = snapshot.data() as CallDoc | undefined;
        if (data) {
            onStatusChange(data.status);
        }
    });
}

/** Clean up the call document and subcollections */
export async function cleanupCallDoc(callId: string): Promise<void> {
    try {
        // Delete subcollections
        const callerCandidates = await getDocs(collection(db, "calls", callId, "callerCandidates"));
        const calleeCandidates = await getDocs(collection(db, "calls", callId, "calleeCandidates"));

        const deletePromises: Promise<void>[] = [];
        callerCandidates.forEach((d) => deletePromises.push(deleteDoc(d.ref)));
        calleeCandidates.forEach((d) => deletePromises.push(deleteDoc(d.ref)));
        await Promise.all(deletePromises);

        // Delete the call document
        await deleteDoc(doc(db, "calls", callId));
    } catch (err) {
        console.error("Error cleaning up call doc:", err);
    }
}

/** Toggle audio track on/off */
export function toggleAudioTrack(stream: MediaStream, enabled: boolean): void {
    stream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
    });
}

/** Toggle video track on/off */
export function toggleVideoTrack(stream: MediaStream, enabled: boolean): void {
    stream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
    });
}

/** Close peer connection and stop all tracks */
export function closePeerConnection(
    pc: RTCPeerConnection | null,
    localStream: MediaStream | null
): void {
    if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
    }
    if (pc) {
        pc.close();
    }
}
