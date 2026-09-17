"use client";

import { MockDataProvider, useMockData } from "@/context/MockContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CallProvider } from "@/context/CallContext";
import CallOverlay from "@/components/CallOverlay";
import { BottomNav, Sidebar } from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import { useEffect, Suspense, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

import { CheckCircle2, AlertTriangle } from "lucide-react";

function NotificationBanner() {
    const { notifications } = useMockData();
    const notification = notifications[notifications.length - 1]; // Show most recent

    if (!notification) return null;

    const isWarning = notification.includes("Maximum") || notification.includes("limit") || notification.includes("only") || notification.includes("failed") || notification.includes("Failed") || notification.includes("error");

    return (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-none w-max max-w-[90vw]">
            <div className={`px-4 py-2.5 rounded-full shadow-2xl font-medium text-[13px] flex items-center gap-2.5 justify-center text-white border backdrop-blur-xl ${
                isWarning 
                    ? 'bg-rose-900/95 dark:bg-rose-950/95 border-rose-700/50 text-rose-100 shadow-rose-900/30' 
                    : 'bg-zinc-900/95 dark:bg-zinc-800/95 border-zinc-700/60 text-zinc-100 shadow-black/40'
            }`}>
                {isWarning ? (
                    <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                ) : (
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                )}
                <span className="truncate">{notification}</span>
            </div>
        </div>
    );
}

function AuthRedirectWrapper({ children }: { children: React.ReactNode }) {
    const { user, userData, isUserDataLoaded, loading, logout } = useAuth();
    const { isProfileLoaded } = useMockData();
    const router = useRouter();
    const pathname = usePathname();

    const [activePathname, setActivePathname] = useState<string | null>(null);
    const [delayedShowLoader, setDelayedShowLoader] = useState(false);
    const [renderLoader, setRenderLoader] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActivePathname(pathname);
    }, [pathname]);

    const isRouteTransitioning = activePathname !== pathname;

    const normalizedPath = (pathname || "/").replace(/\/+$/, "") || "/";
    const isPublicDocumentPage = normalizedPath === "/privacy" || normalizedPath === "/terms";
    const isAuthPage = normalizedPath === "/login" || normalizedPath === "/signup" || isPublicDocumentPage;
    const isOnboardingPage = normalizedPath === "/onboarding" || normalizedPath.startsWith("/onboarding");
    const isAuthOrOnboarding = isOnboardingPage || isAuthPage;
    const isBypassAppShell = isAuthOrOnboarding || normalizedPath.startsWith("/admin") || (normalizedPath === "/" && (!user || loading));

    // Check local storage override to prevent race conditions during onboarding finish
    const localOnboardingComplete = typeof window !== "undefined" && localStorage.getItem("mesh_onboarding_complete") === "true";

    const onboardingComplete = !!userData?.onboardingComplete || !!userData?.isAdmin || localOnboardingComplete;

    // Determine if redirect is required
    const isHomePage = normalizedPath === "/";
    const needsRedirectToOnboarding = !!user && isUserDataLoaded && !onboardingComplete && !isOnboardingPage && !normalizedPath.startsWith("/admin");
    // We only redirect away from auth pages if user is fully onboarded. 
    // Now, "/" serves BOTH login and home, so we don't redirect if it's "/" and user is onboarded.
    const needsRedirectToHome = !!user && onboardingComplete && (isOnboardingPage || normalizedPath === "/login" || normalizedPath === "/signup");
    
    // Logged out users trying to access protected routes (not auth pages and not /)
    const needsRedirectToLogin = !user && !isAuthPage && !isHomePage;

    const isRedirecting = needsRedirectToLogin || needsRedirectToOnboarding || needsRedirectToHome;

    useEffect(() => {
        if (loading || (user && !isUserDataLoaded)) return;

        if (needsRedirectToLogin) {
            console.log("AuthRedirectWrapper: not logged in. Redirecting to /login...");
            router.push("/login");
        } else if (needsRedirectToOnboarding) {
            console.log("AuthRedirectWrapper: user logged in but not onboarded. Redirecting to /onboarding...");
            router.push("/onboarding");
        } else if (needsRedirectToHome) {
            console.log("AuthRedirectWrapper: onboarded user visited auth/onboarding. Redirecting to /...");
            router.push("/");
        }
    }, [loading, isUserDataLoaded, user, needsRedirectToLogin, needsRedirectToOnboarding, needsRedirectToHome, router]);

    // We only hide the loader on the onboarding page to allow its internal steps to render without flashing,
    // unless we are still loading the user state or redirecting away from it.
    const hasPersistedSession = typeof window !== "undefined" && (
        !!localStorage.getItem("mesh_session_token") || 
        localStorage.getItem("mesh_onboarding_complete") === "true" ||
        Object.keys(localStorage).some(k => k.startsWith("firebase:authUser"))
    );

    // On auth, onboarding, or home page, NEVER mount the full-screen loader overlay
    const showLoader = isBypassAppShell || isHomePage 
        ? false 
        : (isRouteTransitioning || isRedirecting);

    useEffect(() => {
        if (showLoader) {
            const timer = setTimeout(() => {
                setDelayedShowLoader(true);
            }, 150);
            return () => clearTimeout(timer);
        } else {
            setDelayedShowLoader(false);
        }
    }, [showLoader]);

    useEffect(() => {
        if (delayedShowLoader) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setRenderLoader(true);
            setIsExiting(false);
        } else if (renderLoader) {
            setIsExiting(true);
            const timer = setTimeout(() => {
                setRenderLoader(false);
                setIsExiting(false);
            }, 80);
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [delayedShowLoader, renderLoader]);

    // Determine what content to render underneath the loader
    const isBanned = userData?.moderationState === "SUSPENDED" || userData?.moderationState === "PERMANENTLY_BANNED";

    if (user && isBanned) {
        return (
            <div className="fixed inset-0 z-[9999] bg-zinc-950 flex items-center justify-center p-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 max-w-md w-full text-center shadow-2xl flex flex-col items-center">
                    <div className="w-16 h-16 bg-red-950/50 border border-red-800/40 rounded-2xl flex items-center justify-center mb-6 text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield-alert"><path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Account Restricted</h2>
                    <p className="text-sm text-red-400 mt-2 font-semibold">
                        {userData.moderationState === "PERMANENTLY_BANNED" ? "Permanently Banned" : "Temporarily Suspended"}
                    </p>
                    <div className="bg-zinc-950 rounded-2xl p-4 mt-6 text-left w-full border border-zinc-850">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Reason provided</p>
                        <p className="text-sm text-zinc-300 mt-1 leading-relaxed italic">
                            &ldquo;{userData.moderationReason || "Violations of community standards & Terms of Service."}&rdquo;
                        </p>
                        {userData.moderatedAt && (
                            <p className="text-[10px] text-zinc-500 mt-3 font-mono">
                                Date: {new Date(userData.moderatedAt).toLocaleString()}
                            </p>
                        )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-6 leading-relaxed">
                        If you believe this was an error, please contact our support desk with your User ID: <span className="font-mono bg-zinc-955 px-1 py-0.5 rounded text-zinc-400 select-all">{user.uid}</span>.
                    </p>
                    <div className="flex flex-col gap-3 mt-8 w-full">
                        <a 
                            href="mailto:support@mesh.internal" 
                            className="py-3.5 px-4 bg-zinc-800 hover:bg-zinc-750 text-white font-bold text-sm rounded-xl transition-all shadow-md text-center"
                        >
                            Appeal via Email
                        </a>
                        <button
                            onClick={() => logout()}
                            className="py-3.5 px-4 bg-transparent hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 font-semibold text-sm rounded-xl transition-all"
                        >
                            Log Out
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    let content = null;
    const hideContentDuringRedirect = isRedirecting && !isBypassAppShell;
    
    if (!hideContentDuringRedirect) {
        if (isBypassAppShell) {
            content = (
                <>
                    <CallOverlay />
                    {children}
                </>
            );
        } else {
            content = (
                <div className={`app-desktop-wrapper ${isExiting ? "ios-entrance" : ""}`}>
                    <div className="app-container">
                        <Suspense fallback={<div className="sidebar" />}>
                            <Sidebar />
                        </Suspense>
                        <main className="main-content">
                            <CallOverlay />
                            <PageTransition>
                                {children}
                            </PageTransition>
                        </main>
                    </div>
                    <Suspense fallback={null}>
                        <BottomNav />
                    </Suspense>
                </div>
            );
        }
    }

    return (
        <>
            {content}
            {renderLoader && (
                <div className={`fixed inset-0 z-[9999] flex items-center justify-center loader-overlay ${isExiting ? "exiting" : ""}`}>
                    <style>{`
                        @keyframes premium-spin {
                            0% {
                                transform: rotate(0deg) scale(1);
                            }
                            50% {
                                transform: rotate(180deg) scale(1.08);
                            }
                            100% {
                                transform: rotate(360deg) scale(1);
                            }
                        }
                        .animate-premium-spin {
                            animation: premium-spin 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                            transform-origin: center;
                        }
                        @keyframes loaderExit {
                            from {
                                opacity: 1;
                                transform: scale(1);
                            }
                            to {
                                opacity: 0;
                                transform: scale(1.08);
                            }
                        }
                        @keyframes iosScaleUp {
                            from {
                                opacity: 0;
                                transform: scale(0.96);
                            }
                            to {
                                opacity: 1;
                                transform: scale(1);
                            }
                        }
                        .ios-entrance {
                            animation: iosScaleUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                        }
                        .loader-overlay {
                            background-color: var(--background, #e4ebd9);
                        }
                        .dark .loader-overlay {
                            background-color: var(--background, #0b141a);
                        }
                        .loader-overlay.exiting {
                            animation: loaderExit 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                            pointer-events: none;
                        }
                    `}</style>
                    <div className="flex flex-col items-center justify-center">
                        <svg 
                            width="38" 
                            height="38" 
                            viewBox="0 0 100 100" 
                            className="animate-premium-spin"
                        >
                            <polygon 
                                points="50,25 73.8,42.3 64.7,70.2 35.3,70.2 26.2,42.3" 
                                fill="#0b57d0" 
                                stroke="#0b57d0"
                                strokeWidth="8" 
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                </div>
            )}
        </>
    );
}

function FontSizeWrapper({ children }: { children: React.ReactNode }) {
    const { currentUser } = useMockData();
    const fontSize = currentUser?.settings?.fontSize || "medium";

    useEffect(() => {
        if (typeof document === "undefined") return;
        document.documentElement.classList.remove("text-sz-small", "text-sz-medium", "text-sz-large");
        document.documentElement.classList.add(`text-sz-${fontSize}`);
    }, [fontSize]);

    // Force Safari iOS to trigger :active state immediately and eliminate tap delays
    useEffect(() => {
        if (typeof document === "undefined") return;

        const handleTouchStart = () => {};
        document.addEventListener("touchstart", handleTouchStart, { passive: true });

        return () => {
            document.removeEventListener("touchstart", handleTouchStart);
        };
    }, []);

    return <>{children}</>;
}

function AppIconWrapper({ children }: { children: React.ReactNode }) {
    const { currentUser } = useMockData();
    const appIcon = currentUser?.settings?.appIcon || "default";

    useEffect(() => {
        if (typeof document === "undefined") return;
        
        const iconPaths: Record<string, string> = {
            default: "/favicon-v3.png",
            green: "/app-icons/icon-green.png",
            blue: "/app-icons/icon-blue.png",
            neon: "/app-icons/icon-neon.png",
            violet: "/app-icons/icon-violet.png",
            gold: "/app-icons/icon-gold.png",
            glow: "/app-icons/icon-glow.png",
            glitter: "/app-icons/icon-glitter.png",
            black: "/app-icons/icon-black.png",
        };

        const applePaths: Record<string, string> = {
            default: "/apple-touch-icon-v3.png",
            green: "/app-icons/apple-green.png",
            blue: "/app-icons/apple-blue.png",
            neon: "/app-icons/apple-neon.png",
            violet: "/app-icons/apple-violet.png",
            gold: "/app-icons/apple-gold.png",
            glow: "/app-icons/apple-glow.png",
            glitter: "/app-icons/apple-glitter.png",
            black: "/app-icons/apple-black.png",
        };

        const manifestPaths: Record<string, string> = {
            default: "/manifest.json",
            green: "/manifest-green.json",
            blue: "/manifest-blue.json",
            neon: "/manifest-neon.json",
            violet: "/manifest-violet.json",
            gold: "/manifest-gold.json",
            glow: "/manifest-glow.json",
            glitter: "/manifest-glitter.json",
            black: "/manifest-black.json",
        };

        const selectedPath = iconPaths[appIcon] || "/favicon-v3.png";
        const selectedApplePath = applePaths[appIcon] || "/apple-touch-icon-v3.png";
        const selectedManifestPath = manifestPaths[appIcon] || "/manifest.json";

        // Find or create link[rel="icon"]
        let favIconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
        if (!favIconLink) {
            favIconLink = document.createElement("link");
            favIconLink.rel = "icon";
            document.head.appendChild(favIconLink);
        }
        favIconLink.href = selectedPath;

        const shortcutIconLink = document.querySelector("link[rel='shortcut icon']") as HTMLLinkElement | null;
        if (shortcutIconLink) {
            shortcutIconLink.href = selectedPath;
        }

        // Find or create link[rel="apple-touch-icon"]
        let appleIconLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement | null;
        if (!appleIconLink) {
            appleIconLink = document.createElement("link");
            appleIconLink.rel = "apple-touch-icon";
            document.head.appendChild(appleIconLink);
        }
        appleIconLink.href = selectedApplePath;

        // Find or create link[rel="manifest"]
        let manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement | null;
        if (manifestLink) {
            manifestLink.href = selectedManifestPath;
        } else {
            manifestLink = document.createElement("link");
            manifestLink.rel = "manifest";
            manifestLink.href = selectedManifestPath;
            document.head.appendChild(manifestLink);
        }
    }, [appIcon]);

    return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <MockDataProvider>
                <CallProvider>
                    <AuthRedirectWrapper>
                        <FontSizeWrapper>
                            <AppIconWrapper>
                                <NotificationBanner />
                                <PWAInstallBanner />
                                {children}
                            </AppIconWrapper>
                        </FontSizeWrapper>
                    </AuthRedirectWrapper>
                </CallProvider>
            </MockDataProvider>
        </AuthProvider>
    );
}
