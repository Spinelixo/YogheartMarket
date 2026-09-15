"use client";

import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, Unsubscribe, setDoc, updateDoc } from "firebase/firestore";
import {
    CallType, CallDoc,
    getMediaStream, createPeerConnection,
    createCallOffer, listenForAnswer, listenForCalleeCandidates,
    answerCallOffer, listenForCallerCandidates,
    updateCallStatus, listenForCallStatus,
    cleanupCallDoc, toggleAudioTrack, toggleVideoTrack, closePeerConnection
} from "@/lib/webrtc";

// ─── Types ──────────────────────────────────────────────────
type CallState = "idle" | "outgoing-calling" | "outgoing-ringing" | "incoming-ringing" | "connecting" | "in-call" | "ended";

interface IncomingCallInfo {
    callId: string;
    callerId: string;
    callerName: string;
    callerAvatar: string | null;
    callType: CallType;
}

interface CallContextType {
    callState: CallState;
    callType: CallType | null;
    isMuted: boolean;
    isCameraOff: boolean;
    callDuration: number;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    remoteName: string;
    remoteAvatar: string | null;
    incomingCall: IncomingCallInfo | null;
    initiateCall: (calleeId: string, calleeName: string, calleeAvatar: string | null, type: CallType) => Promise<void>;
    acceptCall: () => Promise<void>;
    rejectCall: () => Promise<void>;
    hangUp: () => Promise<void>;
    toggleMute: () => void;
    toggleCamera: () => void;
}

const CallContext = createContext<CallContextType | null>(null);

export function useCall(): CallContextType {
    const ctx = useContext(CallContext);
    if (!ctx) throw new Error("useCall must be used within a CallProvider");
    return ctx;
}



