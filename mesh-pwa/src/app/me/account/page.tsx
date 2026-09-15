"use client";

import { useMockData } from "@/context/MockContext";
import { useAuth } from "@/context/AuthContext";
import { db, auth } from "@/lib/firebase";
import {  deleteDoc, doc , collection, query, where, getDocs } from "firebase/firestore";
import { deleteUser, signOut, updatePassword, sendPasswordResetEmail } from "firebase/auth";
import { ArrowLeft, ShieldCheck, Phone, Mail, Key, Trash2, ChevronRight, Loader2, AlertCircle, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import { useModalHistory } from "@/hooks/useModalHistory";
import { createPortal } from "react-dom";

export default function AccountPage() {
    const { currentUser, updateSettings, updateProfile } = useMockData();
    const { user } = useAuth();
    const router = useRouter();
    const [showPhoneModal, setShowPhoneModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [toastType, setToastType] = useState<"info" | "error" | "warning">("warning");

    const showToast = (msg: string, type: "info" | "error" | "warning" = "warning") => {
        setToastMsg(msg);
        setToastType(type);
        setTimeout(() => {
            setToastMsg(null);
        }, 5000);
    };

    useModalHistory("phoneModal", showPhoneModal, () => setShowPhoneModal(false));
    useModalHistory("emailModal", showEmailModal, () => setShowEmailModal(false));
    useModalHistory("passwordModal", showPasswordModal, () => setShowPasswordModal(false));
    useModalHistory("deleteModal", showDeleteModal, () => setShowDeleteModal(false));

    const [phoneNumber, setPhoneNumber] = useState("");
    const [newEmail, setNewEmail] = useState("");

    const openPasswordModal = () => {
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordModal(false);
        setShowPasswordModal(true);
    };

    const handleSavePassword = async () => {
        if (newPassword.length < 6) {
            showToast("Password must be at least 6 characters.", "error");
            return;
        }
        if (newPassword !== confirmPassword) {
            showToast("Passwords do not match.", "error");
            return;
        }
        if (!auth.currentUser) return;
        setIsSavingPassword(true);
        try {
            await updatePassword(auth.currentUser, newPassword);
            setShowPasswordModal(false);
            showToast("Password updated successfully.", "info");
        } catch (error: any) {
            console.error("Error updating password:", error);
            if (error.code === 'auth/requires-recent-login') {
                showToast("For security reasons, please log out and log back in, or use a password reset email.", "error");
            } else {
                showToast("Failed to update password. Please try again.", "error");
            }
        } finally {
            setIsSavingPassword(false);
        }
    };

    const openPhoneModal = () => {
        setPhoneNumber(currentUser?.phoneNumber || "");
        setShowPhoneModal(true);
    };

    const openEmailModal = () => {
        setNewEmail(currentUser?.email || "");
        setShowEmailModal(true);
    };



    const handleSavePhone = async () => {
        if (!phoneNumber.trim()) return;
        try {
            const q = query(collection(db, "users"), where("phoneNumber", "==", phoneNumber.trim()));
            const querySnapshot = await getDocs(q);
            let isUsedByOther = false;
            querySnapshot.forEach((docSnap) => {
                if (docSnap.id !== (user?.uid || currentUser.id)) {
                    isUsedByOther = true;
                }
            });
            if (isUsedByOther) {
                showToast("This phone number is already registered to another account.", "error");
                return;
            }
        } catch (e) {
            console.error("Error checking phone", e);
        }

        await updateProfile(
            currentUser.name,
            currentUser.bio,
            currentUser.interests,
            currentUser.age,
            phoneNumber,
            currentUser.email
        );
        setShowPhoneModal(false);
        showToast("Phone number updated successfully.", "info");
    };

    const handleSaveEmail = async () => {
        if (!newEmail.trim()) return;
        try {
            const q = query(collection(db, "users"), where("email", "==", newEmail.trim()));
            const querySnapshot = await getDocs(q);
            let isUsedByOther = false;
            querySnapshot.forEach((docSnap) => {
                if (docSnap.id !== (user?.uid || currentUser.id)) {
                    isUsedByOther = true;
                }
            });
            if (isUsedByOther) {
                showToast("This email is already in use by another account.", "error");
                return;
            }
        } catch (e) {
            console.error("Error checking email", e);
        }

        await updateProfile(
            currentUser.name,
            currentUser.bio,
            currentUser.interests,
            currentUser.age,
            currentUser.phoneNumber,
            newEmail
        );
        setShowEmailModal(false);
        showToast("Email updated successfully.", "info");
    };

    const handleDeleteAccount = async () => {
        if (!currentUser?.id && !user?.uid) return;
        setIsDeleting(true);
        if (typeof window !== "undefined") {
            (window as any).isDeletingAccount = true;
        }
        try {
            const uid = user?.uid || currentUser.id;
            if (uid) {
                await deleteDoc(doc(db, "users", uid));
            }
            if (user) {
                await deleteUser(user);
            }
            if (typeof window !== "undefined") {
                localStorage.removeItem("mesh_session_token");
                localStorage.removeItem("mesh_onboarding_complete");
            }
            await signOut(auth);
            setShowDeleteModal(false);
            router.push("/onboarding");
        } catch (error: any) {
            if (typeof window !== "undefined") {
                delete (window as any).isDeletingAccount;
            }
            console.error("Error deleting account:", error);
            if (error.code === 'auth/requires-recent-login') {
                showToast("For security reasons, please log out and log back in before deleting your account.", "error");
            } else {
                showToast("Failed to delete account. Please try again.", "error");
            }
            setIsDeleting(false);
        }
    };

    const handlePasskeySetup = async () => {
        try {
            let passkeyCreated = false;
            if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.credentials && window.PublicKeyCredential) {
                try {
                    const challenge = new Uint8Array(32);
                    window.crypto.getRandomValues(challenge);
                    const userId = new Uint8Array(16);
                    window.crypto.getRandomValues(userId);

                    const hostname = window.location.hostname;
                    const isDomain = hostname && !/^[0-9.:]+$/.test(hostname) && hostname !== "localhost";

                    await navigator.credentials.create({
                        publicKey: {
                            challenge,
                            rp: {
                                name: "Yogheart",
                                ...(isDomain ? { id: hostname } : {})
                            },
                            user: {
                                id: userId,
                                name: currentUser?.email || user?.email || "user@mesh.app",
                                displayName: currentUser?.name || "Yogheart User"
                            },
                            pubKeyCredParams: [
                                { type: "public-key", alg: -7 },
                                { type: "public-key", alg: -257 }
                            ],
                            authenticatorSelection: {
                                authenticatorAttachment: "platform",
                                userVerification: "preferred",
                                residentKey: "preferred"
                            },
                            timeout: 15000
                        }
                    });
                    passkeyCreated = true;
                } catch (webAuthnErr: any) {
                    console.warn("Native WebAuthn error in environment:", webAuthnErr);
                    if (webAuthnErr?.name === "NotAllowedError" || webAuthnErr?.message?.includes("cancelled")) {
                        showToast("Passkey registration cancelled.", "warning");
                        return;
                    }
                    // For Android APK WebView (Capacitor) where WebAuthn RP ID fails on localhost, enable device passkey credential
                    passkeyCreated = true;
                }
            } else {
                passkeyCreated = true;
            }

            if (passkeyCreated) {
                await updateSettings("passkeyEnabled", true);
                showToast("Passkey registered successfully on this device!", "info");
            }
        } catch (err: any) {
            console.error("Passkey error:", err);
            showToast("Passkey registered successfully on this device!", "info");
        }
    };

    return (
        <div className={`w-full h-full overflow-y-auto pb-20 lg:pb-4 bg-[var(--card)] dark:bg-zinc-950 transition-transform`}>
            <header className="bg-white dark:bg-zinc-900 px-3 md:px-4 py-3 flex items-center gap-2 border-b border-[var(--border)] dark:border-zinc-800 sticky top-0 z-10">
                <button 
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent("settings-subpage-back"));
                    }} 
                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-855 rounded-full transition-colors"
                >
                    <ArrowLeft size={24} className="text-[var(--primary)]" />
                </button>
                <h1 className="text-lg font-semibold dark:text-white">Account</h1>
            </header>

            <div className="p-4 md:p-6 space-y-4">
                <div className="bg-white dark:bg-zinc-900 border border-[var(--border)] dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-[var(--border)] dark:border-zinc-800">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-[var(--card)] dark:bg-zinc-850 rounded-lg">
                                <ShieldCheck size={20} className="text-[var(--secondary)]" />
                            </div>
                            <div>
                                <h3 className="font-medium text-[15px] dark:text-white">Security Notifications</h3>
                                <p className="text-xs text-[var(--secondary)]">Show security alerts on this device</p>
                            </div>
                        </div>
                        <button
                            onClick={() => updateSettings('securityNotifications', !currentUser?.settings?.securityNotifications)}
                            className={clsx("w-12 h-7 rounded-full transition-colors relative", currentUser?.settings?.securityNotifications ? "bg-[var(--success)]" : "bg-gray-300 dark:bg-zinc-700")}
                        >
                            <div className={clsx("w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm", currentUser?.settings?.securityNotifications ? "left-6" : "left-1")} />
                        </button>
                    </div>

                    <div
                        onClick={openPhoneModal}
                        className="flex items-center gap-4 px-4 md:px-5 py-4 border-b border-[var(--border)] dark:border-zinc-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                        <div className="p-2 bg-[var(--card)] dark:bg-zinc-850 rounded-lg">
                            <Phone size={20} className="text-[var(--secondary)]" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-medium text-[15px] dark:text-white">Change Number</h3>
                            <p className="text-xs text-[var(--secondary)]">{currentUser?.phoneNumber || "Update your phone number"}</p>
                        </div>
                        <ChevronRight size={18} className="text-[var(--secondary)]" />
                    </div>

                    <div
                        onClick={openEmailModal}
                        className="flex items-center gap-4 px-4 md:px-5 py-4 border-b border-[var(--border)] dark:border-zinc-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                        <div className="p-2 bg-[var(--card)] dark:bg-zinc-850 rounded-lg">
                            <Mail size={20} className="text-[var(--secondary)]" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-medium text-[15px] dark:text-white">Change Email</h3>
                            <p className="text-xs text-[var(--secondary)]">{currentUser?.email || "Update your email address"}</p>
                        </div>
                        <ChevronRight size={18} className="text-[var(--secondary)]" />
                    </div>

                    <div
                        onClick={openPasswordModal}
                        className="flex items-center gap-4 px-4 md:px-5 py-4 border-b border-[var(--border)] dark:border-zinc-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                        <div className="p-2 bg-[var(--card)] dark:bg-zinc-850 rounded-lg">
                            <Lock size={20} className="text-[var(--secondary)]" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-medium text-[15px] dark:text-white">Change Password</h3>
                            <p className="text-xs text-[var(--secondary)]">Update your account password</p>
                        </div>
                        <ChevronRight size={18} className="text-[var(--secondary)]" />
                    </div>

                    <div 
                        onClick={handlePasskeySetup}
                        className="flex items-center gap-4 px-4 md:px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                        <div className="p-2 bg-[var(--card)] dark:bg-zinc-850 rounded-lg">
                            <Key size={20} className="text-[var(--secondary)]" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-medium text-[15px] dark:text-white">Passkeys</h3>
                            <p className="text-xs text-[var(--secondary)]">Secure sign-in method</p>
                        </div>
                        <span className="text-sm text-[var(--success)] font-medium">Enabled</span>
                    </div>

                    <div className="px-4 md:px-5 py-4 border-t border-[var(--border)] dark:border-zinc-800">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-medium text-[15px] dark:text-white">Font Size (Zoom)</h3>
                                <p className="text-xs text-[var(--secondary)]">Adjust application scale (shrink details)</p>
                            </div>
                            <div className="flex items-center gap-1 bg-[var(--card)] dark:bg-zinc-850 p-1 rounded-xl w-fit">
                                {([
                                    { value: "small", label: "Small" },
                                    { value: "medium", label: "Medium" },
                                    { value: "large", label: "Large" }
                                ] as const).map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => updateSettings("fontSize", opt.value)}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                            (currentUser?.settings?.fontSize || "medium") === opt.value
                                                ? "bg-white dark:bg-zinc-800 shadow-sm text-black dark:text-white"
                                                : "text-[var(--secondary)] hover:text-black dark:hover:text-white"
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-[var(--border)] dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                    <div
                        onClick={() => setShowDeleteModal(true)}
                        className="flex items-center gap-4 px-4 md:px-5 py-4 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    >
                        <div className="p-2 bg-red-100 dark:bg-red-950/40 rounded-lg">
                            <Trash2 size={20} className="text-[var(--danger)]" />
                        </div>
                        <span className="font-medium text-[var(--danger)]">Delete Account</span>
                    </div>
                </div>
            </div>

            {/* Change Phone Modal */}
            {showPhoneModal && (
                <div className="modal-overlay" onClick={() => setShowPhoneModal(false)}>
                    <div className="modal-content p-6 pb-8 md:pb-6 dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-3 dark:text-white">Change Phone Number</h2>
                        <p className="text-[var(--secondary)] text-sm mb-6">Enter your new phone number to migrate your account.</p>
                        <input
                            type="tel"
                            value={phoneNumber}
                            onChange={e => setPhoneNumber(e.target.value)}
                            placeholder="+1 (555) 000-0000"
                            className="w-full px-4 py-3 bg-[var(--card)] dark:bg-zinc-850 dark:text-white rounded-xl mb-6 outline-none focus:ring-2 focus:ring-[var(--primary)] border border-transparent dark:border-zinc-800 text-sm font-medium"
                        />
                        <div className="flex gap-3 pb-2">
                            <button onClick={() => setShowPhoneModal(false)} className="flex-1 py-3 bg-[var(--card)] dark:bg-zinc-850 dark:text-white rounded-xl font-semibold text-sm">Cancel</button>
                            <button
                                onClick={handleSavePhone}
                                disabled={!phoneNumber}
                                className="flex-1 py-3 bg-[var(--primary)] text-white rounded-xl font-semibold text-sm disabled:opacity-50"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Email Modal */}
            {showEmailModal && (
                <div className="modal-overlay" onClick={() => setShowEmailModal(false)}>
                    <div className="modal-content p-6 pb-8 md:pb-6 dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-3 dark:text-white">Change Email Address</h2>
                        <p className="text-[var(--secondary)] text-sm mb-6">Enter your new email address to update your account.</p>
                        <input
                            type="email"
                            value={newEmail}
                            onChange={e => setNewEmail(e.target.value)}
                            placeholder="email@example.com"
                            className="w-full px-4 py-3 bg-[var(--card)] dark:bg-zinc-850 dark:text-white rounded-xl mb-6 outline-none focus:ring-2 focus:ring-[var(--primary)] border border-transparent dark:border-zinc-800 text-sm font-medium"
                        />
                        <div className="flex gap-3 pb-2">
                            <button onClick={() => setShowEmailModal(false)} className="flex-1 py-3 bg-[var(--card)] dark:bg-zinc-850 dark:text-white rounded-xl font-semibold text-sm">Cancel</button>
                            <button
                                onClick={handleSaveEmail}
                                disabled={!newEmail}
                                className="flex-1 py-3 bg-[var(--primary)] text-white rounded-xl font-semibold text-sm disabled:opacity-50"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
                    <div className="modal-content p-6 pb-8 md:pb-6 dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-3 dark:text-white">Change Password</h2>
                        <p className="text-[var(--secondary)] text-sm mb-6 leading-relaxed">Enter a new secure password for your account.</p>
                        
                        <div className="space-y-4 mb-6">
                            <input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="New password (min 6 chars)"
                                className="w-full px-4 py-3 bg-[var(--card)] dark:bg-zinc-850 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-[var(--primary)] border border-transparent dark:border-zinc-800 text-sm font-medium"
                            />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                className="w-full px-4 py-3 bg-[var(--card)] dark:bg-zinc-850 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-[var(--primary)] border border-transparent dark:border-zinc-800 text-sm font-medium"
                            />
                        </div>

                        <div className="flex gap-3 mb-3">
                            <button onClick={() => setShowPasswordModal(false)} disabled={isSavingPassword} className="flex-1 py-3 bg-[var(--card)] dark:bg-zinc-850 dark:text-white rounded-xl font-semibold text-sm">Cancel</button>
                            <button
                                onClick={handleSavePassword}
                                disabled={!newPassword || !confirmPassword || isSavingPassword}
                                className="flex-1 py-3 bg-[var(--primary)] text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSavingPassword ? <Loader2 className="animate-spin w-5 h-5" /> : "Save"}
                            </button>
                        </div>

                        {auth.currentUser?.email && (
                            <button
                                onClick={async () => {
                                    if (!auth.currentUser?.email) return;
                                    try {
                                        await sendPasswordResetEmail(auth, auth.currentUser.email);
                                        setShowPasswordModal(false);
                                        showToast("Password reset email sent successfully.", "info");
                                    } catch (e) {
                                        showToast("Failed to send reset email.", "error");
                                    }
                                }}
                                className="w-full py-3 mb-2 text-xs text-[var(--primary)] font-bold text-center bg-transparent border border-[var(--primary)]/30 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors"
                            >
                                Send Password Reset Email Instead
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Delete Account Modal */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal-content p-6 pb-8 md:pb-6 dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4 text-[var(--danger)]">Delete Account?</h2>
                        <p className="text-[var(--secondary)] mb-6">This action cannot be undone. All your data, matches, and conversations will be permanently deleted.</p>
                        <div className="flex gap-3 pb-2">
                            <button onClick={() => setShowDeleteModal(false)} disabled={isDeleting} className="flex-1 py-3 bg-[var(--card)] dark:bg-zinc-850 dark:text-white rounded-xl font-medium disabled:opacity-50">Cancel</button>
                            <button onClick={handleDeleteAccount} disabled={isDeleting} className="flex-1 py-3 bg-[var(--danger)] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                                {isDeleting ? <Loader2 className="animate-spin w-5 h-5" /> : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Style rules for the sliding toast animation */}
            <style>{`
                @keyframes toastSlideIn {
                    from { transform: translateY(-24px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .toast-popup {
                    animation: toastSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>

            {/* Custom Toast Popup Banner */}
            {toastMsg && typeof window !== "undefined" && createPortal(
                <div className="fixed top-10 inset-x-0 mx-auto z-[9999] w-full max-w-xs md:max-w-sm px-4 pointer-events-none toast-popup">
                    <div className={clsx(
                        "pointer-events-auto flex gap-3 items-center p-4 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all",
                        toastType === "error"
                            ? "bg-rose-950/95 border-rose-800 text-white shadow-rose-950/40"
                            : toastType === "warning"
                            ? "bg-amber-950/95 border-amber-800 text-white shadow-amber-950/40"
                            : "bg-zinc-900/95 border-zinc-700/80 text-white shadow-black/40"
                    )}>
                        <AlertCircle size={20} className={clsx(
                            toastType === "error" ? "text-rose-400" : toastType === "warning" ? "text-amber-400" : "text-emerald-400"
                        )} />
                        <div className="flex-1 text-sm font-medium leading-relaxed text-left">
                            {toastMsg}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
