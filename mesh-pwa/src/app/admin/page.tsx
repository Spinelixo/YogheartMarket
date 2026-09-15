"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
    collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc,
    query, where, orderBy, getDocs, writeBatch, arrayUnion, arrayRemove
} from "firebase/firestore";
import {
    Users, MessageSquare, Search, Trash2, UserCheck, Copy,
    Check, ArrowLeft, RefreshCw, Send, Smartphone, Mail, AlertTriangle,
    Ban, CheckCheck, Headphones, LifeBuoy, X, ShieldAlert, Sparkles, Reply
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import ProfileView from "@/components/views/ProfileView";
import { useModalHistory } from "@/hooks/useModalHistory";


type AdminUser = {
    id: string;
    name: string;
    email?: string;
    phoneNumber?: string;
    age?: number;
    gender?: string;
    createdAt?: string;
    isAdmin?: boolean;
    isBoosted?: boolean;
    avatar?: string | null;
    moderationState?: "ACTIVE" | "SUSPENDED" | "PERMANENTLY_BANNED";
};



type SupportThread = {
    id: string;
    user: {
        id: string;
        name: string;
        avatar?: string | null;
        color?: string;
    };
    lastMessage: string;
    lastTime: string;
    updatedAt: string;
    unread: boolean;
};

type SupportMessage = {
    id: string;
    sender: "me" | "them";
    text: string;
    time: string;
    createdAt: string;
};

export default function AdminPage({ isOverlay = false, onClose }: { isOverlay?: boolean; onClose?: () => void } = {}) {
    const { user, resolvedUid, loading: authLoading } = useAuth();
    const router = useRouter();

    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [loadingAdminStatus, setLoadingAdminStatus] = useState(true);

    // Active tab in dashboard
    const [activeTab, setActiveTab] = useState<"users" | "support" | "incidents" | "auditLogs" | "health">("users");

    // State for Users tab
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
    const [deletingUser, setDeletingUser] = useState(false);

    // State for moderation/ban modal
    const [userToBan, setUserToBan] = useState<AdminUser | null>(null);
    const [banReason, setBanReason] = useState("");
    const [banState, setBanState] = useState<"ACTIVE" | "SUSPENDED" | "PERMANENTLY_BANNED">("SUSPENDED");
    const [banningUserProgress, setBanningUserProgress] = useState(false);

    // State for Support tab
    const [supportThreads, setSupportThreads] = useState<SupportThread[]>([]);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [isClosingChat, setIsClosingChat] = useState(false);
    const [inspectedUserId, setInspectedUserId] = useState<string | null>(null);
    const [isClosingInspectedUser, setIsClosingInspectedUser] = useState(false);
    const [supportSearchQuery, setSupportSearchQuery] = useState("");
    const [showSupportSearch, setShowSupportSearch] = useState(false);
    const [supportFilterTab, setSupportFilterTab] = useState<"all" | "unread">("all");
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [messageInput, setMessageInput] = useState("");
    const [sendingMessage, setSendingMessage] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [selectedMessageForMenu, setSelectedMessageForMenu] = useState<SupportMessage | null>(null);
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleSelectThread = (threadId: string) => {
        setIsClosingChat(false);
        setSelectedThreadId(threadId);
    };

    const handleCloseChat = () => {
        if (isClosingChat) return;
        setIsClosingChat(true);
        setTimeout(() => {
            setSelectedThreadId(null);
            setIsClosingChat(false);
        }, 340);
    };



    const handleContextMenu = (e: React.MouseEvent, msg: SupportMessage) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedMessageForMenu(msg);
        setContextMenuPos({ x: e.clientX, y: e.clientY });
        setShowContextMenu(true);
    };

    const handleTouchStartMessage = (e: React.TouchEvent, msg: SupportMessage) => {
        const touch = e.touches[0];
        const clientX = touch.clientX;
        const clientY = touch.clientY;
        longPressTimerRef.current = setTimeout(() => {
            setSelectedMessageForMenu(msg);
            setContextMenuPos({ x: clientX, y: clientY });
            setShowContextMenu(true);
        }, 500);
    };

    const handleTouchEndMessage = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleCopyMessage = () => {
        if (!selectedMessageForMenu) return;
        navigator.clipboard.writeText(selectedMessageForMenu.text);
        showToast("Message copied to clipboard.", "success");
        setShowContextMenu(false);
    };

    const handleReplyMessage = () => {
        if (!selectedMessageForMenu) return;
        setMessageInput(`"${selectedMessageForMenu.text}" `);
        setShowContextMenu(false);
    };

    const handleDeleteMessage = async () => {
        if (!selectedMessageForMenu || !selectedThreadId) return;
        try {
            await deleteDoc(doc(db, "threads", selectedThreadId, "messages", selectedMessageForMenu.id));
            showToast("Message deleted.", "success");
        } catch (err) {
            console.error("Failed to delete support message:", err);
            showToast("Failed to delete message.", "error");
        } finally {
            setShowContextMenu(false);
        }
    };

    // State for database reset
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetConfirmationText, setResetConfirmationText] = useState("");
    const [resettingDb, setResettingDb] = useState(false);

    // Toast alerts
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

    const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    useModalHistory("adminSupportChat", selectedThreadId !== null, () => {
        setIsClosingChat(true);
        setTimeout(() => {
            setSelectedThreadId(null);
            setIsClosingChat(false);
        }, 340);
    });

    useModalHistory("adminInspectedUser", inspectedUserId !== null, () => {
        setIsClosingInspectedUser(true);
        setTimeout(() => {
            setInspectedUserId(null);
            setIsClosingInspectedUser(false);
        }, 340);
    });

    useModalHistory("adminBanModal", userToBan !== null, () => setUserToBan(null));
    useModalHistory("adminDeleteModal", userToDelete !== null, () => setUserToDelete(null));
    useModalHistory("adminResetModal", showResetModal, () => { setShowResetModal(false); setResetConfirmationText(""); });

    // 1. Check admin status
    useEffect(() => {
        if (authLoading) return;
        
        // Wait until resolvedUid is available if user is logged in
        if (user && !resolvedUid) return;

        if (!user || !resolvedUid) {
            router.replace("/");
            return;
        }

        // Listen for isAdmin flag on the user's Firestore doc in real-time
        const userDocRef = doc(db, "users", resolvedUid);
        const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const admin = !!docSnap.data().isAdmin;
                setIsAdmin(admin);
                // Silently redirect non-admins home
                if (!admin) router.replace("/");
            } else {
                setIsAdmin(false);
                router.replace("/");
            }
            setLoadingAdminStatus(false);
        });

        return () => unsubscribeUser();
    }, [user, resolvedUid, authLoading, router]);

    // 2. Fetch users for Users Tab
    useEffect(() => {
        if (!isAdmin) return;

        const unsubscribeUsers = onSnapshot(collection(db, "users"), (snap) => {
            const usersList = snap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    name: data.name || "User",
                    email: data.email || "",
                    phoneNumber: data.phoneNumber || "",
                    age: data.age,
                    gender: data.gender,
                    createdAt: data.createdAt,
                    isAdmin: !!data.isAdmin,
                    isBoosted: !!data.isBoosted,
                    avatar: data.avatar || null,
                    moderationState: data.moderationState || "ACTIVE"
                };
            });
            // Sort by name or creation date if exists
            usersList.sort((a, b) => a.name.localeCompare(b.name));
            setUsers(usersList);
        });

        return () => unsubscribeUsers();
    }, [isAdmin]);

    // 3. Fetch Support Threads in real-time
    useEffect(() => {
        if (!isAdmin) return;

        const q = query(collection(db, "threads"), where("participantIds", "array-contains", "support"));
        const unsubscribeSupport = onSnapshot(q, (snap) => {
            const threadsList = snap.docs.map(d => {
                const data = d.data();
                const participantIds = data.participantIds || [];
                const otherUserId = participantIds.find((id: string) => id !== "support") || "";
                const otherUser = data.participants?.[otherUserId] || { id: otherUserId, name: "Unknown User" };
                return {
                    id: d.id,
                    user: {
                        id: otherUserId,
                        name: otherUser.name || "User",
                        avatar: otherUser.avatar || null,
                        color: otherUser.color || "bg-zinc-200"
                    },
                    lastMessage: data.lastMessage || "",
                    lastTime: data.lastTime || "",
                    updatedAt: data.updatedAt || "",
                    unread: Array.isArray(data.unreadFor) && data.unreadFor.includes("support")
                };
            });

            // Sort threads by updatedAt desc
            threadsList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            setSupportThreads(threadsList);
        });

        return () => unsubscribeSupport();
    }, [isAdmin]);

    // 5. Fetch messages for selected Support thread
    useEffect(() => {
        if (!selectedThreadId) {
            setMessages([]);
            return;
        }

        const q = query(
            collection(db, "threads", selectedThreadId, "messages"),
            orderBy("createdAt", "asc")
        );

        const unsubscribeMessages = onSnapshot(q, (snap) => {
            const msgs = snap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    sender: data.senderId === "support" ? ("me" as const) : ("them" as const),
                    text: data.text || "",
                    time: data.time || "",
                    createdAt: data.createdAt || ""
                };
            });
            setMessages(msgs);
            // Scroll to bottom
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 50);
        });

        // Mark read
        const markRead = async () => {
            try {
                await updateDoc(doc(db, "threads", selectedThreadId), {
                    unreadFor: arrayRemove("support")
                });
            } catch (err) {
                console.error("Failed to mark support thread read:", err);
            }
        };
        markRead();

        return () => unsubscribeMessages();
    }, [selectedThreadId]);

    // Log administrative actions to audit_logs
    const logAuditEvent = async (action: string, targetId: string, details: string) => {
        try {
            const logId = crypto.randomUUID();
            await setDoc(doc(db, "audit_logs", logId), {
                id: logId,
                actorId: user?.uid || "System",
                actorEmail: user?.email || "admin@mesh.internal",
                action,
                target: targetId,
                details,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            console.error("Audit log write failed:", err);
        }
    };

    // Ban or restrict a user
    const handleModerateUser = async (userId: string, state: "ACTIVE" | "SUSPENDED" | "PERMANENTLY_BANNED", reason: string) => {
        setBanningUserProgress(true);
        try {
            const idToken = await user!.getIdToken();
            const res = await fetch(`/api/v1/admin/users/${userId}/ban`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    moderationState: state,
                    reason: reason || "No reason provided"
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to update moderation state via API");
            }

            showToast(`User moderation status updated to ${state}.`, "success");
            setUserToBan(null);
            setBanReason("");
        } catch (err: any) {
            console.error("Moderation update failed:", err);
            showToast(err.message || "Failed to update user moderation status.", "error");
        } finally {
            setBanningUserProgress(false);
        }
    };

    // Make another user admin
    const handlePromoteToAdmin = async (userId: string, userName: string) => {
        try {
            await updateDoc(doc(db, "users", userId), { isAdmin: true });
            await logAuditEvent("USER_PROMOTED", userId, `Promoted user ${userName} to administrator.`);
            showToast(`${userName} is now an administrator.`, "success");
        } catch (err) {
            console.error("Promotion failed:", err);
            showToast("Failed to promote user to administrator.", "error");
        }
    };

    // Delete a user
    const handleDeleteUserConfirm = async () => {
        if (!userToDelete) return;
        setDeletingUser(true);
        try {
            await deleteDoc(doc(db, "users", userToDelete.id));
            await logAuditEvent("USER_DELETED", userToDelete.id, `Permanently deleted user profile: ${userToDelete.name}`);
            showToast(`Successfully deleted user ${userToDelete.name}.`, "success");
            setUserToDelete(null);
        } catch (err) {
            console.error("Deletion failed:", err);
            showToast("Failed to delete user.", "error");
        } finally {
            setDeletingUser(false);
        }
    };

    // Send support message
    const handleSendSupportMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedThreadId || !messageInput.trim()) return;

        setSendingMessage(true);
        const currentMessageText = messageInput.trim();
        setMessageInput("");

        try {
            const messageId = crypto.randomUUID();
            const msgRef = doc(db, "threads", selectedThreadId, "messages", messageId);

            // Fetch recipient ID
            const threadRef = doc(db, "threads", selectedThreadId);
            const threadSnap = await getDocs(query(collection(db, "threads"), where("id", "==", selectedThreadId)));
            const threadData = threadSnap.docs[0]?.data();
            const participantIds = threadData?.participantIds || [];
            const userId = participantIds.find((pid: string) => pid !== "support") || "";

            // 1. Write message doc
            await setDoc(msgRef, {
                id: messageId,
                senderId: "support",
                text: currentMessageText,
                time: "Now",
                type: "text",
                read: false,
                createdAt: new Date().toISOString()
            });

            // 2. Update thread
            await updateDoc(threadRef, {
                lastMessage: currentMessageText,
                lastTime: "Now",
                unreadFor: arrayUnion(userId),
                updatedAt: new Date().toISOString()
            });

            // Also clear our unread state
            await updateDoc(threadRef, {
                unreadFor: arrayRemove("support")
            });

        } catch (err) {
            console.error("Failed to send support message:", err);
            showToast("Failed to send support message.", "error");
            setMessageInput(currentMessageText); // Restore input on error
        } finally {
            setSendingMessage(false);
        }
    };

    // Perform database wipe/factory reset
    const handleFactoryReset = async () => {
        if (resetConfirmationText !== "RESET" || !user) return;
        setResettingDb(true);
        try {
            await logAuditEvent("DATABASE_FACTORY_RESET", "database", "Initiated full database factory reset and support account recreation.");
            const collections = ["users", "threads", "statuses", "requests", "moods", "drafts", "callLogs", "transactions", "admin_invites", "incidents", "audit_logs"];

            for (const collName of collections) {
                const snap = await getDocs(collection(db, collName));
                const batch = writeBatch(db);
                let count = 0;

                for (const docObj of snap.docs) {
                    // NEVER delete the current logged in user
                    const myUserDocId = resolvedUid || user.uid;
                    if (collName === "users" && docObj.id === myUserDocId) {
                        continue;
                    }

                    // Delete subcollection messages for threads
                    if (collName === "threads") {
                        const messagesSnap = await getDocs(collection(db, "threads", docObj.id, "messages"));
                        const msgBatch = writeBatch(db);
                        messagesSnap.docs.forEach(mDoc => msgBatch.delete(mDoc.ref));
                        await msgBatch.commit();
                    }

                    batch.delete(docObj.ref);
                    count++;
                }

                if (count > 0) {
                    await batch.commit();
                }
            }

            // Create default support user in users collection to keep it clean
            const supportUserRef = doc(db, "users", "support");
            await setDoc(supportUserRef, {
                id: "support",
                name: "Yogheart Support",
                age: 25,
                bio: "Official Yogheart Support Account",
                color: "bg-emerald-500",
                interests: [],
                avatar: null,
                isAdmin: true,
                createdAt: new Date().toISOString()
            });

            showToast("Database reset successfully completed.", "success");
            setShowResetModal(false);
            setResetConfirmationText("");
            setSelectedThreadId(null);
        } catch (err) {
            console.error("Factory reset failed:", err);
            showToast("Error executing database factory reset.", "error");
        } finally {
            setResettingDb(false);
        }
    };

    // Filter users list based on query
    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phoneNumber?.includes(searchQuery) ||
        u.id.includes(searchQuery)
    );

    const filteredAdmins = filteredUsers.filter(u => u.isAdmin);
    const filteredRegularUsers = filteredUsers.filter(u => !u.isAdmin);

    const renderUserTable = (usersList: AdminUser[], emptyMessage: string) => {
        return (
            <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-zinc-850/50 border-b border-gray-150 dark:border-zinc-800 text-[10px] uppercase font-bold tracking-wider text-[var(--secondary)]">
                                <th className="px-4 py-3.5">User</th>
                                <th className="px-4 py-3.5">Contact Details</th>
                                <th className="px-4 py-3.5">Profile Info</th>
                                <th className="px-4 py-3.5">Role</th>
                                <th className="px-4 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                            {usersList.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-gray-400 dark:text-zinc-500">
                                        {emptyMessage}
                                    </td>
                                </tr>
                            ) : (
                                usersList.map((u) => (
                                    <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-850/20 transition-colors">
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-3">
                                                {u.avatar ? (
                                                    <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-sm flex items-center justify-center shrink-0">
                                                        {u.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="font-bold text-gray-950 dark:text-white truncate">{u.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-mono select-all truncate max-w-[140px]">{u.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="space-y-0.5 text-xs">
                                                {u.email && (
                                                    <p className="flex items-center gap-1.5 text-gray-700 dark:text-zinc-300">
                                                        <Mail size={12} className="text-gray-400" />
                                                        {u.email}
                                                    </p>
                                                )}
                                                {u.phoneNumber && (
                                                    <p className="flex items-center gap-1.5 text-gray-700 dark:text-zinc-300">
                                                        <Smartphone size={12} className="text-gray-400" />
                                                        {u.phoneNumber}
                                                    </p>
                                                )}
                                                {!u.email && !u.phoneNumber && (
                                                    <p className="text-gray-400 italic">No contact details</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="space-y-0.5 text-xs text-gray-700 dark:text-zinc-300">
                                                <p>
                                                    Age: <span className="font-bold">{u.age || "N/A"}</span> • Gender: <span className="font-bold">{u.gender || "N/A"}</span>
                                                </p>
                                                {u.createdAt && (
                                                    <p className="text-[10px] text-gray-400">Joined: {new Date(u.createdAt).toLocaleDateString()}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex gap-1">
                                                {u.isAdmin ? (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                                                        Admin
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400">
                                                        User
                                                    </span>
                                                )}
                                                {u.isBoosted && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                                                        Boosted
                                                    </span>
                                                )}
                                                {u.moderationState && u.moderationState !== "ACTIVE" && (
                                                    <span className={clsx(
                                                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                                        u.moderationState === "SUSPENDED"
                                                            ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50"
                                                            : "bg-red-100 text-red-850 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50"
                                                    )}>
                                                        {u.moderationState === "SUSPENDED" ? "Suspended" : "Banned"}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 text-right shrink-0">
                                            <div className="flex items-center justify-end gap-2">
                                                {!u.isAdmin && (
                                                    <button
                                                        onClick={() => handlePromoteToAdmin(u.id, u.name)}
                                                        title="Make Administrator"
                                                        className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 rounded-lg transition-colors border border-transparent hover:border-emerald-200 dark:hover:border-emerald-900/40"
                                                    >
                                                        <UserCheck size={16} />
                                                    </button>
                                                )}
                                                {(u.id !== user!.uid && u.id !== resolvedUid) && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setUserToBan(u);
                                                                setBanState(u.moderationState || "SUSPENDED");
                                                                setBanReason("");
                                                            }}
                                                            title="Moderate / Ban User"
                                                            className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-600 rounded-lg transition-colors border border-transparent hover:border-amber-200 dark:hover:border-amber-900/40"
                                                        >
                                                            <Ban size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setUserToDelete(u)}
                                                            title="Delete User"
                                                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-900/40"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Mobile card list */}
                <div className="md:hidden divide-y divide-gray-100 dark:divide-zinc-800">
                    {usersList.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 dark:text-zinc-500 text-sm">
                            {emptyMessage}
                        </div>
                    ) : (
                        usersList.map((u) => (
                            <div key={u.id} className="p-4 flex items-center gap-3">
                                <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex items-center gap-3">
                                        {u.avatar ? (
                                            <img src={u.avatar} alt={u.name} className="w-11 h-11 rounded-full object-cover shrink-0" />
                                        ) : (
                                            <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-sm flex items-center justify-center shrink-0">
                                                {u.name.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-950 dark:text-white truncate text-sm">{u.name}</p>
                                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                                {u.isAdmin ? (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">Admin</span>
                                                ) : (
                                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400">User</span>
                                                )}
                                                {u.isBoosted && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">Boosted</span>
                                                )}
                                                {u.moderationState && u.moderationState !== "ACTIVE" && (
                                                    <span className={clsx(
                                                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                                        u.moderationState === "SUSPENDED"
                                                            ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50"
                                                            : "bg-red-100 text-red-850 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50"
                                                    )}>
                                                        {u.moderationState === "SUSPENDED" ? "Suspended" : "Banned"}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-zinc-400 space-y-0.5 pl-14">
                                        {u.email && <p className="flex items-center gap-1.5 truncate"><Mail size={12} className="text-gray-400 shrink-0" /> {u.email}</p>}
                                        {u.phoneNumber && <p className="flex items-center gap-1.5"><Smartphone size={12} className="text-gray-400 shrink-0" /> {u.phoneNumber}</p>}
                                        <p>Age: <span className="font-semibold">{u.age || "N/A"}</span> • Gender: <span className="font-semibold">{u.gender || "N/A"}</span></p>
                                        {u.createdAt && <p className="text-[10px] text-gray-400">Joined: {new Date(u.createdAt).toLocaleDateString()}</p>}
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-1.5 shrink-0">
                                    {!u.isAdmin && (
                                        <button onClick={() => handlePromoteToAdmin(u.id, u.name)} title="Make Administrator" className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 rounded-lg transition-colors border border-gray-150 dark:border-zinc-800"><UserCheck size={16} /></button>
                                    )}
                                    {(u.id !== user!.uid && u.id !== resolvedUid) && (
                                        <>
                                            <button onClick={() => { setUserToBan(u); setBanState(u.moderationState || "SUSPENDED"); setBanReason(""); }} title="Moderate / Ban User" className="p-2 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-600 rounded-lg transition-colors border border-gray-150 dark:border-zinc-800"><Ban size={16} /></button>
                                            <button onClick={() => setUserToDelete(u)} title="Delete User" className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 rounded-lg transition-colors border border-gray-150 dark:border-zinc-800"><Trash2 size={16} /></button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    // Show a blank screen while checking — never reveal the route exists
    if (authLoading || loadingAdminStatus || !isAdmin) {
        return <div className="h-screen w-screen bg-[var(--background)] dark:bg-zinc-950" />;
    }

    // Render Admin Dashboard
    const dashboardContent = (
        <>
            {/* Top Navigation Bar */}
            <header className="bg-white dark:bg-zinc-900 px-4 md:px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 shrink-0">
                <div className="flex items-center gap-3">
                    {isOverlay ? (
                        <button
                            onClick={() => {
                                if (onClose) onClose();
                                else window.dispatchEvent(new CustomEvent("settings-subpage-back"));
                            }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
                        >
                            <ArrowLeft size={20} className="text-[var(--primary)]" />
                        </button>
                    ) : (
                        <button
                            onClick={() => router.push("/me")}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
                        >
                            <ArrowLeft size={20} className="text-[var(--primary)]" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-lg sm:text-xl font-black tracking-tight dark:text-white flex items-center gap-2">
                            Yogheart Admin Dashboard
                            <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-100 text-emerald-800 dark:bg-emerald-955 px-2 py-0.5 rounded-md">
                                Live
                            </span>
                        </h1>
                        <p className="text-xs text-[var(--secondary)]">Logged in as {user!.email || user!.uid}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (isOverlay) {
                                if (onClose) onClose();
                                else window.dispatchEvent(new CustomEvent("settings-subpage-back"));
                            } else {
                                router.push("/me");
                            }
                        }}
                        className="hidden sm:inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-850 text-sm font-semibold transition-colors cursor-pointer"
                    >
                        Back to App
                    </button>
                </div>
            </header>

            {/* Dashboard Tabs bar */}
            <div className="bg-white dark:bg-zinc-900 border-b border-gray-150 dark:border-zinc-850 px-4 md:px-6 py-2 shrink-0 flex gap-2 overflow-x-hidden w-full justify-between md:justify-start">
                <button
                    onClick={() => setActiveTab("users")}
                    className={clsx(
                        "flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 md:px-5 py-2 rounded-xl text-xs md:text-sm font-bold transition-all shrink-0",
                        activeTab === "users"
                            ? "bg-[var(--primary)] text-white shadow-md shadow-emerald-500/10"
                            : "text-gray-700 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    )}
                >
                    <Users size={16} className="shrink-0" />
                    <span>Users<span className="hidden md:inline"> Management</span></span>
                </button>
                <button
                    onClick={() => setActiveTab("support")}
                    className={clsx(
                        "flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 md:px-5 py-2 rounded-xl text-xs md:text-sm font-bold transition-all shrink-0",
                        activeTab === "support"
                            ? "bg-[var(--primary)] text-white shadow-md shadow-emerald-500/10"
                            : "text-gray-700 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    )}
                >
                    <MessageSquare size={16} className="shrink-0" />
                    <span>Support<span className="hidden md:inline"> Portal</span></span>
                    {supportThreads.some(t => t.unread) && (
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                    )}
                </button>
            </div>

            {/* Dashboard Content Panel */}
            <div className={clsx(
                "flex-1 min-h-0 flex flex-col w-full max-w-full overflow-x-hidden",
                activeTab === "support" ? "overflow-hidden" : "overflow-y-auto pb-20 lg:pb-4"
            )}>
                {/* 1. Users Management View */}
                {activeTab === "users" && (
                    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
                        {/* Search and Summary */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search users by name, phone, email, or UID..."
                                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm"
                                />
                            </div>
                            <div className="bg-white dark:bg-zinc-900 px-5 py-3 border border-gray-150 dark:border-zinc-800 rounded-2xl flex items-center gap-6">
                                <div>
                                    <p className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-wider">Total users</p>
                                    <h4 className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{users.length}</h4>
                                </div>
                                <div className="h-8 w-px bg-gray-150 dark:bg-zinc-800" />
                                <div>
                                    <p className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-wider">Administrators</p>
                                    <h4 className="text-xl font-black text-[var(--primary)] mt-0.5">{users.filter(u => u.isAdmin).length}</h4>
                                </div>
                            </div>
                        </div>

                        {/* Administrators Card Section */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-black text-gray-500 dark:text-zinc-400 uppercase tracking-widest pl-1">
                                Administrators
                            </h3>
                            {renderUserTable(filteredAdmins, "No administrators found matching your search.")}
                        </div>

                        {/* Users Card Section */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-black text-gray-500 dark:text-zinc-400 uppercase tracking-widest pl-1">
                                Users
                            </h3>
                            {renderUserTable(filteredRegularUsers, "No users found matching your search.")}
                        </div>

                        {/* Database Danger Zone */}
                        <div className="border border-red-200 dark:border-red-900/30 bg-red-50/20 dark:bg-red-950/10 rounded-2xl p-6">
                            <h3 className="text-base font-bold text-red-600 flex items-center gap-2">
                                <AlertTriangle size={18} />
                                Danger Zone
                            </h3>
                            <p className="text-xs text-[var(--secondary)] mt-1 max-w-2xl leading-relaxed">
                                Executing a factory reset will permanently wipe all users (except your account), messages, threads, match requests, status stories, call logs, and simulated boosting transaction records from the database. This action is irreversible.
                            </p>
                            <button
                                onClick={() => {
                                    setResetConfirmationText("");
                                    setShowResetModal(true);
                                }}
                                className="mt-4 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-500/10 transition-all active:scale-[0.98]"
                            >
                                Factory Reset Database
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. Support Portal View (Full-Width List + Slide-In Chatroom) */}
                {activeTab === "support" && (
                    <div className="h-full flex flex-col bg-white dark:bg-zinc-950 overflow-hidden relative">
                        {/* ──────── 1. Full-Width Support Inquiries List ──────── */}
                        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-950">
                            {/* Header & Controls */}
                            <div className="p-3.5 sm:p-4 space-y-2.5 shrink-0 bg-white dark:bg-zinc-900">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-xs shrink-0">
                                            <Headphones size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white leading-none truncate">Support Inbox</h3>
                                            <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 truncate">Real-time user support chat threads</p>
                                        </div>
                                    </div>

                                    {/* Right side: Search Icon Input + Ticket Badges */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {/* Compact / Expandable Search Bar */}
                                        <div className="relative flex items-center">
                                            {showSupportSearch || supportSearchQuery ? (
                                                <div className="relative flex items-center animate-in fade-in zoom-in-95 duration-150">
                                                    <Search size={14} className="absolute left-2.5 text-gray-400 pointer-events-none" />
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        value={supportSearchQuery}
                                                        onChange={(e) => setSupportSearchQuery(e.target.value)}
                                                        placeholder="Search tickets..."
                                                        className="w-36 sm:w-56 bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white pl-8 pr-7 py-1.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400 transition-all border border-gray-200 dark:border-zinc-750"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            setSupportSearchQuery("");
                                                            setShowSupportSearch(false);
                                                        }}
                                                        className="absolute right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setShowSupportSearch(true)}
                                                    className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-gray-600 dark:text-zinc-300 transition-colors cursor-pointer border border-gray-200/60 dark:border-zinc-750 flex items-center gap-1"
                                                    title="Search Support Tickets"
                                                >
                                                    <Search size={15} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Ticket Badges */}
                                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">
                                            {supportThreads.length} Tickets
                                        </span>
                                        {supportThreads.filter(t => t.unread).length > 0 && (
                                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500 text-white animate-pulse">
                                                {supportThreads.filter(t => t.unread).length} Unread
                                            </span>
                                        )}
                                    </div>
                                </div>


                            </div>

                            {/* Full Width Thread Cards List */}
                            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 custom-scrollbar">
                                {(() => {
                                    const filtered = supportThreads.filter((t) => {
                                        if (supportFilterTab === "unread" && !t.unread) return false;
                                        if (supportSearchQuery.trim()) {
                                            const q = supportSearchQuery.toLowerCase().trim();
                                            return (
                                                t.user.name.toLowerCase().includes(q) ||
                                                t.user.id.toLowerCase().includes(q) ||
                                                t.lastMessage.toLowerCase().includes(q)
                                            );
                                        }
                                        return true;
                                    });

                                    if (filtered.length === 0) {
                                        return (
                                            <div className="p-12 text-center flex flex-col items-center justify-center">
                                                <div className="w-16 h-16 rounded-3xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400 mb-3">
                                                    <LifeBuoy size={30} />
                                                </div>
                                                <p className="text-sm font-bold text-gray-700 dark:text-zinc-200">No support tickets found</p>
                                                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
                                                    {supportSearchQuery ? "Try changing your search terms" : "All open support inquiries from users will appear here."}
                                                </p>
                                            </div>
                                        );
                                    }

                                    return filtered.map((t) => (
                                        <div
                                            key={t.id}
                                            onClick={() => handleSelectThread(t.id)}
                                            className={clsx(
                                                "p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-3.5 sm:gap-4 relative select-none hover:shadow-sm",
                                                t.unread 
                                                    ? "bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40" 
                                                    : "bg-gray-50/60 hover:bg-gray-100/80 dark:bg-zinc-900/60 dark:hover:bg-zinc-850/80 border border-gray-100 dark:border-zinc-800/50"
                                            )}
                                        >
                                            {/* User Avatar */}
                                            <div className="relative shrink-0">
                                                {t.user.avatar ? (
                                                    <img src={t.user.avatar} alt={t.user.name} className="w-12 h-12 rounded-full object-cover shadow-xs" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-emerald-500 text-white font-bold text-base flex items-center justify-center shadow-xs">
                                                        {t.user.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                                {t.unread && (
                                                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900" />
                                                )}
                                            </div>

                                            {/* Text Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className={clsx("text-sm sm:text-base truncate", t.unread ? "font-bold text-gray-950 dark:text-white" : "font-semibold text-gray-800 dark:text-zinc-200")}>
                                                            {t.user.name}
                                                        </span>
                                                        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-gray-200/70 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 shrink-0">
                                                            ID: {t.user.id.slice(0, 8)}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-gray-400 shrink-0 font-medium">{t.lastTime || "Active"}</span>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 mt-1">
                                                    <p className={clsx("text-xs sm:text-sm truncate", t.unread ? "font-semibold text-emerald-700 dark:text-emerald-400" : "text-gray-500 dark:text-zinc-400")}>
                                                        {t.lastMessage || <span className="italic text-gray-400">Open conversation</span>}
                                                    </p>
                                                    {t.unread && (
                                                        <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full shrink-0">
                                                            New
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>

                        {/* ──────── 2. Full-Width Chatroom View ──────── */}
                        {selectedThreadId && (() => {
                            const activeT = supportThreads.find(t => t.id === selectedThreadId);
                            const userDoc = users.find(u => u.id === activeT?.user.id);
                            return (
                            <div 
                                className={clsx(
                                    "absolute inset-0 z-20 flex flex-col bg-white dark:bg-zinc-950 overflow-hidden",
                                    isClosingChat ? "animate-slide-out-to-right-edge" : "animate-slide-in-from-right-edge"
                                )}
                            >
                                {/* Chat Header matching ChatThreadView */}
                                <div className="bg-white dark:bg-zinc-900 px-4 py-3 flex items-center justify-between shrink-0 shadow-2xs z-10">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {/* Back Button (Returns to full-width Inquiries List) */}
                                        <button 
                                            onClick={handleCloseChat}
                                            className="p-2 -ml-1.5 text-gray-700 hover:text-black dark:text-zinc-300 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                            title="Back to Tickets"
                                        >
                                            <ArrowLeft size={22} className="text-emerald-600 dark:text-emerald-400" />
                                        </button>
                                        
                                        {/* User Profile Trigger (Avatar + Name) */}
                                        <div
                                            onClick={() => {
                                                if (activeT?.user.id) {
                                                    setIsClosingInspectedUser(false);
                                                    setInspectedUserId(activeT.user.id);
                                                }
                                            }}
                                            className="flex items-center gap-3 min-w-0 cursor-pointer group hover:opacity-90 transition-opacity select-none"
                                            title="View User Profile"
                                        >
                                            {/* User Avatar */}
                                            <div className="relative shrink-0 transition-transform group-hover:scale-105">
                                                {activeT?.user.avatar ? (
                                                    <img src={activeT.user.avatar} alt={activeT.user.name} className="w-10 h-10 rounded-full object-cover shadow-xs" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                                                        {activeT?.user.name.substring(0, 2).toUpperCase() || "SP"}
                                                    </div>
                                                )}
                                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900" />
                                            </div>

                                            {/* Name and Meta */}
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-sm sm:text-base text-gray-950 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                        {activeT?.user.name}
                                                    </h4>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                                                        Live Ticket
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                                                    {userDoc?.email || `UserID: ${activeT?.user.id}`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Header Action Tools */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {/* View in Users Tab / Inspect Profile */}
                                        <button
                                            onClick={() => {
                                                if (activeT?.user.id) {
                                                    setIsClosingInspectedUser(false);
                                                    setInspectedUserId(activeT.user.id);
                                                }
                                            }}
                                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                                            title="Inspect user profile"
                                        >
                                            <Users size={14} />
                                            <span className="hidden sm:inline">Inspect User</span>
                                        </button>

                                        {/* Moderate User */}
                                        <button
                                            onClick={() => {
                                                const targetUser = userDoc || { id: activeT?.user.id || "", name: activeT?.user.name || "User" };
                                                setUserToBan(targetUser);
                                                setBanReason("");
                                                setBanState("SUSPENDED");
                                            }}
                                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 transition-colors flex items-center gap-1.5 border border-amber-200 dark:border-amber-800/40 cursor-pointer"
                                            title="Moderate, suspend or ban user"
                                        >
                                            <Ban size={14} />
                                            <span className="hidden sm:inline">Moderate</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Messages Canvas with full-width chat styling */}
                                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-2.5 bg-[#efeae2]/40 dark:bg-[#0b141a]/60 custom-scrollbar">
                                    {/* Security & Support notice banner */}
                                    <div className="flex justify-center my-1.5">
                                        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xs px-3.5 py-1 rounded-full text-center shadow-2xs max-w-md">
                                            <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium flex items-center justify-center gap-1.5">
                                                <ShieldAlert size={13} className="text-emerald-500" />
                                                Official Yogheart Admin Support Session
                                            </p>
                                        </div>
                                    </div>

                                    {messages.length === 0 ? (
                                        <div className="h-64 flex flex-col items-center justify-center text-xs sm:text-sm text-gray-400 dark:text-zinc-500 italic">
                                            <MessageSquare size={32} className="text-gray-300 dark:text-zinc-700 mb-2" />
                                            No messages in this ticket yet. Reply below to start assisting the user.
                                        </div>
                                    ) : (
                                        messages.map((m) => {
                                            const isMe = m.sender === "me";
                                            return (
                                                <div
                                                    key={m.id}
                                                    onContextMenu={(e) => handleContextMenu(e, m)}
                                                    onTouchStart={(e) => handleTouchStartMessage(e, m)}
                                                    onTouchEnd={handleTouchEndMessage}
                                                    onTouchMove={handleTouchEndMessage}
                                                    className={clsx(
                                                        "group flex flex-col w-fit max-w-[82%] sm:max-w-[70%] transition-all cursor-context-menu relative select-text",
                                                        isMe ? "ml-auto items-end" : "mr-auto items-start"
                                                    )}
                                                >
                                                    <div
                                                        className={clsx(
                                                            "px-3.5 py-2 rounded-2xl shadow-2xs text-[13.5px] sm:text-sm leading-relaxed transition-all",
                                                            isMe
                                                                ? "bg-emerald-600 text-white rounded-tr-none"
                                                                : "bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 rounded-tl-none border border-gray-150/70 dark:border-zinc-800/70"
                                                        )}
                                                    >
                                                        {/* Sender tag */}
                                                        <span className={clsx(
                                                            "text-[10px] font-bold block mb-0.5 select-none",
                                                            isMe ? "text-emerald-200" : "text-emerald-600 dark:text-emerald-400"
                                                        )}>
                                                            {isMe ? "Support (You)" : activeT?.user.name || "User"}
                                                        </span>

                                                        {/* Message text */}
                                                        <p className="whitespace-pre-wrap break-words">{m.text}</p>

                                                        {/* Timestamp & read receipts */}
                                                        <div className={clsx(
                                                            "flex items-center justify-end gap-1 text-[10px] mt-1 select-none font-medium opacity-75",
                                                            isMe ? "text-emerald-200" : "text-gray-400"
                                                        )}>
                                                            <span>{m.time || "Just now"}</span>
                                                            {isMe && <CheckCheck size={13} className="text-emerald-200" />}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Quick Canned Response Chips - Live Breaking News Auto Ticker */}
                                <div className="relative bg-white dark:bg-zinc-900 border-t border-gray-150 dark:border-zinc-800 py-1.5 md:py-2 px-2.5 md:px-3 shrink-0 flex items-center gap-2 overflow-hidden select-none">
                                    <div className="flex items-center gap-1.5 shrink-0 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-emerald-700 dark:text-emerald-300 z-10 shadow-xs">
                                        <Sparkles size={12} className="text-emerald-500 animate-pulse" />
                                        <span className="text-[9.5px] md:text-[10px] font-black uppercase tracking-wider">Live Quick</span>
                                    </div>
                                    
                                    <div className="flex-1 overflow-hidden relative flex items-center">
                                        {/* Left/Right subtle fade gradient */}
                                        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white dark:from-zinc-900 to-transparent z-10 pointer-events-none" />
                                        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white dark:from-zinc-900 to-transparent z-10 pointer-events-none" />

                                        {/* Infinite Auto-scrolling Marquee Track */}
                                        <div className="animate-marquee flex items-center gap-2 whitespace-nowrap">
                                            {[
                                                "👋 Hello! How can our support team assist you today?",
                                                "🔍 Thanks for letting us know. We are investigating this right now.",
                                                "✅ This issue has been reviewed and resolved.",
                                                "🙏 Thank you for reaching out to Yogheart Support!",
                                                "📋 Please provide more details or a screenshot so we can help.",
                                                "⚡ We've applied an update to your account. Please refresh and check.",
                                                // Duplicate for seamless infinite loop
                                                "👋 Hello! How can our support team assist you today?",
                                                "🔍 Thanks for letting us know. We are investigating this right now.",
                                                "✅ This issue has been reviewed and resolved.",
                                                "🙏 Thank you for reaching out to Yogheart Support!",
                                                "📋 Please provide more details or a screenshot so we can help.",
                                                "⚡ We've applied an update to your account. Please refresh and check."
                                            ].map((chip, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setMessageInput(chip)}
                                                    className="px-3 py-1 md:px-3.5 md:py-1.5 rounded-full text-[11px] md:text-xs font-medium bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:bg-zinc-800 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300 dark:hover:border-emerald-800 text-gray-800 dark:text-zinc-200 shrink-0 whitespace-nowrap transition-all border border-gray-200/80 dark:border-zinc-750 cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                                                >
                                                    {chip}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Message Reply Form */}
                                <form
                                    onSubmit={handleSendSupportMessage}
                                    className="bg-white dark:bg-zinc-900 px-3 md:px-4 py-2.5 md:py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-3 shrink-0 flex items-center gap-2 md:gap-3 border-t border-gray-100 dark:border-zinc-850 z-10"
                                >
                                    <input
                                        type="text"
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        placeholder="Type a support response to user..."
                                        className="flex-1 px-3.5 md:px-4 py-2.5 md:py-3 bg-gray-100 dark:bg-zinc-800 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm border-none transition-all placeholder:text-gray-400"
                                    />
                                    <button
                                        type="submit"
                                        disabled={sendingMessage || !messageInput.trim()}
                                        className="p-2.5 md:p-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl disabled:opacity-40 transition-all shrink-0 shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center"
                                    >
                                        {sendingMessage ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                                    </button>
                                </form>
                            </div>
                            );
                        })()}

                        {/* ──────── 3. In-Admin User Profile View (Slides in over chatroom below Dashboard Header) ──────── */}
                        {inspectedUserId && (
                            <div 
                                className={clsx(
                                    "absolute inset-0 z-30 flex flex-col bg-white dark:bg-zinc-950 overflow-hidden",
                                    isClosingInspectedUser ? "animate-slide-out-to-right-edge" : "animate-slide-in-from-right-edge"
                                )}
                            >
                                <ProfileView 
                                    userId={inspectedUserId}
                                    onClose={() => {
                                        if (isClosingInspectedUser) return;
                                        setIsClosingInspectedUser(true);
                                        setTimeout(() => {
                                            setInspectedUserId(null);
                                            setIsClosingInspectedUser(false);
                                        }, 340);
                                    }}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Support Message Context Menu */}
            {typeof window !== "undefined" && showContextMenu && selectedMessageForMenu && createPortal(
                <>
                    <div className="fixed inset-0 z-[110]" onClick={() => setShowContextMenu(false)} />
                    <div
                        className="fixed bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-150 dark:border-zinc-800 py-1.5 min-w-[170px] z-[120] animate-in fade-in zoom-in-95 duration-150 select-none"
                        style={{
                            ...(contextMenuPos.y > window.innerHeight / 2 ? { bottom: window.innerHeight - contextMenuPos.y } : { top: contextMenuPos.y }),
                            ...(contextMenuPos.x > window.innerWidth / 2 ? { right: window.innerWidth - contextMenuPos.x } : { left: contextMenuPos.x })
                        }}
                    >
                        <button
                            onClick={handleReplyMessage}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800 text-left text-gray-800 dark:text-zinc-200 font-medium transition-colors text-xs cursor-pointer"
                        >
                            <Reply size={14} className="text-gray-400" />
                            <span>Quote / Reply</span>
                        </button>
                        <button
                            onClick={handleCopyMessage}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800 text-left text-gray-800 dark:text-zinc-200 font-medium transition-colors text-xs cursor-pointer"
                        >
                            <Copy size={14} className="text-gray-400" />
                            <span>Copy Text</span>
                        </button>
                        <div className="h-px bg-gray-100 dark:bg-zinc-800 my-1" />
                        <button
                            onClick={handleDeleteMessage}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-red-50 dark:hover:bg-red-950/40 text-left text-red-600 dark:text-red-400 font-medium transition-colors text-xs cursor-pointer"
                        >
                            <Trash2 size={14} />
                            <span>Delete Message</span>
                        </button>
                    </div>
                </>,
                document.body
            )}

            {/* Custom Toast Alert Popup */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[100] max-w-sm w-full bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
                    <div className={clsx(
                        "w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0",
                        toast.type === "success" ? "bg-emerald-500" : toast.type === "error" ? "bg-red-500" : "bg-blue-500"
                    )}>
                        {toast.type === "success" ? <Check size={16} /> : toast.type === "error" ? <AlertTriangle size={16} /> : <MessageSquare size={16} />}
                    </div>
                    <p className="text-xs font-semibold text-gray-700 dark:text-zinc-200 flex-1 leading-relaxed">{toast.message}</p>
                </div>
            )}

            {/* Moderate User Modal */}
            {userToBan && (
                <div className="modal-overlay" onClick={() => setUserToBan(null)}>
                    <div className="modal-content p-6 max-w-md w-full mx-4 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-2xl shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-amber-500 flex items-center gap-2">
                            <Ban size={22} />
                            Moderate User Profile
                        </h3>
                        <p className="text-sm text-[var(--secondary)] mt-3 leading-relaxed">
                            Adjust the moderation state for user <span className="font-bold text-black dark:text-white">{userToBan.name}</span>.
                            Suspension or permanent bans will immediately log the user out of all devices and active sessions.
                        </p>
                        
                        <div className="mt-4">
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 dark:text-zinc-400">Moderation State</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(["ACTIVE", "SUSPENDED", "PERMANENTLY_BANNED"] as const).map((state) => (
                                    <button
                                        key={state}
                                        type="button"
                                        onClick={() => setBanState(state)}
                                        className={clsx(
                                            "py-2 px-3 text-xs font-bold rounded-xl border transition-all",
                                            banState === state
                                                ? state === "ACTIVE"
                                                    ? "bg-emerald-500 text-white border-emerald-500"
                                                    : state === "SUSPENDED"
                                                    ? "bg-amber-500 text-white border-amber-500"
                                                    : "bg-red-600 text-white border-red-600"
                                                : "bg-gray-50 dark:bg-zinc-850 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800"
                                        )}
                                    >
                                        {state === "ACTIVE" ? "Active" : state === "SUSPENDED" ? "Suspended" : "Banned"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 dark:text-zinc-400">Reason / Admin Note</label>
                            <textarea
                                value={banReason}
                                onChange={(e) => setBanReason(e.target.value)}
                                placeholder="Provide a reason for this moderation action (e.g., policy violation, spam, etc.)"
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-xs font-medium resize-none h-24 dark:text-zinc-100"
                            />
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setUserToBan(null)}
                                disabled={banningUserProgress}
                                className="flex-1 py-3 border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-850 transition-colors text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleModerateUser(userToBan.id, banState, banReason)}
                                disabled={banningUserProgress}
                                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-40 flex items-center justify-center gap-2 text-xs"
                            >
                                {banningUserProgress && <RefreshCw size={14} className="animate-spin" />}
                                Save Status
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete User Confirmation Modal */}
            {userToDelete && (
                <div className="modal-overlay" onClick={() => setUserToDelete(null)}>
                    <div className="modal-content p-6 max-w-md w-full mx-4 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-2xl shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-red-500 flex items-center gap-2">
                            <Trash2 size={22} />
                            Delete User Profile?
                        </h3>
                        <p className="text-sm text-[var(--secondary)] mt-3 leading-relaxed">
                            Are you sure you want to permanently delete user <span className="font-bold text-black dark:text-white">{userToDelete.name}</span>?
                            Their user profile record, matching data, and conversations will be deleted from the database.
                        </p>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setUserToDelete(null)}
                                disabled={deletingUser}
                                className="flex-1 py-3 border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-850 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteUserConfirm}
                                disabled={deletingUser}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                {deletingUser && <RefreshCw size={14} className="animate-spin" />}
                                Delete User
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Factory Reset Database Modal */}
            {showResetModal && (
                <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
                    <div className="modal-content p-6 max-w-md w-full mx-4 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-2xl shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-red-600 flex items-center gap-2">
                            <AlertTriangle size={22} className="stroke-[2.5]" />
                            Factory Reset Database?
                        </h3>
                        <p className="text-xs text-[var(--secondary)] mt-3 leading-relaxed">
                            This action is highly destructive. All collections (users, threads, chats, matching requests, statuses, call logs, boosting metrics) will be entirely deleted.
                            Only your admin account will be preserved to prevent lockout.
                        </p>
                        <div className="mt-4">
                            <label className="text-[10px] font-bold text-red-500 uppercase block mb-2">Type &quot;RESET&quot; below to authorize action:</label>
                            <input
                                type="text"
                                value={resetConfirmationText}
                                onChange={(e) => setResetConfirmationText(e.target.value)}
                                placeholder="RESET"
                                className="w-full px-4 py-3 bg-red-50/50 dark:bg-zinc-900 border border-red-200 dark:border-red-900/40 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-sm font-bold tracking-wider"
                            />
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowResetModal(false);
                                    setResetConfirmationText("");
                                }}
                                disabled={resettingDb}
                                className="flex-1 py-3 border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-850 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleFactoryReset}
                                disabled={resettingDb || resetConfirmationText !== "RESET"}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                                {resettingDb && <RefreshCw size={14} className="animate-spin" />}
                                WIPE DATABASE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    if (isOverlay) {
        return (
            <div data-admin-dashboard="true" className="w-full h-full min-h-0 flex flex-col text-gray-900 dark:text-zinc-100 font-sans bg-white dark:bg-zinc-900 overflow-hidden">
                {dashboardContent}
            </div>
        );
    }

    return (
        <div data-admin-dashboard="true" className="app-desktop-wrapper w-full h-[100dvh] flex flex-col overflow-hidden">
            <div className="app-container !flex-col text-gray-900 dark:text-zinc-100 font-sans bg-white dark:bg-zinc-900 overflow-hidden h-full flex-1">
                {dashboardContent}
            </div>
        </div>
    );
}
