"use client";

import { useMockData, isMarketplaceThread } from "@/context/MockContext";
import ChatsView from "./views/ChatsView";
import CallsView from "./views/CallsView";
import MarketplaceView from "./views/MarketplaceView";
import MeView from "./views/MeView";
import ChatThreadView from "./views/ChatThreadView";
import ArchivedChatsView from "./views/ArchivedChatsView";
import { SellerStorefrontModal } from "./marketplace/SellerStorefrontModal";
import { WhatsAppPermissionsModal } from "./permissions/WhatsAppPermissionsModal";
import { clsx } from "clsx";
import { useState, useEffect, useCallback, Suspense, useRef } from "react";


const forceResetViewportScroll = () => {
    if (typeof window === "undefined") return;
    
    // Run immediately
    window.scrollTo(0, 0);
    if (document.documentElement) {
        document.documentElement.scrollLeft = 0;
        document.documentElement.scrollTop = 0;
    }
    document.body.scrollLeft = 0;
    document.body.scrollTop = 0;
    
    // Run once more after a short delay to catch Webkit post-transition frames
    setTimeout(() => {
        window.scrollTo(0, 0);
        if (document.documentElement) {
            document.documentElement.scrollLeft = 0;
            document.documentElement.scrollTop = 0;
        }
        document.body.scrollLeft = 0;
        document.body.scrollTop = 0;
    }, 100);
};
function MainAppShellContent() {
    const isSwipeBackRef = useRef(false);
    const threadClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const { activeTab, setActiveTab, activeThreadId, setActiveThreadId, currentUser, currentSearchParams, threads } = useMockData();
    const [prevThreadId, setPrevThreadId] = useState<string | null>(activeThreadId);
    const [lastActiveThreadId, setLastActiveThreadId] = useState<string | null>(activeThreadId);
    // Animation phase: "entering" = slide-in playing, "stable" = fully visible, "exiting" = slide-out playing, null = hidden
    const [threadAnimPhase, setThreadAnimPhase] = useState<"entering" | "stable" | "exiting" | null>(activeThreadId ? "stable" : null);

    if (activeThreadId !== prevThreadId) {
        setPrevThreadId(activeThreadId);
        if (activeThreadId) {
            // Opening a new thread (or re-opening same one after it was fully closed)
            setLastActiveThreadId(activeThreadId);
            setThreadAnimPhase("entering");
        } else {
            // Thread closed — start exit animation
            setThreadAnimPhase("exiting");
        }
    }

    const userId = currentSearchParams.get("userId");
    const groupId = currentSearchParams.get("groupId");
    const fromParam = currentSearchParams.get("from");
    const activeProfileId = (userId && (userId !== "me" || !!fromParam)) ? userId : (groupId || null);

    const [prevProfileId, setPrevProfileId] = useState<string | null>(activeProfileId);
    const [lastActiveProfileId, setLastActiveProfileId] = useState<string | null>(activeProfileId);
    const [profileAnimPhase, setProfileAnimPhase] = useState<"entering" | "stable" | "exiting" | null>(activeProfileId ? "stable" : null);

    if (activeProfileId !== prevProfileId) {
        setPrevProfileId(activeProfileId);
        if (activeProfileId) {
            setLastActiveProfileId(activeProfileId);
            setProfileAnimPhase("entering");
        } else {
            setProfileAnimPhase("exiting");
        }
    }

    const showSettingsOverlay = typeof window !== "undefined"
        ? (new URLSearchParams(window.location.search).get("settings") === "overlay")
        : (currentSearchParams.get("settings") === "overlay");
    const wasSettingsOpen = typeof window !== "undefined" && sessionStorage.getItem("settings_overlay_open") === "true";
    const [prevSettingsOpen, setPrevSettingsOpen] = useState(showSettingsOverlay);
    const [lastActiveSettingsOpen, setLastActiveSettingsOpen] = useState(showSettingsOverlay);
    const [settingsAnimPhase, setSettingsAnimPhase] = useState<"entering" | "stable" | "exiting" | null>(
        showSettingsOverlay ? (wasSettingsOpen ? "stable" : "entering") : null
    );

    const isArchivedPath = typeof window !== "undefined"
        ? window.location.pathname.startsWith("/archived")
        : false;
    const [prevArchivedOpen, setPrevArchivedOpen] = useState(isArchivedPath);
    const [lastActiveArchivedOpen, setLastActiveArchivedOpen] = useState(isArchivedPath);
    const [isArchivedOverlayStable, setIsArchivedOverlayStable] = useState(isArchivedPath);

    if (isArchivedPath !== prevArchivedOpen) {
        setPrevArchivedOpen(isArchivedPath);
        if (isArchivedPath) {
            setLastActiveArchivedOpen(true);
            setIsArchivedOverlayStable(false);
        } else {
            if (isSwipeBackRef.current) {
                setLastActiveArchivedOpen(false);
                setIsArchivedOverlayStable(true);
            } else {
                setIsArchivedOverlayStable(false);
            }
        }
    }

    const [showPermissionsModal, setShowPermissionsModal] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        // On desktop devices (screens >= 768px), never show the mobile permissions modal
        if (window.innerWidth >= 768) return;

        const hasPrompted = localStorage.getItem("yogheart_permissions_prompted_v7") || sessionStorage.getItem("yogheart_permissions_prompted_v7");
        if (!hasPrompted) {
            const timer = setTimeout(() => {
                setShowPermissionsModal(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    // ── Global PopState/Swipe-back scroll reset listener & iOS Edge Swipe Fixes ──
    useEffect(() => {
        if (typeof window === "undefined") return;

        const handlePopState = () => {
            isSwipeBackRef.current = true;
            const hasModalHash = typeof window !== "undefined" && window.location.hash.startsWith("#modal-");
            const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
            const currentThreadId = urlParams.get("id");
            const currentUserId = urlParams.get("userId") || urlParams.get("groupId");
            const isInboxPath = typeof window !== "undefined" && window.location.pathname.startsWith("/inbox");

            // Gracefully animate overlays out instead of abruptly snapping
            if (!hasModalHash && !currentThreadId && !isInboxPath) {
                if (lastActiveThreadId) {
                    setThreadAnimPhase("exiting");
                    setTimeout(() => {
                        setLastActiveThreadId(null);
                        setThreadAnimPhase(null);
                    }, 460);
                }
            }
            if (!hasModalHash && !currentUserId && !(typeof window !== "undefined" && window.location.pathname.startsWith("/profile"))) {
                if (lastActiveProfileId) {
                    setProfileAnimPhase("exiting");
                    setTimeout(() => {
                        setLastActiveProfileId(null);
                        setProfileAnimPhase(null);
                    }, 460);
                }
            }
            if (!hasModalHash && urlParams.get("settings") !== "overlay") {
                if (lastActiveSettingsOpen) {
                    setSettingsAnimPhase("exiting");
                    setTimeout(() => {
                        setLastActiveSettingsOpen(false);
                        setSettingsAnimPhase(null);
                    }, 460);
                }
            }
            if (!hasModalHash && !(typeof window !== "undefined" && window.location.pathname.startsWith("/archived"))) {
                if (lastActiveArchivedOpen) {
                    setTimeout(() => {
                        setLastActiveArchivedOpen(false);
                    }, 460);
                }
            }

            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            forceResetViewportScroll();
            setTimeout(() => {
                isSwipeBackRef.current = false;
            }, 460);
        };

        const handleScroll = () => {
            // Keep window scrollX and scrollY strictly at 0 on mobile to prevent layout shifting
            if (window.scrollX !== 0 || window.scrollY !== 0) {
                forceResetViewportScroll();
            }
            if (document.documentElement && (document.documentElement.scrollLeft !== 0 || document.documentElement.scrollTop !== 0)) {
                document.documentElement.scrollLeft = 0;
                document.documentElement.scrollTop = 0;
            }
            if (document.body && (document.body.scrollLeft !== 0 || document.body.scrollTop !== 0)) {
                document.body.scrollLeft = 0;
                document.body.scrollTop = 0;
            }
        };

        let touchStartClientX = 0;
        let touchStartClientY = 0;
        let swipeBackTimeout: any;

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                touchStartClientX = e.touches[0].clientX;
                touchStartClientY = e.touches[0].clientY;
                isSwipeBackRef.current = false; // Reset on every touch start
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 0) return;
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            
            const diffX = currentX - touchStartClientX;
            const diffY = currentY - touchStartClientY;

            if (touchStartClientX < 80) {
                // Only qualify as swipe-back if they drag right by more than 15px
                if (diffX > 15) {
                    isSwipeBackRef.current = true;
                }
            }

            const hasActiveOverlay = !!(activeProfileId || activeThreadId || showSettingsOverlay || isArchivedPath);
            if (!hasActiveOverlay) {
                // Block left edge swipe (back) and right edge swipe (forward) on the main app pages
                const isNearLeftEdge = touchStartClientX < 80;
                const isNearRightEdge = touchStartClientX > (window.innerWidth - 80);
                
                if (isNearLeftEdge || isNearRightEdge) {
                    // Only block horizontal swipes to preserve vertical scrolling
                    if (Math.abs(diffX) > Math.abs(diffY)) {
                        if (e.cancelable) {
                            e.preventDefault();
                        }
                    }
                }
            }
        };

        const handleTouchEnd = () => {
            // Keep isSwipeBackRef.current true for 500ms after touch ends to catch the popstate event
            clearTimeout(swipeBackTimeout);
            swipeBackTimeout = setTimeout(() => {
                isSwipeBackRef.current = false;
            }, 500);

            // Reset any scroll offsets immediately after touches end
            setTimeout(forceResetViewportScroll, 30);
        };

        window.addEventListener("popstate", handlePopState);
        window.addEventListener("pageshow", forceResetViewportScroll);
        window.addEventListener("focus", forceResetViewportScroll);
        window.addEventListener("resize", forceResetViewportScroll);
        window.addEventListener("scroll", handleScroll, { passive: true });
        document.addEventListener("scroll", handleScroll, { passive: true });
        window.addEventListener("touchstart", handleTouchStart, { passive: true });
        window.addEventListener("touchmove", handleTouchMove, { passive: false });
        window.addEventListener("touchend", handleTouchEnd, { passive: true });
        window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

        // Force reset scroll when overlays open or close
        forceResetViewportScroll();

        return () => {
            window.removeEventListener("popstate", handlePopState);
            window.removeEventListener("pageshow", forceResetViewportScroll);
            window.removeEventListener("focus", forceResetViewportScroll);
            window.removeEventListener("resize", forceResetViewportScroll);
            window.removeEventListener("scroll", handleScroll);
            document.removeEventListener("scroll", handleScroll);
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleTouchEnd);
            window.removeEventListener("touchcancel", handleTouchEnd);
        };
    }, [activeProfileId, activeThreadId, showSettingsOverlay]);

    // ── Thread overlay state transitions ──
    useEffect(() => {
        if (!activeThreadId) {
            setThreadAnimPhase("exiting");
            const timer = setTimeout(() => {
                setLastActiveThreadId(null);
                setThreadAnimPhase(null);
            }, 460);
            return () => clearTimeout(timer);
        }
        forceResetViewportScroll();
    }, [activeThreadId]);

    // ── Profile overlay state transitions ──
    useEffect(() => {
        if (!activeProfileId) {
            setProfileAnimPhase("exiting");
            const timer = setTimeout(() => {
                setLastActiveProfileId(null);
                setProfileAnimPhase(null);
            }, 460);
            return () => clearTimeout(timer);
        }
    }, [activeProfileId]);

    // ── Settings overlay state transitions ──
    if (showSettingsOverlay !== prevSettingsOpen) {
        setPrevSettingsOpen(showSettingsOverlay);
        if (showSettingsOverlay) {
            // Check if the overlay was already open (returning from a subpage) BEFORE setting the flag
            const wasAlreadyOpen = typeof window !== "undefined" && sessionStorage.getItem("settings_overlay_open") === "true";
            if (typeof window !== "undefined") {
                sessionStorage.setItem("settings_overlay_open", "true");
            }
            setLastActiveSettingsOpen(true);
            setSettingsAnimPhase(wasAlreadyOpen ? "stable" : "entering");
        } else {
            if (typeof window !== "undefined") {
                const path = window.location.pathname;
                if (!path.startsWith("/me/")) {
                    sessionStorage.removeItem("settings_overlay_open");
                }
            }
            setSettingsAnimPhase("exiting");
        }
        forceResetViewportScroll();
    }

    useEffect(() => {
        if (!showSettingsOverlay && lastActiveSettingsOpen) {
            setSettingsAnimPhase("exiting");
            const timer = setTimeout(() => {
                setLastActiveSettingsOpen(false);
                setSettingsAnimPhase(null);
            }, 460);
            return () => clearTimeout(timer);
        }
    }, [showSettingsOverlay, lastActiveSettingsOpen]);

    // ── Visibilitychange handler: fix stuck overlays on wake/unlock/foreground ──
    const handleVisibilityChange = useCallback(() => {
        if (document.visibilityState === "visible") {
            // If user comes back to the app and an overlay should be closed, force-clear it
            // This handles: iOS lock/unlock, Android app switch, browser tab switch
            if (!activeThreadId && lastActiveThreadId) {
                setLastActiveThreadId(null);
            }
            if (!activeProfileId && lastActiveProfileId) {
                setLastActiveProfileId(null);
            }
            if (!showSettingsOverlay && lastActiveSettingsOpen) {
                setLastActiveSettingsOpen(false);
            }
            // Also blur any focused input to dismiss stuck keyboards
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        }
    }, [activeThreadId, lastActiveThreadId, activeProfileId, lastActiveProfileId, showSettingsOverlay, lastActiveSettingsOpen]);

    useEffect(() => {
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [handleVisibilityChange]);

    return (
        <div className="h-full w-full relative overflow-hidden bg-[var(--background)] dark:bg-gray-900 antialiased subpixel-antialiased">
            {/* Chats Tab */}
            <div className={clsx("h-full w-full absolute inset-0", activeTab === "chats" ? "opacity-100 z-10 pointer-events-auto visible" : "opacity-0 z-0 pointer-events-none invisible")}>
                <ChatsView />
            </div>

            {/* Calls Tab */}
            <div className={clsx("h-full w-full absolute inset-0", activeTab === "calls" ? "opacity-100 z-10 pointer-events-auto visible" : "opacity-0 z-0 pointer-events-none invisible")}>
                <CallsView />
            </div>

            {/* Marketplace Tab */}
            <div className={clsx("h-full w-full absolute inset-0", activeTab === "marketplace" ? "opacity-100 z-10 pointer-events-auto visible" : "opacity-0 z-0 pointer-events-none invisible")}>
                <MarketplaceView />
            </div>

            {/* Store / Profile Tab (Menu on Mobile, Store / Profile on Desktop) */}
            <div className={clsx("h-full w-full absolute inset-0", (activeTab === "profile" || activeTab === "store") ? "opacity-100 z-10 pointer-events-auto visible" : "opacity-0 z-0 pointer-events-none invisible")}>
                <SellerStorefrontModal 
                    sellerId="me" 
                    isStandaloneView={true} 
                    onClose={() => {
                        setActiveTab("marketplace");
                        window.history.pushState(null, "", "/marketplace");
                        window.dispatchEvent(new Event("locationchange"));
                    }} 
                />
            </div>

            {/* Settings Tab */}
            <div className={clsx("h-full w-full absolute inset-0", activeTab === "me" ? "opacity-100 z-10 pointer-events-auto visible" : "opacity-0 z-0 pointer-events-none invisible")}>
                <MeView />
            </div>

            {/* Archived Chats View - persistent overlay: slide out on close, slide in on open */}
            {lastActiveArchivedOpen && (
                <div 
                    key="archived-overlay"
                    className={clsx(
                        "absolute inset-0 z-30 h-full w-full bg-[var(--background)] dark:bg-gray-900",
                        isArchivedPath 
                            ? "animate-slide-in-from-right-edge" 
                            : "animate-slide-out-to-right-edge"
                    )}
                    style={{
                        pointerEvents: isArchivedPath ? "auto" : "none",
                        willChange: "transform",
                        backfaceVisibility: "hidden"
                    }}
                >
                    <ArchivedChatsView 
                        onClose={() => {
                            window.history.pushState(null, "", "/");
                        }} 
                    />
                </div>
            )}

            {/* Chat Thread View - persistent overlay: slide out on close, slide in on open */}
            {lastActiveThreadId && threadAnimPhase && (
                <div 
                    key={lastActiveThreadId}
                    className={clsx(
                        "absolute inset-0 z-40 h-full w-full bg-white dark:bg-zinc-950 shadow-[-12px_0_30px_-5px_rgba(0,0,0,0.25)] border-l border-zinc-200/40 dark:border-zinc-800/40 overflow-hidden",
                        threadAnimPhase === "entering" && "animate-slide-in-from-right-edge",
                        threadAnimPhase === "exiting" && "animate-slide-out-to-right-edge"
                    )}
                    style={{
                        pointerEvents: threadAnimPhase === "exiting" ? "none" : "auto",
                        willChange: threadAnimPhase === "stable" ? "auto" : "transform",
                        backfaceVisibility: "hidden",
                        // When stable, pin to final position; entering/exiting are handled by CSS animation
                        transform: threadAnimPhase === "stable" ? "translate3d(0, 0, 0)" : undefined,
                    }}
                    onAnimationEnd={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (threadAnimPhase === "entering") {
                            setThreadAnimPhase("stable");
                        } else if (threadAnimPhase === "exiting") {
                            setLastActiveThreadId(null);
                            setThreadAnimPhase(null);
                        }
                    }}
                >
                    <ChatThreadView 
                        threadId={lastActiveThreadId} 
                        onClose={() => {
                            // Blur any focused input to dismiss keyboard before navigating
                            if (document.activeElement instanceof HTMLElement) {
                                  document.activeElement.blur();
                            }
                            const fromParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("from") : null;
                            const isCurrentlyArchived = typeof window !== "undefined" && (window.location.pathname.startsWith("/archived") || fromParam === "archived");

                            setActiveThreadId(null);
                            if (isCurrentlyArchived) {
                                window.history.pushState(null, "", "/archived");
                            } else {
                                setActiveTab("chats");
                                window.history.pushState(null, "", "/chats");
                            }
                        }} 
                    />
                </div>
            )}

            {/* User Profile View - persistent overlay: slide out on close, slide in on open */}
            {lastActiveProfileId && profileAnimPhase && (
                <div 
                    key={lastActiveProfileId}
                    className={clsx(
                        "absolute inset-0 z-50 h-full w-full bg-white dark:bg-zinc-950",
                        profileAnimPhase === "entering" && "animate-slide-in-from-right-edge",
                        profileAnimPhase === "exiting" && "animate-slide-out-to-right-edge"
                    )}
                    style={{
                        pointerEvents: profileAnimPhase === "exiting" ? "none" : "auto",
                        willChange: profileAnimPhase === "stable" ? "auto" : "transform",
                        backfaceVisibility: "hidden",
                        transform: profileAnimPhase === "stable" ? "translate3d(0, 0, 0)" : undefined,
                    }}
                    onAnimationEnd={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (profileAnimPhase === "entering") {
                            setProfileAnimPhase("stable");
                        } else if (profileAnimPhase === "exiting") {
                            setLastActiveProfileId(null);
                            setProfileAnimPhase(null);
                        }
                    }}
                >
                    <SellerStorefrontModal 
                        sellerId={lastActiveProfileId} 
                        onClose={() => {
                            const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
                            const fromParam = urlParams.get("from");
                            const fromThreadId = urlParams.get("fromThreadId");

                            if (fromThreadId) {
                                setActiveThreadId(fromThreadId);
                                setActiveTab("chats");
                                if (fromParam === "archived") {
                                    window.history.pushState(null, "", `/inbox?id=${fromThreadId}&from=archived`);
                                } else {
                                    window.history.pushState(null, "", `/inbox?id=${fromThreadId}`);
                                }
                            } else if (fromParam === "chats") {
                                setActiveTab("chats");
                                window.history.pushState(null, "", "/chats");
                            } else if (fromParam === "marketplace") {
                                setActiveTab("marketplace");
                                window.history.pushState(null, "", "/marketplace");
                            } else if (fromParam === "calls") {
                                setActiveTab("calls");
                                window.history.pushState(null, "", "/calls");
                            } else if (fromParam === "archived") {
                                setActiveTab("chats");
                                window.history.pushState(null, "", "/archived");
                            } else {
                                setActiveTab("marketplace");
                                window.history.pushState(null, "", "/marketplace");
                            }
                            window.dispatchEvent(new Event("locationchange"));
                        }} 
                    />
                </div>
            )}

            {/* Settings View - persistent overlay: slide out on close, slide in on open */}
            {lastActiveSettingsOpen && (
                <div 
                    key="settings-overlay"
                    className={clsx(
                        "absolute inset-0 z-50 h-full w-full bg-white dark:bg-zinc-950",
                        settingsAnimPhase === "entering" && "animate-slide-in-from-right-edge",
                        settingsAnimPhase === "exiting" && "animate-slide-out-to-right-edge"
                    )}
                    style={{
                        pointerEvents: showSettingsOverlay ? "auto" : "none",
                        willChange: (settingsAnimPhase === "entering" || settingsAnimPhase === "exiting") ? "transform" : "auto",
                        transform: (settingsAnimPhase === "entering" || settingsAnimPhase === "exiting") ? undefined : "none",
                        backfaceVisibility: (settingsAnimPhase === "entering" || settingsAnimPhase === "exiting") ? "hidden" : "visible"
                    }}
                    onAnimationEnd={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (settingsAnimPhase === "entering") {
                            setSettingsAnimPhase("stable");
                        } else if (settingsAnimPhase === "exiting") {
                            setLastActiveSettingsOpen(false);
                            setSettingsAnimPhase(null);
                        }
                    }}
                >
                    <MeView 
                        isOverlay={true} 
                        onCloseOverlay={() => {
                            window.history.pushState(null, "", "/profile?userId=me");
                        }} 
                    />
                </div>
            )}

            {/* WhatsApp-Style Onboarding Permissions Request Modal (Web, PWA & Android APK) */}
            {showPermissionsModal && (
                <WhatsAppPermissionsModal
                    onClose={() => setShowPermissionsModal(false)}
                />
            )}
        </div>
    );
}

export default function MainAppShell() {
    return (
        <Suspense fallback={null}>
            <MainAppShellContent />
        </Suspense>
    );
}
