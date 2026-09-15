"use client";

import { useCall } from "@/context/CallContext";
import { useEffect, useRef, useState } from "react";
import { useMockData } from "@/context/MockContext";
import {
    Phone, PhoneOff, Mic, MicOff, Video, VideoOff,
    Volume2, MoreHorizontal, UserPlus,
    Minimize2, Lock, MonitorUp, MessageSquare, X, Search
} from "lucide-react";

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

interface FloatingEmoji {
    id: number;
    emoji: string;
    x: number;
}

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export default function CallOverlay() {
    const {
        callState,
        callType,
        isMuted,
        isCameraOff,
        callDuration,
        localStream,
        remoteStream,
        remoteName,
        remoteAvatar,
        acceptCall,
        rejectCall,
        hangUp,
        toggleMute,
        toggleCamera,
    } = useCall();

    const { users } = useMockData() as any;

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoAudioRef = useRef<HTMLVideoElement>(null);
    const remoteAudioAudioRef = useRef<HTMLAudioElement>(null);
    const [showMorePanel, setShowMorePanel] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(false);
    const [noiseCancellation, setNoiseCancellation] = useState(true);
    const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
    const [isMinimized, setIsMinimized] = useState(false);
    const [showAddParticipant, setShowAddParticipant] = useState(false);
    const [participantSearch, setParticipantSearch] = useState("");
    const emojiCountRef = useRef(0);

    const [isSwapped, setIsSwapped] = useState(false);

    useEffect(() => {
        if (isSwapped) {
            if (remoteVideoRef.current && localStream && remoteVideoRef.current.srcObject !== localStream) {
                remoteVideoRef.current.srcObject = localStream;
            }
            if (localVideoRef.current && remoteStream && localVideoRef.current.srcObject !== remoteStream) {
                localVideoRef.current.srcObject = remoteStream;
            }
        } else {
            if (remoteVideoRef.current && remoteStream && remoteVideoRef.current.srcObject !== remoteStream) {
                remoteVideoRef.current.srcObject = remoteStream;
            }
            if (localVideoRef.current && localStream && localVideoRef.current.srcObject !== localStream) {
                localVideoRef.current.srcObject = localStream;
            }
        }

        // Direct the remote stream's audio to the dedicated audio/video output elements
        if (remoteVideoAudioRef.current && remoteStream && remoteVideoAudioRef.current.srcObject !== remoteStream) {
            remoteVideoAudioRef.current.srcObject = remoteStream;
        }
        if (remoteAudioAudioRef.current && remoteStream && remoteAudioAudioRef.current.srcObject !== remoteStream) {
            remoteAudioAudioRef.current.srcObject = remoteStream;
        }
    });

    useEffect(() => {
        if (callState !== "in-call") {
            setShowMorePanel(false);
            setIsMinimized(false);
            setIsSwapped(false);
        }
    }, [callState]);

    if (callState === "idle") return null;

    const isVideoCall = callType === "video";
    const isRinging = callState === "outgoing-ringing" || callState === "incoming-ringing";
    const isCalling = callState === "outgoing-calling";
    const isIncoming = callState === "incoming-ringing";
    const isInCall = callState === "in-call";
    const isEnded = callState === "ended";
    const isConnecting = callState === "connecting";

    const sendReaction = (emoji: string) => {
        const id = ++emojiCountRef.current;
        const x = 15 + Math.random() * 65;
        setFloatingEmojis(prev => [...prev, { id, emoji, x }]);
        setTimeout(() => {
            setFloatingEmojis(prev => prev.filter(e => e.id !== id));
        }, 2500);
    };

    // Filter users for add-participant search
    const filteredUsers = (users || []).filter((u: any) =>
        u.displayName?.toLowerCase().includes(participantSearch.toLowerCase()) &&
        u.displayName !== remoteName
    ).slice(0, 6);

    // ── Minimized: Android-style top banner ─────────────────────
    if (isMinimized) {
        return (
            <div
                className="call-minimized-bar"
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    background: "rgba(10,14,26,0.97)",
                    backdropFilter: "blur(20px)",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    padding: "10px 16px",
                    paddingTop: "max(10px, env(safe-area-inset-top))",
                    gap: 12,
                    boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
                }}
            >
                {/* Mute toggle */}
                <button
                    onClick={() => toggleMute()}
                    style={{
                        width: 40, height: 40, borderRadius: "50%", border: "none",
                        background: isMuted ? "white" : "rgba(255,255,255,0.12)",
                        color: isMuted ? "#1e293b" : "white",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}
                >
                    {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                {/* Identity — tap to expand */}
                <div
                    style={{ flex: 1, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}
                    onClick={() => setIsMinimized(false)}
                >
                    <div style={{
                        width: 32, height: 32, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
                        background: remoteAvatar ? "#fff" : "linear-gradient(135deg,#3b82f6,#8b5cf6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                        {remoteAvatar
                            ? <img src={remoteAvatar} alt={remoteName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{remoteName?.charAt(0)?.toUpperCase() || "?"}</span>
                        }
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ color: "white", fontWeight: 700, fontSize: 14, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {remoteName}
                        </div>
                        <div style={{ color: isInCall ? "#4ade80" : "rgba(255,255,255,0.55)", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                            {isInCall ? formatDuration(callDuration) : isRinging && !isIncoming ? "Ringing…" : isCalling ? "Calling…" : "Connecting…"}
                        </div>
                    </div>
                </div>

                {/* Hang up */}
                <button
                    onClick={() => hangUp()}
                    style={{
                        width: 40, height: 40, borderRadius: "50%", border: "none",
                        background: "#ef4444",
                        boxShadow: "0 4px 16px rgba(239,68,68,0.5)",
                        color: "white",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}
                >
                    <PhoneOff size={18} />
                </button>
            </div>
        );
    }

    return (
        <>
            <style jsx>{`
                .call-overlay {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    z-index: 9000;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    animation: callFadeIn 0.3s ease-out;
                }
                .call-bg {
                    background: linear-gradient(160deg, #0f172a 0%, #1e293b 35%, #0f172a 65%, #141624 100%);
                }
                .call-video-bg { background: #000; }

                @keyframes callFadeIn {
                    from { opacity: 0; transform: scale(1.02); }
                    to   { opacity: 1; transform: scale(1); }
                }
                @keyframes pulseRing {
                    0%   { transform: scale(1);   opacity: 0.6; }
                    50%  { transform: scale(1.15); opacity: 0.15; }
                    100% { transform: scale(1.3);  opacity: 0; }
                }
                @keyframes pulseRing2 {
                    0%   { transform: scale(1);   opacity: 0.4; }
                    50%  { transform: scale(1.25); opacity: 0.1; }
                    100% { transform: scale(1.5);  opacity: 0; }
                }
                @keyframes gentlePulse {
                    0%, 100% { transform: scale(1); }
                    50%      { transform: scale(1.03); }
                }
                @keyframes slideUpPanel {
                    from { transform: translateY(40px); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                }
                @keyframes floatUp {
                    0%   { transform: translateY(0) scale(1);     opacity: 1; }
                    80%  { transform: translateY(-120px) scale(1.4); opacity: 1; }
                    100% { transform: translateY(-160px) scale(1.2); opacity: 0; }
                }
                @keyframes acceptBounce {
                    0%, 100% { transform: scale(1); }
                    50%      { transform: scale(1.1); }
                }
                @keyframes slideDown {
                    from { transform: translateY(-16px); opacity: 0; }
                    to   { transform: translateY(0);     opacity: 1; }
                }
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.96) translateY(12px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }

                /* ── Top bar ── */
                .call-topbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 16px 0;
                    padding-top: max(12px, env(safe-area-inset-top));
                    flex-shrink: 0;
                    position: relative;
                    z-index: 10;
                }
                .topbar-icon-btn {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.1);
                    backdrop-filter: blur(12px);
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    transition: background 0.2s, transform 0.15s;
                }
                .topbar-icon-btn:hover  { background: rgba(255,255,255,0.18); }
                .topbar-icon-btn:active { transform: scale(0.92); }
                .topbar-center {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    animation: slideDown 0.4s ease-out;
                }
                .topbar-name {
                    font-size: 18px;
                    font-weight: 700;
                    color: white;
                    letter-spacing: -0.2px;
                }
                .topbar-sub {
                    font-size: 13px;
                    color: rgba(255,255,255,0.55);
                    font-variant-numeric: tabular-nums;
                    margin-top: 2px;
                }
                .topbar-sub-green { color: #4ade80; }

                /* ── Avatar center ── */
                .call-center {
                    flex: 1;
                    min-height: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: flex-start;
                    padding-top: clamp(40px, 8vh, 90px);
                    position: relative;
                    z-index: 5;
                    gap: 20px;
                }
                .call-avatar-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .call-avatar-ring {
                    position: absolute;
                    border-radius: 50%;
                    border: 2px solid rgba(99,149,255,0.4);
                    animation: pulseRing 2s ease-out infinite;
                }
                .call-avatar-ring-2 {
                    position: absolute;
                    border-radius: 50%;
                    border: 1.5px solid rgba(99,149,255,0.25);
                    animation: pulseRing2 2s ease-out infinite 0.5s;
                }
                .call-avatar {
                    width: 148px;
                    height: 148px;
                    border-radius: 50%;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 3px solid rgba(255,255,255,0.15);
                    box-shadow: 0 0 60px rgba(99,149,255,0.2), 0 25px 50px rgba(0,0,0,0.4);
                    animation: gentlePulse 3s ease-in-out infinite;
                    position: relative;
                    z-index: 2;
                }
                .call-avatar img { width:100%; height:100%; object-fit:cover; }
                .call-avatar-initial {
                    font-size: 52px;
                    font-weight: 700;
                    color: white;
                    text-shadow: 0 2px 8px rgba(0,0,0,0.3);
                }
                .call-status-text {
                    font-size: 13px;
                    color: rgba(255,255,255,0.5);
                    font-weight: 500;
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                }
                .call-ended-text {
                    font-size: 18px;
                    font-weight: 600;
                    color: rgba(255,255,255,0.65);
                }
                .incoming-label {
                    font-size: 12px;
                    font-weight: 600;
                    color: rgba(255,255,255,0.5);
                    text-transform: uppercase;
                    letter-spacing: 2.5px;
                }

                /* ── Bottom ── */
                .call-bottom {
                    flex-shrink: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 0 16px;
                    padding-bottom: max(24px, env(safe-area-inset-bottom));
                    position: relative;
                    z-index: 10;
                    gap: 0;
                }

                /* ── Controls pill ── */
                .call-controls-pill {
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    gap: 16px;
                    background: rgba(30,34,50,0.92);
                    backdrop-filter: blur(24px);
                    border-radius: 28px;
                    padding: 16px 20px;
                    border: 1px solid rgba(255,255,255,0.08);
                }
                .control-btn-wrap {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                }
                .control-btn-label {
                    color: rgba(255, 255, 255, 0.65);
                    font-size: 11px;
                    font-weight: 500;
                    user-select: none;
                }
                .pill-btn {
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: rgba(255,255,255,0.85);
                    background: rgba(255,255,255,0.1);
                    transition: all 0.18s ease;
                }
                .pill-btn:hover  { background: rgba(255,255,255,0.16); }
                .pill-btn:active { transform: scale(0.9); }
                .pill-btn-hangup {
                    width: 72px !important;
                    height: 72px !important;
                    background: #ef4444 !important;
                    box-shadow: 0 6px 24px rgba(239,68,68,0.5) !important;
                    color: white !important;
                }
                .pill-btn-hangup:hover { background: #dc2626 !important; }
                /* active = toggled ON → white button, dark icon */
                .pill-btn-active {
                    background: white !important;
                    color: #1e293b !important;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.25);
                }
                .pill-btn-active:hover { background: rgba(240,240,240,1) !important; }

                @media (min-width: 600px) {
                    .pill-btn { width: 56px; height: 56px; }
                    .pill-btn-hangup { width: 64px !important; height: 64px !important; }
                }

                @media (max-width: 480px) {
                    .call-controls-pill {
                        gap: 8px !important;
                        padding: 12px 10px !important;
                    }
                    .pill-btn {
                        width: 46px !important;
                        height: 46px !important;
                    }
                    .pill-btn-hangup {
                        width: 54px !important;
                        height: 54px !important;
                    }
                    .control-btn-label {
                        font-size: 10px !important;
                    }
                }

                /* ── Incoming ── */
                .incoming-controls {
                    display: flex;
                    align-items: flex-start;
                    gap: 52px;
                    margin-bottom: 8px;
                }
                .inc-btn {
                    width: 68px;
                    height: 68px;
                    border-radius: 50%;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    transition: all 0.2s;
                }
                .inc-btn-accept {
                    background: #22c55e;
                    box-shadow: 0 8px 28px rgba(34,197,94,0.45);
                    animation: acceptBounce 1.5s ease-in-out infinite;
                }
                .inc-btn-accept:hover { background: #16a34a; }
                .inc-btn-reject {
                    background: #ef4444;
                    box-shadow: 0 8px 28px rgba(239,68,68,0.4);
                }
                .inc-btn-reject:hover { background: #dc2626; }
                .inc-label {
                    font-size: 12px;
                    color: rgba(255,255,255,0.55);
                    font-weight: 500;
                    margin-top: 8px;
                    text-align: center;
                }

                /* ── More panel ── */
                .more-panel-wrap {
                    position: absolute;
                    inset: 0;
                    z-index: 20;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-end;
                }
                .more-panel {
                    padding: 0 12px;
                    padding-bottom: max(16px, env(safe-area-inset-bottom));
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    animation: slideUpPanel 0.26s ease-out;
                }
                .e2e-label {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    color: rgba(255,255,255,0.5);
                    font-size: 12px;
                    font-weight: 500;
                    padding-bottom: 2px;
                }
                .reactions-row {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 14px;
                }
                .reaction-btn {
                    font-size: 28px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 50%;
                    transition: transform 0.15s;
                    line-height: 1;
                }
                .reaction-btn:hover  { transform: scale(1.35); }
                .reaction-btn:active { transform: scale(0.88); }
                .options-card {
                    background: rgba(30,34,50,0.96);
                    backdrop-filter: blur(24px);
                    border-radius: 20px;
                    overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.09);
                }
                .option-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 15px 20px;
                    color: white;
                    font-size: 15px;
                    font-weight: 500;
                    cursor: pointer;
                    border-bottom: 1px solid rgba(255,255,255,0.07);
                    transition: background 0.15s;
                }
                .option-row:last-child { border-bottom: none; }
                .option-row:hover  { background: rgba(255,255,255,0.06); }
                .option-row:active { background: rgba(255,255,255,0.1); }
                .option-icon {
                    width: 30px;
                    height: 30px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: rgba(255,255,255,0.75);
                    flex-shrink: 0;
                }
                .toggle-track {
                    width: 46px;
                    height: 26px;
                    border-radius: 13px;
                    position: relative;
                    cursor: pointer;
                    transition: background 0.25s;
                    border: none;
                    outline: none;
                    flex-shrink: 0;
                }
                .toggle-track.on  { background: #22c55e; }
                .toggle-track.off { background: rgba(255,255,255,0.2); }
                .toggle-thumb {
                    position: absolute;
                    top: 3px;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: white;
                    transition: left 0.25s cubic-bezier(0.34,1.5,0.64,1);
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    pointer-events: none;
                }
                .toggle-track.on  .toggle-thumb { left: calc(100% - 23px); }
                .toggle-track.off .toggle-thumb { left: 3px; }
                .connection-bar {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    color: #4ade80;
                    font-size: 13px;
                    font-weight: 500;
                    padding: 2px 0 4px;
                }
                .signal-bars { display:flex; align-items:flex-end; gap:2px; height:14px; }
                .signal-bar { width:3px; border-radius:2px; background:#4ade80; }

                /* ── Floating emoji ── */
                .floating-emoji {
                    position: absolute;
                    font-size: 36px;
                    pointer-events: none;
                    z-index: 30;
                    animation: floatUp 2.5s ease-out forwards;
                    bottom: 120px;
                }

                /* ── Add Participant modal ── */
                .add-modal-backdrop {
                    position: absolute;
                    inset: 0;
                    z-index: 40;
                    background: rgba(0,0,0,0.55);
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                    padding: 0 12px;
                    padding-bottom: max(24px, env(safe-area-inset-bottom));
                }
                .add-modal {
                    background: rgba(22,26,40,0.98);
                    backdrop-filter: blur(24px);
                    border-radius: 24px;
                    border: 1px solid rgba(255,255,255,0.1);
                    width: 100%;
                    max-width: 420px;
                    padding: 20px;
                    animation: modalIn 0.25s ease-out;
                }
                .add-modal-title {
                    font-size: 17px;
                    font-weight: 700;
                    color: white;
                    margin-bottom: 14px;
                    text-align: center;
                }
                .add-search-wrap {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: rgba(255,255,255,0.07);
                    border-radius: 12px;
                    padding: 10px 14px;
                    margin-bottom: 12px;
                    border: 1px solid rgba(255,255,255,0.08);
                }
                .add-search-input {
                    flex: 1;
                    background: none;
                    border: none;
                    outline: none;
                    color: white;
                    font-size: 15px;
                }
                .add-search-input::placeholder { color: rgba(255,255,255,0.35); }
                .contact-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    cursor: pointer;
                    transition: opacity 0.15s;
                }
                .contact-row:last-child { border-bottom: none; }
                .contact-row:hover { opacity: 0.8; }
                .contact-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    overflow: hidden;
                    background: linear-gradient(135deg,#3b82f6,#8b5cf6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    font-size: 16px;
                    font-weight: 700;
                    color: white;
                }
                .contact-avatar img { width:100%; height:100%; object-fit:cover; }
                .contact-name { color:white; font-size:14px; font-weight:500; flex:1; }
                .contact-add-btn {
                    background: rgba(99,149,255,0.2);
                    border: 1px solid rgba(99,149,255,0.4);
                    color: #93c5fd;
                    border-radius: 20px;
                    padding: 5px 14px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.15s;
                }
                .contact-add-btn:hover { background: rgba(99,149,255,0.35); }
                .add-modal-close {
                    display: flex;
                    justify-content: center;
                    margin-top: 14px;
                }
                .add-close-btn {
                    background: rgba(255,255,255,0.08);
                    border: none;
                    color: rgba(255,255,255,0.6);
                    border-radius: 20px;
                    padding: 8px 28px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: background 0.15s;
                }
                .add-close-btn:hover { background: rgba(255,255,255,0.14); }

                /* ── Video ── */
                .local-video-pip {
                    position: absolute;
                    top: 64px; right: 16px;
                    width: 110px; height: 150px;
                    border-radius: 16px; overflow: hidden;
                    border: 2px solid rgba(255,255,255,0.2);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                    z-index: 10; background: #1e293b;
                }
                .local-video-pip video { width:100%; height:100%; object-fit:cover; transform:scaleX(-1); }
                .remote-video-bg { position:absolute; inset:0; z-index:0; }
                .remote-video-bg video { width:100%; height:100%; object-fit:cover; }
                .video-overlay-gradient {
                    position:absolute; inset:0; z-index:1;
                    background: linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.7) 100%);
                }

                @media (min-width: 768px) {
                    .call-avatar { width: 168px; height: 168px; }
                    .topbar-name  { font-size: 22px; }
                }
            `}</style>

            <div className={`call-overlay ${isVideoCall && isInCall ? "call-video-bg" : "call-bg"}`}>

                {/* Dedicated audio/video output elements for the remote stream */}
                {isInCall && remoteStream && (
                    <>
                        {/* Loudspeaker route (forced by HTML5 Video element on iOS/Safari) */}
                        <video
                            ref={remoteVideoAudioRef}
                            autoPlay
                            playsInline
                            muted={!isSpeakerOn}
                            style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none", zIndex: -100 }}
                        />
                        {/* Earpiece route (forced by HTML5 Audio element on iOS/Safari) */}
                        <audio
                            ref={remoteAudioAudioRef}
                            autoPlay
                            playsInline
                            muted={isSpeakerOn}
                            style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none", zIndex: -100 }}
                        />
                    </>
                )}

                {/* Remote video (background) - visual only */}
                {isVideoCall && isInCall && remoteStream && (
                    <>
                        <div className="remote-video-bg">
                            <video ref={remoteVideoRef} autoPlay playsInline muted={true} />
                        </div>
                        <div className="video-overlay-gradient" />
                    </>
                )}

                {/* Local video PiP - visual only */}
                {isVideoCall && (isInCall || callState === "outgoing-ringing" || callState === "outgoing-calling") && localStream && (
                    <div 
                        className="local-video-pip"
                        onClick={() => {
                            if (isInCall) setIsSwapped(prev => !prev);
                        }}
                        style={{ cursor: isInCall ? "pointer" : "default" }}
                    >
                        <video ref={localVideoRef} autoPlay playsInline muted={true} />
                    </div>
                )}

                {/* Floating emoji reactions */}
                {floatingEmojis.map(fe => (
                    <span key={fe.id} className="floating-emoji" style={{ left: `${fe.x}%` }}>{fe.emoji}</span>
                ))}

                {/* ── Top bar ── */}
                <div className="call-topbar">
                    <button
                        className="topbar-icon-btn"
                        onClick={() => setIsMinimized(true)}
                        title="Minimize"
                    >
                        <Minimize2 size={18} />
                    </button>

                    <div className="topbar-center">
                        <span className="topbar-name">{remoteName || "Unknown"}</span>
                        {isInCall && <span className={`topbar-sub topbar-sub-green`}>{formatDuration(callDuration)}</span>}
                        {isRinging && !isIncoming && <span className="topbar-sub">Ringing…</span>}
                        {isCalling && <span className="topbar-sub">Calling…</span>}
                        {isIncoming  && <span className="topbar-sub">Incoming Call</span>}
                        {isConnecting && <span className="topbar-sub">Connecting…</span>}
                        {isEnded     && <span className="call-ended-text">Call Ended</span>}
                    </div>

                    <button
                        className="topbar-icon-btn"
                        onClick={() => { setShowMorePanel(false); setShowAddParticipant(true); }}
                        title="Add participant"
                    >
                        <UserPlus size={18} />
                    </button>
                </div>

                {/* ── Avatar ── */}
                <div className="call-center">
                    {!(isVideoCall && isInCall) && (
                        <div className="call-avatar-wrapper">
                            {(isRinging || isCalling) && (
                                <>
                                    <div className="call-avatar-ring" style={{ width: 192, height: 192 }} />
                                    <div className="call-avatar-ring-2" style={{ width: 228, height: 228 }} />
                                </>
                            )}
                            <div className="call-avatar" style={{ background: remoteAvatar ? "#fff" : "linear-gradient(135deg,#3b82f6,#8b5cf6)" }}>
                                {remoteAvatar
                                    ? <img src={remoteAvatar} alt={remoteName} />
                                    : <span className="call-avatar-initial">{remoteName?.charAt(0)?.toUpperCase() || "?"}</span>
                                }
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Bottom Controls ── */}
                <div className="call-bottom">
                    {/* Incoming */}
                    {isIncoming && (
                        <div className="incoming-controls">
                            <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                                <button className="inc-btn inc-btn-reject" onClick={rejectCall}><PhoneOff size={28} /></button>
                                <span className="inc-label">Decline</span>
                            </div>
                            <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                                <button className="inc-btn inc-btn-accept" onClick={acceptCall}><Phone size={28} /></button>
                                <span className="inc-label">Accept</span>
                            </div>
                        </div>
                    )}

                    {/* Outgoing ringing — show full controls so user can mute/camera before pickup */}
                    {(callState === "outgoing-ringing" || callState === "outgoing-calling" || isConnecting) && !showMorePanel && (
                        <div className="call-controls-pill">
                            <div className="control-btn-wrap">
                                <button className="pill-btn" onClick={() => setShowMorePanel(v => !v)} title="More"><MoreHorizontal size={24} /></button>
                                <span className="control-btn-label">More</span>
                            </div>
                            <div className="control-btn-wrap">
                                <button className={`pill-btn${isCameraOff ? " pill-btn-active" : ""}`} onClick={toggleCamera}>{isCameraOff ? <VideoOff size={24} /> : <Video size={24} />}</button>
                                <span className="control-btn-label">Video</span>
                            </div>
                            <div className="control-btn-wrap">
                                <button className={`pill-btn${isSpeakerOn ? " pill-btn-active" : ""}`} onClick={() => setIsSpeakerOn(v => !v)}><Volume2 size={24} /></button>
                                <span className="control-btn-label">Audio</span>
                            </div>
                            <div className="control-btn-wrap">
                                <button className={`pill-btn${isMuted ? " pill-btn-active" : ""}`} onClick={toggleMute}>{isMuted ? <MicOff size={24} /> : <Mic size={24} />}</button>
                                <span className="control-btn-label">Mute</span>
                            </div>
                            <div className="control-btn-wrap">
                                <button className="pill-btn pill-btn-hangup" onClick={hangUp}><PhoneOff size={24} /></button>
                                <span className="control-btn-label">Decline</span>
                            </div>
                        </div>
                    )}

                    {/* In-call pill */}
                    {isInCall && !showMorePanel && (
                        <div className="call-controls-pill">
                            <div className="control-btn-wrap">
                                <button className="pill-btn" onClick={() => setShowMorePanel(true)} title="More"><MoreHorizontal size={24} /></button>
                                <span className="control-btn-label">More</span>
                            </div>
                            <div className="control-btn-wrap">
                                <button className={`pill-btn${isCameraOff ? " pill-btn-active" : ""}`} onClick={toggleCamera}>{isCameraOff ? <VideoOff size={24} /> : <Video size={24} />}</button>
                                <span className="control-btn-label">Video</span>
                            </div>
                            <div className="control-btn-wrap">
                                <button className={`pill-btn${isSpeakerOn ? " pill-btn-active" : ""}`} onClick={() => setIsSpeakerOn(v => !v)}><Volume2 size={24} /></button>
                                <span className="control-btn-label">Audio</span>
                            </div>
                            <div className="control-btn-wrap">
                                <button className={`pill-btn${isMuted ? " pill-btn-active" : ""}`} onClick={toggleMute}>{isMuted ? <MicOff size={24} /> : <Mic size={24} />}</button>
                                <span className="control-btn-label">Mute</span>
                            </div>
                            <div className="control-btn-wrap">
                                <button className="pill-btn pill-btn-hangup" onClick={hangUp}><PhoneOff size={24} /></button>
                                <span className="control-btn-label">Hang Up</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── More Options Panel ── */}
                {(isInCall || callState === "outgoing-ringing" || callState === "outgoing-calling" || isConnecting) && showMorePanel && (
                    <div className="more-panel-wrap" onClick={() => setShowMorePanel(false)}>
                        <div className="more-panel" onClick={e => e.stopPropagation()}>
                            <div className="e2e-label"><Lock size={12} /><span>End-to-end encrypted</span></div>
                            <div className="reactions-row">
                                {REACTIONS.map(emoji => (
                                    <button key={emoji} className="reaction-btn" onClick={() => sendReaction(emoji)}>{emoji}</button>
                                ))}
                            </div>
                            <div className="options-card" style={{ maxWidth: 320, alignSelf: "center", width: "100%" }}>
                                <div className="option-row" onClick={() => { setShowMorePanel(false); alert("Screen sharing would be initiated here."); }}>
                                    <span>Share screen</span>
                                    <div className="option-icon"><MonitorUp size={15} /></div>
                                </div>
                                <div className="option-row" onClick={() => { setShowMorePanel(false); window.dispatchEvent(new CustomEvent("call:open-chat", { detail: { remoteName } })); }}>
                                    <span>Send message</span>
                                    <div className="option-icon"><MessageSquare size={15} /></div>
                                </div>
                                <div className="option-row" style={{ cursor:"default" }}>
                                    <span>Noise cancellation</span>
                                    <button className={`toggle-track ${noiseCancellation ? "on" : "off"}`} onClick={() => setNoiseCancellation(v => !v)}>
                                        <span className="toggle-thumb" />
                                    </button>
                                </div>
                            </div>
                            <div className="connection-bar">
                                <div className="signal-bars">
                                    <div className="signal-bar" style={{ height: 4 }} />
                                    <div className="signal-bar" style={{ height: 7 }} />
                                    <div className="signal-bar" style={{ height: 10 }} />
                                    <div className="signal-bar" style={{ height: 14 }} />
                                </div>
                                <span>Good connection</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "center" }}>
                                <div className="call-controls-pill">
                                    <div className="control-btn-wrap">
                                        <button className="pill-btn" onClick={() => setShowMorePanel(false)}><X size={22} /></button>
                                        <span className="control-btn-label">Close</span>
                                    </div>
                                    <div className="control-btn-wrap">
                                        <button className={`pill-btn${isCameraOff ? " pill-btn-active" : ""}`} onClick={toggleCamera}>{isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}</button>
                                        <span className="control-btn-label">Video</span>
                                    </div>
                                    <div className="control-btn-wrap">
                                        <button className={`pill-btn${isSpeakerOn ? " pill-btn-active" : ""}`} onClick={() => setIsSpeakerOn(v => !v)}><Volume2 size={22} /></button>
                                        <span className="control-btn-label">Audio</span>
                                    </div>
                                    <div className="control-btn-wrap">
                                        <button className={`pill-btn${isMuted ? " pill-btn-active" : ""}`} onClick={toggleMute}>{isMuted ? <MicOff size={22} /> : <Mic size={22} />}</button>
                                        <span className="control-btn-label">Mute</span>
                                    </div>
                                    <div className="control-btn-wrap">
                                        <button className="pill-btn pill-btn-hangup" onClick={hangUp}><PhoneOff size={22} /></button>
                                        <span className="control-btn-label">Hang Up</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Add Participant Modal ── */}
                {showAddParticipant && (
                    <div className="add-modal-backdrop" onClick={() => setShowAddParticipant(false)}>
                        <div className="add-modal" onClick={e => e.stopPropagation()}>
                            <div className="add-modal-title">Add to Call</div>
                            <div className="add-search-wrap">
                                <Search size={16} color="rgba(255,255,255,0.4)" />
                                <input
                                    className="add-search-input"
                                    placeholder="Search contacts…"
                                    value={participantSearch}
                                    onChange={e => setParticipantSearch(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div>
                                {filteredUsers.length === 0 && (
                                    <p style={{ color:"rgba(255,255,255,0.4)", fontSize:14, textAlign:"center", padding:"12px 0" }}>No contacts found</p>
                                )}
                                {filteredUsers.map((u: any) => (
                                    <div key={u.id} className="contact-row">
                                        <div className="contact-avatar">
                                            {u.photoURL
                                                ? <img src={u.photoURL} alt={u.displayName} />
                                                : u.displayName?.charAt(0)?.toUpperCase()
                                            }
                                        </div>
                                        <span className="contact-name">{u.displayName}</span>
                                        <button
                                            className="contact-add-btn"
                                            onClick={() => {
                                                setShowAddParticipant(false);
                                                alert(`${u.displayName} invited to the call`);
                                            }}
                                        >
                                            Invite
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="add-modal-close">
                                <button className="add-close-btn" onClick={() => setShowAddParticipant(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </>
    );
}
