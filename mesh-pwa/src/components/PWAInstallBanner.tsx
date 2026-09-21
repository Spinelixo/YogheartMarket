"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";

export default function PWAInstallBanner() {
    const [showIOSBanner, setShowIOSBanner] = useState(false);
    const pathname = usePathname();

    const isWelcomePage = pathname === "/" || pathname?.startsWith("/onboarding") || pathname?.startsWith("/login") || pathname?.startsWith("/signup");

    const isIOS = () => {
        if (typeof window === "undefined") return false;
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    };

    const isStandalone = () => {
        if (typeof window === "undefined") return false;
        return (
            (window.navigator as any).standalone || 
            window.matchMedia("(display-mode: standalone)").matches
        );
    };

    useEffect(() => {
        if (typeof window === "undefined") return;

        // If the app is currently launched in standalone mode (installed PWA),
        // save the dismissal flag so the user is never prompted in the Safari browser.
        if (isStandalone()) {
            localStorage.setItem("pwa_install_dismissed", "true");
            return;
        }

        // 1. iOS Safari Helper Display (with 0.5-second delay for instant entrance)
        if (isIOS() && !isStandalone() && localStorage.getItem("pwa_install_dismissed") !== "true") {
            const timer = setTimeout(() => {
                setShowIOSBanner(true);
            }, 500);
            return () => {
                clearTimeout(timer);
            };
        }
    }, []);

    // 2. Auto-dismiss banner after 10 seconds of active display
    useEffect(() => {
        if (showIOSBanner) {
            const timer = setTimeout(() => {
                setShowIOSBanner(false);
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [showIOSBanner]);

    const handleDismiss = () => {
        localStorage.setItem("pwa_install_dismissed", "true");
        setShowIOSBanner(false);
    };

    // Render nothing if not applicable
    if (!showIOSBanner) return null;

    return (
        <div className="pwa-banner-container bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-gray-200 dark:border-zinc-800/80 rounded-3xl p-4 sm:p-5 shadow-2xl">
            <style>{`
                .pwa-banner-container {
                    position: fixed;
                    bottom: ${isWelcomePage ? "calc(env(safe-area-inset-bottom, 16px) + 20px)" : "80px"};
                    left: 16px;
                    right: 16px;
                    z-index: 99;
                    animation: pwaSlideUpMobile 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    box-sizing: border-box;
                }

                @media (min-width: 768px) {
                    .pwa-banner-container {
                        bottom: 24px;
                        left: 50%;
                        right: auto;
                        width: 384px;
                        animation: pwaSlideUpDesktop 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    }
                }

                @keyframes pwaSlideUpMobile {
                    from {
                        transform: translateY(30px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }

                @keyframes pwaSlideUpDesktop {
                    from {
                        transform: translate(-50%, 30px);
                        opacity: 0;
                    }
                    to {
                        transform: translate(-50%, 0);
                        opacity: 1;
                    }
                }
            `}</style>
            
            <div className="flex items-start gap-3.5">
                {/* App Icon wrapper */}
                <img 
                    src="/apple-touch-icon-v3.png" 
                    alt="Isoko" 
                    className="w-12 h-12 rounded-2xl object-cover shrink-0 shadow-md"
                />
                
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-black dark:text-white mb-1">Install Isoko</h4>
                    <p className="text-xs text-[var(--secondary)] dark:text-zinc-400 leading-relaxed font-normal">
                        Tap the Share button{" "}
                        <span className="inline-flex align-middle p-1.5 bg-gray-100 dark:bg-zinc-800 rounded-lg mx-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                <polyline points="16 6 12 2 8 6" />
                                <line x1="12" y1="2" x2="12" y2="15" />
                            </svg>
                        </span>{" "}
                        in Safari / Chrome, scroll down, and select{" "}
                        <strong className="text-black dark:text-white">"Add to Home Screen"</strong>{" "}
                        <span className="inline-flex align-middle p-1.5 bg-gray-100 dark:bg-zinc-800 rounded-lg mx-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-black dark:text-white">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </span>.
                    </p>
                </div>
                
                <button 
                    onClick={handleDismiss}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
}
