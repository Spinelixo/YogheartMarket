"use client";

import { useMockData, User } from "@/context/MockContext";
import { ArrowLeft, Archive, ArchiveRestore, Lock, Unlock, BellOff, Pin, Trash2, User as UserIcon, Check, CheckCheck, ShieldAlert, KeyRound, X, Bell } from "lucide-react";
import { clsx } from "clsx";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import ZoomedAvatarModal from "@/components/ZoomedAvatarModal";

export default function ArchivedChatsView({ onClose }: { onClose: () => void }) {
    const { 
        currentUser, 
        archivedThreads, 
        unarchiveChat, 
        muteChat, 
        deleteThread, 
        togglePinThread,
        statuses, 
        seenStatusIds, 
        setActiveThreadId,
        updateUserSettings
    } = useMockData() as any;

    // PIN lock state
    const [pinInput, setPinInput] = useState("");
    const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
        if (typeof window !== "undefined") {
            return sessionStorage.getItem("mesh_archived_unlocked") === "true";
        }
        return false;
    });
    const [pinError, setPinError] = useState(false);
    const [showSetPinModal, setShowSetPinModal] = useState(false);
    const [newPin, setNewPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [setPinStep, setSetPinStep] = useState<"enter" | "confirm">("enter");
    const [setupPinError, setSetupPinError] = useState("");

    // Context menu & Zoom avatar state
    const [zoomedUser, setZoomedUser] = useState<User | null>(null);
    const [selectedThread, setSelectedThread] = useState<any | null>(null);
    const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    // Touch swipe back gesture detection
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length > 0) {
            touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchStartRef.current) return;
        const touch = e.touches[0];
        const diffX = touch.clientX - touchStartRef.current.x;
        const diffY = touch.clientY - touchStartRef.current.y;

        // If starting near left edge (< 80px) and dragging right horizontally by > 40px
        if (touchStartRef.current.x < 80 && diffX > 40 && Math.abs(diffX) > Math.abs(diffY)) {
            touchStartRef.current = null;
            handleBack();
        }
    };

    const handleBack = () => {
        if (typeof window !== "undefined") {
            sessionStorage.removeItem("mesh_archived_unlocked");
        }
        onClose();
    };

    // Get current saved PIN
    const savedPin = currentUser?.settings?.archivedPin || (typeof window !== "undefined" ? localStorage.getItem("mesh_archived_pin") : null);
    const isPinLocked = !!savedPin;

    useEffect(() => {
        if (!isPinLocked) {
            setIsUnlocked(true);
        }
    }, [isPinLocked]);

    // Handle keypad press for PIN unlock
    const handleKeypadPress = (val: string) => {
        setPinError(false);
        if (val === "back") {
            setPinInput(prev => prev.slice(0, -1));
            return;
        }
        if (pinInput.length < 4) {
            const nextPin = pinInput + val;
            setPinInput(nextPin);
            if (nextPin.length === 4) {
                if (nextPin === savedPin) {
                    setTimeout(() => {
                        if (typeof window !== "undefined") {
                            sessionStorage.setItem("mesh_archived_unlocked", "true");
                        }
                        setIsUnlocked(true);
                        setPinInput("");
                    }, 220);
                } else {
                    setPinError(true);
                    if (typeof window !== "undefined" && navigator.vibrate) {
                        navigator.vibrate([100, 50, 100]);
                    }
                    setTimeout(() => {
                        setPinInput("");
                    }, 450);
                }
            }
        }
    };

    // Handle Set/Change PIN
    const handleSetPinKeypad = (val: string) => {
        setSetupPinError("");
        if (setPinStep === "enter") {
            if (val === "back") {
                setNewPin(prev => prev.slice(0, -1));
                return;
            }
            if (newPin.length < 4) {
                const next = newPin + val;
                setNewPin(next);
                if (next.length === 4) {
                    setTimeout(() => {
                        setSetPinStep("confirm");
                    }, 220);
                }
            }
        } else {
            if (val === "back") {
                setConfirmPin(prev => prev.slice(0, -1));
                return;
            }
            if (confirmPin.length < 4) {
                const next = confirmPin + val;
                setConfirmPin(next);
                if (next.length === 4) {
                    if (next === newPin) {
                        setTimeout(() => {
                            if (typeof window !== "undefined") {
                                localStorage.setItem("mesh_archived_pin", next);
                                sessionStorage.setItem("mesh_archived_unlocked", "true");
                            }
                            if (updateUserSettings) {
                                updateUserSettings({ archivedPin: next });
                            }
                            setShowSetPinModal(false);
                            setNewPin("");
                            setConfirmPin("");
                            setSetPinStep("enter");
                            setIsUnlocked(true);
                        }, 220);
                    } else {
                        setSetupPinError("PINs do not match. Try again.");
                        if (typeof window !== "undefined" && navigator.vibrate) {
                            navigator.vibrate([100, 50, 100]);
                        }
                        setTimeout(() => {
                            setConfirmPin("");
                        }, 400);
                    }
                }
            }
        }
    };

    const [showConfirmRemovePin, setShowConfirmRemovePin] = useState(false);

    const handleRemovePin = () => {
        setShowConfirmRemovePin(true);
    };

    const confirmRemovePinAction = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("mesh_archived_pin");
            sessionStorage.removeItem("mesh_archived_unlocked");
        }
        if (updateUserSettings) {
            updateUserSettings({ archivedPin: null });
        }
        setIsUnlocked(true);
        setShowConfirmRemovePin(false);
    };

    // Helper privacy check
    const checkPrivacy = (targetUser: any, settingKey: 'profilePicture' | 'feeds' | 'datingDetails') => {
        if (!targetUser) return false;
        if (targetUser.id === currentUser?.id) return true;
        const settings = targetUser.settings?.privacy;
        if (!settings) return true;
        const value = settings[settingKey];
        if (value === undefined || value === 'everyone' || value === true) return true;
        if (value === 'nobody' || value === false) return false;
        if (value === 'contacts') {
            return currentUser?.savedContactIds?.includes(targetUser.id) || targetUser.savedContactIds?.includes(currentUser?.id);
        }
        return true;
    };

    // Status seen helper
    const getUnreadStatusCount = (userId: string) => {
        if (!statuses) return 0;
        const userStatuses = statuses.filter((s: any) => s.userId === userId && Date.now() - new Date(s.timestamp).getTime() <= 24 * 60 * 60 * 1000);
        return userStatuses.filter((s: any) => {
            const slides = s.mediaItems && s.mediaItems.length > 0
                ? s.mediaItems
                : (s.mediaUrl ? [{ id: 'legacy', mediaUrl: s.mediaUrl }] : []);
            if (slides.length === 0) {
                return !seenStatusIds?.has(s.id) && !seenStatusIds?.has(`${s.id}_text`);
            }
            return !slides.every((slide: any) => seenStatusIds?.has(`${s.id}_${slide.id}`));
        }).length;
    };

    // Thread item click handler
    const handleThreadClick = (threadId: string) => {
        if (setActiveThreadId) {
            setActiveThreadId(threadId);
        }
        if (typeof window !== "undefined") {
            window.history.pushState(null, "", `/inbox?id=${threadId}&from=archived`);
        }
    };

    // Context menu handler
    const handleContextMenu = (e: React.MouseEvent, thread: any) => {
        e.preventDefault();
        setSelectedThread(thread);
        setContextMenuPos({ x: e.clientX, y: e.clientY });
    };

    // Render PIN Lock screen if locked
    if (isPinLocked && !isUnlocked) {
        return (
            <div 
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                className="w-full h-full flex flex-col items-center justify-center p-6 bg-[var(--background)] dark:bg-gray-900 select-none overflow-hidden"
            >
                <div className="absolute top-4 left-4">
                    <button onClick={handleBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer">
                        <ArrowLeft size={22} className="text-[var(--primary)]" />
                    </button>
                </div>
                <div className="flex flex-col items-center max-w-sm w-full">
                    <div className="w-16 h-16 rounded-full bg-[#00a884]/10 text-[#00a884] flex items-center justify-center mb-4 border border-[#00a884]/20 shadow-lg">
                        <Lock size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Archived Chats Locked</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center">
                        Enter your 4-digit PIN to access locked archived conversations.
                    </p>

                    {/* PIN Dots */}
                    <div className={clsx("flex gap-4 mb-8 transition-transform", pinError && "animate-shake")}>
                        {[0, 1, 2, 3].map((idx) => (
                            <div
                                key={idx}
                                className={clsx(
                                    "w-4 h-4 rounded-full border-2 transition-all duration-200",
                                    pinInput.length > idx
                                        ? "bg-[#00a884] border-[#00a884] scale-110 shadow-md shadow-[#00a884]/30"
                                        : "border-gray-300 dark:border-gray-700 bg-transparent"
                                )}
                            />
                        ))}
                    </div>

                    {/* Keypad */}
                    <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
                        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0"].map((btn, idx) => {
                            if (btn === "back") {
                                return (
                                    <button
                                        key="back"
                                        onClick={() => handleKeypadPress("back")}
                                        className="h-14 rounded-2xl flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all text-sm font-semibold col-start-3 cursor-pointer"
                                    >
                                        Delete
                                    </button>
                                );
                            }
                            return (
                                <button
                                    key={btn}
                                    onClick={() => handleKeypadPress(btn)}
                                    className="h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xl font-bold border border-gray-200/80 dark:border-gray-700/60 shadow-xs hover:bg-emerald-50 dark:hover:bg-gray-700 active:scale-95 transition-all cursor-pointer"
                                >
                                    {btn}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={handleBack}
                        className="mt-8 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={16} /> Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            className="w-full h-full relative overflow-y-auto pb-20 lg:pb-4 bg-[var(--background)] dark:bg-gray-900 select-none"
        >
            {/* Header */}
            <header className="sticky top-0 bg-white dark:bg-gray-900 z-40 border-b border-[var(--border)] dark:border-gray-800 px-4 py-3.5 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                    <button onClick={handleBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer">
                        <ArrowLeft size={22} className="text-[var(--primary)]" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            Archived Chats
                            {isPinLocked && <Lock size={15} className="text-[#00a884] shrink-0" />}
                        </h1>
                        <p className="text-xs text-[var(--secondary)]">
                            {archivedThreads.length} archived {archivedThreads.length === 1 ? "conversation" : "conversations"}
                        </p>
                    </div>
                </div>

                {/* PIN Management Action */}
                <div className="flex items-center gap-2">
                    {isPinLocked ? (
                        <button
                            onClick={handleRemovePin}
                            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#00a884]/10 text-[#00a884] dark:text-[#00a884] border border-[#00a884]/20 hover:bg-[#00a884]/20 transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Remove PIN Lock"
                        >
                            <Unlock size={14} /> Remove PIN
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                setShowSetPinModal(true);
                                setNewPin("");
                                setConfirmPin("");
                                setSetPinStep("enter");
                                setSetupPinError("");
                            }}
                            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#00a884]/10 text-[#00a884] dark:text-[#00a884] border border-[#00a884]/20 hover:bg-[#00a884]/20 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <Lock size={14} /> Set PIN
                        </button>
                    )}
                </div>
            </header>

            {/* List of Archived Chats */}
            {archivedThreads.length > 0 ? (
                <div className="divide-y divide-[var(--border)] dark:divide-gray-800">
                    {archivedThreads.map((thread: any) => {
                        const user = thread.user || {};
                        const hasActiveStatus = statuses?.some((s: any) => s.userId === user.id);
                        const hasUnreadStatus = hasActiveStatus && getUnreadStatusCount(user.id) > 0;
                        const unreadCount = thread.messages ? thread.messages.filter((m: any) => (m.sender ? m.sender === "them" : m.senderId !== currentUser?.id) && !m.read).length : 0;
                        const isPinned = currentUser?.pinnedThreadIds?.includes(thread.id);

                        return (
                            <div
                                key={thread.id}
                                onClick={() => handleThreadClick(thread.id)}
                                onContextMenu={(e) => handleContextMenu(e, thread)}
                                className="flex items-center gap-4 px-4 py-3.5 sm:py-4 hover:bg-gray-100/60 dark:hover:bg-gray-800/60 cursor-pointer transition-colors border-b border-[var(--border)]/70 dark:border-zinc-800/70"
                            >
                                {/* Avatar */}
                                <div className="relative shrink-0">
                                    {hasActiveStatus ? (
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (user.avatar && checkPrivacy(user, 'profilePicture')) {
                                                    setZoomedUser(user);
                                                }
                                            }}
                                            className={clsx(
                                                "w-13 h-13 rounded-full shrink-0 relative flex items-center justify-center p-[2.5px] cursor-pointer hover:scale-105 transition-transform",
                                                hasUnreadStatus
                                                    ? "story-gradient-ring bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600"
                                                    : "bg-zinc-200 dark:bg-zinc-700"
                                            )}
                                            style={hasUnreadStatus ? { background: "linear-gradient(45deg, #f59e0b, #f43f5e, #9333ea)" } : undefined}
                                        >
                                            <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 p-[2px]">
                                                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-200">
                                                    {user.avatar && checkPrivacy(user, 'profilePicture') ? (
                                                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="font-bold text-lg">{user.name?.charAt(0) || "U"}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (user.avatar && checkPrivacy(user, 'profilePicture')) {
                                                    setZoomedUser(user);
                                                }
                                            }}
                                            className={clsx(
                                                "w-13 h-13 rounded-full shrink-0 overflow-hidden flex items-center justify-center text-gray-700 dark:text-gray-200 font-bold text-lg",
                                                user.avatar && checkPrivacy(user, 'profilePicture')
                                                    ? "bg-white cursor-pointer hover:scale-105 transition-transform"
                                                    : user.color || "bg-emerald-200"
                                            )}
                                        >
                                            {user.avatar && checkPrivacy(user, 'profilePicture') ? (
                                                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span>{user.name?.charAt(0) || "U"}</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Unread Badge */}
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-[var(--primary)] text-white text-[11px] font-bold h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-zinc-900">
                                            {unreadCount}
                                        </span>
                                    )}
                                </div>

                                {/* Thread Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1.5">
                                        <h3 className="font-semibold text-[15px] truncate text-gray-900 dark:text-white flex items-center gap-1.5">
                                            {user.name || "User"}
                                            {isPinned && (
                                                <Pin size={12} className="text-blue-500 fill-blue-500 rotate-45 shrink-0" />
                                            )}
                                            {thread.isMuted && (
                                                <BellOff size={13} className="text-gray-400 dark:text-gray-500 shrink-0 ml-0.5" />
                                            )}
                                        </h3>
                                        <span className={clsx("text-xs shrink-0 ml-2", unreadCount > 0 ? "text-[var(--primary)] font-semibold" : "text-[var(--secondary)]")}>
                                            {thread.lastTime || ""}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {thread.lastMessageSender === "me" && (
                                            <CheckCheck size={15} className="text-blue-500 shrink-0" />
                                        )}
                                        <p className="text-sm text-[var(--secondary)] truncate">
                                            {thread.lastMessage || "No messages yet"}
                                        </p>
                                    </div>
                                </div>

                                {/* Unarchive Action Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        unarchiveChat(thread.id);
                                    }}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-gray-500 dark:text-gray-400 hover:text-emerald-500 shrink-0 cursor-pointer"
                                    title="Unarchive Chat"
                                >
                                    <ArchiveRestore size={20} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 text-[var(--secondary)] px-4 text-center">
                    <div className="w-20 h-20 rounded-full bg-[#00a884]/10 text-[#00a884] flex items-center justify-center mb-4 border border-[#00a884]/20 shadow-sm">
                        <Archive size={38} className="text-[#00a884]" />
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">No archived chats</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                        Archived chats will stay hidden here and won't appear on your main chat list.
                    </p>
                </div>
            )}

            {/* Set PIN Modal */}
            {showSetPinModal && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-zinc-800 flex flex-col items-center">
                        <div className="w-14 h-14 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
                            <KeyRound size={28} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                            {setPinStep === "enter" ? "Create 4-Digit PIN" : "Confirm 4-Digit PIN"}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-6">
                            {setPinStep === "enter" ? "Choose a PIN to protect your archived chats." : "Re-enter your PIN to confirm."}
                        </p>

                        {/* PIN Dots */}
                        <div className="flex gap-4 mb-6">
                            {[0, 1, 2, 3].map((idx) => {
                                const activeLen = setPinStep === "enter" ? newPin.length : confirmPin.length;
                                return (
                                    <div
                                        key={idx}
                                        className={clsx(
                                            "w-4 h-4 rounded-full border-2 transition-all duration-200",
                                            activeLen > idx
                                                ? "bg-blue-500 border-blue-500 scale-110 shadow-md shadow-blue-500/30"
                                                : "border-gray-300 dark:border-zinc-700 bg-transparent"
                                        )}
                                    />
                                );
                            })}
                        </div>

                        {/* Keypad */}
                        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] mb-4">
                            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0"].map((btn) => {
                                if (btn === "back") {
                                    return (
                                        <button
                                            key="back"
                                            onClick={() => handleSetPinKeypad("back")}
                                            className="h-12 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 active:scale-95 transition-all text-xs font-semibold col-start-3 cursor-pointer"
                                        >
                                            Delete
                                        </button>
                                    );
                                }
                                return (
                                    <button
                                        key={btn}
                                        onClick={() => handleSetPinKeypad(btn)}
                                        className="h-12 rounded-xl bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-lg font-bold border border-gray-200/80 dark:border-zinc-700/60 shadow-xs hover:bg-blue-50 dark:hover:bg-zinc-700 active:scale-95 transition-all cursor-pointer"
                                    >
                                        {btn}
                                    </button>
                                );
                            })}
                        </div>

                        {setupPinError && (
                            <p className="text-xs text-rose-500 font-medium mb-3 text-center animate-shake">
                                {setupPinError}
                            </p>
                        )}

                        <button
                            onClick={() => setShowSetPinModal(false)}
                            className="w-full py-2.5 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Context Menu Modal */}
            {contextMenuPos && selectedThread && typeof window !== "undefined" && createPortal(
                <div 
                    className="fixed inset-0 z-50" 
                    onClick={() => setContextMenuPos(null)}
                >
                    <div 
                        style={{ 
                            top: Math.min(contextMenuPos.y, window.innerHeight - 240), 
                            left: Math.min(contextMenuPos.x, window.innerWidth - 200) 
                        }}
                        className="fixed w-48 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xl py-1.5 z-50 space-y-0.5 animate-in fade-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => {
                                unarchiveChat(selectedThread.id);
                                setContextMenuPos(null);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                            <ArchiveRestore size={16} className="text-emerald-500" />
                            <span>Unarchive Chat</span>
                        </button>

                        <button
                            onClick={() => {
                                muteChat(selectedThread.id, !selectedThread.isMuted);
                                setContextMenuPos(null);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                            {selectedThread.isMuted ? <Bell size={16} className="text-blue-500" /> : <BellOff size={16} className="text-amber-500" />}
                            <span>{selectedThread.isMuted ? "Unmute Chat" : "Mute Chat"}</span>
                        </button>

                        <button
                            onClick={() => {
                                togglePinThread(selectedThread.id);
                                setContextMenuPos(null);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                            <Pin size={16} className="text-purple-500" />
                            <span>{currentUser?.pinnedThreadIds?.includes(selectedThread.id) ? "Unpin Chat" : "Pin Chat"}</span>
                        </button>

                        <button
                            onClick={() => {
                                const userId = selectedThread.user?.id || selectedThread.id;
                                setContextMenuPos(null);
                                if (userId) {
                                    window.history.pushState(null, "", `/profile?userId=${userId}&from=archived`);
                                }
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                            <UserIcon size={16} className="text-indigo-500" />
                            <span>View Profile</span>
                        </button>

                        <div className="h-px bg-gray-100 dark:bg-zinc-800 my-1" />

                        <button
                            onClick={() => {
                                setContextMenuPos(null);
                                setShowConfirmDelete(true);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                        >
                            <Trash2 size={16} />
                            <span>Delete Chat</span>
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* Confirm Delete Modal */}
            {showConfirmDelete && selectedThread && (
                <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-xs w-full shadow-2xl border border-gray-200 dark:border-zinc-800 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-2">
                            <Trash2 size={24} />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Delete Chat?</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Are you sure you want to delete this chat with <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedThread.user?.name || "this user"}</span>? This cannot be undone.
                        </p>
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => setShowConfirmDelete(false)}
                                className="flex-1 py-2.5 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-xs hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    deleteThread(selectedThread.id);
                                    setShowConfirmDelete(false);
                                }}
                                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 transition-colors cursor-pointer shadow-sm"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Zoomed Avatar Modal */}
            <ZoomedAvatarModal
                isOpen={!!zoomedUser}
                onClose={() => setZoomedUser(null)}
                userName={zoomedUser?.name || ""}
                userAvatar={zoomedUser?.avatar || null}
                userColor={zoomedUser?.color || "bg-emerald-200"}
                location={zoomedUser?.location || null}
                showSendMessage={false}
                onMessage={() => {
                    if (zoomedUser) {
                        const threadId = zoomedUser.id;
                        setZoomedUser(null);
                        handleThreadClick(threadId);
                    }
                }}
                onCall={() => {
                    setZoomedUser(null);
                }}
                onInfo={() => {
                    if (zoomedUser) {
                        const userId = zoomedUser.id;
                        setZoomedUser(null);
                        window.history.pushState(null, "", `/profile?userId=${userId}&from=archived`);
                    }
                }}
            />

            {/* Custom Ultra-Premium Remove PIN Modal */}
            {showConfirmRemovePin && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center animate-in zoom-in-95 duration-200 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[#00a884]/10 border border-[#00a884]/20 text-[#00a884] flex items-center justify-center mb-4 shadow-lg shadow-[#00a884]/10">
                            <Unlock size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            Remove PIN Lock?
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                            Are you sure you want to remove the PIN lock for Archived Chats? Anyone will be able to access your archived conversations without entering a PIN.
                        </p>

                        <div className="flex flex-col gap-2.5 w-full">
                            <button
                                onClick={confirmRemovePinAction}
                                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-[#00a884] text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
                            >
                                Remove PIN Lock
                            </button>
                            <button
                                onClick={() => setShowConfirmRemovePin(false)}
                                className="w-full py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-semibold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98] transition-all cursor-pointer"
                            >
                                Keep PIN Locked
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
