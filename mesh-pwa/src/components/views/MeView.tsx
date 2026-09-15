"use client";

import { useMockData } from "@/context/MockContext";
import { useAuth } from "@/context/AuthContext";
import { ChevronRight, Moon, LogOut, Key, Lock, Bell, Database, HelpCircle, Smartphone, AlertTriangle, Sparkles, Flame, ArrowLeft, ShieldAlert, Laptop, Loader2, Camera, Keyboard, Store } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import jsQR from "jsqr";
import { useModalHistory } from "@/hooks/useModalHistory";

// Lazy-load settings subpage components
const AccountPage = lazy(() => import("@/app/me/account/page"));
const PrivacyPage = lazy(() => import("@/app/me/privacy/page"));
const ChatsSettingsPage = lazy(() => import("@/app/me/chats/page"));
const BoostingPage = lazy(() => import("@/app/me/boosting/page"));
const NotificationsPage = lazy(() => import("@/app/me/notifications/page"));
const StoragePage = lazy(() => import("@/app/me/storage/page"));
const HelpPage = lazy(() => import("@/app/me/help/page"));
const MarketplaceSettingsPage = lazy(() => import("@/app/me/marketplace/page"));
const AdminPage = lazy(() => import("@/app/admin/page"));

type SettingsSubpage = "marketplace" | "account" | "privacy" | "chats" | "boosting" | "notifications" | "storage" | "help" | "admin" | null;

const SUBPAGE_COMPONENTS: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
    marketplace: MarketplaceSettingsPage,
    account: AccountPage,
    privacy: PrivacyPage,
    chats: ChatsSettingsPage,
    boosting: BoostingPage,
    notifications: NotificationsPage,
    storage: StoragePage,
    help: HelpPage,
    admin: AdminPage,
};

// Map href to subpage key
const HREF_TO_SUBPAGE: Record<string, SettingsSubpage> = {
    "/me/marketplace": "marketplace",
    "/me/account": "account",
    "/me/privacy": "privacy",
    "/me/chats": "chats",
    "/me/boosting": "boosting",
    "/me/notifications": "notifications",
    "/me/storage": "storage",
    "/me/help": "help",
    "/admin": "admin",
};

