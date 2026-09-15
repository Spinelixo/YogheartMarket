"use client";

import { useMockData } from "@/context/MockContext";
import { ArrowLeft, Eye, CheckCircle, Ban, ChevronRight, Users, Camera, Check, Activity, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { useState, useRef } from "react";

export default function PrivacyPage() {
    const { currentUser, updateSettings, blockedUsers, unblockUser } = useMockData();
    const [showBlockedModal, setShowBlockedModal] = useState(false);
    const [showPfpModal, setShowPfpModal] = useState(false);
    const [showFeedsModal, setShowFeedsModal] = useState(false);
    const [showDatingModal, setShowDatingModal] = useState(false);

    // Swipe-to-dismiss states for Blocked Contacts Modal
    const [blockedDragY, setBlockedDragY] = useState(0);
    const [isBlockedDragging, setIsBlockedDragging] = useState(false);
    const blockedDragStartY = useRef(0);

    const handleBlockedTouchStart = (e: React.TouchEvent) => {
        blockedDragStartY.current = e.touches[0].clientY;
        setIsBlockedDragging(true);
    };
    const handleBlockedTouchMove = (e: React.TouchEvent) => {
        if (!isBlockedDragging) return;
        const deltaY = e.touches[0].clientY - blockedDragStartY.current;
        if (deltaY > 0) setBlockedDragY(deltaY);
    };
    const handleBlockedTouchEnd = () => {
        setIsBlockedDragging(false);
        if (blockedDragY > 120) setShowBlockedModal(false);
        setBlockedDragY(0);
    };

    // Swipe-to-dismiss states for Pfp Privacy Modal
    const [pfpDragY, setPfpDragY] = useState(0);
    const [isPfpDragging, setIsPfpDragging] = useState(false);
    const pfpDragStartY = useRef(0);

    const handlePfpTouchStart = (e: React.TouchEvent) => {
        pfpDragStartY.current = e.touches[0].clientY;
        setIsPfpDragging(true);
    };
    const handlePfpTouchMove = (e: React.TouchEvent) => {
        if (!isPfpDragging) return;
        const deltaY = e.touches[0].clientY - pfpDragStartY.current;
        if (deltaY > 0) setPfpDragY(deltaY);
    };
    const handlePfpTouchEnd = () => {
        setIsPfpDragging(false);
        if (pfpDragY > 120) setShowPfpModal(false);
        setPfpDragY(0);
    };

    // Swipe-to-dismiss states for Feeds Privacy Modal
    const [feedsDragY, setFeedsDragY] = useState(0);
    const [isFeedsDragging, setIsFeedsDragging] = useState(false);
    const feedsDragStartY = useRef(0);

    const handleFeedsTouchStart = (e: React.TouchEvent) => {
        feedsDragStartY.current = e.touches[0].clientY;
        setIsFeedsDragging(true);
    };
    const handleFeedsTouchMove = (e: React.TouchEvent) => {
        if (!isFeedsDragging) return;
        const deltaY = e.touches[0].clientY - feedsDragStartY.current;
        if (deltaY > 0) setFeedsDragY(deltaY);
    };
    const handleFeedsTouchEnd = () => {
        setIsFeedsDragging(false);
        if (feedsDragY > 120) setShowFeedsModal(false);
        setFeedsDragY(0);
    };

    // Swipe-to-dismiss states for Dating Details Privacy Modal
    const [datingDragY, setDatingDragY] = useState(0);
    const [isDatingDragging, setIsDatingDragging] = useState(false);
    const datingDragStartY = useRef(0);

    const handleDatingTouchStart = (e: React.TouchEvent) => {
        datingDragStartY.current = e.touches[0].clientY;
        setIsDatingDragging(true);
    };
    const handleDatingTouchMove = (e: React.TouchEvent) => {
        if (!isDatingDragging) return;
        const deltaY = e.touches[0].clientY - datingDragStartY.current;
        if (deltaY > 0) setDatingDragY(deltaY);
    };
    const handleDatingTouchEnd = () => {
        setIsDatingDragging(false);
        if (datingDragY > 120) setShowDatingModal(false);
        setDatingDragY(0);
    };

    const privacySettings = Object.assign(
        {
            lastSeen: true,
            onlineStatus: true,
            readReceipts: true,
            discoverableByPhone: true,
            showDiscoverSuggestions: true,
            showAge: true,
            profilePicture: "everyone",
            feeds: "everyone",
            datingDetails: "everyone",
        },
        currentUser?.settings?.privacy || {}
    );

    const pfpValue = privacySettings.profilePicture || "everyone";
    const pfpLabels: Record<string, string> = { everyone: "Everyone", contacts: "My Contacts", nobody: "Nobody" };

    const feedsValue = privacySettings.feeds || "everyone";
    const feedsLabels: Record<string, string> = { everyone: "Everyone", contacts: "My Contacts", nobody: "Nobody" };

    const datingValue = privacySettings.datingDetails || "everyone";
    const datingLabels: Record<string, string> = { everyone: "Everyone", contacts: "My Contacts", nobody: "Nobody" };

    const togglePrivacy = (key: "lastSeen" | "onlineStatus" | "readReceipts" | "discoverableByPhone" | "showDiscoverSuggestions" | "showAge") => {
        updateSettings("privacy", {
            ...privacySettings,
            [key]: !privacySettings[key]
        });
    };

    const setPfpPrivacy = (value: string) => {
        updateSettings("privacy", {
            ...privacySettings,
            profilePicture: value
        });
        setShowPfpModal(false);
    };

    const setFeedsPrivacy = (value: string) => {
        updateSettings("privacy", {
            ...privacySettings,
            feeds: value
        });
        setShowFeedsModal(false);
    };

    const setDatingPrivacy = (value: string) => {
        updateSettings("privacy", {
            ...privacySettings,
            datingDetails: value
        });
        setShowDatingModal(false);
    };

    const handleUnblock = (userId: string) => {
        unblockUser(userId);
    };

    return (
        <div className={`w-full h-full overflow-y-auto pb-20 lg:pb-4 bg-[var(--card)] dark:bg-gray-900 transition-transform`}>
            <header className="bg-white dark:bg-zinc-900 px-3 md:px-4 py-3 flex items-center gap-2 border-b border-[var(--border)] dark:border-zinc-800 sticky top-0 z-10">
                <button 
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent("settings-subpage-back"));
                    }} 
                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                >
                    <ArrowLeft size={24} className="text-[var(--primary)]" />
                </button>
                <h1 className="text-lg font-semibold dark:text-white">Privacy</h1>
            </header>

            <div className="p-4 md:p-6 space-y-4">
                <p className="px-1 text-xs font-semibold text-[var(--secondary)] uppercase tracking-wide">Visibility</p>

                <div className="bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-gray-100 dark:border-zinc-800/85 shadow-sm">
                    <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-[var(--border)] dark:border-gray-800">
                        <div className="flex items-center gap-4">
                            <Eye size={20} className="text-[var(--secondary)]" />
                            <div>
                                <span className="font-medium block dark:text-white">Last Seen</span>
                                <span className="text-xs text-[var(--secondary)]">Show when you were last active</span>
                            </div>
                        </div>
                        <button
                            onClick={() => togglePrivacy("lastSeen")}
                            className={clsx("w-12 h-7 rounded-full transition-colors relative", privacySettings.lastSeen ? "bg-[var(--success)]" : "bg-gray-300")}
                        >
                            <div className={clsx("w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm", privacySettings.lastSeen ? "left-6" : "left-1")} />
                        </button>
                    </div>
                    {!privacySettings.lastSeen && (
                        <div className="px-5 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-[var(--border)] dark:border-gray-800">
                            <p className="text-[11px] text-amber-700 dark:text-amber-400">If you turn off your last seen, you won&apos;t be able to see other people&apos;s last seen either.</p>
                        </div>
                    )}

                    {/* Online Status Toggle */}
                    <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-[var(--border)] dark:border-gray-800">
                        <div className="flex items-center gap-4">
                            <Activity size={20} className="text-[var(--secondary)]" />
                            <div>
                                <span className="font-medium block dark:text-white">Online Status</span>
                                <span className="text-xs text-[var(--secondary)]">Show when you are currently online</span>
                            </div>
                        </div>
                        <button
                            onClick={() => togglePrivacy("onlineStatus")}
                            className={clsx("w-12 h-7 rounded-full transition-colors relative", privacySettings.onlineStatus ? "bg-[var(--success)]" : "bg-gray-300")}
                        >
                            <div className={clsx("w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm", privacySettings.onlineStatus ? "left-6" : "left-1")} />
                        </button>
                    </div>
                    {!privacySettings.onlineStatus && (
                        <div className="px-5 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-[var(--border)] dark:border-gray-800">
                            <p className="text-[11px] text-amber-700 dark:text-amber-400">If you turn off your online status, you won&apos;t be able to see when others are online either.</p>
                        </div>
                    )}

                    {/* Show Age Toggle */}
                    <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-[var(--border)] dark:border-gray-800">
                        <div className="flex items-center gap-4">
                            <Eye size={20} className="text-[var(--secondary)]" />
                            <div>
                                <span className="font-medium block dark:text-white">Show Age on your Profile</span>
                                <span className="text-xs text-[var(--secondary)]">Show or hide your age on your profile card</span>
                            </div>
                        </div>
                        <button
                            onClick={() => togglePrivacy("showAge")}
                            className={clsx("w-12 h-7 rounded-full transition-colors relative", privacySettings.showAge ? "bg-[var(--success)]" : "bg-gray-300")}
                        >
                            <div className={clsx("w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm", privacySettings.showAge ? "left-6" : "left-1")} />
                        </button>
                    </div>

                    {/* Profile Picture Privacy */}
                    <div
                        onClick={() => setShowPfpModal(true)}
                        className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-[var(--border)] dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <Camera size={20} className="text-[var(--secondary)]" />
                            <div>
                                <span className="font-medium block dark:text-white">Profile Photo</span>
                                <span className="text-xs text-[var(--secondary)]">Who can see your profile picture</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-[var(--primary)] font-semibold">{pfpLabels[pfpValue]}</span>
                            <ChevronRight size={18} className="text-[var(--secondary)]" />
                        </div>
                    </div>

                    {/* Feeds Privacy */}
                    <div
                        onClick={() => setShowFeedsModal(true)}
                        className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-[var(--border)] dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <Sparkles size={20} className="text-[var(--secondary)]" />
                            <div>
                                <span className="font-medium block dark:text-white">Menus (Toppings, Clips, Glimpses)</span>
                                <span className="text-xs text-[var(--secondary)]">Who can see your toppings, clips, and glimpses</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-[var(--primary)] font-semibold">{feedsLabels[feedsValue]}</span>
                            <ChevronRight size={18} className="text-[var(--secondary)]" />
                        </div>
                    </div>

                    {/* Dating Details Privacy */}
                    <div
                        onClick={() => setShowDatingModal(true)}
                        className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-[var(--border)] dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <Sparkles size={20} className="text-[var(--secondary)]" />
                            <div>
                                <span className="font-medium block dark:text-white">Dating Details on Profile</span>
                                <span className="text-xs text-[var(--secondary)]">Who can see your onboarding answers on your profile</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-[var(--primary)] font-semibold">{datingLabels[datingValue]}</span>
                            <ChevronRight size={18} className="text-[var(--secondary)]" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-4 md:px-5 py-4">
                        <div className="flex items-center gap-4">
                            <CheckCircle size={20} className="text-[var(--secondary)]" />
                            <div>
                                <span className="font-medium block dark:text-white">Read Receipts</span>
                                <span className="text-xs text-[var(--secondary)]">Show when you&apos;ve read messages</span>
                            </div>
                        </div>
                        <button
                            onClick={() => togglePrivacy("readReceipts")}
                            className={clsx("w-12 h-7 rounded-full transition-colors relative", privacySettings.readReceipts ? "bg-[var(--success)]" : "bg-gray-300")}
                        >
                            <div className={clsx("w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm", privacySettings.readReceipts ? "left-6" : "left-1")} />
                        </button>
                    </div>
                    <div className="flex items-center justify-between px-4 md:px-5 py-4 border-t border-[var(--border)] dark:border-gray-800">
                        <div className="flex items-center gap-4">
                            <Users size={20} className="text-[var(--secondary)]" />
                            <div>
                                <span className="font-medium block dark:text-white">Discoverable by Phone</span>
                                <span className="text-xs text-[var(--secondary)]">Show phone number on profile and allow others to find you by number</span>
                            </div>
                        </div>
                        <button
                            onClick={() => togglePrivacy("discoverableByPhone")}
                            className={clsx("w-12 h-7 rounded-full transition-colors relative", privacySettings.discoverableByPhone ? "bg-[var(--success)]" : "bg-gray-300")}
                        >
                            <div className={clsx("w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm", privacySettings.discoverableByPhone ? "left-6" : "left-1")} />
                        </button>
                    </div>
                    <div className="flex items-center justify-between px-4 md:px-5 py-4 border-t border-[var(--border)] dark:border-gray-800">
                        <div className="flex items-center gap-4">
                            <Sparkles size={20} className="text-[var(--secondary)]" />
                            <div>
                                <span className="font-medium block dark:text-white">Discover Suggestions</span>
                                <span className="text-xs text-[var(--secondary)]">Show &quot;Discover New Singles&quot; suggestions on your chat list</span>
                            </div>
                        </div>
                        <button
                            onClick={() => togglePrivacy("showDiscoverSuggestions")}
                            className={clsx("w-12 h-7 rounded-full transition-colors relative", privacySettings.showDiscoverSuggestions ? "bg-[var(--success)]" : "bg-gray-300")}
                        >
                            <div className={clsx("w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm", privacySettings.showDiscoverSuggestions ? "left-6" : "left-1")} />
                        </button>
                    </div>
                </div>

                <p className="px-1 text-xs font-semibold text-[var(--secondary)] uppercase tracking-wide mt-6">Contacts</p>

                <div className="bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-gray-100 dark:border-zinc-800/85 shadow-sm">
                    <div
                        onClick={() => setShowBlockedModal(true)}
                        className="flex items-center justify-between px-4 md:px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <Ban size={20} className="text-[var(--danger)]" />
                            <span className="font-medium dark:text-white">Blocked Contacts</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-[var(--secondary)]">{blockedUsers.length}</span>
                            <ChevronRight size={18} className="text-[var(--secondary)]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Blocked Contacts Modal */}
            {
                showBlockedModal && (
                    <div className="modal-overlay" onClick={() => setShowBlockedModal(false)}>
                        <div 
                            className="modal-content p-6 max-h-[70vh] overflow-y-auto dark:bg-gray-800" 
                            onClick={e => e.stopPropagation()}
                            style={{
                                transform: blockedDragY > 0 ? `translateY(${blockedDragY}px)` : undefined,
                                transition: isBlockedDragging ? 'none' : 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)'
                            }}
                        >
                            {/* Drag Handle Container with touch events */}
                            <div
                                className="w-full pb-3 md:hidden shrink-0 cursor-row-resize select-none flex justify-center -mt-2 mb-2"
                                onTouchStart={handleBlockedTouchStart}
                                onTouchMove={handleBlockedTouchMove}
                                onTouchEnd={handleBlockedTouchEnd}
                            >
                                <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
                            </div>
                            <h2 className="text-xl font-bold mb-4 dark:text-white">Blocked Contacts</h2>
                            {blockedUsers.length > 0 ? (
                                <div className="space-y-3">
                                    {blockedUsers.map(contact => (
                                        <div key={contact.id} className="flex items-center justify-between py-3 border-b border-[var(--border)] dark:border-zinc-800 last:border-0">
                                            <div className="flex items-center gap-3">
                                                <div className={clsx("w-10 h-10 rounded-full", contact.color || "bg-gray-200")} />
                                                <div>
                                                    <span className="font-medium block dark:text-white">{contact.name}</span>
                                                    <span className="text-xs text-[var(--secondary)]">{contact.bio}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleUnblock(contact.id)}
                                                className="text-[var(--primary)] text-sm font-medium px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-zinc-800 rounded-lg"
                                            >
                                                Unblock
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-[var(--secondary)]">
                                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>No blocked contacts</p>
                                </div>
                            )}
                            <button onClick={() => setShowBlockedModal(false)} className="w-full mt-4 py-3 bg-[var(--card)] dark:bg-gray-700 dark:text-white rounded-xl font-medium">Done</button>
                        </div>
                    </div>
                )
            }
            {/* Profile Photo Privacy Modal */}
            {showPfpModal && (
                <div className="modal-overlay backdrop-blur-sm" onClick={() => setShowPfpModal(false)}>
                    <div 
                        className="modal-content p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-2xl rounded-2xl max-w-sm" 
                        onClick={e => e.stopPropagation()}
                        style={{
                            transform: pfpDragY > 0 ? `translateY(${pfpDragY}px)` : undefined,
                            transition: isPfpDragging ? 'none' : 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)'
                        }}
                    >
                        {/* Drag Handle Container with touch events */}
                        <div
                            className="w-full pb-3 md:hidden shrink-0 cursor-row-resize select-none flex justify-center -mt-2 mb-2"
                            onTouchStart={handlePfpTouchStart}
                            onTouchMove={handlePfpTouchMove}
                            onTouchEnd={handlePfpTouchEnd}
                        >
                            <div className="w-10 h-1.5 bg-gray-300 dark:bg-zinc-700 rounded-full" />
                        </div>
                        <h2 className="text-lg font-bold mb-1 dark:text-white">Profile Photo</h2>
                        <p className="text-xs text-[var(--secondary)] mb-4">Who can see your profile picture?</p>
                        <div className="space-y-1.5">
                            {([
                                { value: "everyone", label: "Everyone", desc: "Anyone on Yogheart can see your photo" },
                                { value: "contacts", label: "My Contacts", desc: "Only people in your contacts" },
                                { value: "nobody", label: "Nobody", desc: "Your photo will be hidden from all" }
                            ] as const).map(opt => (
                                <div
                                    key={opt.value}
                                    onClick={() => setPfpPrivacy(opt.value)}
                                    className={clsx(
                                        "flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all",
                                        pfpValue === opt.value
                                            ? "bg-[var(--primary)] text-white shadow-md shadow-blue-500/20"
                                            : "hover:bg-gray-100 dark:hover:bg-zinc-800"
                                    )}
                                >
                                    <div>
                                        <span className={clsx("font-semibold block text-sm", pfpValue !== opt.value && "dark:text-white")}>{opt.label}</span>
                                        <span className={clsx("text-[11px]", pfpValue === opt.value ? "text-white/70" : "text-[var(--secondary)]")}>{opt.desc}</span>
                                    </div>
                                    {pfpValue === opt.value && <Check size={18} />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Feeds Privacy Modal */}
            {showFeedsModal && (
                <div className="modal-overlay backdrop-blur-sm" onClick={() => setShowFeedsModal(false)}>
                    <div 
                        className="modal-content p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-2xl rounded-2xl max-w-sm" 
                        onClick={e => e.stopPropagation()}
                        style={{
                            transform: feedsDragY > 0 ? `translateY(${feedsDragY}px)` : undefined,
                            transition: isFeedsDragging ? 'none' : 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)'
                        }}
                    >
                        {/* Drag Handle Container with touch events */}
                        <div
                            className="w-full pb-3 md:hidden shrink-0 cursor-row-resize select-none flex justify-center -mt-2 mb-2"
                            onTouchStart={handleFeedsTouchStart}
                            onTouchMove={handleFeedsTouchMove}
                            onTouchEnd={handleFeedsTouchEnd}
                        >
                            <div className="w-10 h-1.5 bg-gray-300 dark:bg-zinc-700 rounded-full" />
                        </div>
                        <h2 className="text-lg font-bold mb-1 dark:text-white">Menus Privacy</h2>
                        <p className="text-xs text-[var(--secondary)] mb-4">Who can see your toppings, clips, and glimpses?</p>
                        <div className="space-y-1.5">
                            {([
                                { value: "everyone", label: "Everyone", desc: "Anyone on Yogheart can see your menus" },
                                { value: "contacts", label: "My Contacts", desc: "Only people in your contacts" },
                                { value: "nobody", label: "Nobody", desc: "Your menus will be hidden from all" }
                            ] as const).map(opt => (
                                <div
                                    key={opt.value}
                                    onClick={() => setFeedsPrivacy(opt.value)}
                                    className={clsx(
                                        "flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all",
                                        feedsValue === opt.value
                                            ? "bg-[var(--primary)] text-white shadow-md shadow-blue-500/20"
                                            : "hover:bg-gray-100 dark:hover:bg-zinc-800"
                                    )}
                                >
                                    <div>
                                        <span className={clsx("font-semibold block text-sm", feedsValue !== opt.value && "dark:text-white")}>{opt.label}</span>
                                        <span className={clsx("text-[11px]", feedsValue === opt.value ? "text-white/70" : "text-[var(--secondary)]")}>{opt.desc}</span>
                                    </div>
                                    {feedsValue === opt.value && <Check size={18} />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Dating Details Privacy Modal */}
            {showDatingModal && (
                <div className="modal-overlay backdrop-blur-sm" onClick={() => setShowDatingModal(false)}>
                    <div 
                        className="modal-content p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-2xl rounded-2xl max-w-sm" 
                        onClick={e => e.stopPropagation()}
                        style={{
                            transform: datingDragY > 0 ? `translateY(${datingDragY}px)` : undefined,
                            transition: isDatingDragging ? 'none' : 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)'
                        }}
                    >
                        {/* Drag Handle Container with touch events */}
                        <div
                            className="w-full pb-3 md:hidden shrink-0 cursor-row-resize select-none flex justify-center -mt-2 mb-2"
                            onTouchStart={handleDatingTouchStart}
                            onTouchMove={handleDatingTouchMove}
                            onTouchEnd={handleDatingTouchEnd}
                        >
                            <div className="w-10 h-1.5 bg-gray-300 dark:bg-zinc-700 rounded-full" />
                        </div>
                        <h2 className="text-lg font-bold mb-1 dark:text-white">Dating Details Privacy</h2>
                        <p className="text-xs text-[var(--secondary)] mb-4">Who can see your onboarding answers on your profile?</p>
                        <div className="space-y-1.5">
                            {([
                                { value: "everyone", label: "Everyone", desc: "Anyone on Yogheart can see your dating answers" },
                                { value: "contacts", label: "My Contacts", desc: "Only people in your contacts" },
                                { value: "nobody", label: "Nobody", desc: "Your dating answers will be hidden from all" }
                            ] as const).map(opt => (
                                <div
                                    key={opt.value}
                                    onClick={() => setDatingPrivacy(opt.value)}
                                    className={clsx(
                                        "flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all",
                                        datingValue === opt.value
                                            ? "bg-[var(--primary)] text-white shadow-md shadow-blue-500/20"
                                            : "hover:bg-gray-100 dark:hover:bg-zinc-800"
                                    )}
                                >
                                    <div>
                                        <span className={clsx("font-semibold block text-sm", datingValue !== opt.value && "dark:text-white")}>{opt.label}</span>
                                        <span className={clsx("text-[11px]", datingValue === opt.value ? "text-white/70" : "text-[var(--secondary)]")}>{opt.desc}</span>
                                    </div>
                                    {datingValue === opt.value && <Check size={18} />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
