"use client";

import { useMockData, Mood, User, MoodComment, isMarketplaceThread } from "@/context/MockContext";
import { useRouter } from "next/navigation";
import { ArrowLeft, Phone, Video, MessageCircle, Ban, Flag, MoreVertical, Send, Check, X, UserPlus, UserCheck, Plus, Heart, MessageSquare, Trash2, Image, Film, Sparkles, Globe, LayoutGrid, Play, Pencil, Lock, Settings, Users, LogOut } from "lucide-react";
import ZoomedAvatarModal from "@/components/ZoomedAvatarModal";
import { formatLastSeen } from "@/lib/date";
import { INITIAL_YOGHEART_CLIPS } from "@/components/clips/clipsData";

// --- NEW INLINE COMPONENT FOR INSTAGRAM-STYLE FEED POST ---
const FeedPost = ({ 
    mood, 
    currentUser, 
    isSelf, 
    onDelete, 
    onLike, 
    onComment,
    onLikeComment,
    onEditComment,
    onDeleteComment,
    onUpdate,
    onOpenCommentsDrawer
}: { 
    mood: Mood; 
    currentUser: User | null; 
    isSelf: boolean; 
    onDelete: (id: string) => void; 
    onLike: (id: string) => void; 
    onComment: (id: string, text: string, replyTo?: string | null) => void;
    onLikeComment: (moodId: string, commentId: string) => void;
    onEditComment: (moodId: string, commentId: string, text: string) => void;
    onDeleteComment: (moodId: string, commentId: string) => void;
    onUpdate: (id: string, updates: Partial<Mood>) => void;
    onOpenCommentsDrawer: () => void;
}) => {
    const [commentText, setCommentText] = useState("");
    const [replyingTo, setReplyingTo] = useState<{ commentId: string; userName: string } | null>(null);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editCommentText, setEditCommentText] = useState("");
    const [isEditingCaption, setIsEditingCaption] = useState(false);
    const [captionText, setCaptionText] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    
    // Helper to format comment timestamp
    const formatCommentTime = (isoString: string) => {
        try {
            const diffMs = Date.now() - new Date(isoString).getTime();
            const diffMin = Math.floor(diffMs / 60000);
            if (diffMin < 1) return "now";
            if (diffMin < 60) return `${diffMin}m`;
            const diffHr = Math.floor(diffMin / 60);
            if (diffHr < 24) return `${diffHr}h`;
            const diffDays = Math.floor(diffHr / 24);
            return `${diffDays}d`;
        } catch (e) {
            return "";
        }
    };

    const rootComments = mood.comments.filter(c => !c.replyTo);
    
    const renderCommentItem = (comment: MoodComment, isReply: boolean = false) => {
        const commentLikes = comment.likes || [];
        const isCommentLiked = commentLikes.includes(currentUser?.id || "");
        const canEdit = currentUser && comment.userId === currentUser.id;
        const canDelete = currentUser && (comment.userId === currentUser.id || isSelf);
        
        return (
            <div key={comment.id} className={clsx("flex gap-2.5 items-start mt-3.5", isReply && "pl-8")}>
                {/* User Avatar */}
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] relative bg-gray-100 dark:bg-gray-800 shrink-0 mt-0.5 overflow-hidden">
                    {!comment.userAvatar ? "👤" : <img src={comment.userAvatar} className="w-full h-full object-cover" />}
                </div>

                {/* Comment content column */}
                <div className="flex-1 min-w-0">
                    {editingCommentId === comment.id ? (
                        <div className="flex flex-col gap-1.5 mt-0.5 bg-gray-50 dark:bg-gray-800/40 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700/60">
                            <input 
                                type="text" 
                                value={editCommentText} 
                                onChange={(e) => setEditCommentText(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                                autoFocus
                            />
                            <div className="flex gap-3 justify-end">
                                <button 
                                    onClick={() => setEditingCommentId(null)} 
                                    className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => {
                                        if (editCommentText.trim()) {
                                            onEditComment(mood.id, comment.id, editCommentText);
                                            setEditingCommentId(null);
                                        }
                                    }} 
                                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="text-sm leading-relaxed text-gray-805 dark:text-gray-200 text-left">
                                <span className="font-bold dark:text-white mr-1.5">{comment.userName}</span>
                                <span className="break-words">{comment.text}</span>
                            </div>
                            {/* Actions line */}
                            <div className="flex flex-wrap items-center gap-3.5 mt-2 text-[13px] text-gray-500 dark:text-zinc-400 font-bold">
                                <span className="text-gray-450 dark:text-zinc-500 font-normal">{formatCommentTime(comment.createdAt)}</span>
                                
                                <button 
                                    onClick={() => onLikeComment(mood.id, comment.id)}
                                    className={clsx("flex items-center gap-1 py-1.5 px-2.5 rounded-lg transition-colors bg-gray-50 dark:bg-zinc-800/35", isCommentLiked ? "text-red-500 bg-red-50/40 dark:bg-red-950/20" : "hover:text-gray-700 dark:hover:text-white")}
                                    title="Like Comment"
                                >
                                    <span>{isCommentLiked ? "❤️" : "🤍"}</span>
                                    {commentLikes.length > 0 && <span className="ml-0.5">{commentLikes.length}</span>}
                                </button>

                                {!isReply && (
                                    <button 
                                        onClick={() => {
                                            setReplyingTo({ commentId: comment.id, userName: comment.userName });
                                            inputRef.current?.focus();
                                        }}
                                        className="py-1.5 px-2.5 rounded-lg bg-gray-50 dark:bg-zinc-800/35 hover:text-gray-750 dark:hover:text-white transition-colors"
                                    >
                                        Reply
                                    </button>
                                )}

                                {canEdit && (
                                    <button 
                                        onClick={() => {
                                            setEditingCommentId(comment.id);
                                            setEditCommentText(comment.text);
                                        }}
                                        className="py-1.5 px-2.5 rounded-lg bg-gray-50 dark:bg-zinc-800/35 hover:text-gray-755 dark:hover:text-white transition-colors"
                                    >
                                        Edit
                                    </button>
                                )}

                                {canDelete && (
                                    <button 
                                        onClick={() => onDeleteComment(mood.id, comment.id)}
                                        className="py-1.5 px-2.5 rounded-lg bg-red-50/20 dark:bg-red-950/10 text-red-500 hover:text-red-600 transition-colors"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div id={`feed-mood-${mood.id}`} className="w-full bg-white dark:bg-gray-900 border-b-8 border-gray-100 dark:border-gray-950 overflow-hidden shrink-0 flex flex-col lg:flex-row lg:h-[600px]">

            {/* Left Pane: Media Display */}
            <div className="w-full lg:w-[58%] bg-transparent lg:bg-black flex items-center justify-center relative h-auto lg:h-full overflow-hidden shrink-0">
                {/* Blurred backdrop reflection to eliminate black bars on desktop/portrait */}
                <div className="absolute inset-0 select-none pointer-events-none overflow-hidden hidden lg:block opacity-45">
                    {mood.type === "photo" ? (
                        <img src={mood.mediaUrl} className="w-full h-full object-cover blur-2xl scale-110" alt="" />
                    ) : (
                        <video src={mood.mediaUrl} className="w-full h-full object-cover blur-2xl scale-110" muted loop autoPlay playsInline />
                    )}
                </div>

                {mood.type === "photo" ? (
                    <img src={mood.mediaUrl} alt={mood.caption} className="w-full h-auto lg:h-full lg:object-contain relative z-10" />
                ) : (
                    <video src={mood.mediaUrl} className="w-full h-auto lg:h-full lg:object-contain relative z-10" controls autoPlay loop muted />
                )}
            </div>

            {/* Right Pane: Info & Comments */}
            <div className="w-full lg:w-[42%] flex flex-col lg:h-full border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-gray-850 bg-white dark:bg-gray-900 overflow-hidden">
                {/* Desktop-only owner header, hidden on mobile */}
                <div className="hidden lg:flex p-3 border-b border-gray-50 dark:border-gray-800 items-center justify-between shrink-0 bg-white dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className={clsx("w-9 h-9 rounded-full flex items-center justify-center text-sm relative shrink-0", mood.userColor || "bg-gray-200")}>
                            {!mood.userAvatar ? "👤" : <img src={mood.userAvatar} className="w-full h-full rounded-full object-cover" />}
                        </div>
                        <div>
                            <h4 className="font-bold text-sm dark:text-white leading-tight">{mood.userName}</h4>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                {new Date(mood.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    {isSelf && (
                        <div className="flex items-center gap-1.5">
                            <button 
                                onClick={() => {
                                    setIsEditingCaption(true);
                                    setCaptionText(mood.caption || "");
                                }}
                                className="p-2 text-gray-400 hover:text-indigo-500 transition-colors"
                                title="Edit Caption"
                            >
                                <Pencil size={16} />
                            </button>
                            <button 
                                onClick={() => onDelete(mood.id)}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete Post"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Content & Comments List (scrollable on desktop) */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col min-h-0 text-left">
                    {(mood.caption || isEditingCaption) && (
                        <div className="hidden lg:block mb-4 text-sm text-left pb-3 border-b border-gray-50 dark:border-gray-800/40 shrink-0">
                            {isEditingCaption ? (
                                <div className="flex flex-col gap-2 w-full mt-1 bg-gray-50 dark:bg-gray-800/30 p-3 rounded-xl border border-gray-200 dark:border-gray-700/60">
                                    <textarea 
                                        value={captionText} 
                                        onChange={(e) => setCaptionText(e.target.value)}
                                        placeholder="Add a caption..."
                                        className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 min-h-[60px] resize-none"
                                        autoFocus
                                    />
                                    <div className="flex gap-3 justify-end">
                                        <button 
                                            onClick={() => setIsEditingCaption(false)} 
                                            className="text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={() => {
                                                onUpdate(mood.id, { caption: captionText.trim() });
                                                setIsEditingCaption(false);
                                            }} 
                                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <span className="font-bold dark:text-white mr-2">{mood.userName}</span>
                                    <span className="text-gray-800 dark:text-gray-200 break-words">{mood.caption}</span>
                                </>
                            )}
                        </div>
                    )}

                    {/* Mobile Likes & Comments Row (Instagram style below caption) */}
                    <div className="lg:hidden flex items-center gap-4.5 py-1 mb-2">
                        <button 
                            onClick={() => onLike(mood.id)}
                            className="flex items-center gap-1.5 transition-colors group"
                        >
                            <Heart 
                                size={22} 
                                className={clsx(
                                    "transition-transform group-active:scale-90",
                                    mood.likes.includes(currentUser?.id || "") ? "text-red-500 fill-red-500" : "text-gray-800 dark:text-white group-hover:text-gray-500"
                                )} 
                            />
                            <span className="font-bold text-sm dark:text-white">{mood.likes.length}</span>
                        </button>
                        <button 
                            onClick={onOpenCommentsDrawer}
                            className="flex items-center gap-1.5 text-gray-800 dark:text-white hover:opacity-75 transition-opacity"
                        >
                            <MessageCircle size={22} className="scale-x-[-1]" />
                            <span className="font-bold text-sm">{mood.comments.length}</span>
                        </button>
                    </div>

                    {/* Mobile Owner Info & Caption Row (Combined like Instagram) */}
                    <div className="lg:hidden flex gap-2.5 items-start pb-3.5 mb-2 border-b border-gray-105 dark:border-zinc-800">
                        {/* Creator Avatar */}
                        <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center text-xs relative shrink-0 overflow-hidden", mood.userColor || "bg-gray-200")}>
                            {!mood.userAvatar ? "👤" : <img src={mood.userAvatar} className="w-full h-full object-cover" />}
                        </div>

                        {/* Content column */}
                        <div className="flex-1 min-w-0 text-left">
                            {isEditingCaption ? (
                                <div className="flex flex-col gap-2 w-full mt-1 bg-gray-50 dark:bg-gray-800/30 p-3 rounded-xl border border-gray-200 dark:border-gray-700/60">
                                    <textarea 
                                        value={captionText} 
                                        onChange={(e) => setCaptionText(e.target.value)}
                                        placeholder="Add a caption..."
                                        className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 min-h-[60px] resize-none"
                                        autoFocus
                                    />
                                    <div className="flex gap-3 justify-end">
                                        <button 
                                            onClick={() => setIsEditingCaption(false)} 
                                            className="text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={() => {
                                                onUpdate(mood.id, { caption: captionText.trim() });
                                                setIsEditingCaption(false);
                                            }} 
                                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="text-sm leading-relaxed text-gray-805 dark:text-gray-205">
                                        <span className="font-bold dark:text-white mr-2">{mood.userName}</span>
                                        <span className="break-words text-gray-800 dark:text-gray-200">{mood.caption || <span className="text-gray-400 italic">No caption yet</span>}</span>
                                    </div>

                                    {/* Action line */}
                                    <div className="flex items-center gap-3.5 mt-2 text-[11px] text-gray-400 dark:text-zinc-500 font-bold">
                                        <span>{new Date(mood.createdAt).toLocaleDateString()}</span>
                                        
                                        {isSelf && (
                                            <>
                                                <button 
                                                    onClick={() => {
                                                        setIsEditingCaption(true);
                                                        setCaptionText(mood.caption || "");
                                                    }}
                                                    className="hover:underline hover:text-gray-700 dark:hover:text-white"
                                                >
                                                    Edit
                                                </button>
                                                <button 
                                                    onClick={() => onDelete(mood.id)}
                                                    className="hover:underline text-red-500/80 dark:text-red-400/80 hover:text-red-600"
                                                >
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>


                    {/* Comments header/divider on desktop */}
                    <div className="hidden lg:block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 shrink-0">
                        Comments ({mood.comments.length})
                    </div>

                    {/* Comments List */}
                    <div className="hidden lg:block space-y-4 flex-1 overflow-y-auto min-h-0 pr-1">
                        {rootComments.length === 0 ? (
                            <p className="text-xs text-gray-500 italic py-2">No comments yet. Be the first!</p>
                        ) : (
                            rootComments.map((rootComment) => {
                                const replies = mood.comments.filter(c => c.replyTo === rootComment.id);
                                return (
                                    <div key={rootComment.id} className="border-b border-gray-50/30 dark:border-gray-800/10 pb-3">
                                        {/* Render Root Comment */}
                                        {renderCommentItem(rootComment, false)}
                                        
                                        {/* Render Nested Replies */}
                                        {replies.map((reply) => renderCommentItem(reply, true))}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Sticky Actions & Add Comment Input at bottom */}
                <div className="hidden lg:block p-4 border-t border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
                    
                    {/* Replying Indicator Bar */}
                    {replyingTo && (
                        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl mb-3 border border-gray-100 dark:border-gray-700/50 animate-in slide-in-from-bottom-2 duration-150">
                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                                Replying to @{replyingTo.userName}
                            </span>
                            <button 
                                onClick={() => setReplyingTo(null)}
                                className="p-1 hover:bg-gray-250 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <X size={12} className="text-gray-400" />
                            </button>
                        </div>
                    )}

                    <div className="hidden lg:flex items-center gap-4 mb-3">
                        <button 
                            onClick={() => onLike(mood.id)}
                            className="flex items-center gap-1.5 transition-colors group"
                        >
                            <Heart 
                                size={22} 
                                className={clsx(
                                    "transition-transform group-active:scale-90",
                                    mood.likes.includes(currentUser?.id || "") ? "text-red-500 fill-red-500" : "text-gray-800 dark:text-white group-hover:text-gray-500"
                                )} 
                            />
                            <span className="font-bold text-sm dark:text-white">{mood.likes.length}</span>
                        </button>
                        <div className="flex items-center gap-1.5 text-gray-800 dark:text-white">
                            <MessageCircle size={22} className="scale-x-[-1]" />
                            <span className="font-bold text-sm">{mood.comments.length}</span>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <input
                            ref={inputRef}
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && commentText.trim()) {
                                    onComment(mood.id, commentText, replyingTo?.commentId);
                                    setCommentText("");
                                    setReplyingTo(null);
                                }
                            }}
                            placeholder={replyingTo ? `Reply to @${replyingTo.userName}...` : "Add a comment..."}
                            className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white placeholder:text-gray-400"
                        />
                        <button
                            onClick={() => {
                                if (commentText.trim()) {
                                    onComment(mood.id, commentText, replyingTo?.commentId);
                                    setCommentText("");
                                    setReplyingTo(null);
                                }
                            }}
                            disabled={!commentText.trim()}
                            className="px-3 py-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm disabled:opacity-50 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"
                        >
                            Post
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
// --------------------------------------------------------

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { clsx } from "clsx";
import { useModalHistory } from "@/hooks/useModalHistory";
import { useCall } from "@/context/CallContext";

const VIEWER_GRADIENTS = [
    "from-violet-600 via-purple-500 to-fuchsia-500",
    "from-cyan-500 via-blue-500 to-indigo-600",
    "from-amber-500 via-orange-500 to-red-500",
    "from-emerald-500 via-teal-500 to-cyan-500",
    "from-rose-500 via-pink-500 to-purple-500",
    "from-gray-900 via-zinc-800 to-black",
];

const GRADIENT_STYLES: Record<string, string> = {
    "from-violet-600 via-purple-500 to-fuchsia-500": "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #d946ef 100%)",
    "from-cyan-500 via-blue-500 to-indigo-600": "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #4f46e5 100%)",
    "from-amber-500 via-orange-500 to-red-500": "linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)",
    "from-emerald-500 via-teal-500 to-cyan-500": "linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #06b6d4 100%)",
    "from-rose-500 via-pink-500 to-purple-500": "linear-gradient(135deg, #f43f5e 0%, #ec4899 50%, #a855f7 100%)",
    "from-gray-900 via-zinc-800 to-black": "linear-gradient(135deg, #111827 0%, #27272a 50%, #000000 100%)",
    "from-blue-600 to-indigo-600": "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
};

const RELATIONSHIP_GOALS = [
  { emoji: "💍", label: "Love that leads to Forever" },
  { emoji: "💒", label: "Wife/Hubby me now" },
  { emoji: "🌊", label: "See where things go" },
  { emoji: "🤝", label: "New friends & connections" },
];

const renderDraftText = (text: string, users: User[], currentUser: User) => {
    if (!text) return "";
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, index) => {
        if (part.startsWith("@")) {
            const username = part.slice(1);
            const matchedUser = [currentUser, ...users].find(
                u => u.name.toLowerCase() === username.toLowerCase()
            );
            if (matchedUser) {
                return (
                    <button
                        key={index}
                        onClick={(e) => {
                            e.stopPropagation();
                            window.history.pushState(null, "", `/profile?userId=${matchedUser.id}`);
                        }}
                        className="text-blue-500 hover:underline font-semibold focus:outline-none"
                    >
                        {part}
                    </button>
                );
            }
        }
        return part;
    });
};

const CONFETTI_PARTICLES = Array.from({ length: 40 }).map((_, i) => {
    const size = ((i * 17) % 9) + 6; // 6 to 14
    const left = (i * 27) % 100;    // 0 to 99
    const delay = ((i * 13) % 15) / 10; // 0 to 1.4s
    const duration = (((i * 7) % 20) / 10) + 1.5; // 1.5s to 3.4s
    const colors = ["bg-amber-400", "bg-yellow-300", "bg-fuchsia-500", "bg-blue-400", "bg-emerald-400", "bg-rose-400"];
    const randomColor = colors[i % colors.length];
    return { size, left, delay, duration, randomColor };
});

export default function ProfileView({ userId: propUserId, onClose }: { userId?: string | null; onClose?: () => void } = {}) {
    const router = useRouter();
    const { initiateCall } = useCall();
    const { currentUser, threads, requests, suggestions, sendIcebreaker, acceptRequest, declineRequest, saveContact, blockUser, reportUser, startDirectChat, allDatingUsers, isProfileLoaded, getMoodsForUser, moods, postMood, deleteMood, updateMood, likeMood, commentOnMood, likeCommentOnMood, editCommentOnMood, deleteCommentOnMood, drafts, postDraft, deleteDraft, likeDraft, commentOnDraft, getStatusesForUser, postStatus, updateStatus, deleteStatus, uploadImageToStorage, boostStatus, addNotification, currentSearchParams, setActiveTab: setGlobalActiveTab, setActiveThreadId, updateGroupProfile, leaveGroup, deleteThread, makeGroupAdmin, removeUserFromGroup, addUsersToGroup, updateAvatar } = useMockData();
    const userId = propUserId || currentSearchParams.get("userId") || "me";
    const [isStartingChat, setIsStartingChat] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [showConfirmBlock, setShowConfirmBlock] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showConfirmLeaveGroup, setShowConfirmLeaveGroup] = useState(false);
    const [showConfirmDeleteGroup, setShowConfirmDeleteGroup] = useState(false);
    const [selectedMemberForMenu, setSelectedMemberForMenu] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [showAddMembersModal, setShowAddMembersModal] = useState(false);
    const [selectedAddMemberIds, setSelectedAddMemberIds] = useState<Set<string>>(new Set());
    const [addMembersSearch, setAddMembersSearch] = useState("");

    const handleAddMembersConfirm = async () => {
        if (!groupThread || selectedAddMemberIds.size === 0) return;
        const userIds = Array.from(selectedAddMemberIds);
        await addUsersToGroup(groupThread.id, userIds);
        setSelectedAddMemberIds(new Set());
        setAddMembersSearch("");
        setShowAddMembersModal(false);
    };

    // Edit Group Profile state
    const [showEditGroupModal, setShowEditGroupModal] = useState(false);
    const [editGroupName, setEditGroupName] = useState("");
    const [editGroupBio, setEditGroupBio] = useState("");
    const [editGroupLocation, setEditGroupLocation] = useState("");
    const [editGroupAvatar, setEditGroupAvatar] = useState<string | null>(null);
    const [isSavingGroup, setIsSavingGroup] = useState(false);
    const editGroupAvatarFileRef = useRef<HTMLInputElement>(null);

    // Moods state
    const [showMoodCreator, setShowMoodCreator] = useState(false);
    const [moodCaption, setMoodCaption] = useState("");
    const [moodMediaPreview, setMoodMediaPreview] = useState<string | null>(null);
    const [moodMediaType, setMoodMediaType] = useState<"photo" | "video">("photo");
    const [isMoodUploading, setIsMoodUploading] = useState(false);
    const [viewingMood, setViewingMood] = useState<Mood | null>(null);
    const [commentsDrawerMoodId, setCommentsDrawerMoodId] = useState<string | null>(null);
    const moodFileRef = useRef<HTMLInputElement>(null);

    // Tab state
    const [activeTab, setActiveTab] = useState<"moods" | "clips" | "tweet">("moods");
    const [viewingStatus, setViewingStatus] = useState<any | null>(null);
    const [prevUserId, setPrevUserId] = useState<string | null>(null);

    if (userId !== prevUserId) {
        setPrevUserId(userId);
        setIsStartingChat(false);
        setShowMoreMenu(false);
        setMessage("");
        setIsSending(false);
        setIsSent(false);
        setShowConfirmBlock(false);
        setShowReportModal(false);
        setActiveTab("moods");
        setViewingMood(null);
        setCommentsDrawerMoodId(null);
        setViewingStatus(null);
    }
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const [transitionDirection, setTransitionDirection] = useState<"right" | "left" | null>(null);

    const [seenStatusIds, setSeenStatusIds] = useState<Set<string>>(new Set());

    const isStatusRead = (s: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
        const slides = s.mediaItems && s.mediaItems.length > 0
            ? s.mediaItems
            : (s.mediaUrl ? [{ id: 'legacy', mediaUrl: s.mediaUrl }] : []);
        if (slides.length === 0) {
            return seenStatusIds.has(s.id) || seenStatusIds.has(`${s.id}_text`);
        }
        return slides.every((slide: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => seenStatusIds.has(`${s.id}_${slide.id}`));
    };

    useEffect(() => {
        try {
            const stored = localStorage.getItem("mesh_seen_status_ids");
            if (stored) {
                setSeenStatusIds(new Set(JSON.parse(stored)));
            }
        } catch (e) {
            console.error("Failed to load seen status IDs:", e);
        }
    }, []);

    const markStatusAsSeen = (statusId: string) => {
        setSeenStatusIds((prev) => {
            if (prev.has(statusId)) return prev;
            const next = new Set(prev);
            next.add(statusId);
            try {
                localStorage.setItem("mesh_seen_status_ids", JSON.stringify(Array.from(next)));
            } catch (e) {
                console.error("Failed to save seen status IDs:", e);
            }
            return next;
        });
    };

    const handleBack = useCallback(() => {
        if (onClose) {
            onClose();
            return;
        }
        const userIdParam = currentSearchParams.get("userId");
        const groupIdParam = currentSearchParams.get("groupId");
        const fromParam = currentSearchParams.get("from");
        const fromThreadIdParam = currentSearchParams.get("fromThreadId");
        
        if (fromThreadIdParam) {
            const thread = threads?.find(t => t.id === fromThreadIdParam);
            const isCarpool = fromParam === "carpool" || fromParam === "rides" || !!(thread && ((thread as any).isRideInquiry || (thread as any).marketplaceItemId?.startsWith("ride_")));
            const isMarket = fromParam === "marketplace" || (thread && isMarketplaceThread(thread));
            if (isCarpool) {
                setGlobalActiveTab("marketplace");
                setActiveThreadId(fromThreadIdParam);
                window.history.replaceState(null, "", `/inbox?id=${fromThreadIdParam}&from=carpool`);
            } else if (isMarket) {
                setGlobalActiveTab("marketplace");
                setActiveThreadId(fromThreadIdParam);
                window.history.replaceState(null, "", `/inbox?id=${fromThreadIdParam}&from=marketplace`);
            } else {
                setActiveThreadId(fromThreadIdParam);
                window.history.replaceState(null, "", `/inbox?id=${fromThreadIdParam}`);
            }
            window.dispatchEvent(new Event("locationchange"));
            return;
        }
        
        if (fromParam === "admin") {
            window.history.pushState(null, "", "/admin?tab=support");
            window.dispatchEvent(new Event("locationchange"));
            return;
        }
        if (fromParam === "marketplace") {
            setActiveThreadId(null);
            setGlobalActiveTab("marketplace");
            window.history.pushState(null, "", "/marketplace");
            return;
        }
        if (fromParam === "calls") {
            setActiveThreadId(null);
            setGlobalActiveTab("calls");
            window.history.pushState(null, "", "/calls");
            return;
        }
        if (fromParam === "clips") {
            setActiveThreadId(null);
            setGlobalActiveTab("requests");
            window.history.pushState(null, "", "/requests?tab=clips");
            return;
        }
        if (fromParam === "requests") {
            setActiveThreadId(null);
            setGlobalActiveTab("requests");
            window.history.pushState(null, "", "/requests");
            return;
        }
        if (fromParam === "chats") {
            setActiveThreadId(null);
            setGlobalActiveTab("chats");
            window.history.pushState(null, "", "/");
            return;
        }
        
        setActiveThreadId(null);
        setGlobalActiveTab("chats");
        window.history.pushState(null, "", "/");
    }, [currentSearchParams, threads, setActiveThreadId, setGlobalActiveTab]);

    const [showPfpPreview, setShowPfpPreview] = useState(false);
    const pfpTimerRef = useRef<any>(null);
    const isPfpLongPress = useRef(false);

    const startPfpPress = useCallback(() => {
        isPfpLongPress.current = false;
        pfpTimerRef.current = setTimeout(() => {
            isPfpLongPress.current = true;
            setShowPfpPreview(true);
            if (navigator.vibrate) {
                navigator.vibrate(15);
            }
        }, 500);
    }, []);

    const endPfpPress = useCallback((action: () => void) => {
        if (pfpTimerRef.current) {
            clearTimeout(pfpTimerRef.current);
        }
        if (!isPfpLongPress.current) {
            action();
        }
        isPfpLongPress.current = false;
    }, []);

    const cancelPfpPress = useCallback(() => {
        if (pfpTimerRef.current) {
            clearTimeout(pfpTimerRef.current);
        }
    }, []);

    const closePfpPreview = useCallback(() => {
        setTimeout(() => {
            setShowPfpPreview(false);
        }, 300);
    }, []);
    const [isPaused, setIsPaused] = useState(false);
    const pressStartTimeRef = useRef<number>(0);
    const statusSwipeStartX = useRef(0);
    const statusSwipeStartY = useRef(0);
    // Swipe-to-dismiss states for status viewer
    const [statusDragY, setStatusDragY] = useState(0);
    const [isStatusDragging, setIsStatusDragging] = useState(false);
    const statusDragStartY = useRef(0);
    const [statusContextMenu, setStatusContextMenu] = useState<{ x: number; y: number; status: any /* eslint-disable-line @typescript-eslint/no-explicit-any */ } | null>(null);
    const [showStatusEditModal, setShowStatusEditModal] = useState<any | null>(null);
    const [highlightUploadArea, setHighlightUploadArea] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState<{ statusId: string; currentTitle: string } | null>(null);
    const editFileInputRef = useRef<HTMLInputElement>(null);
    const [renameInput, setRenameInput] = useState("");
    const [statusToDelete, setStatusToDelete] = useState<string | null>(null);

    // Unified Post Modal States
    const [showPostModal, setShowPostModal] = useState(false);
    const [postType, setPostType] = useState<"status" | "tweet" | "moods" | "clips">("status");
    const [newStatusText, setNewStatusText] = useState("");
    const [statusMediaUrl, setStatusMediaUrl] = useState<string | null>(null);
    const [statusMediaType, setStatusMediaType] = useState<"photo" | "video" | null>(null);
    const [statusBgType, setStatusBgType] = useState<"color" | "media">("color");
    const [selectedBgColor, setSelectedBgColor] = useState(VIEWER_GRADIENTS[3]);
    const [mediaError, setMediaError] = useState<string | null>(null);
    const [isPosting, setIsPosting] = useState(false);
    const statusFileInputRef = useRef<HTMLInputElement>(null);

    // Status Boosting States
    const [isBoostSelected, setIsBoostSelected] = useState(false);
    const boostDuration = 1 as number;
    const paymentMethod = 'simulated';
    const [showConfetti, setShowConfetti] = useState(false);

    // Swipe-to-dismiss states for post modal
    const [postDragY, setPostDragY] = useState(0);
    const [isPostDragging, setIsPostDragging] = useState(false);
    const postDragStartY = useRef(0);
    const postDragStartScrollTop = useRef(0);

    const handlePostTouchStart = (e: React.TouchEvent) => {
        const target = e.target as HTMLElement;
        
        // If the target is an input, textarea, or button/link, don't initiate drag to dismiss
        if (
            target.tagName === "INPUT" || 
            target.tagName === "TEXTAREA" || 
            target.tagName === "BUTTON" || 
            target.closest("button") || 
            target.closest("input") || 
            target.closest("textarea")
        ) {
            setIsPostDragging(false);
            return;
        }

        const scrollContainer = target.closest(".overflow-y-auto");
        if (scrollContainer) {
            postDragStartScrollTop.current = scrollContainer.scrollTop;
        } else {
            postDragStartScrollTop.current = 0;
        }

        postDragStartY.current = e.touches[0].clientY;
        setIsPostDragging(true);
    };

    const handlePostTouchMove = (e: React.TouchEvent) => {
        if (!isPostDragging) return;
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - postDragStartY.current;

        // Only drag down (deltaY > 0) and only if the scroll container is at the top
        if (deltaY > 0 && postDragStartScrollTop.current <= 0) {
            setPostDragY(deltaY);
            if (e.cancelable) {
                e.preventDefault();
            }
        }
    };

    const handlePostTouchEnd = () => {
        setIsPostDragging(false);
        if (postDragY > 120) {
            setShowPostModal(false);
            setNewStatusText("");
            clearSelectedMedia();
            setPostType("status");
        }
        setPostDragY(0);
    };

    // Swipe-to-dismiss states for mood viewer modal
    const [moodDragY, setMoodDragY] = useState(0);
    const [isMoodDragging, setIsMoodDragging] = useState(false);
    const moodDragStartY = useRef(0);

    const handleMoodTouchStart = (e: React.TouchEvent) => {
        const target = e.target as HTMLElement;
        
        // Ignore dragging if clicking buttons inside the header
        if (
            target.tagName === "BUTTON" || 
            target.closest("button")
        ) {
            setIsMoodDragging(false);
            return;
        }

        moodDragStartY.current = e.touches[0].clientY;
        setIsMoodDragging(true);
    };

    const handleMoodTouchMove = (e: React.TouchEvent) => {
        if (!isMoodDragging) return;
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - moodDragStartY.current;
        
        // Only allow dragging down (positive translation)
        if (deltaY > 0) {
            setMoodDragY(deltaY);
            if (e.cancelable) {
                e.preventDefault();
            }
        } else {
            setMoodDragY(0);
        }
    };

    const handleMoodTouchEnd = () => {
        setIsMoodDragging(false);
        if (moodDragY > 120) {
            setViewingMood(null);
        }
        setMoodDragY(0);
    };

    // Swipe-to-dismiss states for other popup modals (Block, Report, Mood Creator)
    const [popupDragY, setPopupDragY] = useState(0);
    const [isPopupDragging, setIsPopupDragging] = useState(false);
    const popupDragStartY = useRef(0);

    const handlePopupTouchStart = (e: React.TouchEvent) => {
        popupDragStartY.current = e.touches[0].clientY;
        setIsPopupDragging(true);
    };
    const handlePopupTouchMove = (e: React.TouchEvent) => {
        if (!isPopupDragging) return;
        const deltaY = e.touches[0].clientY - popupDragStartY.current;
        if (deltaY > 0) setPopupDragY(deltaY);
    };
    const handlePopupTouchEnd = (closeModalFn: () => void) => {
        setIsPopupDragging(false);
        if (popupDragY > 120) {
            closeModalFn();
        }
        setPopupDragY(0);
    };

    // Lock body scroll and disable pull-to-refresh when any modal is open
    const anyModalOpen = showConfirmBlock || showReportModal || showMoodCreator || showPostModal || !!showStatusEditModal || !!showRenameModal || !!viewingMood || showEditGroupModal || showConfirmLeaveGroup || showConfirmDeleteGroup;
    useEffect(() => {
        if (anyModalOpen) {
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            document.body.style.overflow = "hidden";
            document.body.style.overscrollBehaviorY = "contain";
            if (scrollbarWidth > 0) {
                document.body.style.paddingRight = `${scrollbarWidth}px`;
            }
        } else {
            document.body.style.overflow = "";
            document.body.style.overscrollBehaviorY = "";
            document.body.style.paddingRight = "";
        }
        return () => {
            document.body.style.overflow = "";
            document.body.style.overscrollBehaviorY = "";
            document.body.style.paddingRight = "";
        };
    }, [anyModalOpen]);

    // Modal history integration for Android back-button dismissal
    useModalHistory("showPostModal", showPostModal, () => { setShowPostModal(false); setNewStatusText(""); clearSelectedMedia(); });
    useModalHistory("showConfirmBlock", showConfirmBlock, () => { setShowConfirmBlock(false); });
    useModalHistory("showReportModal", showReportModal, () => { setShowReportModal(false); });
    useModalHistory("showMoodCreator", showMoodCreator, () => { setShowMoodCreator(false); });
    useModalHistory("showEditGroupModal", showEditGroupModal, () => { setShowEditGroupModal(false); });
    useModalHistory("showConfirmLeaveGroup", showConfirmLeaveGroup, () => { setShowConfirmLeaveGroup(false); });
    useModalHistory("showConfirmDeleteGroup", showConfirmDeleteGroup, () => { setShowConfirmDeleteGroup(false); });
    useModalHistory("addMembersModal", showAddMembersModal, () => setShowAddMembersModal(false));
    useModalHistory("pfpPreview", showPfpPreview, closePfpPreview);

    // Window touchmove interceptor when dragging
    useEffect(() => {
        if (isPostDragging || isMoodDragging || isPopupDragging) {
            const handleTouchMove = (e: TouchEvent) => {
                if (e.cancelable) e.preventDefault();
            };
            window.addEventListener("touchmove", handleTouchMove, { passive: false });
            return () => {
                window.removeEventListener("touchmove", handleTouchMove);
            };
        }
    }, [isPostDragging, isMoodDragging, isPopupDragging]);

    // Autocomplete states for unified modal draft composer
    const [showDraftSuggestions, setShowDraftSuggestions] = useState(false);
    const [filteredDraftSuggestions, setFilteredDraftSuggestions] = useState<User[]>([]);
    const [draftMentionTriggerIndex, setDraftMentionTriggerIndex] = useState(-1);

    // Comments & compose states for drafts tab
    const [expandedDraftComments, setExpandedDraftComments] = useState<{ [draftId: string]: boolean }>({});
    const [draftCommentText, setDraftCommentText] = useState<{ [draftId: string]: string }>({});

    const [quickDraftText, setQuickDraftText] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState<User[]>([]);
    const [mentionTriggerIndex, setMentionTriggerIndex] = useState(-1);

    // Find user from threads, requests, suggestions, or check if self
    const isSelf = userId === "me" || userId === currentUser?.id || userId.startsWith("my_scoop_") || (currentUser?.id === "5bc4bOg4fHYjNhutsstxO2GuENE3" && userId === "G9AZEt3LhfXWGYyTn3QTm8WwNi62") || (currentUser?.id === "BXMyJRrbIDTBkTQ9e7Z92WAWUFB2" && userId === "NQ8D7dt6QAb7wpkMfl2zB9b6IRF3");
    const thread = !isSelf ? threads.find(t => t.user.id === userId) : undefined;
    const request = !isSelf ? requests.find(r => r.user.id === userId) : undefined;
    const suggestion = !isSelf ? suggestions.find(s => s.id === userId) : undefined;

    const groupThread = useMemo(() => {
        const gid = currentSearchParams.get("groupId");
        return threads.find(t => (t.id === userId || (gid && t.id === gid)) && t.isGroup);
    }, [threads, userId, currentSearchParams]);

    const isGroupProfile = !!groupThread;
    const isGroupAdmin = isGroupProfile && currentUser && (
        (groupThread?.adminIds && groupThread.adminIds.length > 0 ? groupThread.adminIds : [groupThread?.creatorId || groupThread?.initiatedBy || ""]).includes(currentUser.id)
    );

    const user = useMemo(() => {
        if (isGroupProfile && groupThread) {
            return {
                id: groupThread.id,
                name: groupThread.groupName || "Group",
                avatar: groupThread.groupAvatar || null,
                color: "bg-emerald-500",
                age: 0,
                bio: groupThread.groupBio || "Group Profile",
                photos: groupThread.groupAvatar ? [groupThread.groupAvatar] : []
            } as any;
        }
        if (isSelf) return currentUser;
        const found = thread?.user || request?.user || suggestion || allDatingUsers.find(u => u.id === userId);
        if (found) return found;

        // Clip Creator Fallback Profile
        const clipMatch = INITIAL_YOGHEART_CLIPS.find(c => c.creator.id === userId);
        if (clipMatch) {
            return {
                id: clipMatch.creator.id,
                name: clipMatch.creator.name,
                avatar: clipMatch.creator.avatar,
                color: "bg-emerald-500",
                age: 24,
                bio: clipMatch.caption,
                jobTitle: "Content Creator & Yogi",
                company: "Yogheart Community",
                location: "Montreal, QC",
                distance: "3 km away",
                interests: ["Yoga", "Clips", "Music", "Photography", "Travel", "Wellness"],
                photos: [clipMatch.posterUrl, clipMatch.creator.avatar],
                relationshipGoal: "Long-term partner",
                education: "B.A. Communications",
                drinking: "Socially",
                smoking: "Never",
                exercise: "Every day",
                verified: clipMatch.creator.isVerified
            } as any;
        }

        return null;
    }, [isGroupProfile, groupThread, isSelf, currentUser, thread?.user, request?.user, suggestion, allDatingUsers, userId]);

    const isSavedContact = !isSelf && (thread?.user.isSavedContact || false);

    const sharedMedia = useMemo(() => {
        if (!isGroupProfile || !groupThread) {
            return { images: [], videos: [], files: [] };
        }
        const messages = groupThread.messages || [];
        const images = messages
            .filter(m => m.type === "image" && m.imageUrl)
            .map(m => ({
                id: m.id,
                url: m.imageUrl!,
                time: m.time
            }));
        const videos = messages
            .filter(m => m.type === "video" && m.imageUrl)
            .map(m => ({
                id: m.id,
                url: m.imageUrl!,
                time: m.time
            }));
        const files = messages
            .filter(m => m.type === "file" && m.imageUrl)
            .map(m => ({
                id: m.id,
                fileUrl: m.imageUrl!,
                fileName: m.fileName || "Shared File",
                fileSize: m.fileSize || "Unknown size",
                time: m.time
            }));
        return { images, videos, files };
    }, [isGroupProfile, groupThread]);

    const userMoods = useMemo(() => {
        if (!user) return [];
        return getMoodsForUser(user.id).filter(m => m.type === "photo");
    }, [getMoodsForUser, user?.id]);

    const userClips = useMemo(() => {
        if (!user) return [];
        return getMoodsForUser(user.id).filter(m => m.type === "video");
    }, [getMoodsForUser, user?.id]);


    const moodsToShow = useMemo(() => {
        if (!isGroupProfile || !user) return userMoods;
        const chatShared = sharedMedia.images.map(img => ({
            id: img.id,
            userId: user.id,
            userName: user.name,
            userAvatar: user.avatar,
            userColor: user.color || "bg-emerald-500",
            type: "photo" as const,
            mediaUrl: img.url,
            caption: "Shared in group chat",
            createdAt: img.time || new Date().toISOString(),
            likes: [],
            comments: [],
            isShared: true
        } as Mood));
        return [...userMoods, ...chatShared];
    }, [isGroupProfile, userMoods, sharedMedia.images, user]);

    const clipsToShow = useMemo(() => {
        if (!isGroupProfile || !user) return userClips;
        const chatShared = sharedMedia.videos.map(v => ({
            id: v.id,
            userId: user.id,
            userName: user.name,
            userAvatar: user.avatar,
            userColor: user.color || "bg-emerald-500",
            type: "video" as const,
            mediaUrl: v.url,
            caption: "Shared in group chat",
            createdAt: v.time || new Date().toISOString(),
            likes: [],
            comments: [],
            isShared: true
        } as Mood));
        return [...userClips, ...chatShared];
    }, [isGroupProfile, userClips, sharedMedia.videos, user]);

    const privacySettings = (user?.settings?.privacy || {}) as any;
    const pfpPrivacy = privacySettings.profilePicture || "everyone";
    const datingPrivacy = privacySettings.datingDetails || "everyone";
    const feedsPrivacy = privacySettings.feeds || "everyone";

    const canSeePfp = isSelf || pfpPrivacy === "everyone" || (pfpPrivacy === "contacts" && isSavedContact);
    const canSeeDatingDetails = isSelf || datingPrivacy === "everyone" || (datingPrivacy === "contacts" && isSavedContact);
    const canSeeFeeds = isSelf || feedsPrivacy === "everyone" || (feedsPrivacy === "contacts" && isSavedContact);

    const profilePhoto = canSeePfp ? (user?.avatar || (user?.photos && user.photos.length > 0 ? user.photos[0] : null)) : null;
    const isFromSuggestions = !isSelf && !!suggestion && !thread && !request;
    const isFromRequests = !isSelf && !!request;
    const isConnected = !isSelf && !!thread;
    const isUnconnected = !isSelf && !thread && !request && !suggestion && !!user;
    const userStatuses = user ? getStatusesForUser(user.id) : [];
    const activeStatuses = userStatuses.filter(s => Date.now() - new Date(s.timestamp).getTime() <= 24 * 60 * 60 * 1000);
    const hasActiveStatus = activeStatuses.length > 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const profileStatuses = user ? [...getStatusesForUser(user.id)].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) : [];
    const currentStatusIndex = viewingStatus ? profileStatuses.findIndex(s => s.id === viewingStatus.id) : -1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const viewingSlides = viewingStatus
        ? (viewingStatus.mediaItems && viewingStatus.mediaItems.length > 0 
            ? viewingStatus.mediaItems 
            : (viewingStatus.mediaUrl ? [{ id: 'legacy', mediaUrl: viewingStatus.mediaUrl, mediaType: viewingStatus.mediaType || 'photo' }] : []))
        : [];

    useEffect(() => {
        if (viewingStatus) {
            markStatusAsSeen(viewingStatus.id);
            markStatusAsSeen(`${viewingStatus.id}_text`);
            if (viewingSlides.length === 0) {
                // Text status or status without slides
            } else if (viewingSlides[activeSlideIndex]) {
                const currentSlide = viewingSlides[activeSlideIndex];
                markStatusAsSeen(`${viewingStatus.id}_${currentSlide.id}`);
            }
        }
    }, [viewingStatus, activeSlideIndex, viewingSlides]);

    useEffect(() => {
        if (user && hasActiveStatus && currentSearchParams.get("viewStatus") === "true") {
            const firstUnread = activeStatuses.find(s => !isStatusRead(s));
            const targetStatus = firstUnread || activeStatuses[0];
            if (targetStatus) {
                setViewingStatus(targetStatus);
                setActiveSlideIndex(0);
                
                const url = new URL(window.location.href);
                url.searchParams.delete("viewStatus");
                window.history.replaceState(null, "", url.pathname + url.search);
            }
        }
    }, [user, hasActiveStatus, activeStatuses, currentSearchParams]);

    useModalHistory("statusViewer", !!viewingStatus, () => { setViewingStatus(null); setActiveSlideIndex(0); });

    const handlePrevSlide = useCallback(() => {
        if (!viewingStatus) return;
        if (activeSlideIndex > 0) {
            setActiveSlideIndex(prev => prev - 1);
        } else if (currentStatusIndex > 0) {
            setTransitionDirection("left");
            setTimeout(() => setTransitionDirection(null), 400);
            const prevStatus = profileStatuses[currentStatusIndex - 1];
            setViewingStatus(prevStatus);
            const prevSlides = prevStatus.mediaItems && prevStatus.mediaItems.length > 0
                ? prevStatus.mediaItems
                : (prevStatus.mediaUrl ? [{ id: 'legacy', mediaUrl: prevStatus.mediaUrl, mediaType: prevStatus.mediaType || 'photo' }] : []);
            setActiveSlideIndex(prevSlides.length > 0 ? prevSlides.length - 1 : 0);
        } else {
            setActiveSlideIndex(0);
        }
    }, [viewingStatus, activeSlideIndex, currentStatusIndex, profileStatuses]);

    const handleNextSlide = useCallback(() => {
        if (!viewingStatus) return;
        if (activeSlideIndex < viewingSlides.length - 1) {
            setActiveSlideIndex(prev => prev + 1);
        } else if (currentStatusIndex < profileStatuses.length - 1) {
            setTransitionDirection("right");
            setTimeout(() => setTransitionDirection(null), 400);
            const nextStatus = profileStatuses[currentStatusIndex + 1];
            setViewingStatus(nextStatus);
            setActiveSlideIndex(0);
        } else {
            setViewingStatus(null);
        }
    }, [viewingStatus, activeSlideIndex, viewingSlides.length, currentStatusIndex, profileStatuses]);

    // Auto-advance statuses
    useEffect(() => {
        if (!viewingStatus || isPaused) return;

        const duration = 5000; // 5 seconds per slide
        const timer = setTimeout(() => {
            handleNextSlide();
        }, duration);

        return () => clearTimeout(timer);
    }, [viewingStatus, activeSlideIndex, isPaused, handleNextSlide]);

    const handlePressStart = (e: React.MouseEvent | React.TouchEvent) => {
        pressStartTimeRef.current = Date.now();
        setIsPaused(true);
        if ("touches" in e && e.touches.length > 0) {
            statusSwipeStartX.current = e.touches[0].clientX;
            statusSwipeStartY.current = e.touches[0].clientY;
        } else if ("clientX" in e) {
            statusSwipeStartX.current = (e as React.MouseEvent).clientX;
            statusSwipeStartY.current = (e as React.MouseEvent).clientY;
        }
    };

    const handlePressMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isPaused) return;
        
        let clientX = 0;
        let clientY = 0;
        if ("touches" in e && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if ("clientX" in e) {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }
        
        const deltaX = clientX - statusSwipeStartX.current;
        const deltaY = clientY - statusSwipeStartY.current;
        
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
            return;
        }
    };

    const handlePressEnd = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isPaused) return; // Already resumed
        setIsPaused(false);
        
        let clientX = 0;
        let clientY = 0;
        
        const isTouchEvent = "changedTouches" in e && e.changedTouches && e.changedTouches.length > 0;
        if (isTouchEvent) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
            if (e.cancelable) {
                e.preventDefault();
            }
        } else if ("clientX" in e) {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }
        
        const deltaX = clientX - statusSwipeStartX.current;
        const deltaY = clientY - statusSwipeStartY.current;
        const threshold = 40; // Swipe threshold
        
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
            if (deltaX > 0) {
                // Swipe right: previous status document
                if (currentStatusIndex > 0) {
                    const prevStatus = profileStatuses[currentStatusIndex - 1];
                    setViewingStatus(prevStatus);
                    setActiveSlideIndex(0);
                }
            } else {
                // Swipe left: next status document
                if (currentStatusIndex < profileStatuses.length - 1) {
                    const nextStatus = profileStatuses[currentStatusIndex + 1];
                    setViewingStatus(nextStatus);
                    setActiveSlideIndex(0);
                } else {
                    setViewingStatus(null);
                }
            }
            return; // Prevent tap navigation
        }
        
        const duration = Date.now() - pressStartTimeRef.current;
        if (duration < 350) {
            // Quick tap: navigate
            const currentTarget = e.currentTarget as HTMLElement;
            const rect = currentTarget.getBoundingClientRect();
            const clickX = clientX - rect.left;
            const width = rect.width;
            
            if (clickX < width * 0.4) {
                handlePrevSlide();
            } else {
                handleNextSlide();
            }
        }
    };

    const handlePressCancel = () => {
        setIsPaused(false);
    };

    const activeViewingMood = viewingMood && user ? (getMoodsForUser(user.id).find(m => m.id === viewingMood.id) || viewingMood) : null;



    useModalHistory("moodViewer", !!viewingMood, () => { setViewingMood(null); });
    useModalHistory("commentsDrawer", !!commentsDrawerMoodId, () => { setCommentsDrawerMoodId(null); });

    // Scroll to the clicked mood when the feed opens
    useEffect(() => {
        if (viewingMood) {
            const timer = setTimeout(() => {
                const element = document.getElementById(`feed-mood-${viewingMood.id}`);
                const container = document.getElementById('mood-feed-container');
                if (element && container) {
                    container.scrollTop = element.offsetTop;
                }
            }, 50); // Small delay to allow modal to render
            return () => clearTimeout(timer);
        }
    }, [viewingMood]);



    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);


    // Use effect to handle isLoading state and prevent flickering screens
    useEffect(() => {
        // If it's self and currentUser is loaded, stop loading immediately
        if (isSelf && isProfileLoaded) {
            setIsLoading(false);
        }
    }, [isSelf, isProfileLoaded]);

    // Check user data loaded state
    const isReady = isSelf ? isProfileLoaded : (!!user && user.id !== "me");

    // Effect to check when Firestore is loaded and data is parsed
    useEffect(() => {
        if (!hasMounted) return;
        if (isReady) {
            setIsLoading(false);
        } else {
            if (isProfileLoaded) {
                const timer = setTimeout(() => {
                    setIsLoading(false);
                }, 800);
                return () => clearTimeout(timer);
            }
        }
    }, [isReady, isProfileLoaded, hasMounted, userId]);

    useEffect(() => {
        if (!currentSearchParams) return;
        const success = currentSearchParams.get("success");
        const statusId = currentSearchParams.get("statusId");
        const duration = currentSearchParams.get("duration");

        if (success === "true" && statusId && duration) {
            const durationHrs = parseInt(duration, 10) || 1;
            const amount = durationHrs === 24 ? 19.99 : durationHrs === 6 ? 9.99 : 2.99;
            boostStatus(statusId, durationHrs, "stripe", amount);
            setShowConfetti(true);
            setTimeout(() => {
                setShowConfetti(false);
            }, 3000);
            
            // Clean up query parameters
            window.history.replaceState(null, "", "/profile?userId=me");
        }
    }, [currentSearchParams, boostStatus, router]);

    useEffect(() => {
        if (groupThread) {
            setEditGroupName(groupThread.groupName || "");
            setEditGroupBio(groupThread.groupBio || "");
            setEditGroupLocation(groupThread.groupLocation || "");
            setEditGroupAvatar(groupThread.groupAvatar || null);
        }
    }, [groupThread, showEditGroupModal]);

    if (!user && (!hasMounted || isLoading)) {
        return (
            <div className="flex items-center justify-center h-full bg-white dark:bg-gray-900">
                <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-[var(--secondary)] p-8 bg-white dark:bg-gray-900">
                <p className="text-lg mb-4 dark:text-gray-300">User not found</p>
                <button onClick={() => router.back()} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-blue-600">
                    Go Back
                </button>
            </div>
        );
    }

    const handleSendMessage = () => {
        if (message.trim() && suggestion) {
            setIsSending(true);
            sendIcebreaker(suggestion, message);
            setTimeout(() => {
                setIsSending(false);
                setIsSent(true);
                setTimeout(() => {
                    window.history.pushState(null, "", "/");
                }, 1500);
            }, 500);
        }
    };

    const handleStartDirectChat = async () => {
        if (!user || isSelf) return;
        setIsStartingChat(true);
        try {
            const threadId = await startDirectChat(user);
            if (threadId) {
                setGlobalActiveTab("chats");
                setActiveThreadId(threadId);
                window.history.replaceState(null, "", `/inbox?id=${threadId}`);
            }
        } finally {
            setIsStartingChat(false);
        }
    };

    const handleAccept = () => {
        if (request) {
            acceptRequest(request.id);
            window.history.pushState(null, "", "/");
        }
    };

    const handleDecline = () => {
        if (request) {
            declineRequest(request.id);
            setGlobalActiveTab("requests");
            window.history.pushState(null, "", "/requests");
        }
    };

    const handleSaveContact = () => {
        if (thread) {
            saveContact(thread.user.id);
        }
    };

    const handleBlockUser = () => {
        blockUser(user.id);
        setShowConfirmBlock(false);
        setShowMoreMenu(false);
        window.history.pushState(null, "", "/");
    };

    const handleReport = (reason: string) => {
        reportUser(user.id, reason);
        setShowReportModal(false);
        setShowMoreMenu(false);
    };

    const handleGroupAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setEditGroupAvatar(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSaveGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupThread) return;
        setIsSavingGroup(true);
        try {
            await updateGroupProfile(
                groupThread.id,
                editGroupName.trim(),
                editGroupBio.trim(),
                editGroupLocation.trim(),
                editGroupAvatar
            );
            setShowEditGroupModal(false);
        } catch (err) {
            console.error("Failed to save group details:", err);
        } finally {
            setIsSavingGroup(false);
        }
    };

    const confirmLeaveGroup = async () => {
        if (!groupThread) return;
        await leaveGroup(groupThread.id);
        setShowConfirmLeaveGroup(false);
        setGlobalActiveTab("chats");
        window.history.pushState(null, "", "/");
    };

    const confirmDeleteGroup = async () => {
        if (!groupThread) return;
        await deleteThread(groupThread.id, false);
        setShowConfirmDeleteGroup(false);
        setGlobalActiveTab("chats");
        window.history.pushState(null, "", "/");
    };

    const handleMemberChat = async (memberUser: User) => {
        const directThread = threads.find(t => !t.isGroup && t.user?.id === memberUser.id);
        if (directThread) {
            setActiveThreadId(directThread.id);
            window.history.replaceState(null, "", `/inbox?id=${directThread.id}`);
        } else {
            try {
                const newThreadId = await startDirectChat(memberUser);
                setActiveThreadId(newThreadId);
                window.history.replaceState(null, "", `/inbox?id=${newThreadId}`);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleMemberCall = (memberUser: User, type: "audio" | "video") => {
        initiateCall(memberUser.id, memberUser.name, memberUser.avatar || null, type);
    };

    const handleMemberBlock = (memberUser: User) => {
        const confirmed = window.confirm(`Are you sure you want to block ${memberUser.name}?`);
        if (confirmed) {
            blockUser(memberUser.id);
            addNotification(`${memberUser.name} has been blocked.`);
        }
    };

    const handleMemberRemove = async (memberUser: User) => {
        if (!groupThread) return;
        const confirmed = window.confirm(`Are you sure you want to remove ${memberUser.name} from the group?`);
        if (confirmed) {
            await removeUserFromGroup(groupThread.id, memberUser.id);
            addNotification(`${memberUser.name} has been removed from the group.`);
        }
    };

    const handleMemberMakeAdmin = async (memberUser: User) => {
        if (!groupThread) return;
        await makeGroupAdmin(groupThread.id, memberUser.id);
    };

    const handleMoodFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isVideo = file.type.startsWith("video/");
        setMoodMediaType(isVideo ? "video" : "photo");

        const reader = new FileReader();
        reader.onloadend = () => {
            setMoodMediaPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleCreateMood = async () => {
        if (!moodMediaPreview) return;
        setIsMoodUploading(true);
        try {
            await postMood(moodMediaType, moodMediaPreview, moodCaption, undefined, isGroupProfile ? groupThread?.id : undefined);
            setShowMoodCreator(false);
            setMoodCaption("");
            setMoodMediaPreview(null);
        } catch (err) {
            console.error("Failed to post mood:", err);
        } finally {
            setIsMoodUploading(false);
        }
    };

    const handleQuickDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setQuickDraftText(text);
        
        const cursor = e.target.selectionStart;
        const beforeCursor = text.slice(0, cursor);
        const lastAt = beforeCursor.lastIndexOf("@");
        
        if (lastAt !== -1 && lastAt >= beforeCursor.lastIndexOf(" ")) {
            const queryStr = beforeCursor.slice(lastAt + 1);
            setMentionTriggerIndex(lastAt);
            setShowSuggestions(true);
            
            const list = [currentUser, ...allDatingUsers].filter(
                u => u.name.toLowerCase().includes(queryStr.toLowerCase())
            );
            setFilteredSuggestions(list);
        } else {
            setShowSuggestions(false);
        }
    };

    const selectSuggestion = (targetUser: User) => {
        if (mentionTriggerIndex === -1) return;
        const text = quickDraftText;
        const beforeTrigger = text.slice(0, mentionTriggerIndex);
        const afterCursor = text.slice(mentionTriggerIndex).replace(/^@[a-zA-Z0-9_]*/, "");
        
        const newText = beforeTrigger + `@${targetUser.name} ` + afterCursor;
        setQuickDraftText(newText);
        setShowSuggestions(false);
        setMentionTriggerIndex(-1);
    };

    const submitQuickDraft = async () => {
        if (!quickDraftText.trim()) return;
        await postDraft(quickDraftText, isGroupProfile ? groupThread?.id : undefined);
        setQuickDraftText("");
    };

    // Modal helpers
    const handleDraftTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setNewStatusText(text);
        
        const cursor = e.target.selectionStart;
        const beforeCursor = text.slice(0, cursor);
        const lastAt = beforeCursor.lastIndexOf("@");
        
        if (lastAt !== -1 && lastAt >= beforeCursor.lastIndexOf(" ")) {
            const queryStr = beforeCursor.slice(lastAt + 1);
            setDraftMentionTriggerIndex(lastAt);
            setShowDraftSuggestions(true);
            
            const list = [currentUser, ...allDatingUsers].filter(
                u => u.name.toLowerCase().includes(queryStr.toLowerCase())
            );
            setFilteredDraftSuggestions(list);
        } else {
            setShowDraftSuggestions(false);
        }
    };

    const selectDraftSuggestion = (targetUser: User) => {
        if (draftMentionTriggerIndex === -1) return;
        const text = newStatusText;
        const beforeTrigger = text.slice(0, draftMentionTriggerIndex);
        const afterCursor = text.slice(draftMentionTriggerIndex).replace(/^@[a-zA-Z0-9_]*/, "");
        
        const newText = beforeTrigger + `@${targetUser.name} ` + afterCursor;
        setNewStatusText(newText);
        setShowDraftSuggestions(false);
        setDraftMentionTriggerIndex(-1);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setMediaError(null);

        const maxSize = 20 * 1024 * 1024; // 20MB
        if (file.size > maxSize) {
            setMediaError("File size exceeds 20MB limit.");
            return;
        }

        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");

        if (!isImage && !isVideo) {
            setMediaError("Only image and video files are supported.");
            return;
        }

        if (postType === "moods" && !isImage) {
            setMediaError("Please upload an image/photo for Moods.");
            return;
        }
        if (postType === "clips" && !isVideo) {
            setMediaError("Please upload a video for Clips.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
                setStatusMediaUrl(dataUrl);
                setStatusMediaType(isImage ? "photo" : "video");
                setStatusBgType("media");
            }
        };
        reader.onerror = () => {
            setMediaError("Error reading file.");
        };
        reader.readAsDataURL(file);
    };

    const clearSelectedMedia = () => {
        setStatusMediaUrl(null);
        setStatusMediaType(null);
        setMediaError(null);
        setStatusBgType("color");
        if (statusFileInputRef.current) {
            statusFileInputRef.current.value = "";
        }
    };

    const handlePost = async () => {
        setIsPosting(true);
        try {
            if (postType === "status") {
                if (!newStatusText.trim() && !statusMediaUrl) {
                    setIsPosting(false);
                    return;
                }
                const newStatusId = await postStatus(
                    newStatusText.trim() || undefined,
                    statusMediaUrl || undefined,
                    statusMediaType || undefined,
                    statusBgType === "color" ? selectedBgColor : undefined,
                    isGroupProfile ? groupThread?.id : undefined
                );

                if (newStatusId && isBoostSelected) {
                    const amount = boostDuration === 24 ? 19.99 : boostDuration === 6 ? 9.99 : 2.99;
                    if (paymentMethod === "simulated") {
                        await boostStatus(newStatusId, boostDuration, "simulated", amount);
                        setShowConfetti(true);
                        setTimeout(() => {
                            setShowConfetti(false);
                            setShowPostModal(false);
                            setNewStatusText("");
                            clearSelectedMedia();
                            setIsBoostSelected(false);
                        }, 1800);
                        return;
                    } else {
                        try {
                            const STRIPE_SECRET_KEY = process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || "";
                            const amountCents = Math.round(amount * 100);
                            const productName = `${boostDuration} Hour Status Boost`;
                            const successUrl = `${window.location.origin}/profile?userId=me&success=true&duration=${boostDuration}&statusId=${newStatusId}`;
                            const cancelUrl = `${window.location.origin}/profile?userId=me&cancel=true`;

                            const params = new URLSearchParams();
                            params.append("payment_method_types[0]", "card");
                            params.append("line_items[0][price_data][currency]", "usd");
                            params.append("line_items[0][price_data][product_data][name]", productName);
                            params.append("line_items[0][price_data][product_data][description]", `Promote your status update for ${boostDuration} hours to the top of the Status Pool.`);
                            params.append("line_items[0][price_data][unit_amount]", String(amountCents));
                            params.append("line_items[0][quantity]", "1");
                            params.append("mode", "payment");
                            params.append("success_url", successUrl);
                            params.append("cancel_url", cancelUrl);

                            const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
                                method: "POST",
                                headers: {
                                    "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
                                    "Content-Type": "application/x-www-form-urlencoded",
                                },
                                body: params.toString(),
                            });

                            const data = await response.json();
                            if (data.url) {
                                window.location.href = data.url;
                                return;
                            } else {
                                alert(`Stripe Checkout Error: ${data.error?.message || "Unable to create Stripe Checkout session."}`);
                                setIsPosting(false);
                                return;
                            }
                        } catch (err: any) {
                            console.error("Stripe redirect failed:", err);
                            alert(`Stripe Connection Error: ${err?.message || "Failed to connect to Stripe."}`);
                            setIsPosting(false);
                            return;
                        }
                    }
                }
            } else if (postType === "tweet") {
                if (!newStatusText.trim()) {
                    setIsPosting(false);
                    return;
                }
                await postDraft(newStatusText, isGroupProfile ? groupThread?.id : undefined);
            } else if (postType === "moods" || postType === "clips") {
                if (!statusMediaUrl) {
                    setIsPosting(false);
                    return;
                }
                await postMood(
                    postType === "moods" ? "photo" : "video",
                    statusMediaUrl,
                    newStatusText,
                    undefined,
                    isGroupProfile ? groupThread?.id : undefined
                );
            }
            
            setNewStatusText("");
            clearSelectedMedia();
            setShowPostModal(false);
        } catch (err) {
            console.error("Error creating post:", err);
        } finally {
            if (!isBoostSelected || paymentMethod === "simulated") {
                setIsPosting(false);
            }
        }
    };



    return (
        <div className={clsx(
            "h-full overflow-y-auto pb-20 md:pb-4 bg-[var(--background)] dark:bg-gray-900",
            !isSelf && "slide-in-right"
        )}>
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 px-3 md:px-4 py-3 flex items-center justify-between border-b border-[var(--border)] dark:border-gray-700 sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    {(!isSelf || !!onClose || !!propUserId || !!currentSearchParams.get("from")) && (
                        <button 
                            onClick={handleBack} 
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors cursor-pointer flex items-center justify-center shrink-0"
                            title="Back"
                        >
                            <ArrowLeft size={24} className="text-[var(--primary)]" />
                        </button>
                    )}
                    <h1 className="text-lg font-semibold dark:text-white">Profile</h1>
                </div>
                {isSelf ? (
                    <button
                        onClick={() => {
                            const fromParam = currentSearchParams.get("from");
                            window.history.pushState(null, "", `/profile?userId=me&settings=overlay${fromParam ? `&from=${fromParam}` : ""}`);
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-700 dark:text-gray-200 shrink-0"
                        title="Settings"
                    >
                        <Settings size={22} className="text-gray-700 dark:text-gray-200" />
                    </button>
                ) : (
                    <div className="relative">
                        <button
                            onClick={() => setShowMoreMenu(!showMoreMenu)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        >
                            <MoreVertical size={20} className="text-[var(--secondary)]" />
                        </button>
                        {showMoreMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-[var(--border)] dark:border-gray-700 py-2 min-w-[160px] z-50">
                                    <button
                                        onClick={() => setShowConfirmBlock(true)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left dark:text-gray-200"
                                    >
                                        <Ban size={18} className="text-[var(--secondary)]" /> Block
                                    </button>
                                    <button
                                        onClick={() => setShowReportModal(true)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left text-[var(--danger)]"
                                    >
                                        <Flag size={18} /> Report
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </header>


            {/* Profile Header/Avatar (Left-aligned like Instagram) */}
            <div className="flex items-start gap-5 md:gap-8 p-6 md:p-8 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700/50">
                <div className="flex-shrink-0 relative">
                    {isGroupProfile ? (
                        <button
                            onClick={() => setShowPfpPreview(true)}
                            className="w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center bg-emerald-100 dark:bg-[#12382f] text-[#00a884] dark:text-[#00c89a] border border-gray-100 dark:border-gray-700 shadow-sm shrink-0 outline-none hover:scale-105 active:scale-95 transition-all"
                        >
                            {groupThread?.groupAvatar && (groupThread.groupAvatar.startsWith("http") || groupThread.groupAvatar.startsWith("data:") || groupThread.groupAvatar.startsWith("/")) ? (
                                <img src={groupThread.groupAvatar} alt={groupThread.groupName} className="w-full h-full rounded-full object-cover select-none pointer-events-none" />
                            ) : groupThread?.groupAvatar ? (
                                <span className="text-3xl md:text-5xl select-none">{groupThread.groupAvatar}</span>
                            ) : (
                                <Users className="w-10 h-10 md:w-14 md:h-14" />
                            )}
                        </button>
                    ) : hasActiveStatus ? (
                        <button
                            onMouseDown={startPfpPress}
                            onMouseUp={() => endPfpPress(() => {
                                const firstUnread = activeStatuses.find(s => !isStatusRead(s));
                                const targetStatus = firstUnread || activeStatuses[0];
                                setViewingStatus(targetStatus);
                                const slides = targetStatus.mediaItems && targetStatus.mediaItems.length > 0 
                                    ? targetStatus.mediaItems 
                                    : (targetStatus.mediaUrl ? [{ id: 'legacy', mediaUrl: targetStatus.mediaUrl }] : []);
                                const firstUnreadSlideIdx = slides.findIndex((slide: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => !seenStatusIds.has(`${targetStatus.id}_${slide.id}`));
                                setActiveSlideIndex(firstUnreadSlideIdx >= 0 ? firstUnreadSlideIdx : 0);
                            })}
                            onMouseLeave={cancelPfpPress}
                            onTouchStart={startPfpPress}
                            onTouchEnd={() => endPfpPress(() => {
                                const firstUnread = activeStatuses.find(s => !isStatusRead(s));
                                const targetStatus = firstUnread || activeStatuses[0];
                                setViewingStatus(targetStatus);
                                const slides = targetStatus.mediaItems && targetStatus.mediaItems.length > 0 
                                    ? targetStatus.mediaItems 
                                    : (targetStatus.mediaUrl ? [{ id: 'legacy', mediaUrl: targetStatus.mediaUrl }] : []);
                                const firstUnreadSlideIdx = slides.findIndex((slide: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => !seenStatusIds.has(`${targetStatus.id}_${slide.id}`));
                                setActiveSlideIndex(firstUnreadSlideIdx >= 0 ? firstUnreadSlideIdx : 0);
                            })}
                            onTouchCancel={cancelPfpPress}
                            onContextMenu={(e) => e.preventDefault()}
                            className={clsx(
                                "w-20 h-20 md:w-28 md:h-28 rounded-full p-[3px] hover:scale-105 active:scale-95 transition-all shadow-md flex items-center justify-center cursor-pointer",
                                activeStatuses.every(s => isStatusRead(s))
                                    ? "bg-gray-300 dark:bg-gray-700"
                                    : "story-gradient-ring bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600"
                            )}
                            style={!activeStatuses.every(s => isStatusRead(s)) ? { background: "linear-gradient(45deg, #f59e0b, #f43f5e, #9333ea)" } : undefined}
                        >
                            <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 p-[2.5px]">
                                <div className={clsx("w-full h-full rounded-full flex items-center justify-center overflow-hidden", user.color)}>
                                    {profilePhoto && (profilePhoto.startsWith("http") || profilePhoto.startsWith("data:") || profilePhoto.startsWith("/")) ? (
                                        <img src={profilePhoto} alt="Profile" className="w-full h-full rounded-full object-cover object-[center_20%] select-none pointer-events-none" />
                                    ) : profilePhoto ? (
                                        <span className="text-2xl md:text-4xl select-none">{profilePhoto}</span>
                                    ) : (
                                        <span className="text-2xl md:text-4xl select-none">👤</span>
                                    )}
                                </div>
                            </div>
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                setShowPfpPreview(true);
                            }}
                            className={clsx("w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all outline-none", user.color)}
                        >
                            {profilePhoto && (profilePhoto.startsWith("http") || profilePhoto.startsWith("data:") || profilePhoto.startsWith("/")) ? (
                                <img src={profilePhoto} alt="Profile" className="w-full h-full rounded-full object-cover object-[center_20%] select-none pointer-events-none" />
                            ) : profilePhoto ? (
                                <span className="text-3xl md:text-5xl select-none">{profilePhoto}</span>
                            ) : (
                                <span className="text-3xl md:text-5xl select-none">👤</span>
                            )}
                        </button>
                    )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                            {isGroupProfile ? (groupThread?.groupName || user.name) : user.name}
                        </h2>

                        {isGroupProfile && isGroupAdmin && (
                            <button
                                onClick={() => setShowEditGroupModal(true)}
                                className="self-start md:self-auto px-4 py-1.5 border border-gray-200 dark:border-gray-700 bg-gray-50/50 hover:bg-gray-100 dark:bg-gray-800/40 dark:hover:bg-gray-800 text-gray-750 dark:text-gray-200 text-xs font-semibold rounded-lg shadow-sm active:scale-95 transition-all"
                            >
                                Edit Group Profile
                            </button>
                        )}
                        {isSavedContact && (
                            <div className="flex items-center gap-1 text-xs text-[var(--primary)] font-medium">
                                <UserCheck size={14} /> Saved contact
                            </div>
                        )}
                    </div>

                    <p className="text-sm text-[var(--secondary)] dark:text-gray-300 whitespace-pre-line leading-relaxed max-w-xl">{user.bio}</p>

                    {/* Phone number inline */}
                    {(user.phoneNumber || (user as any).phone) && (
                        <p className="text-xs text-[var(--secondary)] dark:text-gray-400 mt-1.5 flex items-center gap-1.5">
                            <Phone size={12} className="opacity-60" />
                            <span className="font-medium dark:text-gray-300">{user.phoneNumber || (user as any).phone}</span>
                        </p>
                    )}

                    {/* Location Badge */}
                    {user.location && (
                        <div className="flex flex-wrap gap-1.5 mt-2 mb-1 max-w-xl">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-50 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-400 border border-cyan-100/50 dark:border-cyan-900/30 rounded-full text-xs font-medium shadow-sm">
                                <span className="text-xs">📍</span> {user.location}
                            </span>
                        </div>
                    )}



                    {(() => {
                        const privacySettings = currentUser?.settings?.privacy || {};
                        const showOnline = privacySettings.onlineStatus !== false;
                        const showLastSeen = privacySettings.lastSeen !== false;
                        const isOnline = isSelf || user.lastSeen === "online";
                        if (isOnline && showOnline) {
                            return (
                                <p className="text-xs text-[var(--success)] mt-2 flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--success)] animate-pulse" /> Online now
                                </p>
                            );
                        }
                        if (!isOnline && showLastSeen) {
                            const lastMsgFromThem = thread
                                ? [...(thread.messages || [])].reverse().find(m => m.sender === "them")
                                : null;
                            const fallbackTimestamp = lastMsgFromThem?.createdAt || null;
                            const effectiveLastSeen = user.lastSeen || fallbackTimestamp;
                            if (effectiveLastSeen) {
                                return (
                                    <p className="text-xs text-[var(--secondary)] dark:text-gray-400 mt-1.5">
                                        Last seen {formatLastSeen(user.lastSeen, fallbackTimestamp)}
                                    </p>
                                );
                            }
                        }
                        return null;
                    })()}
                </div>
            </div>

            {/* ──────── Group Members Section (Group Only) ──────── */}
            {isGroupProfile && (
                <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">BLEND MEMBERS ({groupThread?.groupMemberIds?.length || 0})</h3>
                    <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                        {isGroupAdmin && (
                            <button 
                                onClick={() => setShowAddMembersModal(true)}
                                className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-xl transition-colors text-left text-[#00a884] dark:text-[#00c89a] font-semibold text-[14px] cursor-pointer mb-1 border border-transparent"
                            >
                                <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center shrink-0">
                                    <Users size={16} className="text-[#00a884] dark:text-[#00c89a]" />
                                </div>
                                <span>Add Members</span>
                            </button>
                        )}
                        {(groupThread?.groupMemberIds || []).map(memberId => {
                            const isSelfMember = memberId === currentUser?.id;
                            const memberUser = isSelfMember ? currentUser : allDatingUsers.find(u => u.id === memberId);
                            if (!memberUser) return null;
                            const initial = memberUser.name.charAt(0).toUpperCase() || "?";
                            const isMemberAdmin = (groupThread.adminIds && groupThread.adminIds.length > 0 ? groupThread.adminIds : [groupThread.creatorId || groupThread.initiatedBy || ""]).includes(memberId);
                            return (
                                <div 
                                    key={memberId}
                                    onClick={() => {
                                        if (!isSelfMember) {
                                            setSelectedMemberForMenu(memberUser);
                                        } else {
                                            window.history.pushState(null, "", `/profile?userId=me`);
                                        }
                                    }}
                                    className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-full shrink-0 relative overflow-hidden flex items-center justify-center">
                                            {memberUser.avatar ? (
                                                <img src={memberUser.avatar} alt={memberUser.name} className="w-full h-full object-cover select-none pointer-events-none" />
                                            ) : (
                                                <div className={clsx("w-full h-full flex items-center justify-center font-bold text-sm text-white", memberUser.color || "bg-emerald-200")}>
                                                    {initial}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <span className="font-semibold text-sm text-gray-900 dark:text-white block truncate">
                                                {memberUser.name} {isSelfMember && <span className="text-xs text-gray-400 font-normal ml-1">(You)</span>}
                                            </span>
                                            <span className="text-xs text-gray-400 dark:text-zinc-500 block truncate">
                                                {memberUser.bio || "Hey there! I'm using Yogheart."}
                                            </span>
                                        </div>
                                    </div>
                                    {isMemberAdmin && (
                                        <span className="text-[10px] bg-emerald-100 dark:bg-[#12382f] text-[#00a884] dark:text-[#00c89a] px-2 py-0.5 rounded-full font-semibold shrink-0">
                                            Admin
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Profile Content Container - fills remaining space */}
            <div className="flex-1 min-h-0">

                {/* ──────── Status Stories Row (Instagram-style) ──────── */}
                {canSeeFeeds && (
                    <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700/50 px-4 md:px-6 py-3">
                        <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                            {/* Add New Status circle (self or group admin) */}
                            {(isSelf || (isGroupProfile && isGroupAdmin)) && (
                                <button
                                    onClick={() => { setPostType("status"); setShowPostModal(true); }}
                                    className="flex flex-col items-center gap-1.5 shrink-0"
                                >
                                    <div className="w-[68px] h-[68px] md:w-[76px] md:h-[76px] rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-800 hover:border-[var(--primary)] hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all">
                                        <Plus size={22} className="text-gray-400" />
                                    </div>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 w-[68px] text-center truncate font-medium">New</span>
                                </button>
                            )}
                            {/* Status circles */}
                            {profileStatuses.map(status => {
                                const isPast = Date.now() - new Date(status.timestamp).getTime() > 24 * 60 * 60 * 1000;
                                return (
                                    <button
                                        key={status.id}
                                        onClick={() => {
                                            setViewingStatus(status);
                                            const slides = status.mediaItems && status.mediaItems.length > 0 
                                                ? status.mediaItems 
                                                : (status.mediaUrl ? [{ id: 'legacy', mediaUrl: status.mediaUrl }] : []);
                                            const firstUnreadSlideIdx = slides.findIndex((slide: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => !seenStatusIds.has(`${status.id}_${slide.id}`));
                                            setActiveSlideIndex(firstUnreadSlideIdx >= 0 ? firstUnreadSlideIdx : 0);
                                        }}
                                        onContextMenu={(e) => {
                                            if (isSelf) {
                                                e.preventDefault();
                                                setStatusContextMenu({
                                                    x: e.clientX,
                                                    y: e.clientY,
                                                    status: status
                                                });
                                            }
                                        }}
                                        className="flex flex-col items-center gap-1.5 shrink-0 group relative"
                                    >
                                        <div 
                                            className={clsx(
                                                "w-[68px] h-[68px] md:w-[76px] md:h-[76px] rounded-full p-[3px] group-hover:scale-105 transition-transform",
                                                isPast || isStatusRead(status)
                                                    ? "bg-gray-300 dark:bg-gray-600" 
                                                    : "story-gradient-ring bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600"
                                            )}
                                            style={!(isPast || isStatusRead(status)) ? { background: "linear-gradient(45deg, #f59e0b, #f43f5e, #9333ea)" } : undefined}
                                        >
                                            <div className="w-full h-full rounded-full overflow-hidden border-[3px] border-white dark:border-gray-900">
                                                {status.mediaUrl ? (
                                                    status.mediaType === "video" ? (
                                                        <video src={status.mediaUrl} className="w-full h-full object-cover" muted />
                                                    ) : (
                                                        <img src={status.mediaUrl} className="w-full h-full object-cover" alt="Status" />
                                                    )
                                                ) : (
                                                    <div 
                                                        className={clsx("w-full h-full bg-gradient-to-br flex items-center justify-center", status.backgroundColor || "from-blue-600 to-indigo-600")}
                                                        style={{ background: GRADIENT_STYLES[status.backgroundColor || ""] || "linear-gradient(135deg, #2563eb, #4f46e5)" }}
                                                    >
                                                        <span className="text-white text-[8px] font-bold text-center px-1 line-clamp-2 leading-tight">{status.textContent?.slice(0, 30)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 w-[68px] text-center truncate font-medium">
                                            {status.title ? status.title : (isPast ? (() => {
                                                try {
                                                    return new Date(status.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                                } catch { return "Story"; }
                                            })() : (() => {
                                                try {
                                                    const diff = Date.now() - new Date(status.timestamp).getTime();
                                                    const mins = Math.floor(diff / 60000);
                                                    if (mins < 1) return "Now";
                                                    if (mins < 60) return `${mins}m`;
                                                    const hrs = Math.floor(mins / 60);
                                                    if (hrs < 24) return `${hrs}h`;
                                                    return new Date(status.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                                } catch { return "Story"; }
                                            })())}
                                        </span>
                                    </button>
                                );
                            })}
                            {/* Empty state when no statuses and not self */}
                            {!isSelf && profileStatuses.length === 0 && (
                                <div className="flex items-center justify-center w-full py-2">
                                    <p className="text-xs text-gray-400 dark:text-gray-500">No stories yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Status Viewer Modal */}
                {viewingStatus && (() => {
                    const slides = viewingStatus.mediaItems && viewingStatus.mediaItems.length > 0 
                        ? viewingStatus.mediaItems 
                        : (viewingStatus.mediaUrl ? [{ id: 'legacy', mediaUrl: viewingStatus.mediaUrl, mediaType: viewingStatus.mediaType || 'photo' }] : []);
                    
                    const currentSlide = slides[activeSlideIndex] || null;

                    // Swipe-to-dismiss handlers
                    const handleStatusTouchStart = (e: React.TouchEvent) => {
                        if ((e.target as HTMLElement).tagName === "INPUT" || 
                            (e.target as HTMLElement).tagName === "TEXTAREA" ||
                            (e.target as HTMLElement).closest(".reply-bar")) {
                            return;
                        }
                        statusDragStartY.current = e.touches[0].clientY;
                        setIsStatusDragging(true);
                    };

                    const handleStatusTouchMove = (e: React.TouchEvent) => {
                        if (!isStatusDragging) return;
                        const clientX = e.touches[0].clientX;
                        const clientY = e.touches[0].clientY;
                        const dx = Math.abs(clientX - statusSwipeStartX.current);
                        const dy = Math.abs(clientY - statusDragStartY.current);

                        if (dx > dy && dx > 10) {
                            // Primarily horizontal swipe, ignore vertical drag
                            return;
                        }

                        const deltaY = clientY - statusDragStartY.current;
                        if (deltaY > 0) {
                            setStatusDragY(deltaY);
                            if (e.cancelable) e.preventDefault();
                        }
                    };

                    const handleStatusTouchEnd = () => {
                        setIsStatusDragging(false);
                        if (statusDragY > 120) {
                            setViewingStatus(null);
                            setActiveSlideIndex(0);
                        }
                        setStatusDragY(0);
                    };

                    return (
                        <div 
                            className="absolute inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 sm:p-0 overflow-hidden"
                            onClick={(e) => {
                                if (e.target !== e.currentTarget) return;
                                const width = window.innerWidth;
                                const clickX = e.clientX;
                                if (clickX < width * 0.4) {
                                    handlePrevSlide();
                                } else {
                                    handleNextSlide();
                                }
                            }}
                            onTouchEnd={(e) => {
                                if (e.target !== e.currentTarget) return;
                                e.preventDefault();
                                const width = window.innerWidth;
                                const clickX = e.changedTouches[0].clientX;
                                if (clickX < width * 0.4) {
                                    handlePrevSlide();
                                } else {
                                    handleNextSlide();
                                }
                            }}
                        >
                            <div 
                                key={viewingStatus?.id}
                                className={clsx(
                                    "relative w-full max-w-lg h-[80vh] rounded-2xl overflow-hidden bg-zinc-950 flex flex-col select-none shadow-2xl",
                                    transitionDirection === "right" && "animate-story-slide-in-right",
                                    transitionDirection === "left" && "animate-story-slide-in-left"
                                )}
                                onClick={(e) => e.stopPropagation()}
                                onTouchStart={handleStatusTouchStart}
                                onTouchMove={handleStatusTouchMove}
                                onTouchEnd={handleStatusTouchEnd}
                                style={{
                                    transform: statusDragY > 0 ? `translateY(${statusDragY}px)` : undefined,
                                    opacity: statusDragY > 0 ? Math.max(0.3, 1 - statusDragY / 600) : 1,
                                    transition: isStatusDragging ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease-out'
                                }}
                            >
                                {/* Segmented Progress Bar */}
                                {viewingSlides.length > 0 && (
                                    <div className="absolute top-2.5 left-4 right-4 flex gap-1.5 z-30">
                                        {viewingSlides.map((_: any /* eslint-disable-line @typescript-eslint/no-explicit-any */, idx: number) => (
                                            <div key={idx} className="h-[3px] flex-1 bg-white/25 rounded-full overflow-hidden">
                                                <div
                                                    className={clsx(
                                                        "h-full bg-white transition-all duration-300",
                                                        idx < activeSlideIndex ? "w-full" : idx === activeSlideIndex ? "w-0" : "w-0"
                                                    )}
                                                    style={{
                                                        animation: idx === activeSlideIndex ? "progressFill 5s linear forwards" : "none",
                                                        animationPlayState: idx === activeSlideIndex ? (isPaused ? "paused" : "running") : "initial"
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Top bar */}
                                <div className="flex items-center justify-between px-4 py-3 pt-5 z-20">
                                    <div className="flex items-center gap-3 pointer-events-none select-none">
                                        <div className={clsx("w-9 h-9 rounded-full flex items-center justify-center text-sm border-2 border-white/30 overflow-hidden", user.color)}>
                                            {profilePhoto && (profilePhoto.startsWith("http") || profilePhoto.startsWith("data:") || profilePhoto.startsWith("/")) ? (
                                                <img src={profilePhoto} className="w-full h-full object-cover" alt="" />
                                            ) : profilePhoto ? (
                                                <span className="text-lg select-none">{profilePhoto}</span>
                                            ) : (
                                                <span className="text-white">👤</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-semibold">{user.name}</p>
                                            <p className="text-white/60 text-[10px]">
                                                {(() => {
                                                    try {
                                                        return new Date(viewingStatus.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                                                    } catch { return "Status"; }
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {isSelf && (
                                            <>
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setShowStatusEditModal(viewingStatus); 
                                                        setViewingStatus(null);
                                                        setHighlightUploadArea(false);
                                                    }} 
                                                    className="w-9 h-9 bg-black/40 hover:bg-black/60 border border-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                                                    title="Edit Status"
                                                >
                                                    <Sparkles size={16} />
                                                </button>
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setStatusToDelete(viewingStatus.id);
                                                    }} 
                                                    className="w-9 h-9 bg-black/40 hover:bg-red-650/80 border border-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                                                    title="Delete Status"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setViewingStatus(null); setActiveSlideIndex(0); }}
                                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                        >
                                            <X size={22} className="text-white" />
                                        </button>
                                    </div>
                                </div>

                                {/* Content area with press/swipe handlers */}
                                <div 
                                    className="flex-1 flex items-center justify-center px-6 relative overflow-hidden cursor-pointer select-none"
                                    onMouseDown={handlePressStart}
                                    onMouseUp={handlePressEnd}
                                    onMouseMove={handlePressMove}
                                    onMouseLeave={handlePressCancel}
                                    onTouchStart={handlePressStart}
                                    onTouchMove={handlePressMove}
                                    onTouchEnd={handlePressEnd}
                                >
                                    {currentSlide ? (
                                        currentSlide.mediaType === "video" ? (
                                            <video src={currentSlide.mediaUrl} className="absolute inset-0 w-full h-full object-cover animate-fade-in" autoPlay loop muted playsInline />
                                        ) : (
                                            <img src={currentSlide.mediaUrl} className="absolute inset-0 w-full h-full object-cover animate-fade-in" alt="Status Slide" />
                                        )
                                    ) : (
                                        <div className={clsx("absolute inset-0 bg-gradient-to-br flex items-center justify-center", viewingStatus.backgroundColor || "from-blue-600 to-indigo-600")} />
                                    )}

                                    {/* Centered glassmorphic caption */}
                                    {viewingStatus.textContent && (
                                        <div className="relative z-10 max-w-sm text-center mx-4 bg-black/45 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-4 shadow-xl">
                                            <p className="text-white text-lg md:text-xl font-semibold leading-relaxed drop-shadow-md break-words">
                                                {viewingStatus.textContent}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Slide counter badge */}
                                {slides.length > 1 && (
                                    <div className="absolute bottom-20 right-4 bg-black/45 backdrop-blur-sm border border-white/10 px-2 py-0.5 rounded text-[10px] text-white/90 z-30 font-medium select-none pointer-events-none">
                                        {activeSlideIndex + 1} / {slides.length}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* ──────── Feed Tabs (Instagram-style icon tabs) ──────── */}
                <div className="bg-white dark:bg-gray-800 mx-4 md:mx-6 mt-4 rounded-xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden min-h-[400px] relative">
                    {!canSeeFeeds ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gray-55 dark:bg-zinc-900/50 backdrop-blur-[1px]">
                            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-zinc-800/80 flex items-center justify-center text-[var(--secondary)] mb-4 border border-gray-150 dark:border-zinc-800 shadow-inner">
                                <Lock size={24} className="text-gray-400 dark:text-zinc-500" />
                            </div>
                            <h3 className="font-bold text-base dark:text-white mb-1">Private Feed</h3>
                            <p className="text-xs text-[var(--secondary)] dark:text-zinc-400 max-w-xs leading-relaxed">
                                {"This user's feed is private. Add them to your contacts to see their moods, clips, and glimpses."}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Icon Tab Switcher */}
                    <div className="flex border-b border-gray-100 dark:border-gray-700/50">
                        {([
                            { key: "moods" as const, icon: <LayoutGrid size={20} />, label: "Moods" },
                            { key: "clips" as const, icon: <Play size={20} />, label: "Clips" },
                            { key: "tweet" as const, icon: <MessageSquare size={20} />, label: "Glimpses" },
                        ]).map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={clsx(
                                    "flex-1 py-3 flex items-center justify-center gap-1.5 transition-all relative",
                                    activeTab === tab.key
                                        ? "text-[var(--primary)]"
                                        : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                )}
                            >
                                {tab.icon}
                                <span className="text-[11px] font-semibold uppercase tracking-wide">{tab.label}</span>
                                {activeTab === tab.key && (
                                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--primary)] rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content Panels */}
                    <div className="space-y-4">
                            <div className={clsx("space-y-4", activeTab !== "tweet" && "hidden")}>
                                {/* Quick Compose Draft for self or group admin */}
                                {(isSelf || (isGroupProfile && isGroupAdmin)) && (
                                    <div className="flex gap-3 items-start border-b border-gray-50 dark:border-gray-700/50 pb-4">
                                        <div className={clsx("w-9 h-9 rounded-full flex items-center justify-center text-sm relative shrink-0", currentUser.color)}>
                                            {currentUser.avatar ? (
                                                <img src={currentUser.avatar} className="w-full h-full rounded-full object-cover" alt="Avatar" />
                                            ) : (
                                                <span>{currentUser.name.charAt(0)}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 relative">
                                            <textarea
                                                value={quickDraftText}
                                                onChange={handleQuickDraftChange}
                                                placeholder="What's on your mind? Tag user profile with @Name..."
                                                className="w-full py-2 bg-transparent text-sm resize-none outline-none dark:text-white min-h-[60px] leading-relaxed"
                                                maxLength={280}
                                            />
                                            
                                            {/* Autocomplete Popup */}
                                            {showSuggestions && filteredSuggestions.length > 0 && (
                                                <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-xl shadow-lg w-64 max-h-[160px] overflow-y-auto z-40 py-1">
                                                    {filteredSuggestions.map((u) => (
                                                        <button
                                                            key={u.id}
                                                            onClick={() => selectSuggestion(u)}
                                                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left text-xs text-gray-805 dark:text-gray-200"
                                                        >
                                                            <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center text-[10px] relative font-semibold shrink-0", u.color)}>
                                                                {u.avatar ? (
                                                                    <img src={u.avatar} className="w-full h-full rounded-full object-cover" />
                                                                ) : (
                                                                    <span>{u.name.charAt(0)}</span>
                                                                )}
                                                            </div>
                                                            <span className="font-semibold truncate">{u.name}</span>
                                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">@{u.name.toLowerCase()}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 dark:border-gray-700/20">
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                                    {280 - quickDraftText.length} characters left
                                                </span>
                                                <button
                                                    onClick={submitQuickDraft}
                                                    disabled={!quickDraftText.trim()}
                                                    className="px-4 py-1 bg-[var(--primary)] text-white text-xs font-semibold rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50"
                                                >
                                                    Post Glimpse
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Drafts List */}
                                {(() => {
                                    const userDrafts = drafts.filter(d => d.userId === user.id);
                                    if (userDrafts.length === 0) {
                                        return (
                                            <div className="text-center py-8">
                                                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                                                    <MessageSquare size={28} className="text-blue-400" />
                                                </div>
                                                <p className="text-sm text-[var(--secondary)] mb-1">No glimpses yet</p>
                                                {isSelf && (
                                                    <p className="text-xs text-[var(--secondary)] opacity-70">Share a glimpse of your day!</p>
                                                )}
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="space-y-4">
                                            {userDrafts.map((draft) => {
                                                const isLiked = draft.likes?.includes(currentUser.id);
                                                const commentsCount = draft.comments?.length || 0;
                                                const isCommentsExpanded = !!expandedDraftComments[draft.id];
                                                const commentInputVal = draftCommentText[draft.id] || "";
                                                
                                                return (
                                                    <div key={draft.id} className="bg-gray-50/50 dark:bg-gray-800/40 rounded-xl p-4 border border-gray-100 dark:border-gray-700/60 space-y-3">
                                                        {/* Header */}
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className={clsx("w-9 h-9 rounded-full flex items-center justify-center text-sm relative shrink-0", draft.userColor)}>
                                                                    {draft.userAvatar ? (
                                                                        <img src={draft.userAvatar} alt={draft.userName} className="w-full h-full rounded-full object-cover" />
                                                                    ) : (
                                                                        <span>{draft.userName.charAt(0)}</span>
                                                                    )}
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className="font-semibold text-sm dark:text-white flex items-center gap-1.5">
                                                                        {draft.userName}
                                                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">@{draft.userName.toLowerCase()}</span>
                                                                    </div>
                                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 block">
                                                                        {(() => {
                                                                            try {
                                                                                const diff = Date.now() - new Date(draft.createdAt).getTime();
                                                                                const mins = Math.floor(diff / 60000);
                                                                                if (mins < 1) return "Just now";
                                                                                if (mins < 60) return `${mins}m ago`;
                                                                                const hrs = Math.floor(mins / 60);
                                                                                if (hrs < 24) return `${hrs}h ago`;
                                                                                return new Date(draft.createdAt).toLocaleDateString();
                                                                            } catch {
                                                                                return "Recently";
                                                                            }
                                                                        })()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {isSelf && (
                                                                <button 
                                                                    onClick={() => deleteDraft(draft.id)}
                                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition-colors"
                                                                    title="Delete Post"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Body */}
                                                        <div className="text-sm text-gray-800 dark:text-gray-255 text-left break-words whitespace-pre-wrap leading-relaxed">
                                                            {renderDraftText(draft.text, allDatingUsers, currentUser)}
                                                        </div>
                                                        
                                                        {/* Footer actions */}
                                                        <div className="flex items-center gap-6 pt-2 border-t border-gray-100/50 dark:border-gray-700/50 text-gray-500 dark:text-gray-400">
                                                            <button 
                                                                onClick={() => likeDraft(draft.id)}
                                                                className="flex items-center gap-1.5 hover:text-red-500 transition-colors group"
                                                            >
                                                                <Heart size={16} className={clsx("transition-transform group-active:scale-125", isLiked && "fill-red-500 text-red-500")} />
                                                                <span className="text-xs">{draft.likes?.length || 0}</span>
                                                            </button>
                                                            
                                                            <button 
                                                                onClick={() => setExpandedDraftComments(prev => ({ ...prev, [draft.id]: !prev[draft.id] }))}
                                                                className="flex items-center gap-1.5 hover:text-[var(--primary)] transition-colors"
                                                            >
                                                                <MessageSquare size={16} />
                                                                <span className="text-xs">{commentsCount}</span>
                                                            </button>
                                                            
                                                            <div className="ml-auto flex items-center gap-1 text-[10px] text-gray-450 dark:text-gray-500">
                                                                <Globe size={11} />
                                                                <span>Public</span>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Comments Area */}
                                                        {isCommentsExpanded && (
                                                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3 animate-in fade-in duration-200">
                                                                {/* Add Comment */}
                                                                <div className="flex gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={commentInputVal}
                                                                        onChange={(e) => setDraftCommentText(prev => ({ ...prev, [draft.id]: e.target.value }))}
                                                                        placeholder="Write a public comment..."
                                                                        className="flex-1 px-3 py-2 text-xs bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-[var(--primary)] dark:text-white"
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === "Enter" && commentInputVal.trim()) {
                                                                                commentOnDraft(draft.id, commentInputVal);
                                                                                setDraftCommentText(prev => ({ ...prev, [draft.id]: "" }));
                                                                            }
                                                                        }}
                                                                    />
                                                                    <button
                                                                        onClick={() => {
                                                                            if (commentInputVal.trim()) {
                                                                                commentOnDraft(draft.id, commentInputVal);
                                                                                setDraftCommentText(prev => ({ ...prev, [draft.id]: "" }));
                                                                            }
                                                                        }}
                                                                        disabled={!commentInputVal.trim()}
                                                                        className="px-3 py-1.5 bg-[var(--primary)] text-white text-xs font-semibold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 shrink-0"
                                                                    >
                                                                        Reply
                                                                    </button>
                                                                </div>
                                                                
                                                                {/* Comments List */}
                                                                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                                                    {commentsCount === 0 ? (
                                                                        <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">No comments yet. Be the first to comment!</p>
                                                                    ) : (
                                                                        draft.comments.map((comment) => (
                                                                            <div key={comment.id} className="flex gap-2.5 items-start text-xs text-left p-2 rounded-lg bg-white/40 dark:bg-gray-900/40">
                                                                                <div className={clsx("w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] relative font-semibold", comment.userColor || "bg-gray-250")}>
                                                                                    {comment.userAvatar ? (
                                                                                        <img src={comment.userAvatar} className="w-full h-full rounded-full object-cover" alt="User" />
                                                                                    ) : (
                                                                                        <span>{comment.userName.charAt(0)}</span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="flex items-baseline justify-between mb-0.5">
                                                                                        <span className="font-semibold dark:text-white text-gray-900">{comment.userName}</span>
                                                                                        <span className="text-[8px] text-gray-400 dark:text-gray-550">
                                                                                            {(() => {
                                                                                                try {
                                                                                                    const diff = Date.now() - new Date(comment.createdAt).getTime();
                                                                                                    const mins = Math.floor(diff / 60000);
                                                                                                    if (mins < 1) return "Now";
                                                                                                    if (mins < 60) return `${mins}m ago`;
                                                                                                    const hrs = Math.floor(mins / 60);
                                                                                                    if (hrs < 24) return `${hrs}h ago`;
                                                                                                    return new Date(comment.createdAt).toLocaleDateString();
                                                                                                } catch {
                                                                                                    return "";
                                                                                                }
                                                                                            })()}
                                                                                        </span>
                                                                                    </div>
                                                                                    <p className="text-gray-600 dark:text-gray-300 break-words leading-relaxed">{comment.text}</p>
                                                                                </div>
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>

                        {/* ──── MOODS TAB (Photos/Images) ──── */}
                            <div className={clsx(activeTab !== "moods" && "hidden")}>
                                {(isSelf || (isGroupProfile && isGroupAdmin)) && (
                                    <div className="flex justify-end px-4 pt-3 pb-2">
                                        <button
                                            onClick={() => { setPostType("moods"); setShowPostModal(true); }}
                                            className="btn-new-mood flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-semibold rounded-full hover:shadow-lg hover:shadow-violet-500/25 transition-all active:scale-95"
                                            style={{ background: "linear-gradient(135deg, #8b5cf6, #d946ef)", color: "#ffffff", WebkitTextFillColor: "#ffffff" }}
                                        >
                                            <Plus size={14} /> New Mood
                                        </button>
                                    </div>
                                )}
                                {(() => {
                                    const moodsList = moodsToShow;
                                    if (moodsList.length === 0) {
                                        return (
                                            <div className="text-center py-12">
                                                <div className="w-20 h-20 mx-auto mb-4 rounded-full border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center">
                                                    <Image size={32} className="text-gray-300 dark:text-gray-600" />
                                                </div>
                                                <p className="text-sm font-semibold text-gray-800 dark:text-white mb-1">No Photos Yet</p>
                                                {isSelf ? (
                                                    <p className="text-xs text-gray-400 dark:text-gray-500">Share photos to fill your feed</p>
                                                ) : (
                                                    <p className="text-xs text-gray-400 dark:text-gray-555">No photos shared yet</p>
                                                )}
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="grid grid-cols-3 gap-[2px]">
                                            {moodsList.map((mood) => (
                                                <div
                                                    key={mood.id}
                                                    onClick={() => setViewingMood(mood)}
                                                    className="relative aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden group cursor-pointer"
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setViewingMood(mood); } }}
                                                >
                                                    <img src={mood.mediaUrl} alt={mood.caption} loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                                    {/* Hover overlay */}
                                                    {!(mood as any).isShared && (
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4">
                                                            <span className="flex items-center gap-1.5 text-white text-sm font-bold">
                                                                <Heart size={16} fill="white" /> {mood.likes?.length || 0}
                                                            </span>
                                                            <span className="flex items-center gap-1.5 text-white text-sm font-bold">
                                                                <MessageSquare size={16} fill="white" /> {mood.comments?.length || 0}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {/* Delete badge for own moods */}
                                                    {isSelf && !(mood as any).isShared && (
                                                        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); deleteMood(mood.id); }}
                                                                className="w-7 h-7 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
                                                            >
                                                                <Trash2 size={13} className="text-white" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className={clsx(activeTab !== "clips" && "hidden")}>
                                {(isSelf || (isGroupProfile && isGroupAdmin)) && (
                                    <div className="flex justify-end px-4 pt-3 pb-2">
                                        <button
                                            onClick={() => { setPostType("clips"); setShowPostModal(true); }}
                                            className="btn-new-clip flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-500 to-orange-500 text-white text-xs font-semibold rounded-full hover:shadow-lg hover:shadow-rose-500/25 transition-all active:scale-95"
                                            style={{ background: "linear-gradient(135deg, #f43f5e, #f97316)", color: "#ffffff", WebkitTextFillColor: "#ffffff" }}
                                        >
                                            <Plus size={14} /> New Clip
                                        </button>
                                    </div>
                                )}
                                {(() => {
                                    const clipsList = clipsToShow;
                                    if (clipsList.length === 0) {
                                        return (
                                            <div className="text-center py-12">
                                                <div className="w-20 h-20 mx-auto mb-4 rounded-full border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center">
                                                    <Play size={32} className="text-gray-300 dark:text-gray-600" />
                                                </div>
                                                <p className="text-sm font-semibold text-gray-800 dark:text-white mb-1">No Clips Yet</p>
                                                {isSelf ? (
                                                    <p className="text-xs text-gray-400 dark:text-gray-550">Upload short videos to share</p>
                                                ) : (
                                                    <p className="text-xs text-gray-400 dark:text-gray-555">No clips shared yet</p>
                                                )}
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="grid grid-cols-3 gap-[2px]">
                                            {clipsList.map((clip) => (
                                                <div
                                                    key={clip.id}
                                                    onClick={() => setViewingMood(clip)}
                                                    className="relative aspect-[9/16] bg-gray-900 overflow-hidden group cursor-pointer"
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setViewingMood(clip); } }}
                                                >
                                                    <video src={clip.mediaUrl} className="w-full h-full object-cover pointer-events-none" />
                                                    {/* Video icon overlay */}
                                                    <div className="absolute top-2 right-2 text-white bg-black/45 p-1 rounded-full backdrop-blur-sm z-10">
                                                        <Play size={12} fill="white" />
                                                    </div>
                                                    {/* Hover overlay */}
                                                    {!(clip as any).isShared && (
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4">
                                                            <span className="flex items-center gap-1.5 text-white text-sm font-bold">
                                                                <Heart size={16} fill="white" /> {clip.likes?.length || 0}
                                                            </span>
                                                            <span className="flex items-center gap-1.5 text-white text-sm font-bold">
                                                                <MessageSquare size={16} fill="white" /> {clip.comments?.length || 0}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {/* Delete badge for own clips */}
                                                    {isSelf && !(clip as any).isShared && (
                                                        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); deleteMood(clip.id); }}
                                                                className="w-7 h-7 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
                                                            >
                                                                <Trash2 size={13} className="text-white" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>

                    </div>

                        </>
                    )}
                </div>




                {/* Action Buttons - Connected User (from chat) */}
                {isConnected && (
                    <div className="bg-white dark:bg-gray-800 mx-4 md:mx-6 mt-4 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700/60 shadow-sm">
                        {isGroupProfile && groupThread ? (
                            <>
                                <button
                                    onClick={() => {
                                        setGlobalActiveTab("chats");
                                        setActiveThreadId(groupThread.id);
                                        window.history.replaceState(null, "", `/inbox?id=${groupThread.id}`);
                                    }}
                                    className="w-full flex items-center justify-center gap-3 px-4 py-4 text-[var(--primary)] font-semibold hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors border-b border-[var(--border)] dark:border-gray-700"
                                >
                                    <MessageCircle size={20} /> Open Group Chat
                                </button>
                                <div className="flex divide-x divide-[var(--border)] dark:divide-gray-700">
                                    <button
                                        onClick={() => setShowConfirmLeaveGroup(true)}
                                        className="flex-1 flex items-center justify-center gap-2 py-4 hover:bg-gray-50 dark:hover:bg-zinc-800/60 text-[var(--danger)] font-semibold transition-colors"
                                    >
                                        <LogOut size={18} /> Leave Group
                                    </button>
                                    <button
                                        onClick={() => setShowConfirmDeleteGroup(true)}
                                        className="flex-1 flex items-center justify-center gap-2 py-4 hover:bg-gray-50 dark:hover:bg-zinc-800/60 text-[var(--danger)] font-semibold transition-colors"
                                    >
                                        <Trash2 size={18} /> Delete Group
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {!isSavedContact && (
                                    <button
                                        onClick={handleSaveContact}
                                        className="w-full flex items-center justify-center gap-3 px-4 py-4 text-[var(--primary)] font-medium hover:bg-gray-50 dark:hover:bg-zinc-800/60 border-b border-[var(--border)] dark:border-gray-700"
                                    >
                                        <UserPlus size={20} /> Save to Contacts
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setGlobalActiveTab("chats");
                                        setActiveThreadId(thread.id);
                                        window.history.replaceState(null, "", `/inbox?id=${thread.id}`);
                                    }}
                                    className="w-full flex items-center justify-center gap-3 px-4 py-4 text-[var(--primary)] font-medium hover:bg-gray-50 dark:hover:bg-zinc-800/60"
                                >
                                    <MessageCircle size={20} /> Message
                                </button>
                                <div className="border-t border-[var(--border)] dark:border-gray-700 flex">
                                    <button 
                                        onClick={() => initiateCall(user.id, user.name, user.avatar || null, "audio")}
                                        className="flex-1 flex items-center justify-center gap-2 py-4 hover:bg-gray-50 dark:hover:bg-zinc-800/60 text-[var(--primary)]"
                                    >
                                        <Phone size={18} /> Call
                                    </button>
                                    <div className="w-px bg-[var(--border)] dark:bg-gray-700" />
                                    <button 
                                        onClick={() => initiateCall(user.id, user.name, user.avatar || null, "video")}
                                        className="flex-1 flex items-center justify-center gap-2 py-4 hover:bg-gray-50 dark:hover:bg-zinc-800/60 text-[var(--primary)]"
                                    >
                                        <Video size={18} /> Video
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Action Buttons - Request User */}
                {isFromRequests && (
                    <div className="bg-white dark:bg-gray-800 mx-4 md:mx-6 mt-4 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700/60 shadow-sm">
                        <div className="p-4 border-b border-[var(--border)] dark:border-gray-700">
                            <p className="text-sm text-[var(--secondary)] text-center mb-2">They sent you a message:</p>
                            <p className="text-center font-medium dark:text-white">{`"${request?.message || ''}"`}</p>
                        </div>
                        <div className="flex">
                            <button
                                onClick={handleDecline}
                                className="flex-1 flex items-center justify-center gap-2 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:text-gray-300"
                            >
                                <X size={18} className="text-[var(--secondary)]" /> Decline
                            </button>
                            <div className="w-px bg-[var(--border)] dark:bg-gray-700" />
                            <button
                                onClick={handleAccept}
                                className="flex-1 flex items-center justify-center gap-2 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-[var(--primary)] font-medium"
                            >
                                <Check size={18} /> Accept
                            </button>
                        </div>
                    </div>
                )}

                {/* Action Buttons - Suggestion (not connected) */}
                {isFromSuggestions && !isSent && (
                    <div className="bg-white dark:bg-gray-800 mx-4 md:mx-6 mt-4 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700/60 shadow-sm">
                        <div className="p-4">
                            <p className="text-sm text-[var(--secondary)] text-center mb-4">Send a message to connect with {user.name}</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                    placeholder="Write something nice..."
                                    className="flex-1 px-4 py-3 bg-[var(--card)] dark:bg-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-[var(--primary)] dark:text-white"
                                    disabled={isSending}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!message.trim() || isSending}
                                    className="px-4 py-3 bg-[var(--primary)] text-white rounded-xl disabled:opacity-50 hover:bg-blue-600 transition-colors"
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Sent Confirmation */}
                {isSent && (
                    <div className="bg-[var(--success)] mx-4 md:mx-6 mt-4 rounded-xl p-4 text-center text-white font-medium">
                        {"✓ Message Sent! They'll respond soon."}
                    </div>
                )}

                {/* Action Buttons - Unconnected User (found via allDatingUsers) */}
                {isUnconnected && !isSent && (
                    <div className="bg-white dark:bg-gray-800 mx-4 md:mx-6 mt-4 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700/60 shadow-sm">
                        <button
                            onClick={handleStartDirectChat}
                            disabled={isStartingChat}
                            className="w-full flex items-center justify-center gap-3 px-4 py-4 text-[var(--primary)] font-medium hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50"
                        >
                            {isStartingChat ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                    Opening chat...
                                </>
                            ) : (
                                <>
                                    <MessageCircle size={20} /> Start Chat
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Block Confirmation */}
            {showConfirmBlock && (
                <div className="modal-overlay" onClick={() => setShowConfirmBlock(false)}>
                    <div 
                        className="modal-content p-6 max-w-sm flex flex-col" 
                        onClick={e => e.stopPropagation()}
                        style={{
                            transform: popupDragY > 0 ? `translateY(${popupDragY}px)` : undefined,
                            transition: isPopupDragging ? 'none' : 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)'
                        }}
                    >
                        {/* Drag Handle Container with touch events */}
                        <div
                            className="w-full pb-3 md:hidden shrink-0 cursor-row-resize select-none flex justify-center -mt-2 mb-2"
                            style={{ touchAction: 'none' }}
                            onTouchStart={handlePopupTouchStart}
                            onTouchMove={handlePopupTouchMove}
                            onTouchEnd={() => handlePopupTouchEnd(() => setShowConfirmBlock(false))}
                        >
                            <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Block {user.name}?</h3>
                        <p className="text-[var(--secondary)] mb-6">{"They won't be able to message you or see your profile. This can be undone in settings."}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmBlock(false)}
                                className="flex-1 py-3 bg-[var(--card)] rounded-xl font-medium hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBlockUser}
                                className="flex-1 py-3 bg-[var(--danger)] text-white rounded-xl font-medium hover:opacity-90"
                            >
                                Block
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Modal */}
            {showReportModal && (
                <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
                    <div 
                        className="modal-content p-6 max-w-sm flex flex-col" 
                        onClick={e => e.stopPropagation()}
                        style={{
                            transform: popupDragY > 0 ? `translateY(${popupDragY}px)` : undefined,
                            transition: isPopupDragging ? 'none' : 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)'
                        }}
                    >
                        {/* Drag Handle Container with touch events */}
                        <div
                            className="w-full pb-3 md:hidden shrink-0 cursor-row-resize select-none flex justify-center -mt-2 mb-2"
                            style={{ touchAction: 'none' }}
                            onTouchStart={handlePopupTouchStart}
                            onTouchMove={handlePopupTouchMove}
                            onTouchEnd={() => handlePopupTouchEnd(() => setShowReportModal(false))}
                        >
                            <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
                        </div>
                        <h3 className="text-lg font-semibold mb-4">Report {user.name}</h3>
                        <p className="text-[var(--secondary)] text-sm mb-4">Why are you reporting this user?</p>
                        <div className="space-y-2">
                            {["Spam", "Inappropriate content", "Harassment", "Fake profile", "Other"].map(reason => (
                                <button
                                    key={reason}
                                    onClick={() => handleReport(reason)}
                                    className="w-full py-3 text-left px-4 bg-[var(--card)] rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    {reason}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowReportModal(false)}
                            className="w-full py-3 mt-4 text-[var(--secondary)] font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Group Profile Modal */}
            {showEditGroupModal && groupThread && (
                <div className="modal-overlay" onClick={() => setShowEditGroupModal(false)}>
                    <div 
                        className="modal-content p-6 max-w-md w-full mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700 mb-4 shrink-0">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Group Profile</h3>
                            <button type="button" onClick={() => setShowEditGroupModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                                <X size={20} className="text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveGroup} className="space-y-4 overflow-y-auto pr-1">
                            {/* Avatar selector */}
                            <div className="flex flex-col items-center gap-2">
                                <div className="relative w-20 h-20 rounded-full bg-emerald-100 dark:bg-[#12382f] flex items-center justify-center text-[#00a884] dark:text-[#00c89a] border border-gray-100 dark:border-gray-700 shrink-0 overflow-hidden group">
                                    {editGroupAvatar && (editGroupAvatar.startsWith("http") || editGroupAvatar.startsWith("data:") || editGroupAvatar.startsWith("/")) ? (
                                        <img src={editGroupAvatar} alt="Group avatar" className="w-full h-full object-cover select-none" />
                                    ) : editGroupAvatar ? (
                                        <span className="text-3xl select-none">{editGroupAvatar}</span>
                                    ) : (
                                        <Users className="w-10 h-10" />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => editGroupAvatarFileRef.current?.click()}
                                        className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Pencil size={18} className="text-white" />
                                    </button>
                                </div>
                                <input
                                    type="file"
                                    ref={editGroupAvatarFileRef}
                                    onChange={handleGroupAvatarChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const emojis = ["🚀", "🔥", "💬", "🍕", "🎉", "🎮", "📚", "🎨", "🌟", "👾", "🤖", "⚽", "🍿", "🍩"];
                                            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                                            setEditGroupAvatar(randomEmoji);
                                        }}
                                        className="text-xs text-[var(--primary)] font-medium hover:underline"
                                    >
                                        Use emoji
                                    </button>
                                    {editGroupAvatar && (
                                        <button
                                            type="button"
                                            onClick={() => setEditGroupAvatar(null)}
                                            className="text-xs text-red-500 font-medium hover:underline"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Group Name input */}
                            <div>
                                <label className="block text-xs font-bold text-gray-750 dark:text-zinc-300 uppercase mb-1.5">Group Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editGroupName}
                                    onChange={e => setEditGroupName(e.target.value)}
                                    className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-700 bg-transparent rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] dark:text-white"
                                    placeholder="Enter group name..."
                                />
                            </div>

                            {/* Group Bio input */}
                            <div>
                                <label className="block text-xs font-bold text-gray-750 dark:text-zinc-300 uppercase mb-1.5">Description / Bio</label>
                                <textarea
                                    value={editGroupBio}
                                    onChange={e => setEditGroupBio(e.target.value)}
                                    rows={3}
                                    className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-700 bg-transparent rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] resize-none dark:text-white"
                                    placeholder="Describe your group..."
                                />
                            </div>

                            {/* Group Location input */}
                            <div>
                                <label className="block text-xs font-bold text-gray-750 dark:text-zinc-300 uppercase mb-1.5">Location</label>
                                <input
                                    type="text"
                                    value={editGroupLocation}
                                    onChange={e => setEditGroupLocation(e.target.value)}
                                    className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-700 bg-transparent rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] dark:text-white"
                                    placeholder="e.g. New York, NY"
                                />
                            </div>

                            {/* Form Actions */}
                            <div className="flex gap-3 pt-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowEditGroupModal(false)}
                                    className="flex-1 py-2.5 border border-gray-200 dark:border-gray-750 text-gray-750 dark:text-zinc-300 font-semibold rounded-xl text-sm active:scale-[0.98] transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingGroup || !editGroupName.trim()}
                                    className="flex-1 py-2.5 bg-[var(--primary)] hover:brightness-105 disabled:opacity-50 text-white font-bold rounded-xl text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    {isSavingGroup ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Group Members Modal */}
            {showAddMembersModal && groupThread && (
                <div className="modal-overlay" onClick={() => setShowAddMembersModal(false)}>
                    <div className="modal-content p-5 max-w-md w-full max-h-[85vh] flex flex-col bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800 shrink-0">
                            <h3 className="text-lg font-bold text-black dark:text-white">Add Members</h3>
                            <button onClick={() => setShowAddMembersModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full">
                                <X size={20} className="text-zinc-500" />
                            </button>
                        </div>
                        
                        {/* Search candidates */}
                        <div className="py-3 shrink-0">
                            <input 
                                type="text"
                                placeholder="Search contacts..."
                                value={addMembersSearch}
                                onChange={e => setAddMembersSearch(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-transparent focus:border-zinc-200 focus:bg-white rounded-xl text-sm outline-none text-black dark:text-white dark:focus:bg-zinc-900 dark:focus:border-zinc-800"
                            />
                        </div>

                        {/* List of candidates */}
                        <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[40vh] space-y-2 py-1 pr-1 scrollbar-thin">
                            {(() => {
                                // Build matched contacts from phone list
                                const registeredUsersByPhone = new Map<string, any>();
                                allDatingUsers.forEach(u => {
                                    if (u.phoneNumber) {
                                        const clean = u.phoneNumber.replace(/\D/g, "");
                                        registeredUsersByPhone.set(clean, u);
                                    }
                                });

                                const localContacts = currentUser?.localContacts || [];
                                const matchedContacts: { contactName: string; user: any }[] = [];
                                localContacts.forEach(contact => {
                                    if (!contact.phoneNumber) return;
                                    const clean = contact.phoneNumber.replace(/\D/g, "");
                                    const matchedUser = registeredUsersByPhone.get(clean);
                                    if (matchedUser && matchedUser.id !== currentUser.id) {
                                        if (!matchedContacts.some(m => m.user.id === matchedUser.id)) {
                                            matchedContacts.push({ contactName: contact.name, user: matchedUser });
                                        }
                                    }
                                });

                                const candidates: { id: string; name: string; avatar: string | null; color?: string; bio?: string }[] = [];
                                const seenIds = new Set<string>();

                                // Add active chat partners (who are not groups)
                                threads.forEach(t => {
                                    if (!t.isGroup && t.user && !seenIds.has(t.user.id)) {
                                        const isAlreadyMember = groupThread?.groupMemberIds?.includes(t.user.id);
                                        if (!isAlreadyMember) {
                                            candidates.push({
                                                id: t.user.id,
                                                name: t.user.name,
                                                avatar: t.user.avatar,
                                                color: t.user.color,
                                                bio: t.user.bio
                                            });
                                            seenIds.add(t.user.id);
                                        }
                                    }
                                });

                                // Add matched contacts who are not already added
                                matchedContacts.forEach(m => {
                                    if (m.user && !seenIds.has(m.user.id)) {
                                        const isAlreadyMember = groupThread?.groupMemberIds?.includes(m.user.id);
                                        if (!isAlreadyMember) {
                                            candidates.push({
                                                id: m.user.id,
                                                name: m.contactName,
                                                avatar: m.user.avatar,
                                                color: m.user.color,
                                                bio: m.user.bio
                                            });
                                            seenIds.add(m.user.id);
                                        }
                                    }
                                });

                                // Apply search query filter
                                const filteredCandidates = candidates.filter(cand => {
                                    if (!addMembersSearch.trim()) return true;
                                    return cand.name.toLowerCase().includes(addMembersSearch.toLowerCase());
                                });

                                if (filteredCandidates.length === 0) {
                                    return (
                                        <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-sm">
                                            No eligible contacts to add
                                        </div>
                                    );
                                }

                                return filteredCandidates.map(cand => {
                                    const isChecked = selectedAddMemberIds.has(cand.id);
                                    const initial = cand.name.charAt(0).toUpperCase() || "?";
                                    return (
                                        <div 
                                            key={cand.id}
                                            onClick={() => {
                                                const next = new Set(selectedAddMemberIds);
                                                if (isChecked) next.delete(cand.id);
                                                else next.add(cand.id);
                                                setSelectedAddMemberIds(next);
                                            }}
                                            className="flex items-center justify-between p-2.5 hover:bg-gray-50 dark:hover:bg-zinc-900/50 rounded-xl cursor-pointer transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                {cand.avatar ? (
                                                    <img src={cand.avatar} alt={cand.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                                                ) : (
                                                    <div className={clsx("w-9 h-9 rounded-full flex items-center justify-center font-bold text-gray-950 text-sm shrink-0", cand.color || "bg-emerald-150")}>
                                                        {initial}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <span className="font-semibold text-xs text-black dark:text-white block truncate">{cand.name}</span>
                                                    <span className="text-[10px] text-zinc-450 dark:text-zinc-500 block truncate">{cand.bio || "Hey there! I'm using Yogheart."}</span>
                                                </div>
                                            </div>
                                            <input 
                                                type="checkbox"
                                                checked={isChecked}
                                                readOnly
                                                className="rounded border-zinc-300 text-[var(--primary)] focus:ring-[var(--primary)] pointer-events-none"
                                            />
                                        </div>
                                    );
                                });
                            })()}
                        </div>

                        {/* Footer buttons */}
                        <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-end gap-3 shrink-0">
                            <button 
                                onClick={() => setShowAddMembersModal(false)}
                                className="px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleAddMembersConfirm}
                                disabled={selectedAddMemberIds.size === 0}
                                className="px-5 py-2.5 bg-[var(--primary)] hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                            >
                                Add ({selectedAddMemberIds.size})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Leave Group Confirmation Modal */}
            {showConfirmLeaveGroup && groupThread && (
                <div className="modal-overlay" onClick={() => setShowConfirmLeaveGroup(false)}>
                    <div className="modal-content p-6 max-w-sm bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Leave Group?</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">
                            Are you sure you want to leave "{groupThread.groupName || "Group Chat"}"? You will no longer receive or see any messages from this conversation.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmLeaveGroup(false)}
                                className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmLeaveGroup}
                                className="flex-1 py-3 bg-[var(--danger)] text-white rounded-xl font-bold hover:brightness-105 active:scale-95 transition-all"
                            >
                                Leave
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Group Confirmation Modal */}
            {showConfirmDeleteGroup && groupThread && (
                <div className="modal-overlay" onClick={() => setShowConfirmDeleteGroup(false)}>
                    <div className="modal-content p-6 max-w-sm bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Delete Group?</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">
                            Are you sure you want to delete and disband "{groupThread.groupName || "Group Chat"}"? This will permanently delete the conversation for all members.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmDeleteGroup(false)}
                                className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteGroup}
                                className="flex-1 py-3 bg-[var(--danger)] text-white rounded-xl font-bold hover:brightness-105 active:scale-95 transition-all"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mood Creator Modal */}
            {showMoodCreator && (
                <div className="modal-overlay" onClick={() => setShowMoodCreator(false)}>
                    <div 
                        className="modal-content p-6 max-w-md w-full mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col" 
                        onClick={e => e.stopPropagation()}
                        style={{
                            transform: popupDragY > 0 ? `translateY(${popupDragY}px)` : undefined,
                            transition: isPopupDragging ? 'none' : 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)'
                        }}
                    >
                        {/* Drag Handle Container with touch events */}
                        <div
                            className="w-full pb-3 md:hidden shrink-0 cursor-row-resize select-none flex justify-center -mt-2 mb-2"
                            style={{ touchAction: 'none' }}
                            onTouchStart={handlePopupTouchStart}
                            onTouchMove={handlePopupTouchMove}
                            onTouchEnd={() => handlePopupTouchEnd(() => setShowMoodCreator(false))}
                        >
                            <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
                        </div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent flex items-center gap-2">
                                <Sparkles size={20} className="text-violet-500 animate-pulse" />
                                Share your Mood
                            </h3>
                            <button onClick={() => setShowMoodCreator(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                                <X size={20} className="text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Media Preview / Selector */}
                            <div 
                                onClick={() => moodFileRef.current?.click()}
                                className={clsx(
                                    "relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:border-violet-500 dark:hover:border-violet-500 transition-colors group bg-gray-55 dark:bg-gray-900/50 w-full",
                                    moodMediaPreview ? "h-auto min-h-[220px]" : "aspect-video"
                                )}
                            >
                                {moodMediaPreview ? (
                                    <>
                                        {moodMediaType === "photo" ? (
                                            <img src={moodMediaPreview} alt="Preview" className="w-full h-auto max-h-[440px] object-contain" />
                                        ) : (
                                            <video src={moodMediaPreview} className="w-full h-auto max-h-[440px] object-contain" controls />
                                        )}
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setMoodMediaPreview(null);
                                            }}
                                            className="absolute top-2 right-2 w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-center p-6">
                                        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Image size={24} className="text-violet-500" />
                                        </div>
                                        <p className="text-sm font-semibold dark:text-gray-300">Upload Photo or Video</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Supports PNG, JPG, MP4</p>
                                    </div>
                                )}
                            </div>

                            <input 
                                type="file" 
                                ref={moodFileRef} 
                                onChange={handleMoodFileChange} 
                                accept="image/*,video/*" 
                                className="hidden" 
                            />

                            {/* Caption Input */}
                            <div>
                                <textarea
                                    value={moodCaption}
                                    onChange={(e) => setMoodCaption(e.target.value.slice(0, 150))}
                                    placeholder="How are you feeling right now?"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 dark:text-white border border-gray-100 dark:border-gray-700 min-h-[80px] resize-none text-sm"
                                />
                                <div className="flex justify-end text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    {moodCaption.length}/150 characters
                                </div>
                            </div>

                            {/* Actions */}
                            <button
                                onClick={handleCreateMood}
                                disabled={!moodMediaPreview || isMoodUploading}
                                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                            >
                                {isMoodUploading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Posting Mood...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} />
                                        Post Mood
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeViewingMood && user && (
                <div 
                    className="modal-overlay moods-desktop-panel lg:absolute lg:inset-0 lg:z-50 lg:p-0" 
                    onClick={() => { setViewingMood(null); }}
                    style={{ backgroundColor: `rgba(0,0,0,${Math.min(0.5, 0.5 - (moodDragY / 500))})` }}
                >
                    <div 
                        className="modal-content max-w-[600px] lg:max-w-none lg:w-full lg:h-full lg:max-h-none lg:mx-0 lg:rounded-none w-full bg-gray-50 dark:bg-gray-900 rounded-t-2xl lg:rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col h-[92vh]"
                        onClick={e => e.stopPropagation()}
                        style={{
                            transform: `translateY(${moodDragY > 0 ? moodDragY : 0}px)`,
                            transition: isMoodDragging ? 'none' : 'transform 0.3s ease-out'
                        }}
                    >
                        {/* Header Area with swipe-down-to-dismiss touch events */}
                        <div 
                            className="w-full shrink-0 select-none cursor-row-resize bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800"
                            onTouchStart={handleMoodTouchStart}
                            onTouchMove={handleMoodTouchMove}
                            onTouchEnd={handleMoodTouchEnd}
                            onTouchCancel={handleMoodTouchEnd}
                        >
                            {/* Visual Drag Handle for mobile */}
                            <div className="w-full pt-2.5 pb-1 md:hidden flex justify-center">
                                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
                            </div>

                            {/* Header details */}
                            <div className="w-full flex items-center justify-between px-4 pb-3 pt-1">
                                <button 
                                    onClick={() => { setViewingMood(null); }} 
                                    className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <ArrowLeft size={18} />
                                </button>
                                <span className="text-gray-900 dark:text-white font-bold text-lg capitalize">{activeViewingMood.type === 'photo' ? 'Moods' : 'Clips'}</span>
                                <div className="w-9" /> {/* Spacer */}
                            </div>
                        </div>

                        {/* Scrollable Feed */}
                        <div id="mood-feed-container" className="flex-1 relative overflow-y-auto overflow-x-hidden pb-6 custom-scrollbar">
                            {getMoodsForUser(user.id).filter(m => m.type === activeViewingMood.type).map((mood) => (
                                <FeedPost 
                                    key={mood.id}
                                    mood={mood}
                                    currentUser={currentUser}
                                    isSelf={isSelf}
                                    onDelete={(id) => { deleteMood(id); if (mood.id === activeViewingMood.id) setViewingMood(null); }}
                                    onLike={likeMood}
                                    onComment={commentOnMood}
                                    onLikeComment={likeCommentOnMood}
                                    onEditComment={editCommentOnMood}
                                    onDeleteComment={deleteCommentOnMood}
                                    onUpdate={updateMood}
                                    onOpenCommentsDrawer={() => setCommentsDrawerMoodId(mood.id)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {commentsDrawerMoodId && (
                <CommentsDrawer 
                    moodId={commentsDrawerMoodId}
                    onClose={() => setCommentsDrawerMoodId(null)}
                    currentUser={currentUser}
                    isSelf={isSelf}
                    onComment={commentOnMood}
                    onLikeComment={likeCommentOnMood}
                    onEditComment={editCommentOnMood}
                    onDeleteComment={deleteCommentOnMood}
                    moods={moods}
                />
            )}

            {/* ──────── Post Modal (Unified Composer) ──────── */}
            {showPostModal && (
                <div
                    className="fixed inset-0 z-[100] modal-overlay bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center animate-fade-in"
                    onClick={() => { setShowPostModal(false); setNewStatusText(""); clearSelectedMedia(); setPostType("status"); }}
                >
                    <div
                        className={clsx(
                            "w-full md:max-w-md bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-2xl",
                            "p-5 md:p-6 shadow-2xl border-t md:border border-gray-100 dark:border-gray-700",
                            "animate-[slideUp_0.3s_ease-out] h-[95vh] md:h-[800px] flex flex-col relative overflow-hidden"
                        )}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            transform: postDragY > 0 ? `translateY(${postDragY}px)` : undefined,
                            transition: isPostDragging ? 'none' : 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)'
                        }}
                        onTouchStart={handlePostTouchStart}
                        onTouchMove={handlePostTouchMove}
                        onTouchEnd={handlePostTouchEnd}
                    >
                        {/* Drag Handle Container with touch events */}
                        <div
                            className="w-full pb-3 md:hidden shrink-0 cursor-row-resize select-none flex justify-center"
                            style={{ touchAction: 'none' }}
                        >
                            <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
                        </div>
                        <div className="flex items-center justify-between mb-3 shrink-0">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white capitalize">Create {postType === "moods" ? "Mood" : postType === "clips" ? "Clip" : postType === "tweet" ? "Glimpse" : "Status"}</h2>
                            <button
                                onClick={() => { setShowPostModal(false); setNewStatusText(""); clearSelectedMedia(); setPostType("status"); }}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <X size={18} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Segmented Picker */}
                        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 text-xs font-semibold mb-4 shrink-0">
                            {(["status", "moods", "clips", "tweet"] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => {
                                        setPostType(type);
                                        setNewStatusText("");
                                        clearSelectedMedia();
                                        setMediaError(null);
                                    }}
                                    className={clsx(
                                        "flex-1 py-2 rounded-lg transition-all text-center capitalize",
                                        postType === type
                                            ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                                    )}
                                    type="button"
                                >
                                    {type === "moods" ? "Moods" : type === "clips" ? "Clips" : type === "tweet" ? "Glimpse" : "Status"}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-4 min-h-0">
                            {postType === "status" && (
                                <div className="space-y-4">
                                    {/* Live Preview Card */}
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Live Preview (Tap Card to Edit Text)</p>
                                        <div className="w-full aspect-[16/10] rounded-2xl relative overflow-hidden flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-inner bg-gray-55 dark:bg-gray-900 group">
                                            {statusBgType === "media" && statusMediaUrl ? (
                                                statusMediaType === "video" ? (
                                                    <video src={statusMediaUrl} className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted playsInline />
                                                ) : (
                                                    <img src={statusMediaUrl} className="absolute inset-0 w-full h-full object-cover" alt="Status preview" />
                                                )
                                            ) : (
                                                <div 
                                                    className={clsx(
                                                        "absolute inset-0 bg-gradient-to-br transition-all duration-300",
                                                        selectedBgColor
                                                    )} 
                                                    style={{ background: GRADIENT_STYLES[selectedBgColor] || undefined }}
                                                />
                                            )}

                                            {/* Interactive Text Overlay Card */}
                                            <div className="relative z-10 w-[85%] mx-auto bg-black/45 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2.5 text-center">
                                                <textarea
                                                    value={newStatusText}
                                                    onChange={(e) => setNewStatusText(e.target.value.slice(0, 280))}
                                                    placeholder="What's on your mind? Tap to write..."
                                                    className="w-full bg-transparent border-none outline-none text-white text-center text-xs font-semibold leading-relaxed placeholder:text-white/60 resize-none h-16 focus:ring-0 focus:outline-none scrollbar-none"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>

                                            {/* Character counter inside preview */}
                                            <span className={clsx(
                                                "absolute bottom-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/30 text-white/80 backdrop-blur-sm transition-opacity z-20",
                                                newStatusText.length > 250 ? "text-amber-400" : "text-white/80"
                                            )}>
                                                {newStatusText.length}/280
                                            </span>
                                        </div>
                                    </div>

                                    {/* Background Type Toggle Tabs */}
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Background Style</p>
                                        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 text-xs font-medium">
                                            <button
                                                onClick={() => setStatusBgType("color")}
                                                className={clsx(
                                                    "flex-1 py-1.5 rounded-md transition-all text-center",
                                                    statusBgType === "color"
                                                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                                                )}
                                                type="button"
                                            >
                                                Gradients
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (statusMediaUrl) {
                                                        setStatusBgType("media");
                                                    } else {
                                                        statusFileInputRef.current?.click();
                                                    }
                                                }}
                                                className={clsx(
                                                    "flex-1 py-1.5 rounded-md transition-all text-center",
                                                    statusBgType === "media"
                                                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                                                )}
                                                type="button"
                                            >
                                                My Photo/Video
                                            </button>
                                        </div>
                                    </div>

                                    {/* Options Area (Colors or Media Uploader) */}
                                    {statusBgType === "color" ? (
                                        <div className="flex flex-wrap gap-2 justify-center py-1">
                                            {VIEWER_GRADIENTS.map((gradient) => (
                                                <button
                                                    key={gradient}
                                                    onClick={() => setSelectedBgColor(gradient)}
                                                    style={{ background: GRADIENT_STYLES[gradient] || undefined }}
                                                    className={clsx(
                                                        "w-8 h-8 rounded-full bg-gradient-to-br transition-all hover:scale-110",
                                                        gradient,
                                                        selectedBgColor === gradient
                                                            ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900 scale-105 shadow-md"
                                                            : "border border-gray-200 dark:border-gray-700"
                                                    )}
                                                    type="button"
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div>
                                            {statusMediaUrl ? (
                                                <div className="flex items-center justify-between p-2.5 bg-gray-55 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-black flex items-center justify-center">
                                                            {statusMediaType === "video" ? (
                                                                <Film size={18} className="text-white animate-pulse" />
                                                            ) : (
                                                                <img src={statusMediaUrl} className="w-full h-full object-cover" alt="Preview Thumbnail" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[11px] font-semibold text-gray-900 dark:text-white truncate">
                                                                {statusMediaType === "video" ? "Uploaded Video" : "Uploaded Image"}
                                                            </p>
                                                            <p className="text-[9px] text-gray-500 dark:text-gray-400">Ready to post</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1.5">
                                                        <button
                                                            onClick={() => statusFileInputRef.current?.click()}
                                                            className="p-1.5 text-xs text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-lg font-medium transition-colors"
                                                            type="button"
                                                        >
                                                            Change
                                                        </button>
                                                        <button
                                                            onClick={clearSelectedMedia}
                                                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                            type="button"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div 
                                                    onClick={() => statusFileInputRef.current?.click()}
                                                    className="flex flex-col items-center justify-center gap-1.5 py-5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl text-gray-500 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 transition-all cursor-pointer bg-gray-50/50 dark:bg-gray-800/30"
                                                >
                                                    <div className="p-2 bg-white dark:bg-gray-700 rounded-full shadow-sm">
                                                        <Plus size={16} className="text-gray-600 dark:text-gray-300" />
                                                    </div>
                                                    <p className="text-xs font-semibold">Upload Photo or Video</p>
                                                    <p className="text-[9px] text-gray-400 dark:text-gray-500">Max size 20MB</p>
                                                </div>
                                            )}
                                            {mediaError && (
                                                <p className="text-red-500 text-[10px] mt-1 text-center font-medium">{mediaError}</p>
                                            )}
                                        </div>
                                    )}


                                </div>
                            )}

                            {postType === "tweet" && (
                                <div className="space-y-3 relative">
                                    <textarea
                                        value={newStatusText}
                                        onChange={handleDraftTextChange}
                                        placeholder="Share a new glimpse! Tag user profile with @Name..."
                                        className="w-full px-4 py-3 bg-gray-55 dark:bg-gray-900 border border-gray-150 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white min-h-[140px] resize-none text-sm leading-relaxed"
                                        maxLength={280}
                                    />
                                    
                                    {/* Suggestions popup */}
                                    {showDraftSuggestions && filteredDraftSuggestions.length > 0 && (
                                        <div className="absolute left-0 bottom-full mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg w-full max-h-[160px] overflow-y-auto z-[60] py-1">
                                            {filteredDraftSuggestions.map((u) => (
                                                <button
                                                    key={u.id}
                                                    onClick={() => selectDraftSuggestion(u)}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left text-xs text-gray-805 dark:text-gray-200"
                                                    type="button"
                                                >
                                                    <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center text-[10px] relative font-semibold shrink-0", u.color)}>
                                                        {u.avatar ? (
                                                            <img src={u.avatar} className="w-full h-full rounded-full object-cover" />
                                                        ) : (
                                                            <span>{u.name.charAt(0)}</span>
                                                        )}
                                                    </div>
                                                    <span className="font-semibold truncate">{u.name}</span>
                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">@{u.name.toLowerCase()}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex justify-end text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        {280 - newStatusText.length} characters left
                                    </div>
                                </div>
                            )}

                            {(postType === "moods" || postType === "clips") && (
                                <div className="space-y-4">
                                    {/* Media selector */}
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                                            {postType === "moods" ? "Upload Photo (Required)" : "Upload Video Clip (Required)"}
                                        </p>
                                        <div 
                                            onClick={() => statusFileInputRef.current?.click()}
                                            className={clsx(
                                                "relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:border-violet-500 dark:hover:border-violet-500 transition-colors group bg-gray-55 dark:bg-gray-900/50 w-full",
                                                statusMediaUrl ? "h-auto min-h-[220px]" : "aspect-video"
                                            )}
                                        >
                                            {statusMediaUrl ? (
                                                <>
                                                    {statusMediaType === "video" ? (
                                                        <video src={statusMediaUrl} className="w-full h-auto max-h-[440px] object-contain" controls />
                                                    ) : (
                                                        <img src={statusMediaUrl} alt="Preview" className="w-full h-auto max-h-[440px] object-contain" />
                                                    )}
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            clearSelectedMedia();
                                                        }}
                                                        className="absolute top-2 right-2 w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                                                        type="button"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="text-center p-6 animate-pulse">
                                                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        {postType === "moods" ? (
                                                            <Image size={24} className="text-violet-500" />
                                                        ) : (
                                                            <Film size={24} className="text-violet-500" />
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-semibold dark:text-gray-300">
                                                        {postType === "moods" ? "Upload Photo" : "Upload Video Clip"}
                                                    </p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                        {postType === "moods" ? "Supports PNG, JPG, WEBP" : "Supports MP4, MOV, WEBM"}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        {mediaError && (
                                            <p className="text-red-500 text-[10px] mt-1 text-center font-medium">{mediaError}</p>
                                        )}
                                    </div>

                                    {/* Caption */}
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                                            {postType === "moods" ? "Mood Caption" : "Clip Caption"}
                                        </p>
                                        <textarea
                                            value={newStatusText}
                                            onChange={(e) => setNewStatusText(e.target.value.slice(0, 150))}
                                            placeholder={postType === "moods" ? "How are you feeling right now? (Max 150 characters)" : "Describe your clip... (Max 150 characters)"}
                                            className="w-full px-4 py-3 bg-gray-55 dark:bg-gray-900 border border-gray-150 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 dark:text-white min-h-[80px] resize-none text-sm"
                                        />
                                        <div className="flex justify-end text-xs text-gray-400 dark:text-gray-500 mt-1">
                                            {150 - newStatusText.length} characters left
                                        </div>
                                    </div>
                                </div>
                            )}

                            <input
                                type="file"
                                ref={statusFileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                accept={
                                    postType === "moods"
                                        ? "image/*"
                                        : postType === "clips"
                                        ? "video/*"
                                        : "image/*,video/*"
                                }
                            />
                        </div>

                        {/* Actions */}
                        <div className="pt-4 mt-2 border-t border-gray-150 dark:border-gray-800 shrink-0">
                            <button
                                onClick={handlePost}
                                disabled={
                                    (postType === "status" && (!newStatusText.trim() && !statusMediaUrl)) ||
                                    (postType === "tweet" && !newStatusText.trim()) ||
                                    ((postType === "moods" || postType === "clips") && !statusMediaUrl) ||
                                    isPosting
                                }
                                className="btn-post-status w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold text-sm disabled:opacity-40 hover:shadow-lg transition-all active:scale-[0.98]"
                                style={{ background: "linear-gradient(135deg, #3b82f6, #a855f7)", color: "#ffffff", WebkitTextFillColor: "#ffffff" }}
                            >
                                {isPosting ? "Posting..." : postType === "status" ? "Share Status" : postType === "tweet" ? "Post Glimpse" : postType === "moods" ? "Post Mood" : "Post Clip"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Context Menu */}
            {statusContextMenu && (
                <>
                    <div className="fixed inset-0 z-[70]" onClick={() => setStatusContextMenu(null)} />
                    <div
                        className="fixed bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1.5 min-w-[140px] z-[80] animate-fade-in"
                        style={{ top: `${statusContextMenu.y}px`, left: `${statusContextMenu.x}px` }}
                    >
                        <button
                            onClick={() => {
                                setRenameInput(statusContextMenu.status.title || "");
                                setShowRenameModal({
                                    statusId: statusContextMenu.status.id,
                                    currentTitle: statusContextMenu.status.title || ""
                                });
                                setStatusContextMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left text-gray-800 dark:text-gray-200 text-xs font-semibold"
                        >
                            <Pencil size={14} className="text-blue-500" /> Rename
                        </button>
                        <button
                            onClick={() => {
                                setShowStatusEditModal(statusContextMenu.status);
                                setStatusContextMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left text-gray-800 dark:text-gray-200 text-xs font-semibold"
                        >
                            <Sparkles size={14} className="text-violet-500" /> Edit Media
                        </button>
                        <button
                            onClick={() => {
                                deleteStatus(statusContextMenu.status.id);
                                setStatusContextMenu(null);
                                if (viewingStatus?.id === statusContextMenu.status.id) {
                                    setViewingStatus(null);
                                }
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-left text-red-650 text-xs font-semibold"
                        >
                            <Trash2 size={14} /> Delete Status
                        </button>
                    </div>
                </>
            )}

            {/* Status Edit Modal */}
            {showStatusEditModal && (
                <div 
                    className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setShowStatusEditModal(null)}
                >
                    <div 
                        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-5 md:p-6 shadow-2xl relative max-h-[85vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-700/50">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">Edit Status Items</h3>
                            <button onClick={() => setShowStatusEditModal(null)} className="p-1 hover:bg-gray-150 dark:hover:bg-gray-700 rounded-full">
                                <X size={18} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Title / Highlight Name */}
                        <div className="mb-4">
                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Highlight Name</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={showStatusEditModal.title || ""}
                                    onChange={(e) => setShowStatusEditModal((prev: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => ({ ...prev, title: e.target.value }))}
                                    placeholder="e.g. Memories, Paris, Europe..."
                                    className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
                                    maxLength={24}
                                />
                                <button
                                    onClick={async () => {
                                        await updateStatus(showStatusEditModal.id, { title: showStatusEditModal.title || "" });
                                    }}
                                    className="px-3 py-2 bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                                >
                                    Save
                                </button>
                            </div>
                            <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1">Give your story a name — like Instagram Highlights</p>
                        </div>

                        {/* Current slides grid */}
                        <div className="flex-1 overflow-y-auto space-y-4 pr-1 -mr-1">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Current Photos & Videos</p>
                                {(() => {
                                    const currentSlides = showStatusEditModal.mediaItems && showStatusEditModal.mediaItems.length > 0 
                                        ? showStatusEditModal.mediaItems 
                                        : (showStatusEditModal.mediaUrl ? [{ id: 'legacy', mediaUrl: showStatusEditModal.mediaUrl, mediaType: showStatusEditModal.mediaType || 'photo' }] : []);
                                    
                                    if (currentSlides.length === 0) {
                                        return <p className="text-xs text-gray-400 dark:text-gray-500 py-3 text-center">No media files in this status yet.</p>;
                                    }

                                    return (
                                        <div className="grid grid-cols-2 gap-2.5">
                                            {currentSlides.map((slide: any /* eslint-disable-line @typescript-eslint/no-explicit-any */, index: number) => (
                                                <div key={slide.id || index} className="relative aspect-video rounded-xl overflow-hidden bg-black group border border-gray-100 dark:border-gray-700">
                                                    {slide.mediaType === "video" ? (
                                                        <video src={slide.mediaUrl} className="w-full h-full object-cover" muted />
                                                    ) : (
                                                        <img src={slide.mediaUrl} className="w-full h-full object-cover" alt="" />
                                                    )}
                                                    {/* Delete overlay */}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button
                                                            onClick={async () => {
                                                                const updatedSlides = currentSlides.filter((s: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => (s.id !== slide.id && s.mediaUrl !== slide.mediaUrl));
                                                                // Update Firestore
                                                                await updateStatus(showStatusEditModal.id, {
                                                                    mediaItems: updatedSlides,
                                                                    // Update legacy URL/type for backward compatibility
                                                                    mediaUrl: updatedSlides.length > 0 ? updatedSlides[0].mediaUrl : null,
                                                                    mediaType: updatedSlides.length > 0 ? updatedSlides[0].mediaType : null,
                                                                });
                                                                // Update local state
                                                                setShowStatusEditModal((prev: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => ({
                                                                    ...prev,
                                                                    mediaItems: updatedSlides,
                                                                    mediaUrl: updatedSlides.length > 0 ? updatedSlides[0].mediaUrl : null,
                                                                    mediaType: updatedSlides.length > 0 ? updatedSlides[0].mediaType : null,
                                                                }));
                                                            }}
                                                            className="w-8 h-8 bg-red-650/80 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-all scale-95 group-hover:scale-100"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 text-[8px] font-bold bg-black/50 text-white rounded">#{index + 1}</span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Add More Media section */}
                            <div className="border-t border-gray-100 dark:border-gray-700/50 pt-3">
                                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Add Photo or Video</p>
                                <button
                                    onClick={() => editFileInputRef.current?.click()}
                                    className={clsx(
                                        "w-full py-4 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center gap-1",
                                        highlightUploadArea
                                            ? "border-violet-500 text-violet-500 bg-violet-500/5 dark:bg-violet-500/10 animate-pulse"
                                            : "border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-violet-500 dark:hover:border-violet-500 hover:text-violet-500 bg-gray-50/50 dark:bg-gray-800/30"
                                    )}
                                >
                                    <Plus size={18} />
                                    <span className="text-xs font-semibold">Upload Photo/Video</span>
                                </button>
                                <input 
                                    type="file" 
                                    ref={editFileInputRef} 
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const isImage = file.type.startsWith("image/");
                                        const isVideo = file.type.startsWith("video/");
                                        if (!isImage && !isVideo) return;

                                        const reader = new FileReader();
                                        reader.onload = async (event) => {
                                            const dataUrl = event.target?.result as string;
                                            if (dataUrl) {
                                                addNotification("Uploading new item...");
                                                // Upload to storage
                                                const itemId = `item_${Date.now()}`;
                                                const storagePath = `statuses/${currentUser.id}/${showStatusEditModal.id}_${itemId}`;
                                                const uploadedUrl = await uploadImageToStorage(dataUrl, storagePath);

                                                const currentSlides = showStatusEditModal.mediaItems && showStatusEditModal.mediaItems.length > 0 
                                                    ? showStatusEditModal.mediaItems 
                                                    : (showStatusEditModal.mediaUrl ? [{ id: 'legacy', mediaUrl: showStatusEditModal.mediaUrl, mediaType: showStatusEditModal.mediaType || 'photo' }] : []);
                                                
                                                const newItem = {
                                                    id: itemId,
                                                    mediaUrl: uploadedUrl,
                                                    mediaType: isImage ? ("photo" as const) : ("video" as const)
                                                };
                                                const updatedSlides = [...currentSlides, newItem];

                                                await updateStatus(showStatusEditModal.id, {
                                                    mediaItems: updatedSlides,
                                                    mediaUrl: updatedSlides[0].mediaUrl,
                                                    mediaType: updatedSlides[0].mediaType,
                                                });

                                                setShowStatusEditModal((prev: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => ({
                                                    ...prev,
                                                    mediaItems: updatedSlides,
                                                    mediaUrl: updatedSlides[0].mediaUrl,
                                                    mediaType: updatedSlides[0].mediaType,
                                                }));
                                            }
                                        };
                                        reader.readAsDataURL(file);
                                    }} 
                                    className="hidden" 
                                    accept="image/*,video/*" 
                                />
                            </div>
                        </div>

                        <div className="pt-3 border-t border-gray-150 dark:border-gray-700/50 mt-4">
                            <button
                                onClick={() => setShowStatusEditModal(null)}
                                className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-800 dark:text-gray-200 font-bold rounded-xl text-xs shadow-sm"
                            >
                                Done Editing
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Status Confirmation Modal */}
            {statusToDelete && (
                <div
                    className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setStatusToDelete(null)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col items-center text-center mt-2">
                            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-4 text-red-500 dark:text-red-400">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Status Story?</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                                Are you sure you want to delete this status story? This action cannot be undone and it will be removed for all users.
                            </p>
                        </div>
                        
                        <div className="flex gap-3 mt-2">
                            <button
                                onClick={() => setStatusToDelete(null)}
                                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (statusToDelete) {
                                        await deleteStatus(statusToDelete);
                                        setStatusToDelete(null);
                                        setViewingStatus(null);
                                    }
                                }}
                                className="flex-1 py-3 px-4 rounded-xl bg-red-500 hover:bg-red-650 active:bg-red-700 text-sm font-semibold text-white shadow-lg transition-all"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rename Status Modal */}
            {showRenameModal && (
                <div
                    className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setShowRenameModal(null)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
                                    <Pencil size={15} className="text-violet-600 dark:text-violet-400" />
                                </div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">Name this Story</h3>
                            </div>
                            <button
                                onClick={() => setShowRenameModal(null)}
                                className="w-7 h-7 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                            >
                                <X size={16} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Input */}
                        <input
                            type="text"
                            value={renameInput}
                            onChange={(e) => setRenameInput(e.target.value)}
                            onKeyDown={async (e) => {
                                if (e.key === "Enter" && renameInput.trim()) {
                                    await updateStatus(showRenameModal.statusId, { title: renameInput.trim() });
                                    setShowRenameModal(null);
                                }
                            }}
                            placeholder="e.g. Memories, Paris, Europe 2024..."
                            autoFocus
                            maxLength={24}
                            className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all mb-1.5"
                        />
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-5">
                            {renameInput.length}/24 characters — shown below the story circle
                        </p>

                        {/* Suggestions */}
                        <div className="mb-5">
                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Quick Suggestions</p>
                            <div className="flex flex-wrap gap-1.5">
                                {["Memories", "Travel", "2024", "Favorites", "Summer", "Family", "Friends", "Work"].map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        onClick={() => setRenameInput(suggestion)}
                                        className={clsx(
                                            "px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all",
                                            renameInput === suggestion
                                                ? "bg-violet-500 text-white border-violet-500"
                                                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400"
                                        )}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2.5">
                            <button
                                onClick={() => setShowRenameModal(null)}
                                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    const title = renameInput.trim();
                                    await updateStatus(showRenameModal.statusId, { title: title || undefined });
                                    setShowRenameModal(null);
                                }}
                                disabled={!renameInput.trim()}
                                className="flex-1 py-2.5 bg-violet-500 hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
                            >
                                Save Name
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <ZoomedAvatarModal
                isOpen={showPfpPreview}
                onClose={() => setShowPfpPreview(false)}
                userName={user.name}
                userAvatar={profilePhoto}
                userColor={user.color}
                isGroup={isGroupProfile}
                isSelf={isSelf}
                onChangeAvatar={updateAvatar}
                onLeaveGroup={() => {
                    setShowConfirmLeaveGroup(true);
                    setShowPfpPreview(false);
                }}
                onMessage={() => {
                    handleStartDirectChat();
                    setShowPfpPreview(false);
                }}
                onCall={(type) => initiateCall(user.id, user.name, profilePhoto || null, type)}
                onInfo={() => {}} 
            />

            {/* Member Action Context Menu Modal */}
            {selectedMemberForMenu && groupThread && (
                <div 
                    className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setSelectedMemberForMenu(null)}
                >
                    <div 
                        className="w-full sm:max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom sm:zoom-in duration-250 border border-gray-150 dark:border-zinc-800"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Member Summary Header */}
                        <div className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-zinc-800">
                            <div className={clsx("w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white relative shrink-0", selectedMemberForMenu.color || "bg-emerald-500")}>
                                {selectedMemberForMenu.avatar ? (
                                    <img src={selectedMemberForMenu.avatar} alt={selectedMemberForMenu.name} className="w-full h-full rounded-full object-cover select-none pointer-events-none" />
                                ) : (
                                    selectedMemberForMenu.name.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-base text-gray-900 dark:text-white truncate">{selectedMemberForMenu.name}</h4>
                                <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">{selectedMemberForMenu.bio || "Hey there! I'm using Yogheart."}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedMemberForMenu(null)}
                                className="p-1 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-full transition-colors text-gray-500 dark:text-gray-400 cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Options List */}
                        {(() => {
                            const hasDmThread = threads.some(t => !t.isGroup && t.user.id === selectedMemberForMenu.id);
                            const isMemberAlsoAdmin = (groupThread.adminIds && groupThread.adminIds.length > 0 ? groupThread.adminIds : [groupThread.creatorId || groupThread.initiatedBy || ""]).includes(selectedMemberForMenu.id);
                            const canCommunicate = isGroupAdmin || hasDmThread;
                            return (
                        <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto pr-1">
                            {/* Always visible */}
                            <button
                                onClick={() => {
                                    setSelectedMemberForMenu(null);
                                    window.history.pushState(null, "", `/profile?userId=${selectedMemberForMenu.id}`);
                                }}
                                className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/50 rounded-xl text-left text-sm font-semibold text-gray-800 dark:text-gray-200 transition-colors cursor-pointer"
                            >
                                <Users size={18} className="text-zinc-500" /> View Profile
                            </button>

                            {/* Send Icebreaker: only for non-friends who are not admin */}
                            {!canCommunicate && (
                                <button
                                    onClick={() => {
                                        const member = selectedMemberForMenu;
                                        setSelectedMemberForMenu(null);
                                        sendIcebreaker(member, "👋 Hey! We're in the same group. Let's connect!");
                                    }}
                                    className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/50 rounded-xl text-left text-sm font-semibold text-gray-800 dark:text-gray-200 transition-colors cursor-pointer"
                                >
                                    <MessageSquare size={18} className="text-amber-500" /> Send Icebreaker
                                </button>
                            )}
                            
                            {/* Communication options: visible for mutual friends OR admin */}
                            {canCommunicate && (
                                <button
                                    onClick={() => {
                                        setSelectedMemberForMenu(null);
                                        handleMemberChat(selectedMemberForMenu);
                                    }}
                                    className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/50 rounded-xl text-left text-sm font-semibold text-gray-800 dark:text-gray-200 transition-colors cursor-pointer"
                                >
                                    <MessageSquare size={18} className="text-indigo-500" /> Send Message
                                </button>
                            )}

                            {canCommunicate && (
                                <button
                                    onClick={() => {
                                        setSelectedMemberForMenu(null);
                                        handleMemberCall(selectedMemberForMenu, "audio");
                                    }}
                                    className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/50 rounded-xl text-left text-sm font-semibold text-gray-800 dark:text-gray-200 transition-colors cursor-pointer"
                                >
                                    <Phone size={18} className="text-emerald-500" /> Voice Call
                                </button>
                            )}

                            {canCommunicate && (
                                <button
                                    onClick={() => {
                                        setSelectedMemberForMenu(null);
                                        handleMemberCall(selectedMemberForMenu, "video");
                                    }}
                                    className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/50 rounded-xl text-left text-sm font-semibold text-gray-800 dark:text-gray-200 transition-colors cursor-pointer"
                                >
                                    <Video size={18} className="text-rose-500" /> Video Call
                                </button>
                            )}

                            {/* Admin-only: Make Admin */}
                            {isGroupAdmin && !isMemberAlsoAdmin && (
                                <button
                                    onClick={() => {
                                        setSelectedMemberForMenu(null);
                                        handleMemberMakeAdmin(selectedMemberForMenu);
                                    }}
                                    className="flex items-center gap-3 px-3 py-3 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/20 dark:hover:text-blue-400 rounded-xl text-left text-sm font-semibold text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                                >
                                    <UserCheck size={18} /> Make Admin
                                </button>
                            )}

                            {/* Admin-only: Remove from Group */}
                            {isGroupAdmin && (
                                <button
                                    onClick={() => {
                                        setSelectedMemberForMenu(null);
                                        handleMemberRemove(selectedMemberForMenu);
                                    }}
                                    className="flex items-center gap-3 px-3 py-3 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 rounded-xl text-left text-sm font-semibold text-red-650 transition-colors cursor-pointer"
                                >
                                    <Trash2 size={18} /> Remove from Group
                                </button>
                            )}

                            {/* Block: visible for mutual friends OR admin */}
                            {canCommunicate && (
                                <button
                                    onClick={() => {
                                        setSelectedMemberForMenu(null);
                                        handleMemberBlock(selectedMemberForMenu);
                                    }}
                                    className="flex items-center gap-3 px-3 py-3 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-950/20 dark:hover:text-orange-400 rounded-xl text-left text-sm font-semibold text-orange-650 transition-colors cursor-pointer"
                                >
                                    <Ban size={18} /> Block User
                                </button>
                            )}
                        </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {showConfetti && (
                <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                    <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
                        {/* Confetti particles */}
                        {CONFETTI_PARTICLES.map((particle, i) => {
                            return (
                                <div
                                    key={i}
                                    className={`absolute rounded-full opacity-90 ${particle.randomColor} animate-confetti`}
                                    style={{
                                        width: `${particle.size}px`,
                                        height: `${particle.size}px`,
                                        left: `${particle.left}%`,
                                        top: `-10px`,
                                        animationDelay: `${particle.delay}s`,
                                        animationDuration: `${particle.duration}s`,
                                    }}
                                />
                            );
                        })}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-3 animate-[zoomIn_0.3s_ease-out] max-w-xs mx-4 text-center">
                            <div className="w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg text-white text-3xl animate-bounce">
                                🔥
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Status Boosted!</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Your status is now promoted to the top of the pool for everyone to see.</p>
                        </div>
                    </div>
                    <style jsx global>{`
                        @keyframes confetti-fall {
                            0% {
                                transform: translateY(0) rotate(0deg);
                                opacity: 1;
                            }
                            100% {
                                transform: translateY(105vh) rotate(720deg);
                                opacity: 0;
                            }
                        }
                        .animate-confetti {
                            animation: confetti-fall linear (infinite or whatever is fine) 1;
                            animation-iteration-count: 1;
                            animation-fill-mode: forwards;
                        }
                        @keyframes pfpZoomIn {
                            from {
                                transform: scale(0.4);
                                opacity: 0;
                            }
                            to {
                                transform: scale(1);
                                opacity: 1;
                            }
                        }
                        @keyframes pfpZoomOut {
                            from {
                                transform: scale(1);
                                opacity: 1;
                            }
                            to {
                                transform: scale(0.4);
                                opacity: 0;
                            }
                        }
                        @keyframes fadeIn {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        @keyframes fadeOut {
                            from { opacity: 1; }
                            to { opacity: 0; }
                        }
                        .animate-pfp-in {
                            animation: pfpZoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                        }
                        .animate-pfp-out {
                            animation: pfpZoomOut 0.25s cubic-bezier(0.36, 0.07, 0.19, 0.97) forwards;
                        }
                        .animate-fade-in-overlay {
                            animation: fadeIn 0.3s ease-out forwards;
                        }
                        .animate-fade-out-overlay {
                            animation: fadeOut 0.25s ease-in forwards;
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}

// Mobile Comments sliding drawer panel overlay (Instagram Layout)
const CommentsDrawer = ({
    moodId,
    onClose,
    currentUser,
    isSelf,
    onComment,
    onLikeComment,
    onEditComment,
    onDeleteComment,
    moods
}: {
    moodId: string;
    onClose: () => void;
    currentUser: User | null;
    isSelf: boolean;
    onComment: (id: string, text: string, replyTo?: string | null) => void;
    onLikeComment: (moodId: string, commentId: string) => void;
    onEditComment: (moodId: string, commentId: string, text: string) => void;
    onDeleteComment: (moodId: string, commentId: string) => void;
    moods: Mood[];
}) => {
    const [commentText, setCommentText] = useState("");
    const [replyingTo, setReplyingTo] = useState<{ commentId: string; userName: string } | null>(null);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editCommentText, setEditCommentText] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Swipe-to-dismiss
    const [dragY, setDragY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartY = useRef(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleDragStart = (e: React.TouchEvent) => {
        const target = e.target as HTMLElement;
        // Don't initiate drag on buttons, inputs, or interactive elements
        if (target.tagName === "BUTTON" || target.closest("button") || target.tagName === "INPUT" || target.closest("input")) return;
        // Only allow drag if the scrollable list is at the top (not scrolled)
        if (scrollRef.current && scrollRef.current.scrollTop > 0) return;
        dragStartY.current = e.touches[0].clientY;
        setIsDragging(true);
    };
    const handleDragMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const deltaY = e.touches[0].clientY - dragStartY.current;
        if (deltaY > 0) {
            setDragY(deltaY);
            if (e.cancelable) e.preventDefault();
        } else {
            setDragY(0);
        }
    };
    const handleDragEnd = () => {
        setIsDragging(false);
        if (dragY > 200) {
            onClose();
        }
        setDragY(0);
    };
    
    const mood = moods.find(m => m.id === moodId);
    if (!mood) return null;

    const formatCommentTime = (isoString: string) => {
        try {
            const nowTime = new Date().getTime();
            const diffMs = nowTime - new Date(isoString).getTime();
            const diffMin = Math.floor(diffMs / 60000);
            if (diffMin < 1) return "now";
            if (diffMin < 60) return `${diffMin}m`;
            const diffHr = Math.floor(diffMin / 60);
            if (diffHr < 24) return `${diffHr}h`;
            const diffDays = Math.floor(diffHr / 24);
            return `${diffDays}d`;
        } catch {
            return "";
        }
    };

    const rootComments = mood.comments.filter(c => !c.replyTo);
    
    const renderCommentItem = (comment: MoodComment, isReply: boolean = false) => {
        const commentLikes = comment.likes || [];
        const isCommentLiked = commentLikes.includes(currentUser?.id || "");
        const canEdit = currentUser && comment.userId === currentUser.id;
        const canDelete = currentUser && (comment.userId === currentUser.id || isSelf);
        
        return (
            <div key={comment.id} className={clsx("flex gap-2.5 items-start mt-3.5", isReply && "pl-8")}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs relative bg-gray-150 dark:bg-gray-800 shrink-0 mt-0.5 overflow-hidden">
                    {!comment.userAvatar ? "👤" : <img src={comment.userAvatar} className="w-full h-full object-cover" />}
                </div>

                <div className="flex-1 min-w-0">
                    {editingCommentId === comment.id ? (
                        <div className="flex flex-col gap-1.5 mt-0.5 bg-gray-50 dark:bg-gray-850 p-2.5 rounded-xl border border-gray-200 dark:border-gray-805">
                            <input 
                                type="text" 
                                value={editCommentText} 
                                onChange={(e) => setEditCommentText(e.target.value)}
                                className="w-full px-3 py-1.5 text-sm bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                                autoFocus
                            />
                            <div className="flex gap-3 justify-end">
                                <button 
                                    onClick={() => setEditingCommentId(null)} 
                                    className="text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => {
                                        if (editCommentText.trim()) {
                                            onEditComment(mood.id, comment.id, editCommentText);
                                            setEditingCommentId(null);
                                        }
                                    }} 
                                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 text-left">
                                <span className="font-bold dark:text-white mr-1.5">{comment.userName}</span>
                                <span className="break-words">{comment.text}</span>
                            </div>

                            <div className="flex items-center gap-3.5 mt-2 text-[12px] text-gray-500 dark:text-zinc-400 font-bold">
                                <span className="text-gray-400 dark:text-zinc-500 font-normal">{formatCommentTime(comment.createdAt)}</span>
                                
                                <button 
                                    onClick={() => onLikeComment(mood.id, comment.id)}
                                    className={clsx("flex items-center gap-1 py-1.5 px-2.5 rounded-lg transition-colors bg-gray-50 dark:bg-zinc-800/35", isCommentLiked ? "text-red-500 bg-red-50/40 dark:bg-red-950/20" : "hover:text-gray-700 dark:hover:text-white")}
                                >
                                    <span>{isCommentLiked ? "❤️" : "🤍"}</span>
                                    {commentLikes.length > 0 && <span className="ml-0.5">{commentLikes.length}</span>}
                                </button>

                                {!isReply && (
                                    <button 
                                        onClick={() => {
                                            setReplyingTo({ commentId: comment.id, userName: comment.userName });
                                            inputRef.current?.focus();
                                        }}
                                        className="py-1.5 px-2.5 rounded-lg bg-gray-50 dark:bg-zinc-800/35 hover:text-gray-750 dark:hover:text-white transition-colors"
                                    >
                                        Reply
                                    </button>
                                )}

                                {canEdit && (
                                    <button 
                                        onClick={() => {
                                            setEditingCommentId(comment.id);
                                            setEditCommentText(comment.text);
                                        }}
                                        className="py-1.5 px-2.5 rounded-lg bg-gray-50 dark:bg-zinc-800/35 hover:text-gray-755 dark:hover:text-white transition-colors"
                                    >
                                        Edit
                                    </button>
                                )}

                                {canDelete && (
                                    <button 
                                        onClick={() => onDeleteComment(mood.id, comment.id)}
                                        className="py-1.5 px-2.5 rounded-lg bg-red-50/20 dark:bg-red-950/10 text-red-500 hover:text-red-600 transition-colors"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[150] modal-overlay flex items-end justify-center lg:hidden">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50 animate-backdrop-fade-in" 
                onClick={onClose}
                style={{ opacity: Math.max(0, 1 - (dragY / 300)) }}
            />
            
            {/* Drawer sheet */}
            <div 
                className="relative w-full h-[75vh] bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-bottom-sheet-slide-up z-10 border-t border-gray-100 dark:border-zinc-800"
                style={{
                    transform: `translateY(${dragY > 0 ? dragY : 0}px)`,
                    transition: isDragging ? 'none' : 'transform 0.3s ease-out'
                }}
                onTouchStart={handleDragStart}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
                onTouchCancel={handleDragEnd}
            >
                {/* Drag pill and header */}
                <div className="w-full shrink-0 flex flex-col items-center border-b border-gray-50 dark:border-zinc-800 py-3 cursor-row-resize select-none">
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-zinc-700 rounded-full mb-3" />
                    <span className="text-sm font-bold text-gray-900 dark:text-white">Comments</span>
                </div>

                {/* Scrollable list */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar min-h-0">
                    {rootComments.length === 0 ? (
                        <div className="text-center py-10">
                            <span className="text-3xl">💬</span>
                            <p className="text-xs text-gray-500 italic mt-2">No comments yet. Be the first!</p>
                        </div>
                    ) : (
                        rootComments.map((rootComment) => {
                            const replies = mood.comments.filter(c => c.replyTo === rootComment.id);
                            return (
                                <div key={rootComment.id} className="border-b border-gray-50/30 dark:border-gray-800/10 pb-3">
                                    {renderCommentItem(rootComment, false)}
                                    {replies.map((reply) => renderCommentItem(reply, true))}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Bottom comment box */}
                <div className="p-4 pb-10 md:pb-4 border-t border-gray-100 dark:border-zinc-850 shrink-0 bg-white dark:bg-zinc-900">
                    {replyingTo && (
                        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl mb-3 border border-gray-100 dark:border-gray-700/50">
                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                                Replying to @{replyingTo.userName}
                            </span>
                            <button 
                                onClick={() => setReplyingTo(null)}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                            >
                                <X size={12} className="text-gray-400" />
                            </button>
                        </div>
                    )}

                    {/* Instagram-style Quick Emojis Bar */}
                    <div className="flex items-center justify-between px-1 pb-3 pt-0.5 mb-3 overflow-x-auto gap-2 shrink-0 select-none custom-scrollbar">
                        {["❤️", "🙌", "🔥", "👏", "😢", "😍", "😮", "😂"].map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => setCommentText(prev => prev + emoji)}
                                className="text-2xl hover:scale-110 active:scale-95 transition-transform duration-100"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Current User Avatar */}
                        <div className={clsx("w-9 h-9 rounded-full flex items-center justify-center text-xs relative shrink-0 overflow-hidden bg-gray-100 dark:bg-zinc-800")}>
                            {!currentUser?.avatar ? (
                                <span className="font-bold text-gray-500 dark:text-zinc-400">{currentUser?.name?.[0]?.toUpperCase() || "👤"}</span>
                            ) : (
                                <img src={currentUser.avatar} className="w-full h-full object-cover" alt="User Avatar" />
                            )}
                        </div>

                        {/* Input Box */}
                        <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700/60 rounded-full px-4.5 py-2.5 shadow-sm">
                            <input
                                ref={inputRef}
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && commentText.trim()) {
                                        onComment(mood.id, commentText, replyingTo?.commentId);
                                        setCommentText("");
                                        setReplyingTo(null);
                                    }
                                }}
                                placeholder={replyingTo ? `Reply to @${replyingTo.userName}...` : `Add a comment...`}
                                className="flex-1 text-base bg-transparent outline-none border-none dark:text-white placeholder:text-gray-400 py-0.5"
                            />
                            <button
                                onClick={() => {
                                    if (commentText.trim()) {
                                        onComment(mood.id, commentText, replyingTo?.commentId);
                                        setCommentText("");
                                        setReplyingTo(null);
                                    }
                                }}
                                disabled={!commentText.trim()}
                                className="text-indigo-600 dark:text-indigo-400 font-bold text-base disabled:opacity-30 transition-opacity whitespace-nowrap px-1.5 hover:scale-105 active:scale-95 transition-transform"
                            >
                                Post
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