export default function MeView({ isOverlay = false, onCloseOverlay }: { isOverlay?: boolean; onCloseOverlay?: () => void } = {}) {
    const { currentUser, updateSettings, isProfileLoaded, setActiveTab } = useMockData();
    const { logout, user } = useAuth();
    const router = useRouter();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showLinkDevice, setShowLinkDevice] = useState(false);
    const [enteredCode, setEnteredCode] = useState("");
    const [linkError, setLinkError] = useState("");
    const [linkSuccess, setLinkSuccess] = useState(false);
    const [linkLoading, setLinkLoading] = useState(false);
    const [scanMode, setScanMode] = useState<"camera" | "code">("camera");

    // Settings subpage overlay state
    const [activeSubpage, setActiveSubpage] = useState<SettingsSubpage>(null);
    const [lastActiveSubpage, setLastActiveSubpage] = useState<SettingsSubpage>(null);
    const [isSubpageStable, setIsSubpageStable] = useState(false);

    // Track subpage transitions
    useEffect(() => {
        if (activeSubpage && activeSubpage !== lastActiveSubpage) {
            setLastActiveSubpage(activeSubpage);
            setIsSubpageStable(false);
        } else if (!activeSubpage && lastActiveSubpage) {
            setIsSubpageStable(false);
        }
    }, [activeSubpage, lastActiveSubpage]);

    // Listen for subpage back events (dispatched by subpage back buttons)
    useEffect(() => {
        const handleSubpageBack = () => {
            setActiveSubpage(null);
        };
        window.addEventListener("settings-subpage-back", handleSubpageBack);
        return () => window.removeEventListener("settings-subpage-back", handleSubpageBack);
    }, []);

    // Sync subpage with browser history for native swipe-from-edge / back button
    useModalHistory(
        "settingsSubpage",
        !!activeSubpage,
        () => setActiveSubpage(null)
    );

    useModalHistory(
        "linkDevice",
        showLinkDevice,
        () => setShowLinkDevice(false)
    );

    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        let activeStream: MediaStream | null = null;
        let animationFrameId: number | null = null;

        const scan = () => {
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                const video = videoRef.current;
                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "dontInvert",
                    });
                    if (code) {
                        handleScannedUrl(code.data);
                        return;
                    }
                }
            }
            if (showLinkDevice && scanMode === "camera" && !linkSuccess) {
                animationFrameId = requestAnimationFrame(scan);
            }
        };

        const handleScannedUrl = async (url: string) => {
            setLinkLoading(true);
            setLinkError("");
            try {
                let sessionId = "";
                if (url.includes("linkSession=")) {
                    const urlObj = new URL(url);
                    sessionId = urlObj.searchParams.get("linkSession") || "";
                } else {
                    sessionId = url;
                }

                if (!sessionId) {
                    throw new Error("Invalid QR code.");
                }

                const idToken = await user?.getIdToken();
                const functionUrl = `https://us-central1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-6639048179-3b66d'}.cloudfunctions.net/generateQRLoginToken`;
                const res = await fetch(functionUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ sessionId })
                });
                const resData = await res.json();
                if (res.ok && resData.success) {
                    setLinkSuccess(true);
                } else {
                    throw new Error(resData.error || "Failed to link device.");
                }
            } catch (err: any) {
                console.error("Linking error from QR:", err);
                setLinkError(err.message || "An error occurred. Please try scanning again.");
                setTimeout(() => {
                    if (showLinkDevice && !linkSuccess && scanMode === "camera") {
                        animationFrameId = requestAnimationFrame(scan);
                    }
                }, 2000);
            } finally {
                setLinkLoading(false);
            }
        };

        const initCamera = async () => {
            try {
                setLinkError("");
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        facingMode: "environment",
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });
                activeStream = mediaStream;
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                    videoRef.current.setAttribute("playsinline", "true");
                    videoRef.current.play();
                    animationFrameId = requestAnimationFrame(scan);
                }
            } catch (err: any) {
                console.error("Camera access error:", err);
                setLinkError("Unable to access camera. Please enter the code manually.");
                setScanMode("code");
            }
        };

        if (showLinkDevice && scanMode === "camera" && !linkSuccess) {
            initCamera();
        }

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [showLinkDevice, scanMode, linkSuccess, user]);

    if (!isProfileLoaded) {
        return (
            <div className="h-full flex items-center justify-center bg-[var(--card)] dark:bg-zinc-950">
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const baseMenuItems = [
        { icon: Store, label: "Marketplace Store Profile", sub: "Branding, culinary / specialty, fulfillment", href: "/me/marketplace" },
        { icon: Key, label: "Account", sub: "Security, change number", href: "/me/account" },
        { icon: Lock, label: "Privacy", sub: "Last seen, read receipts", href: "/me/privacy" },
        { icon: Smartphone, label: "Chats", sub: "Theme, wallpapers", href: "/me/chats" },
        { icon: Flame, label: "Boosting History", sub: "Active boosts, transaction receipts", href: "/me/boosting" },
        { icon: Laptop, label: "Link a Device", sub: "Scan QR or enter linking code", href: "#link-device" },
        { icon: Bell, label: "Notifications", sub: "Message tones, alerts", href: "/me/notifications" },
        { icon: Database, label: "Storage", sub: "Network, data usage", href: "/me/storage" },
        { icon: HelpCircle, label: "Help", sub: "FAQ, contact us", href: "/me/help" },
    ];

    const menuItems = currentUser?.isAdmin
        ? [
            { icon: ShieldAlert, label: "Admin Panel", sub: "Manage users, invites & support", href: "/admin" },
            ...baseMenuItems
          ]
        : baseMenuItems;

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    return (
        <div className="h-full w-full relative overflow-hidden bg-[var(--background)] dark:bg-zinc-950 antialiased subpixel-antialiased">
            {/* Main Settings Scrollable View */}
            <div 
                className={clsx(
                    "h-full w-full overflow-y-auto pb-14 lg:pb-4 custom-scrollbar",
                    lastActiveSubpage && "pointer-events-none select-none"
                )}
            >
                {/* Header */}
                <header className="bg-white dark:bg-zinc-900 px-4 md:px-6 py-3 flex items-center justify-between border-b border-[var(--border)] dark:border-zinc-800 sticky top-0 z-10">
                    <button
                        onClick={() => {
                            if (isOverlay && onCloseOverlay) {
                                onCloseOverlay();
                            } else {
                                setActiveTab("profile");
                                window.history.pushState(null, "", "/profile");
                            }
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors shrink-0 cursor-pointer"
                        title="Back to Profile"
                    >
                        <ArrowLeft size={24} className="text-[var(--primary)]" />
                    </button>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Settings</h1>
                </header>

                <div className="p-4 md:p-4 space-y-3 w-full">
                {/* Settings List */}
                <div className="bg-white dark:bg-zinc-900 border border-[var(--border)] dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
                    {menuItems.map((item, idx) => (
                        <div
                            key={idx}
                            onClick={() => {
                                if (item.href === "#link-device") {
                                    setShowLinkDevice(true);
                                    setLinkError("");
                                    setLinkSuccess(false);
                                    setEnteredCode("");
                                    setScanMode("camera");
                                } else {
                                    const subpage = HREF_TO_SUBPAGE[item.href];
                                    if (subpage) {
                                        setActiveSubpage(subpage);
                                    } else {
                                        router.push(item.href);
                                    }
                                }
                            }}
                            className="flex items-center gap-3 px-4 md:px-4 py-3 md:py-2.5 border-b border-[var(--border)] dark:border-zinc-800 last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40 active:bg-gray-100 dark:active:bg-zinc-850 transition-colors"
                        >
                            <div className="p-2 bg-[var(--card)] dark:bg-zinc-850 rounded-lg shrink-0">
                                <item.icon size={19} className="text-[var(--secondary)]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-[15px] md:text-[14px] text-zinc-900 dark:text-white">{item.label}</h3>
                                <p className="text-[12px] md:text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{item.sub}</p>
                            </div>
                            <ChevronRight size={16} className="text-zinc-400 dark:text-zinc-500 shrink-0" />
                        </div>
                    ))}
                </div>

                {/* Toggles */}
                <div className="bg-white dark:bg-zinc-900 border border-[var(--border)] dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-[var(--border)] dark:divide-zinc-800">
                    <div className="flex items-center justify-between px-4 md:px-4 py-3 md:py-2.5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[var(--card)] dark:bg-zinc-850 rounded-lg"><Moon size={19} className="text-[var(--secondary)]" /></div>
                            <span className="font-medium text-[15px] md:text-[14px] dark:text-white">Dark Mode</span>
                        </div>
                        <button
                            onClick={() => updateSettings('darkMode', !currentUser?.settings?.darkMode)}
                            className={clsx("w-12 h-7 rounded-full transition-colors relative", currentUser?.settings?.darkMode ? "bg-[var(--success)]" : "bg-gray-300 dark:bg-zinc-700")}
                        >
                            <div className={clsx("w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm", currentUser?.settings?.darkMode ? "left-6" : "left-1")} />
                        </button>
                    </div>


                </div>

                {/* Logout */}
                <div className="bg-white dark:bg-zinc-900 border border-[var(--border)] dark:border-zinc-800 rounded-xl overflow-hidden">
                    <div
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 md:px-4 py-3 md:py-2.5 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    >
                        <div className="p-2 bg-red-100 dark:bg-red-950/40 rounded-lg"><LogOut size={19} className="text-[var(--danger)]" /></div>
                        <span className="font-medium text-[15px] md:text-[14px] text-[var(--danger)]">Log Out</span>
                    </div>
                </div>

                <div className="pt-4 pb-2 text-center">
                    <p className="text-xs text-[var(--secondary)]">Yogheart v1.0.0</p>
                </div>
            </div>
            </div>

            {/* Custom Logout Warning Modal */}
            <AnimatePresence>
                {showLogoutConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowLogoutConfirm(false)}
                            className="absolute inset-0 bg-black/65"
                        />

                        {/* Modal Card */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            transition={{ type: "spring", duration: 0.3 }}
                            className="relative bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[32px] p-6 md:p-8 w-full max-w-sm shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] text-center flex flex-col items-center animate-in zoom-in-95 duration-200"
                        >
                            {/* Icon Container */}
                            <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 rounded-[22px] flex items-center justify-center mb-5 text-red-500 shadow-inner">
                                <AlertTriangle size={32} className="stroke-[2.5]" />
                            </div>

                            {/* Typography */}
                            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                                Logging Out?
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed mb-6 px-2">
                                Are you sure you want to log out? You will need to sign in again to access your profile.
                            </p>

                            {/* Actions */}
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setShowLogoutConfirm(false)}
                                    className="flex-1 py-4 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-bold rounded-2xl transition-all text-sm active:scale-[0.98] duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        setShowLogoutConfirm(false);
                                        await logout();
                                    }}
                                    className="flex-1 py-4 bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-500/20 hover:brightness-105 active:scale-[0.98] duration-200 text-sm"
                                >
                                    Log Out
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {showLinkDevice && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !linkLoading && setShowLinkDevice(false)}
                            className="absolute inset-0 bg-black/65"
                        />

                        {/* Modal Card */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            transition={{ type: "spring", duration: 0.3 }}
                            className="relative bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-[32px] p-6 md:p-8 w-full max-w-sm shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] text-center flex flex-col items-center animate-in zoom-in-95 duration-200"
                        >
                            {/* Icon Container */}
                            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/20 rounded-[22px] flex items-center justify-center mb-5 text-blue-500 shadow-inner">
                                <Laptop size={32} className="stroke-[2.5]" />
                            </div>

                            {/* Typography */}
                            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                                Link a Device
                            </h2>
                            
                            {linkSuccess ? (
                                <>
                                    <div className="text-green-500 font-bold mb-4">Device linked successfully!</div>
                                    <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">
                                        Your web client has been signed in.
                                    </p>
                                    <button
                                        onClick={() => setShowLinkDevice(false)}
                                        className="w-full py-4 bg-[var(--primary)] text-white font-bold rounded-2xl transition-all text-sm cursor-pointer"
                                    >
                                        Close
                                    </button>
                                </>
                            ) : (
                                <>
                                    {scanMode === "camera" ? (
                                        <>
                                            <div className="relative w-full aspect-[3/4] max-w-[320px] mx-auto bg-black rounded-3xl overflow-hidden mb-4 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shadow-inner">
                                                <video
                                                    ref={videoRef}
                                                    className="w-full h-full object-cover"
                                                    playsInline
                                                    muted
                                                />
                                                {/* Viewfinder overlay */}
                                                <div className="absolute inset-6 border-2 border-dashed border-white/50 rounded-2xl pointer-events-none flex items-center justify-center">
                                                    <div className="w-full h-0.5 bg-blue-500/80 animate-pulse absolute" style={{ top: '50%' }} />
                                                </div>
                                            </div>

                                            <p className="text-sm text-center text-gray-500 dark:text-zinc-400 leading-relaxed mb-5 px-2">
                                                Point your phone camera at the QR code on your computer screen.
                                            </p>

                                            {linkError && (
                                                <div className="w-full p-3 mb-4 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-xl text-xs text-left font-medium">
                                                    {linkError}
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => setScanMode("code")}
                                                className="text-blue-500 hover:text-blue-600 dark:text-blue-400 font-bold text-sm mb-6 flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                                <Keyboard size={16} /> Enter code manually instead
                                            </button>

                                            <div className="flex w-full">
                                                <button
                                                    onClick={() => setShowLinkDevice(false)}
                                                    className="w-full py-4 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-bold rounded-2xl transition-all text-sm cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed mb-6 px-2">
                                                Enter the 6-character linking code shown on your computer screen:
                                            </p>

                                            <input
                                                type="text"
                                                maxLength={6}
                                                value={enteredCode}
                                                onChange={(e) => setEnteredCode(e.target.value.toUpperCase().trim())}
                                                placeholder="ABCXYZ"
                                                disabled={linkLoading}
                                                className="w-full text-center tracking-[0.2em] font-black text-2xl py-3.5 px-4 mb-4 border-2 border-gray-200 dark:border-zinc-800 dark:bg-zinc-850 dark:text-white rounded-2xl focus:border-[var(--primary)] outline-none transition-colors placeholder:text-gray-300 placeholder:tracking-normal"
                                            />

                                            {linkError && (
                                                <div className="w-full p-3 mb-4 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-xl text-xs text-left font-medium">
                                                    {linkError}
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => setScanMode("camera")}
                                                className="text-blue-500 hover:text-blue-600 dark:text-blue-400 font-bold text-sm mb-6 flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                                <Camera size={16} /> Scan QR Code instead
                                            </button>

                                            {/* Actions */}
                                            <div className="flex gap-3 w-full">
                                                <button
                                                    onClick={() => setShowLinkDevice(false)}
                                                    disabled={linkLoading}
                                                    className="flex-1 py-4 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-bold rounded-2xl transition-all text-sm cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (enteredCode.length !== 6) {
                                                            setLinkError("Please enter a valid 6-character code.");
                                                            return;
                                                        }
                                                        setLinkLoading(true);
                                                        setLinkError("");
                                                        try {
                                                            // 1. Get the sessionId associated with this code
                                                            const codeSnap = await getDoc(doc(db, "qr_codes", enteredCode));
                                                            if (!codeSnap.exists()) {
                                                                throw new Error("Invalid or expired code.");
                                                            }
                                                            const { sessionId } = codeSnap.data();
                                                            
                                                            // 2. Call Cloud Function to link
                                                            const idToken = await user?.getIdToken();
                                                            const functionUrl = `https://us-central1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-6639048179-3b66d'}.cloudfunctions.net/generateQRLoginToken`;
                                                            const res = await fetch(functionUrl, {
                                                                method: "POST",
                                                                headers: {
                                                                    "Content-Type": "application/json",
                                                                    "Authorization": `Bearer ${idToken}`
                                                                },
                                                                body: JSON.stringify({ sessionId })
                                                            });
                                                            const resData = await res.json();
                                                            if (res.ok && resData.success) {
                                                                setLinkSuccess(true);
                                                            } else {
                                                                throw new Error(resData.error || "Failed to link device.");
                                                            }
                                                        } catch (err: any) {
                                                            console.error("Linking error:", err);
                                                            setLinkError(err.message || "An error occurred. Please check your internet and try again.");
                                                        } finally {
                                                            setLinkLoading(false);
                                                        }
                                                    }}
                                                    disabled={linkLoading}
                                                    className="flex-1 py-4 bg-[var(--primary)] text-white font-bold rounded-2xl transition-all shadow-lg hover:brightness-105 active:scale-[0.98] duration-200 text-sm flex items-center justify-center gap-2 cursor-pointer"
                                                >
                                                    {linkLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Link Device"}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Settings Subpage Overlay */}
            {lastActiveSubpage && (() => {
                const SubpageComponent = SUBPAGE_COMPONENTS[lastActiveSubpage];
                return (
                    <div
                        data-settings-subpage="true"
                        className={clsx(
                            "absolute inset-0 z-[60] h-full w-full bg-[var(--background)] dark:bg-zinc-950 flex flex-col overflow-hidden",
                            isSubpageStable
                                ? ""
                                : activeSubpage
                                    ? "animate-slide-in-from-right-edge"
                                    : "animate-slide-out-to-right-edge"
                        )}
                        style={{
                            pointerEvents: activeSubpage ? "auto" : "none"
                        }}
                        onAnimationEnd={(e) => {
                            if (e.target !== e.currentTarget) return;
                            if (activeSubpage) {
                                setIsSubpageStable(true);
                            } else {
                                setLastActiveSubpage(null);
                            }
                        }}
                    >
                        <Suspense fallback={
                            <div className="h-full flex items-center justify-center">
                                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                            </div>
                        }>
                            <SubpageComponent isOverlay={true} onClose={() => setActiveSubpage(null)} />
                        </Suspense>
                    </div>
                );
            })()}
        </div>
    );
}