// ─── Provider ───────────────────────────────────────────────
export function CallProvider({ children }: { children: ReactNode }) {
    const { user, resolvedUid, userData } = useAuth();
    const currentUserId = resolvedUid || user?.uid;

    const [callState, setCallState] = useState<CallState>("idle");
    const [callType, setCallType] = useState<CallType | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [remoteName, setRemoteName] = useState("");
    const [remoteAvatar, setRemoteAvatar] = useState<string | null>(null);
    const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);

    const callStateRef = useRef<CallState>("idle");
    useEffect(() => {
        callStateRef.current = callState;
    }, [callState]);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const callIdRef = useRef<string | null>(null);
    const unsubsRef = useRef<Unsubscribe[]>([]);
    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const ringtoneTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isCallerRef = useRef(false);
    const callDurationRef = useRef(0);

    // ─── Ringtone management ─────────────────────────────────
    const startRingtone = useCallback(() => {
        try {
            // Create a Web Audio API based ringtone
            if (typeof window === "undefined") return;
            const audioCtx = new (window.AudioContext || (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext)();
            
            const playTone = () => {
                // Ensure audio context is resumed (browsers require user interaction)
                if (audioCtx.state === "suspended") {
                    audioCtx.resume();
                }

                const now = audioCtx.currentTime;

                // Function to play a single bell-like warm chime note
                const playNote = (freq: number, startTime: number, duration: number = 1.0) => {
                    const osc1 = audioCtx.createOscillator();
                    const osc2 = audioCtx.createOscillator(); // sub-oscillator for warmth
                    const gainNode = audioCtx.createGain();
                    const filter = audioCtx.createBiquadFilter();

                    osc1.type = "triangle";
                    osc1.frequency.setValueAtTime(freq, startTime);

                    osc2.type = "sine";
                    osc2.frequency.setValueAtTime(freq / 2, startTime); // One octave down

                    filter.type = "lowpass";
                    filter.frequency.setValueAtTime(1200, startTime);
                    filter.frequency.exponentialRampToValueAtTime(300, startTime + duration);

                    osc1.connect(filter);
                    osc2.connect(filter);
                    filter.connect(gainNode);
                    gainNode.connect(audioCtx.destination);

                    // Envelope: fast attack, smooth exponential decay
                    gainNode.gain.setValueAtTime(0, startTime);
                    gainNode.gain.linearRampToValueAtTime(0.06, startTime + 0.03); // 30ms ramp-up
                    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

                    osc1.start(startTime);
                    osc2.start(startTime);
                    
                    osc1.stop(startTime + duration + 0.1);
                    osc2.stop(startTime + duration + 0.1);
                };

                // Play a beautiful, futuristic premium chord sweep arpeggio:
                // Asus2 chord sweep (E5 -> A5 -> B5 -> E6 -> A6)
                playNote(659.25, now, 1.2);          // E5
                playNote(880.00, now + 0.15, 1.05);   // A5
                playNote(987.77, now + 0.30, 0.90);   // B5
                playNote(1318.51, now + 0.45, 0.75);  // E6
                playNote(1760.00, now + 0.60, 0.60);  // A6
            };
            
            playTone();
            const interval = setInterval(playTone, 3000); // Repeat every 3 seconds
            ringtoneTimeoutRef.current = interval;
            
            // Store audioCtx for cleanup
            (ringtoneTimeoutRef as unknown as Record<string, unknown>)._audioCtx = audioCtx;
        } catch (_e) {
            console.warn("Could not play ringtone:", _e);
        }
    }, []);

    const stopRingtone = useCallback(() => {
        if (ringtoneTimeoutRef.current) {
            clearInterval(ringtoneTimeoutRef.current);
            ringtoneTimeoutRef.current = null;
        }
        try {
            const audioCtx = (ringtoneTimeoutRef as any)?._audioCtx;
            if (audioCtx && audioCtx.state !== "closed") {
                audioCtx.close();
            }
        } catch (_e) { /* ignore */ } /* eslint-disable-line @typescript-eslint/no-unused-vars */
    }, []);

    const playCallEndedTone = useCallback(() => {
        try {
            if (typeof window === "undefined") return;
            const audioCtx = new (window.AudioContext || (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext)();
            
            // Ensure audio context is resumed
            if (audioCtx.state === "suspended") {
                audioCtx.resume();
            }

            const now = audioCtx.currentTime;

            const playNoteNode = (freq: number, startTime: number, duration: number = 0.5) => {
                const osc = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                const filter = audioCtx.createBiquadFilter();

                osc.type = "triangle";
                osc.frequency.setValueAtTime(freq, startTime);

                filter.type = "lowpass";
                filter.frequency.setValueAtTime(1000, startTime);
                filter.frequency.exponentialRampToValueAtTime(300, startTime + duration);

                osc.connect(filter);
                filter.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.05, startTime + 0.02); // 20ms attack
                gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

                osc.start(startTime);
                osc.stop(startTime + duration + 0.1);
            };

            // Play a premium descending double-tone chime: B5 (987.77 Hz) -> G5 (783.99 Hz)
            playNoteNode(987.77, now, 0.4);
            playNoteNode(783.99, now + 0.15, 0.55);

            // Close context after playback completes
            setTimeout(() => {
                try {
                    if (audioCtx.state !== "closed") {
                        audioCtx.close();
                    }
                } catch { /* ignore */ }
            }, 1000);
        } catch (err) {
            console.warn("Could not play call ended tone:", err);
        }
    }, []);

    const triggerCallEnded = useCallback(() => {
        setCallState("ended");
        stopRingtone();
        playCallEndedTone();
    }, [stopRingtone, playCallEndedTone]);

    // ─── Cleanup all listeners ───────────────────────────────
    const cleanupAll = useCallback(async (shouldCleanDoc = true) => {
        stopRingtone();
        unsubsRef.current.forEach((unsub) => unsub());
        unsubsRef.current = [];

        if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
        }

        closePeerConnection(pcRef.current, localStream);
        pcRef.current = null;

        if (shouldCleanDoc && callIdRef.current) {
            // Delay cleanup to let the "ended" status propagate
            const cid = callIdRef.current;
            setTimeout(() => cleanupCallDoc(cid), 5000);
        }

        callIdRef.current = null;
        isCallerRef.current = false;

        setLocalStream(null);
        setRemoteStream(null);
        setIsMuted(false);
        setIsCameraOff(false);
        setCallDuration(0);
        callDurationRef.current = 0;
        setIncomingCall(null);
    }, [localStream, stopRingtone]);

    // ─── Initiate Call (Caller) ──────────────────────────────
    const initiateCall = useCallback(async (
        calleeId: string,
        calleeName: string,
        calleeAvatar: string | null,
        type: CallType
    ) => {
        if (!currentUserId || callState !== "idle") return;

        try {
            setCallState("outgoing-calling");
            setCallType(type);
            setRemoteName(calleeName);
            setRemoteAvatar(calleeAvatar);
            isCallerRef.current = true;

            // Get local media
            const stream = await getMediaStream(type);
            setLocalStream(stream);

            // Create peer connection
            const pc = createPeerConnection();
            pcRef.current = pc;

            // Add tracks to peer connection
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            // Set up remote stream
            const remote = new MediaStream();
            setRemoteStream(remote);
            pc.ontrack = (event) => {
                event.streams[0].getTracks().forEach((track) => {
                    remote.addTrack(track);
                });
            };

            // Generate call ID
            const callId = `${currentUserId}_${calleeId}_${Date.now()}`;
            callIdRef.current = callId;

            // Use already-loaded caller info from AuthContext (avoids a Firestore read
            // and ensures the name is correct even when resolvedUid != user.uid)
            const callerName = userData?.name || user?.displayName || "User";
            const callerAvatar: string | null = userData?.avatar || user?.photoURL || null;

            // Create offer and write to Firestore (with 'calling' status initially)
            await createCallOffer(pc, callId, {
                callerId: currentUserId,
                callerName,
                callerAvatar,
                calleeId,
                calleeName,
                calleeAvatar,
                type,
                status: "calling",
            });

            // Write call history log (default to missed)
            try {
                await setDoc(doc(db, "callLogs", callId), {
                    callerId: currentUserId,
                    callerName,
                    callerAvatar,
                    calleeId,
                    calleeName,
                    calleeAvatar,
                    type,
                    status: "missed",
                    timestamp: new Date().toISOString(),
                });
            } catch (e) {
                console.error("Failed to create call history log:", e);
            }

            // Listen for answer, rejection, hangup, and callee ringing signal
            const unsubAnswer = listenForAnswer(
                pc,
                callId,
                () => {
                    // Answered
                    setCallState("in-call");
                    stopRingtone();
                    updateDoc(doc(db, "callLogs", callId), { status: "answered" }).catch(() => {});
                    // Start duration timer
                    callDurationRef.current = 0;
                    durationIntervalRef.current = setInterval(() => {
                        callDurationRef.current += 1;
                        setCallDuration(callDurationRef.current);
                    }, 1000);
                },
                () => {
                    // Rejected
                    triggerCallEnded();
                    updateDoc(doc(db, "callLogs", callId), { status: "rejected" }).catch(() => {});
                    setTimeout(() => {
                        cleanupAll();
                        setCallState("idle");
                        setCallType(null);
                    }, 2500);
                },
                () => {
                    // Ended by remote
                    triggerCallEnded();
                    updateDoc(doc(db, "callLogs", callId), { 
                        status: "ended",
                        duration: callDurationRef.current
                    }).catch(() => {});
                    setTimeout(() => {
                        cleanupAll();
                        setCallState("idle");
                        setCallType(null);
                    }, 2500);
                },
                () => {
                    // Ringing signal received from Callee
                    if (callStateRef.current === "outgoing-calling") {
                        setCallState("outgoing-ringing");
                        startRingtone(); // Play the caller ringback tone
                    }
                }
            );
            unsubsRef.current.push(unsubAnswer);

            // Listen for callee ICE candidates
            const unsubCandidates = listenForCalleeCandidates(pc, callId);
            unsubsRef.current.push(unsubCandidates);

            // Auto-timeout after 45 seconds
            setTimeout(async () => {
                if (callIdRef.current === callId && (callStateRef.current === "outgoing-ringing" || callStateRef.current === "outgoing-calling")) {
                    await updateCallStatus(callId, "missed");
                    updateDoc(doc(db, "callLogs", callId), { status: "missed" }).catch(() => {});
                    triggerCallEnded();
                    setTimeout(() => {
                        cleanupAll();
                        setCallState("idle");
                        setCallType(null);
                    }, 2500);
                }
            }, 45000);
        } catch (err) {
            console.error("Error initiating call:", err);
            alert("Could not start call. Please check camera/microphone permissions.");
            cleanupAll();
            setCallState("idle");
            setCallType(null);
        }
    }, [currentUserId, callState, cleanupAll, stopRingtone, userData, user, startRingtone, triggerCallEnded]);

    // ─── Accept Call (Callee) ────────────────────────────────
    const acceptCall = useCallback(async () => {
        if (!incomingCall || !currentUserId) return;

        try {
            setCallState("connecting");
            stopRingtone();

            const { callId, callType: incType, callerName, callerAvatar } = incomingCall;
            setCallType(incType);
            setRemoteName(callerName);
            setRemoteAvatar(callerAvatar);
            callIdRef.current = callId;
            isCallerRef.current = false;

            // Get local media
            const stream = await getMediaStream(incType);
            setLocalStream(stream);

            // Create peer connection
            const pc = createPeerConnection();
            pcRef.current = pc;

            // Add tracks
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            // Set up remote stream
            const remote = new MediaStream();
            setRemoteStream(remote);
            pc.ontrack = (event) => {
                event.streams[0].getTracks().forEach((track) => {
                    remote.addTrack(track);
                });
            };

            // Answer the call
            await answerCallOffer(pc, callId);

            // Listen for caller ICE candidates
            const unsubCandidates = listenForCallerCandidates(pc, callId);
            unsubsRef.current.push(unsubCandidates);

            // Listen for call status changes (hangup from caller)
            const unsubStatus = listenForCallStatus(callId, (status) => {
                if (status === "ended") {
                    triggerCallEnded();
                    updateDoc(doc(db, "callLogs", callId), { 
                        status: "ended",
                        duration: callDurationRef.current
                    }).catch(() => {});
                    setTimeout(() => {
                        cleanupAll();
                        setCallState("idle");
                        setCallType(null);
                    }, 2500);
                }
            });
            unsubsRef.current.push(unsubStatus);

            setCallState("in-call");
            setIncomingCall(null);
            updateDoc(doc(db, "callLogs", callId), { status: "answered" }).catch(() => {});

            // Start duration timer
            callDurationRef.current = 0;
            durationIntervalRef.current = setInterval(() => {
                callDurationRef.current += 1;
                setCallDuration(callDurationRef.current);
            }, 1000);
        } catch (err) {
            console.error("Error accepting call:", err);
            alert("Could not accept call. Please check camera/microphone permissions.");
            cleanupAll();
            setCallState("idle");
            setCallType(null);
        }
    }, [incomingCall, currentUserId, cleanupAll, stopRingtone, triggerCallEnded]);

    // ─── Reject Call ─────────────────────────────────────────
    const rejectCall = useCallback(async () => {
        if (!incomingCall) return;
        stopRingtone();

        try {
            await updateCallStatus(incomingCall.callId, "rejected");
            await updateDoc(doc(db, "callLogs", incomingCall.callId), { status: "rejected" });
        } catch (e) { console.error(e); }

        setIncomingCall(null);
        setCallState("idle");
        setCallType(null);
    }, [incomingCall, stopRingtone]);

    // ─── Hang Up ─────────────────────────────────────────────
    const hangUp = useCallback(async () => {
        stopRingtone();

        if (callIdRef.current) {
            try {
                await updateCallStatus(callIdRef.current, "ended");
                const status = callStateRef.current === "in-call" ? "ended" : "missed";
                await updateDoc(doc(db, "callLogs", callIdRef.current), { 
                    status,
                    duration: callDurationRef.current
                });
            } catch (e) { console.error(e); }
        }

        triggerCallEnded();
        setTimeout(() => {
            cleanupAll();
            setCallState("idle");
            setCallType(null);
        }, 2000);
    }, [cleanupAll, stopRingtone, triggerCallEnded]);

    // ─── Toggle Controls ─────────────────────────────────────
    const toggleMute = useCallback(() => {
        if (localStream) {
            const newMuted = !isMuted;
            toggleAudioTrack(localStream, !newMuted);
            setIsMuted(newMuted);
        }
    }, [localStream, isMuted]);

    const toggleCamera = useCallback(() => {
        if (localStream) {
            const newCameraOff = !isCameraOff;
            toggleVideoTrack(localStream, !newCameraOff);
            setIsCameraOff(newCameraOff);
        }
    }, [localStream, isCameraOff]);

    // ─── Listen for Incoming Calls ───────────────────────────
    useEffect(() => {
        if (!currentUserId) return;

        const callsRef = collection(db, "calls");
        const q = query(
            callsRef,
            where("calleeId", "==", currentUserId),
            where("status", "in", ["calling", "ringing"])
        );

        const unsub = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                const callId = change.doc.id;

                if (change.type === "added" && callState === "idle") {
                    const data = change.doc.data() as CallDoc;
                    
                    // Inform the caller that our phone is now actively ringing
                    if (data.status === "calling") {
                        await updateCallStatus(callId, "ringing");
                    }
                    
                    setIncomingCall({
                        callId: callId,
                        callerId: data.callerId,
                        callerName: data.callerName,
                        callerAvatar: data.callerAvatar,
                        callType: data.type,
                    });
                    setCallState("incoming-ringing");
                    setRemoteName(data.callerName);
                    setRemoteAvatar(data.callerAvatar);
                    startRingtone();
                } else if (change.type === "removed") {
                    // Stop ringing if the active incoming call was hung up or deleted
                    if (callState === "incoming-ringing" && incomingCall && incomingCall.callId === callId) {
                        triggerCallEnded();
                        setTimeout(() => {
                            cleanupAll(false);
                            setCallState("idle");
                            setCallType(null);
                        }, 2000);
                    }
                }
            });
        });

        return () => unsub();
    }, [currentUserId, callState, incomingCall, startRingtone, cleanupAll, triggerCallEnded]);

    // ─── Cleanup on unmount ──────────────────────────────────
    useEffect(() => {
        return () => {
            unsubsRef.current.forEach((unsub) => unsub());
            if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
            stopRingtone();
        };
    }, [stopRingtone]);

    return (
        <CallContext.Provider
            value={{
                callState,
                callType,
                isMuted,
                isCameraOff,
                callDuration,
                localStream,
                remoteStream,
                remoteName,
                remoteAvatar,
                incomingCall,
                initiateCall,
                acceptCall,
                rejectCall,
                hangUp,
                toggleMute,
                toggleCamera,
            }}
        >
            {children}
        </CallContext.Provider>
    );
}
