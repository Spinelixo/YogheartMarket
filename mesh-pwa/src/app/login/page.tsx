"use client";
import "./login.css";
import { useState, useEffect, useCallback } from "react";
import { signInWithCustomToken, GoogleAuthProvider, signInWithPopup, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const getFriendlyErrorMessage = (err: unknown, fallback: string): string => {
    if (!err) return fallback;
    const code = (err as { code?: string }).code || "";
    switch (code) {
        case "auth/network-request-failed":
            return "Network connection error. Please check your internet connection.";
        case "auth/too-many-requests":
            return "Too many attempts. Access has been temporarily restricted.";
        default: {
            const msg = (err as { message?: string }).message || "";
            const cleaned = msg
                .replace(/Firebase:\s*/gi, "")
                .replace(/Error\s*\(auth\/(.*?)\)\.?/gi, (_: string, p1: string) => {
                    const humanized = p1.replace(/-/g, " ");
                    return humanized.charAt(0).toUpperCase() + humanized.slice(1) + ".";
                })
                .trim();
            if (!cleaned || cleaned.includes("auth/") || cleaned.includes("Firebase")) {
                return fallback;
            }
            return cleaned;
        }
    }
};

export default function LoginPage() {
    const { user } = useAuth();
    const router = useRouter();

    // Two-Phase Auth state: welcome -> qr
    const [phase, setPhase] = useState<"welcome" | "qr">("welcome");
    const [qrSessionId, setQrSessionId] = useState<string | null>(null);
    const [qrCodeVal, setQrCodeVal] = useState<string>("");
    const [linkCodeVal, setLinkCodeVal] = useState<string>("");
    const [linkSessionToProcess, setLinkSessionToProcess] = useState<string | null>(null);
    const [linkingSuccess, setLinkingSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [error, setError] = useState("");

    // Mobile email/password flow states
    const [mobileAuthStep, setMobileAuthStep] = useState<"none" | "credentials">("none");
    const [emailInput, setEmailInput] = useState("");
    const [passwordInput, setPasswordInput] = useState("");
    const [isReturningUser, setIsReturningUser] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);
    const [signUpMode, setSignUpMode] = useState(true); // true = creating account, false = signing in



    const [isSigningOut, setIsSigningOut] = useState(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("mesh_signing_out") === "true";
        }
        return false;
    });

    useEffect(() => {
        if (typeof window !== "undefined" && localStorage.getItem("mesh_signing_out") === "true") {
            localStorage.removeItem("mesh_signing_out");
            auth.signOut().then(() => {
                setIsSigningOut(false);
            }).catch(() => {
                setIsSigningOut(false);
            });
        }
    }, []);

    // Accessibility states
    const [accessibilityOpen, setAccessibilityOpen] = useState(false);
    const [largeFont, setLargeFont] = useState(false);
    const [highContrast, setHighContrast] = useState(false);

    // Three-Dots Menu state
    const [activeModal, setActiveModal] = useState<"help" | "terms" | "privacy" | null>(null);

    const setupSessionAndRedirect = useCallback(async (uid: string, phoneNum: string) => {
        const newSessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        if (typeof window !== "undefined") {
            // Tell AuthContext to ignore session checks while we transition
            localStorage.setItem("mesh_ignore_session_check", "true");
            localStorage.setItem("mesh_session_id", newSessionId);
            localStorage.setItem("mesh_session_token", btoa("phone:" + phoneNum));
        }

        const userDocRef = doc(db, "users", uid);
        const docSnap = await getDoc(userDocRef);

        let isAlreadyOnboarded = false;
        let hasExistingProfileMatched = false;

        if (docSnap.exists()) {
            const updates: any = {
                activeSessionId: newSessionId,
            };
            if (phoneNum) {
                updates.phoneNumber = phoneNum;
            }
            await updateDoc(userDocRef, updates);

            const data = docSnap.data();
            if (data?.onboardingComplete || data?.isAdmin) {
                isAlreadyOnboarded = true;
            }
        } else {
            // Check for existing document in Firestore matching email or phoneNumber
            const currentUser = auth.currentUser;
            if (currentUser) {
                try {
                    // Check by email (try email_lowercase first, then email)
                    if (currentUser.email) {
                        const normalizedEmail = currentUser.email.toLowerCase();
                        let snapEmail = await getDocs(query(collection(db, "users"), where("email_lowercase", "==", normalizedEmail)));
                        if (snapEmail.empty) {
                            snapEmail = await getDocs(query(collection(db, "users"), where("email", "==", currentUser.email)));
                        }
                        if (!snapEmail.empty) {
                            const existingDoc = snapEmail.docs[0];
                            const data = existingDoc.data();
                            const matchedDocRef = doc(db, "users", existingDoc.id);
                            await updateDoc(matchedDocRef, {
                                activeSessionId: newSessionId,
                                email_lowercase: normalizedEmail
                            });
                            // Also mirror to direct uid doc so direct lookup always succeeds
                            try {
                                await setDoc(doc(db, "users", uid), {
                                    ...data,
                                    id: uid,
                                    activeSessionId: newSessionId,
                                    email_lowercase: normalizedEmail
                                }, { merge: true });
                            } catch (_) {}
                            hasExistingProfileMatched = true;
                            if (data.onboardingComplete || data.isAdmin) {
                                isAlreadyOnboarded = true;
                            }
                        }
                    }
                    
                    // Check by phone number (if not already found onboarded)
                    const effectivePhone = phoneNum || currentUser.phoneNumber;
                    if (!isAlreadyOnboarded && effectivePhone) {
                        const qPhone = query(collection(db, "users"), where("phoneNumber", "==", effectivePhone));
                        const snapPhone = await getDocs(qPhone);
                        if (!snapPhone.empty) {
                            const data = snapPhone.docs[0].data();
                            const matchedDocRef = doc(db, "users", data.id);
                            await updateDoc(matchedDocRef, {
                                activeSessionId: newSessionId
                            });
                            try {
                                await setDoc(doc(db, "users", uid), {
                                    ...data,
                                    id: uid,
                                    activeSessionId: newSessionId
                                }, { merge: true });
                            } catch (_) {}
                            hasExistingProfileMatched = true;
                            if (data.onboardingComplete || data.isAdmin) {
                                isAlreadyOnboarded = true;
                            }
                        }
                    }
                } catch (err) {
                    console.error("Login: error querying existing user for unification redirect:", err);
                }
            }
        }

        if (typeof window !== "undefined") {
            localStorage.removeItem("mesh_ignore_session_check");
        }

        if (linkSessionToProcess) {
            setLoading(false);
            return;
        }

        setIsSigningIn(false);
        setLoading(false);

        if (isAlreadyOnboarded) {
            if (typeof window !== "undefined") {
                localStorage.setItem("mesh_onboarding_complete", "true");
            }
            router.replace("/");
        } else {
            if (typeof window !== "undefined") {
                localStorage.removeItem("mesh_onboarding_complete");
            }
            // If the document doesn't exist AND there's no existing account to migrate:
            // create the minimal user doc so they can go to onboarding without waiting for server response.
            if (!docSnap.exists() && !hasExistingProfileMatched) {
                const currentUser = auth.currentUser;
                const userEmail = currentUser?.email || `phone_${phoneNum.replace("+", "")}@yogheart.app`;
                const userName = currentUser?.displayName || "User";
                
                setDoc(doc(db, "users", uid), {
                    id: uid,
                    name: userName,
                    phoneNumber: phoneNum,
                    email: userEmail,
                    email_lowercase: userEmail.toLowerCase(),
                    photoURL: currentUser?.photoURL || null,
                    bio: "Active seller on Yogheart Marketplace.",
                    activeSessionId: newSessionId,
                    settings: {
                        privacy: { discoverableByPhone: true, lastSeen: true, readReceipts: true }
                    },
                    createdAt: new Date().toISOString()
                }).catch(err => console.error("Error creating initial user profile:", err));
            }
            router.replace("/onboarding");
        }
    }, [linkSessionToProcess, router]);



    // Parse query parameter linkSession on mount
    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        const linkSessionParam = params.get("linkSession");
        if (linkSessionParam) {
            setLinkSessionToProcess(linkSessionParam);
        }
    }, []);

    // Listen to the QR session state on Firestore
    useEffect(() => {
        if (!qrSessionId || phase !== "qr") return;

        const unsubscribe = onSnapshot(doc(db, "qr_sessions", qrSessionId), async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.status === "authenticated" && data.customToken) {
                    setLoading(true);
                    try {
                        const userCredential = await signInWithCustomToken(auth, data.customToken);
                        const user = userCredential.user;

                        await setupSessionAndRedirect(user.uid, user.phoneNumber || "");

                        // Cleanup Firestore docs
                        await deleteDoc(doc(db, "qr_sessions", qrSessionId));
                        if (linkCodeVal) {
                            await deleteDoc(doc(db, "qr_codes", linkCodeVal));
                        }
                    } catch (err) {
                        console.error("Sign in with custom token failed:", err);
                        setError("Failed to sign in. Please try again.");
                        setLoading(false);
                    }
                }
            }
        });

        return () => unsubscribe();
    }, [qrSessionId, phase, linkCodeVal, setupSessionAndRedirect]);

    const startQrLogin = async () => {
        setPhase("qr");
        setError("");
        setLoading(true);

        const newSessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        setQrSessionId(newSessionId);

        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let code = "";
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setLinkCodeVal(code);

        const host = typeof window !== "undefined" ? window.location.origin : "https://studio-6639048179-3b66d.web.app";
        const linkUrl = `${host}/login?linkSession=${newSessionId}`;
        setQrCodeVal(linkUrl);

        try {
            await setDoc(doc(db, "qr_sessions", newSessionId), {
                status: "pending",
                createdAt: new Date().toISOString()
            });

            await setDoc(doc(db, "qr_codes", code), {
                sessionId: newSessionId,
                createdAt: new Date().toISOString()
            });
        } catch (err) {
            console.error("Failed to create QR session in Firestore:", err);
            setError("Failed to initialize QR session. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsSigningIn(true);
        setLoading(true);
        setError("");
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            await setupSessionAndRedirect(user.uid, user.phoneNumber || "");
        } catch (err: any) {
            console.error("Google sign in failed:", err);
            setIsSigningIn(false);
            const errMsg = err.message || "";
            if (
                err.code === "auth/web-storage-unsupported" || 
                errMsg.includes("sessionStorage") || 
                errMsg.includes("initial state") ||
                errMsg.includes("storage-partitioned")
            ) {
                setError("Sign-in is restricted here. Please open this app in your main Safari/Chrome browser to sign in, or link your account via QR code.");
            } else if (errMsg === "account-exists") {
                setError("An account with this email already exists. Please sign in using your phone number.");
            } else {
                setError(getFriendlyErrorMessage(err, "Failed to sign in with Google."));
            }
            setLoading(false);
        }
    };

    const handleAnonymousLogin = async () => {
        setIsSigningIn(true);
        setLoading(true);
        setError("");
        try {
            const result = await signInAnonymously(auth);
            const user = result.user;
            await setupSessionAndRedirect(user.uid, "");
        } catch (err: any) {
            console.error("Anonymous sign in failed:", err);
            setIsSigningIn(false);
            setError(getFriendlyErrorMessage(err, "Failed to create an account."));
            setLoading(false);
        }
    };

    // Mobile email/password handlers
    const handleMobileSubmit = async () => {
        const trimmedEmail = emailInput.trim().toLowerCase();
        if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            setError("Please enter a valid email address.");
            return;
        }
        if (passwordInput.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        setIsSigningIn(true);
        setLoading(true);
        setError("");
        try {
            if (signUpMode) {
                // Create new account
                const result = await createUserWithEmailAndPassword(auth, trimmedEmail, passwordInput);
                const newUid = result.user.uid;
                const newSessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
                if (typeof window !== "undefined") {
                    localStorage.setItem("mesh_session_token", newSessionId);
                    localStorage.removeItem("mesh_onboarding_complete");
                }
                const initialUserData = {
                    id: newUid,
                    name: "User",
                    phoneNumber: "",
                    email: trimmedEmail,
                    email_lowercase: trimmedEmail,
                    photoURL: null,
                    bio: "Active seller on Yogheart Marketplace.",
                    activeSessionId: newSessionId,
                    onboardingComplete: false,
                    settings: {
                        privacy: { discoverableByPhone: true, lastSeen: true, readReceipts: true }
                    },
                    createdAt: new Date().toISOString()
                };
                
                // Write user document optimistically in the background without blocking navigation
                setDoc(doc(db, "users", newUid), initialUserData).catch(err => {
                    console.error("Failed to write initial user doc:", err);
                });

                setIsSigningIn(false);
                setLoading(false);
                router.replace("/onboarding");
                return;
            } else {
                // Sign in existing account
                const result = await signInWithEmailAndPassword(auth, trimmedEmail, passwordInput);
                await setupSessionAndRedirect(result.user.uid, result.user.phoneNumber || "");
            }
        } catch (err: any) {
            console.error("Email/password auth failed:", err);
            const code = err?.code || "";
            if (code === "auth/email-already-in-use") {
                // Email is already registered! Automatically attempt sign-in with the provided password!
                try {
                    const signInRes = await signInWithEmailAndPassword(auth, trimmedEmail, passwordInput);
                    await setupSessionAndRedirect(signInRes.user.uid, signInRes.user.phoneNumber || "");
                    return;
                } catch (signInErr: any) {
                    setSignUpMode(false);
                    const signInCode = signInErr?.code || "";
                    if (signInCode === "auth/wrong-password" || signInCode === "auth/invalid-credential") {
                        setError("This email is already registered. Incorrect password entered.");
                    } else {
                        setError("This email already has an account. Please enter your password to sign in.");
                    }
                    setIsSigningIn(false);
                    setLoading(false);
                    return;
                }
            } else if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
                setError("Incorrect password. Please try again.");
            } else if (code === "auth/user-not-found") {
                setSignUpMode(true);
                setError("No account found with this email. Sign up to create one.");
            } else if (code === "auth/too-many-requests") {
                setError("Too many attempts. Please try again later.");
            } else {
                setError(getFriendlyErrorMessage(err, "Authentication failed. Please try again."));
            }
            setIsSigningIn(false);
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        const trimmedEmail = emailInput.trim().toLowerCase();
        if (!trimmedEmail) return;
        setLoading(true);
        setError("");
        try {
            await sendPasswordResetEmail(auth, trimmedEmail);
            setResetEmailSent(true);
        } catch (err) {
            console.error("Password reset failed:", err);
            setError(getFriendlyErrorMessage(err, "Failed to send reset email. Please try again."));
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        if (typeof window !== "undefined") {
            const searchParams = new URLSearchParams(window.location.search);
            const actionParam = searchParams.get("action");
            
            if (actionParam === "qr") {
                startQrLogin();
            }
        }
    }, []);

    if (user && linkSessionToProcess) {
        return (
            <div className="login-page flex items-center justify-center p-6 bg-white dark:bg-zinc-950">
                <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[32px] p-6 border border-gray-150 dark:border-zinc-800 shadow-xl text-center flex flex-col items-center">
                    {linkingSuccess ? (
                        <>
                            <div className="w-16 h-16 bg-green-50 dark:bg-green-950/20 text-green-500 rounded-[22px] flex items-center justify-center mb-5 shadow-inner">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold dark:text-white mb-2">Device Linked!</h2>
                            <p className="text-sm text-[var(--secondary)] mb-6 leading-relaxed">
                                You are now logged in on your other device. You can safely close this browser window.
                            </p>
                            <button
                                onClick={() => {
                                    setLinkSessionToProcess(null);
                                    router.push("/");
                                }}
                                className="w-full py-4 bg-[var(--primary)] text-white font-bold rounded-2xl hover:opacity-90 transition-opacity"
                            >
                                Go to Chats
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/20 text-blue-500 rounded-[22px] flex items-center justify-center mb-5 shadow-inner">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                    <line x1="8" y1="21" x2="16" y2="21"></line>
                                    <line x1="12" y1="17" x2="12" y2="21"></line>
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold dark:text-white mb-2">Link Device?</h2>
                            <p className="text-sm text-[var(--secondary)] mb-6 leading-relaxed">
                                Do you want to sign in on your other device? Never scan QR codes from people you don&apos;t know.
                            </p>
                            
                            {error && (
                                <div className="w-full p-3 mb-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl text-xs text-left font-medium">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => {
                                        setLinkSessionToProcess(null);
                                        router.push("/");
                                    }}
                                    disabled={loading}
                                    className="flex-1 py-4 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-850 dark:text-zinc-300 font-bold rounded-2xl transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        setLoading(true);
                                        setError("");
                                        try {
                                            const idToken = await user.getIdToken();
                                            const functionUrl = `https://us-central1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-6639048179-3b66d'}.cloudfunctions.net/generateQRLoginToken`;
                                            const res = await fetch(functionUrl, {
                                                method: "POST",
                                                headers: {
                                                    "Content-Type": "application/json",
                                                    "Authorization": `Bearer ${idToken}`
                                                },
                                                body: JSON.stringify({ sessionId: linkSessionToProcess })
                                            });
                                            const resData = await res.json();
                                            if (res.ok && resData.success) {
                                                setLinkingSuccess(true);
                                            } else {
                                                throw new Error(resData.error || "Failed to link device.");
                                            }
                                        } catch (err: any) {
                                            console.error("Linking failed:", err);
                                            setError(err.message || "Failed to link device. Please try scanning again.");
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    disabled={loading}
                                    className="flex-1 py-4 bg-[var(--primary)] text-white font-bold rounded-2xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    if ((user && !isSigningOut) || isSigningIn) {
        return (
            <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-[#0b141a]">
                <div className="w-20 h-20 rounded-[22px] overflow-hidden shadow-xl flex items-center justify-center">
                    <img
                        src="/icon-192-v3.png"
                        alt="Yogheart Market"
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="login-page">
            <div className={`app-wrapper ${largeFont ? "large-font" : ""} ${highContrast ? "high-contrast" : ""}`}>
                {/* Header Navigation */}
                <div className="auth-header">
                    {(phase !== "welcome" || mobileAuthStep !== "none") ? (
                        <button onClick={() => {
                            if (mobileAuthStep === "credentials") {
                                setMobileAuthStep("none");
                                setEmailInput("");
                                setPasswordInput("");
                                setError("");
                                setResetEmailSent(false);
                                setShowPassword(false);
                                setSignUpMode(true);
                            } else {
                                setPhase("welcome");
                            }
                        }} className="back-btn" title="Back">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                        </button>
                    ) : (
                        <div style={{ width: 28 }} />
                    )}

                    <div className="menu-dots-container">
                        <button
                            className={`access-icon-btn ${accessibilityOpen ? "active" : ""}`}
                            onClick={() => setAccessibilityOpen(!accessibilityOpen)}
                            title="Menu & Accessibility Settings"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="4" r="2.2" fill="var(--primary)" />
                                <path d="M12 6.5v7.5M6 9h12M9.5 21.5l2.5-7.5 2.5 7.5" />
                            </svg>
                        </button>

                        {/* Combined Menu Panel */}
                        {accessibilityOpen && (
                            <>
                                <div className="menu-backdrop" onClick={() => setAccessibilityOpen(false)} />
                                <div className="accessibility-modal" style={{ top: "44px", right: "0" }}>
                                    <div className="accessibility-title">Accessibility</div>
                                    <label className="accessibility-option">
                                        <span>Large Text</span>
                                        <input
                                            type="checkbox"
                                            checked={largeFont}
                                            onChange={(e) => setLargeFont(e.target.checked)}
                                            className="accessibility-checkbox"
                                        />
                                    </label>
                                    <label className="accessibility-option">
                                        <span>High Contrast</span>
                                        <input
                                            type="checkbox"
                                            checked={highContrast}
                                            onChange={(e) => setHighContrast(e.target.checked)}
                                            className="accessibility-checkbox"
                                        />
                                    </label>

                                    <div style={{ height: "1px", background: "#e9edef", margin: "8px 0" }} />

                                    <div className="accessibility-title">System & Info</div>
                                    <button className="accessibility-link" onClick={() => { setActiveModal("help"); setAccessibilityOpen(false); }}>
                                        Help & Support
                                    </button>
                                    <button className="accessibility-link" onClick={() => { setActiveModal("terms"); setAccessibilityOpen(false); }}>
                                        Terms of Service
                                    </button>
                                    <button className="accessibility-link" onClick={() => { setActiveModal("privacy"); setAccessibilityOpen(false); }}>
                                        Privacy Policy
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Info Text Modals Overlay (Help, Terms, Privacy) */}
                {activeModal && (
                    <div className="info-modal-overlay">
                        <div className="info-modal-content">
                            <h2 className="info-modal-title">
                                {activeModal === "help" && "Help & Support"}
                                {activeModal === "terms" && "Terms of Service"}
                                {activeModal === "privacy" && "Privacy Policy"}
                            </h2>
                            <div className="info-modal-body">
                                {activeModal === "help" && (
                                    <div className="modal-text">
                                        <p><strong>Need help signing in?</strong></p>
                                        <p>Yogheart supports Google Sign-In and anonymous registration on mobile devices, or secure device linking via QR code on desktop devices.</p>
                                        <p>If you encounter issues, please clear your browser cache and try again, or contact support at support@yogheart.app.</p>
                                        
                                        <div className="border-t border-gray-100 dark:border-zinc-800/80 mt-4 pt-4 text-left">
                                            <h3 className="text-sm font-bold dark:text-white mb-3 text-[var(--primary)] flex items-center gap-1.5">
                                                🛍️ Welcome to Yogheart Market
                                            </h3>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
                                                Yogheart Market is your local marketplace and community commerce hub. Browse items, connect directly with local sellers, and share updates from your storefront:
                                            </p>
                                            
                                            <div className="space-y-3 pr-1">
                                                <div className="bg-gray-50/50 dark:bg-zinc-850/50 p-3 rounded-xl border border-gray-100/50 dark:border-zinc-800/50">
                                                    <h4 className="font-bold text-xs text-gray-800 dark:text-zinc-200 mb-1 flex items-center gap-1.5">
                                                        🛍️ Marketplace & Storefronts
                                                    </h4>
                                                    <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                                                        Discover electronics, furniture, clothing, and local items. Tap any listing to inspect details, check seller availability, and browse the seller&apos;s full catalogue.
                                                    </p>
                                                </div>

                                                <div className="bg-gray-50/50 dark:bg-zinc-850/50 p-3 rounded-xl border border-gray-100/50 dark:border-zinc-800/50">
                                                    <h4 className="font-bold text-xs text-gray-800 dark:text-zinc-200 mb-1 flex items-center gap-1.5">
                                                        💬 Real-Time Buyer & Seller Chat
                                                    </h4>
                                                    <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                                                        Chat directly with sellers about availability, pricing, and meetup locations. Listing status banners show Available, Pending, or Sold in real time.
                                                    </p>
                                                </div>

                                                <div className="bg-gray-50/50 dark:bg-zinc-850/50 p-3 rounded-xl border border-gray-100/50 dark:border-zinc-800/50">
                                                    <h4 className="font-bold text-xs text-gray-800 dark:text-zinc-200 mb-1 flex items-center gap-1.5">
                                                        📢 Storefront Statuses & Feeds
                                                    </h4>
                                                    <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                                                        Post 24-hour Status updates for quick flash announcements, or permanent photo posts to showcase new arrivals in your store feed.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {activeModal === "terms" && (
                                    <div className="modal-text">
                                        <p>Welcome to Yogheart. By accessing or using our services, you agree to be bound by these Terms.</p>
                                        <p>We use your information to create your account, deliver our services, and help keep Yogheart safe and secure. In settings, you can access, manage, and delete your account information.</p>
                                        <p><strong>1. Use of Service:</strong> You must be at least 18 years old to use Yogheart. You agree to provide accurate registration information.</p>
                                        <p><strong>2. Account Safety:</strong> You are responsible for maintaining the confidentiality of your session token.</p>
                                        <p><strong>3. Content Policy:</strong> You agree not to send abusive, offensive, or harassing messages to other users.</p>
                                    </div>
                                )}
                                {activeModal === "privacy" && (
                                    <div className="modal-text">
                                        <p>At Yogheart, your privacy is our priority. We design our features with security in mind.</p>
                                        <p><strong>1. Information Collection:</strong> We collect your profile details, online/offline last-seen indicators, and messages to deliver the core chat features.</p>
                                        <p><strong>2. Data Usage:</strong> We use your profile details, online/offline last-seen indicators, and messages to deliver the core chat features.</p>
                                        <p><strong>3. Data Management:</strong> You can access, manage, and delete your profile or settings at any time in the app settings.</p>
                                    </div>
                                )}
                            </div>
                            <button className="info-modal-close-btn" onClick={() => setActiveModal(null)}>
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}

                {/* Welcome Screen Phase */}
                {phase === "welcome" && (
                    <div className="welcome-phase-container">
                        {/* Default welcome view (no email/password sub-step active) */}
                        {mobileAuthStep === "none" && (
                            <>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                                    <div className="illustration-container">
                                        <svg className="illustration-svg" width="160" height="160" style={{ width: 160, height: 160, display: "block" }} viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            {/* Left cream chat bubble + Blue phone receiver */}
                                            <g className="anim-float-left">
                                                <path d="M40 90C40 65 60 45 85 45H115C140 45 160 65 160 90C160 115 140 135 115 135H85C60 135 40 115 40 90Z" fill="#fffbf0" stroke="#1c2d37" strokeWidth="2.5" />
                                                <path d="M40 100L30 115L50 110" stroke="#1c2d37" strokeWidth="2.5" strokeLinejoin="round" fill="#fffbf0" />
                                                <path d="M65 75C65 72 70 70 73 70C76 70 78 72 80 75C81 77 79 80 78 81C82 86 86 90 91 94C92 93 95 91 97 92C100 94 102 96 102 99C102 102 100 107 97 107C88 107 72 91 65 75Z" fill="var(--primary)" stroke="#1c2d37" strokeWidth="2.5" strokeLinejoin="round" />
                                            </g>

                                            {/* Blue globe on top-right */}
                                            <g className="anim-float-globe">
                                                <circle cx="160" cy="80" r="32" fill="#e5f1ff" stroke="#1c2d37" strokeWidth="2.5" />
                                                <path d="M128 80H192" stroke="#1c2d37" strokeWidth="2.5" />
                                                <path d="M160 48V112" stroke="#1c2d37" strokeWidth="2.5" />
                                                <path d="M160 48C172 65 172 95 160 112" stroke="#1c2d37" strokeWidth="2.5" />
                                                <path d="M160 48C148 65 148 95 160 112" stroke="#1c2d37" strokeWidth="2.5" />
                                            </g>

                                            {/* Main light-blue chat bubble in the middle/right */}
                                            <g className="anim-float-right">
                                                <path d="M90 145C90 125 106 109 126 109H184C204 109 220 125 220 145C220 165 204 181 184 181H126C106 181 90 165 90 145Z" fill="#e5f1ff" stroke="#1c2d37" strokeWidth="2.5" />
                                                <path d="M200 181L215 198L205 180" stroke="#1c2d37" strokeWidth="2.5" strokeLinejoin="round" fill="#e5f1ff" />
                                                <line x1="120" y1="135" x2="190" y2="135" stroke="#1c2d37" strokeWidth="2.5" strokeLinecap="round" />
                                                <line x1="120" y1="155" x2="170" y2="155" stroke="#1c2d37" strokeWidth="2.5" strokeLinecap="round" />
                                            </g>

                                            {/* Apple Pink/Red Heart bubble on the left */}
                                            <g className="anim-heartbeat">
                                                <path d="M70 140C62 132 50 132 42 140C34 148 34 160 42 168L70 196L98 168C106 160 106 148 98 140C90 132 78 132 70 140Z" fill="#ff2d55" stroke="#1c2d37" strokeWidth="2.5" strokeLinejoin="round" />
                                            </g>

                                            {/* Lock at the bottom right */}
                                            <g className="anim-lock">
                                                <rect x="120" y="195" width="36" height="28" rx="6" fill="var(--primary)" stroke="#1c2d37" strokeWidth="2.5" />
                                                <path d="M128 195V187C128 182 132 178 138 178C144 178 148 182 148 187V195" stroke="#1c2d37" strokeWidth="2.5" strokeLinecap="round" />
                                                <circle cx="138" cy="207" r="3" fill="#1c2d37" />
                                                <path d="M138 210V216" stroke="#1c2d37" strokeWidth="2" />
                                            </g>
                                        </svg>
                                    </div>

                                    <h1 className="title-welcome" style={{ marginBottom: "16px" }}>Hey Yoghearts,</h1>

                                    <p className="disclaimer-text">
                                        By signing up, you agree to Yogheart&apos;s <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal("privacy"); }}>Privacy Policies</a> and <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal("terms"); }}>Terms of Service</a>.
                                    </p>
                                </div>
                                {error && <div className="err-box" style={{ margin: "0 auto 10px auto", maxWidth: 300 }}>{error}</div>}
                                <div className="action-row" style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 300, margin: "0 auto" }}>
                                    <button onClick={() => { setMobileAuthStep("credentials"); setError(""); }} className="capsule-btn blue mobile-only" style={{ width: "100%", margin: 0 }}>
                                        Agree and Continue
                                    </button>
                                    <button onClick={handleGoogleLogin} className="google-login-btn">
                                        <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                                        </svg>
                                        Get in the Mix
                                    </button>
                                    <button onClick={startQrLogin} className="capsule-btn desktop-only" style={{ width: "100%", margin: 0, backgroundColor: "transparent", color: "var(--primary)", border: "2px solid var(--primary)", fontWeight: "bold", cursor: "pointer", alignItems: "center", justifyContent: "center" }}>
                                        Link with QR code
                                    </button>
                                </div>
                            </>
                        )}
                        {/* Mobile Credentials Entry Step (Combined Email + Password) */}
                        {mobileAuthStep === "credentials" && (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", flex: 1, justifyContent: "center", gap: 20 }}>
                                <div style={{ textAlign: "center" }}>
                                    <div style={{ width: 64, height: 64, borderRadius: 20, background: signUpMode ? "linear-gradient(135deg, var(--primary), #34a853)" : "linear-gradient(135deg, #4285F4, #7B61FF)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            {signUpMode ? (
                                                <>
                                                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                    <circle cx="8.5" cy="7" r="4"></circle>
                                                    <line x1="20" y1="8" x2="20" y2="14"></line>
                                                    <line x1="23" y1="11" x2="17" y2="11"></line>
                                                </>
                                            ) : (
                                                <>
                                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                                </>
                                            )}
                                        </svg>
                                    </div>
                                    <h1 className="title-phone" style={{ marginBottom: 6 }}>
                                        {signUpMode ? "Create Account 🍦" : "Welcome Back 🍦"}
                                    </h1>
                                    <p className="disclaimer-text" style={{ fontSize: 13, lineHeight: 1.5, maxWidth: 280, margin: "0 auto" }}>
                                        {signUpMode ? "Enter your email and create a password to get started." : "Enter your email and password to sign in."}
                                    </p>
                                </div>

                                <div style={{ width: "100%", maxWidth: 300, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
                                    {error && <div className="err-box" style={{ marginBottom: 4 }}>{error}</div>}
                                    {resetEmailSent && (
                                        <div style={{ padding: "10px 14px", marginBottom: 4, background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 12, fontSize: 13, color: "#065f46", fontWeight: 500, textAlign: "center" }}>
                                            ✓ Password reset email sent! Check your inbox.
                                        </div>
                                    )}
                                    <input
                                        type="email"
                                        inputMode="email"
                                        autoComplete="email"
                                        autoFocus
                                        placeholder="Email address"
                                        value={emailInput}
                                        onChange={(e) => setEmailInput(e.target.value)}
                                        className="mobile-auth-input"
                                        disabled={loading}
                                    />
                                    <div style={{ position: "relative" }}>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            autoComplete={signUpMode ? "new-password" : "current-password"}
                                            placeholder={signUpMode ? "Create a password (min. 6 chars)" : "Password"}
                                            value={passwordInput}
                                            onChange={(e) => setPasswordInput(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === "Enter" && !loading) handleMobileSubmit(); }}
                                            className="mobile-auth-input"
                                            style={{ paddingRight: 48 }}
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--secondary)", cursor: "pointer", padding: 4 }}
                                            tabIndex={-1}
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                {showPassword ? (
                                                    <>
                                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path>
                                                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>
                                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                                    </>
                                                ) : (
                                                    <>
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                        <circle cx="12" cy="12" r="3"></circle>
                                                    </>
                                                )}
                                            </svg>
                                        </button>
                                    </div>
                                    <button
                                        onClick={handleMobileSubmit}
                                        disabled={loading || !emailInput.trim() || passwordInput.length < 6}
                                        className="capsule-btn blue"
                                        style={{ width: "100%", margin: "8px 0 0 0", opacity: (!emailInput.trim() || passwordInput.length < 6 || loading) ? 0.5 : 1 }}
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (signUpMode ? "Create Account" : "Sign In")}
                                    </button>
                                    {!signUpMode && !resetEmailSent && (
                                        <button
                                            type="button"
                                            onClick={handleForgotPassword}
                                            disabled={loading}
                                            style={{ display: "block", width: "100%", marginTop: 4, background: "none", border: "none", color: "var(--primary)", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "center" }}
                                        >
                                            Forgot password?
                                        </button>
                                    )}
                                    <div style={{ textAlign: "center", marginTop: 4 }}>
                                        <span style={{ fontSize: 13, color: "var(--secondary)" }}>
                                            {signUpMode ? "Already have an account?" : "Don\u0027t have an account?"}
                                        </span>
                                        {" "}
                                        <button
                                            type="button"
                                            onClick={() => { setSignUpMode(!signUpMode); setError(""); setPasswordInput(""); setResetEmailSent(false); }}
                                            style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0 }}
                                        >
                                            {signUpMode ? "Sign In" : "Sign Up"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* QR Code Screen Phase */}
                {phase === "qr" && (
                    <>
                        <h1 className="title-phone" style={{ marginBottom: 8 }}>Link with QR Code</h1>
                        
                        <p className="disclaimer-text" style={{ padding: "0 16px", marginBottom: 24, fontSize: 13, lineHeight: 1.5 }}>
                            {"Open Yogheart on your phone, go to Settings, select \"Link a Device\" and scan this QR code or enter the code below."}
                        </p>

                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, width: "100%", maxWidth: 300, margin: "0 auto" }}>
                            {loading ? (
                                <div style={{ height: 240, width: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Loader2 className="animate-spin text-blue-500" size={36} />
                                </div>
                            ) : qrCodeVal ? (
                                <div style={{ padding: 12, background: "white", borderRadius: 24, border: "1px solid var(--border)", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeVal)}`}
                                        alt="Link Device QR Code"
                                        style={{ width: 200, height: 200, display: "block" }}
                                    />
                                </div>
                            ) : null}

                            {linkCodeVal && (
                                <div style={{ textAlign: "center", marginTop: 8 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Or enter this code on your phone:</span>
                                    <div style={{ fontSize: 24, fontWeight: 900, color: "#111b21", letterSpacing: 4, marginTop: 8, padding: "8px 24px", background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)", fontFamily: "monospace" }}>
                                        {linkCodeVal.slice(0, 3)} {linkCodeVal.slice(3)}
                                    </div>
                                </div>
                            )}

                            {error && (
                                <p style={{ color: "#ef4444", fontSize: 13, fontWeight: 600, textAlign: "center", margin: 0 }}>
                                    {error}
                                </p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
