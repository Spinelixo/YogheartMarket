"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  useMockData,
  User,
  Status,
  Mood,
  Draft
} from "@/context/MockContext";
import {
  Plus,
  X,
  Heart,
  MessageSquare,
  Play,
  Image as ImageIcon,
  Film,
  Send,
  Sparkles,
  Trash2,
  Globe,
  ChevronLeft,
  ArrowLeft,
  Edit2,
  Check
} from "lucide-react";
import { clsx } from "clsx";
import { useModalHistory } from "@/hooks/useModalHistory";

export const STATUS_GRADIENTS: Record<string, string> = {
  "from-rose-500 to-amber-500": "linear-gradient(135deg, #f43f5e, #f59e0b)",
  "from-indigo-500 to-purple-600": "linear-gradient(135deg, #6366f1, #9333ea)",
  "from-emerald-400 to-cyan-500": "linear-gradient(135deg, #34d399, #06b6d4)",
  "from-fuchsia-600 to-pink-500": "linear-gradient(135deg, #c026d3, #ec4899)",
  "from-blue-600 to-indigo-800": "linear-gradient(135deg, #2563eb, #3730a3)",
  "from-amber-400 to-orange-600": "linear-gradient(135deg, #fbbf24, #ea580c)",
  "from-teal-400 to-emerald-600": "linear-gradient(135deg, #2dd4bf, #059669)",
  "from-gray-900 to-black": "linear-gradient(135deg, #111827, #000000)"
};

// ─────────────────────────────────────────────────────────────
// 1. STATUS STORIES ROW (Below fulfillment buttons)
// ─────────────────────────────────────────────────────────────
interface StatusStoriesRowProps {
  sellerUser: User;
  isMe: boolean;
  hasFeedPosts?: boolean;
  onOpenCreateStatus: () => void;
  onOpenCreatePost?: () => void;
  onOpenStatus: (status: Status) => void;
}

export function StatusStoriesRow({
  sellerUser,
  isMe,
  hasFeedPosts = false,
  onOpenCreateStatus,
  onOpenCreatePost,
  onOpenStatus
}: StatusStoriesRowProps) {
  const { getStatusesForUser } = useMockData();
  const [seenStatuses, setSeenStatuses] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem("yogheart_seen_statuses");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const userStatuses = useMemo(() => {
    return getStatusesForUser(sellerUser.id) || [];
  }, [getStatusesForUser, sellerUser.id]);

  const activeStatuses = useMemo(() => {
    return userStatuses.filter(
      (s) => Date.now() - new Date(s.timestamp).getTime() <= 24 * 60 * 60 * 1000
    );
  }, [userStatuses]);

  return (
    <div className="pt-2 pb-1">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
        {/* + New Status Button (Owner only) */}
        {isMe && (
          <button
            type="button"
            onClick={onOpenCreateStatus}
            className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-dashed border-gray-300 dark:border-zinc-700 flex items-center justify-center bg-gray-50 dark:bg-zinc-900 hover:border-[var(--primary)] hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all group-hover:scale-105">
              <Plus size={20} className="text-gray-400 group-hover:text-[var(--primary)] transition-colors" />
            </div>
            <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium">
              {hasFeedPosts ? "Status" : "New"}
            </span>
          </button>
        )}

        {/* + New Post Button (Owner only, circular, placed next to circular new Status when there are feed posts) */}
        {isMe && hasFeedPosts && onOpenCreatePost && (
          <button
            type="button"
            onClick={onOpenCreatePost}
            className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-dashed border-gray-300 dark:border-zinc-700 flex items-center justify-center bg-gray-50 dark:bg-zinc-900 hover:border-[var(--primary)] hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all group-hover:scale-105">
              <Plus size={20} className="text-gray-400 group-hover:text-[var(--primary)] transition-colors" />
            </div>
            <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium">New Post</span>
          </button>
        )}

        {/* Active Status Story Circles */}
        {activeStatuses.map((status) => {
          const isRead = seenStatuses.has(status.id);
          const bgGrad = status.backgroundColor ? STATUS_GRADIENTS[status.backgroundColor] || status.backgroundColor : undefined;
          return (
            <button
              key={status.id}
              type="button"
              onClick={() => {
                setSeenStatuses((prev) => {
                  const next = new Set(prev).add(status.id);
                  try {
                    localStorage.setItem("yogheart_seen_statuses", JSON.stringify([...next]));
                  } catch {}
                  return next;
                });
                onOpenStatus(status);
              }}
              className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
            >
              <div
                className={clsx(
                  "w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[2.5px] transition-transform group-hover:scale-105",
                  isRead
                    ? "bg-gray-300 dark:bg-zinc-700"
                    : "bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600"
                )}
              >
                <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 p-[2px] overflow-hidden flex items-center justify-center">
                  {status.mediaUrl ? (
                    status.mediaType === "video" ? (
                      <video src={status.mediaUrl} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <img src={status.mediaUrl} className="w-full h-full object-cover rounded-full" alt="" />
                    )
                  ) : (
                    <div
                      className="w-full h-full rounded-full flex items-center justify-center text-white font-black text-xs px-1 text-center truncate"
                      style={{ background: bgGrad || "linear-gradient(135deg, #6366f1, #9333ea)" }}
                    >
                      Aa
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-gray-600 dark:text-zinc-400 font-medium truncate max-w-[62px]">
                {status.textContent ? status.textContent.slice(0, 10) : "Status"}
              </span>
            </button>
          );
        })}

        {!isMe && activeStatuses.length === 0 && (
          <div className="flex flex-col items-center shrink-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-dashed border-gray-300 dark:border-zinc-700 bg-gray-50/40 dark:bg-zinc-900/40" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. STATUS VIEWER MODAL
// ─────────────────────────────────────────────────────────────
interface StatusViewerModalProps {
  status: Status;
  onClose: () => void;
}

export function StatusViewerModal({ status, onClose }: StatusViewerModalProps) {
  const { replyToStatus, currentUser } = useMockData();
  const [replyText, setReplyText] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("yogheart_seen_statuses");
        const set = stored ? new Set(JSON.parse(stored)) : new Set();
        set.add(status.id);
        localStorage.setItem("yogheart_seen_statuses", JSON.stringify([...set]));
      } catch {}
    }
  }, [status.id]);

  // 5-second story auto-progress
  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          onClose();
          return 100;
        }
        return prev + 2;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [status, onClose]);

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    await replyToStatus(status.id, replyText);
    setReplyText("");
    onClose();
  };

  const bgGrad = status.backgroundColor ? STATUS_GRADIENTS[status.backgroundColor] || status.backgroundColor : "linear-gradient(135deg, #6366f1, #9333ea)";

  return (
    <div
      data-modal="true"
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-2 sm:p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md h-[80vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between p-4"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: status.mediaUrl ? "#000" : bgGrad
        }}
      >
        {/* Progress Bar */}
        <div className="w-full bg-white/25 h-1 rounded-full overflow-hidden mb-3 relative z-20">
          <div
            className="bg-white h-full transition-all duration-100 ease-linear rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Story Header */}
        <div className="flex items-center justify-between relative z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/20 border border-white/40 overflow-hidden flex items-center justify-center text-white font-bold text-sm">
              {status.userAvatar ? (
                <img src={status.userAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                status.username?.charAt(0) || "U"
              )}
            </div>
            <div>
              <p className="text-white text-xs font-bold leading-tight">{status.username || "Seller"}</p>
              <p className="text-white/70 text-[10px]">Just now</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Media or Text Content */}
        <div className="flex-1 flex items-center justify-center relative my-4 overflow-hidden">
          {status.mediaUrl ? (
            status.mediaType === "video" ? (
              <video
                src={status.mediaUrl}
                className="w-full h-full object-contain rounded-2xl"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <img
                src={status.mediaUrl}
                className="w-full h-full object-contain rounded-2xl"
                alt=""
              />
            )
          ) : (
            <div className="p-6 text-center">
              <p className="text-white text-xl sm:text-2xl font-bold leading-relaxed drop-shadow-md select-none">
                {status.textContent}
              </p>
            </div>
          )}
        </div>

        {/* Reply Bar */}
        {currentUser?.id !== status.userId && (
          <div className="flex items-center gap-2 relative z-20 pt-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Reply to status..."
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendReply();
              }}
              className="flex-1 bg-white/20 border border-white/30 text-white placeholder:text-white/60 text-xs px-4 py-2.5 rounded-full outline-none backdrop-blur-sm"
            />
            <button
              type="button"
              onClick={handleSendReply}
              className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
            >
              <Send size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. UNIFIED POST COMPOSER MODAL (Status, Feed Post)
// ─────────────────────────────────────────────────────────────
interface UnifiedPostModalProps {
  initialType?: "status" | "feed";
  onClose: () => void;
}

export function UnifiedPostModal({ initialType = "status", onClose }: UnifiedPostModalProps) {
  const { postStatus, postMood, addNotification } = useMockData();
  const [postType, setPostType] = useState<"status" | "feed">(initialType);
  const [isClosing, setIsClosing] = useState(false);
  const [animPhase, setAnimPhase] = useState<"entering" | "stable">("entering");

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 280);
  };

  useModalHistory("unifiedPostModal", !isClosing, handleClose);

  // Status state
  const [statusText, setStatusText] = useState("");
  const [statusBg, setStatusBg] = useState("from-indigo-500 to-purple-600");
  const [statusMediaData, setStatusMediaData] = useState<string | null>(null);
  const [statusMediaType, setStatusMediaType] = useState<"photo" | "video">("photo");

  // Feed post state (merged mood / clip)
  const [feedCaption, setFeedCaption] = useState("");
  const [feedMediaData, setFeedMediaData] = useState<string | null>(null);
  const [feedMediaType, setFeedMediaType] = useState<"photo" | "video">("photo");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Swipe gesture to dismiss from left edge
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (touchStartX.current < 60 && deltaX > 80 && deltaY < 80) {
      handleClose();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: "status" | "feed") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (target === "status") {
        setStatusMediaData(dataUrl);
        setStatusMediaType(isVideo ? "video" : "photo");
      } else {
        setFeedMediaData(dataUrl);
        setFeedMediaType(isVideo ? "video" : "photo");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (postType === "status") {
        if (!statusText.trim() && !statusMediaData) {
          addNotification("Please enter status text or upload media.");
          setIsSubmitting(false);
          return;
        }
        await postStatus(
          statusText.trim() || undefined,
          statusMediaData || undefined,
          statusMediaData ? statusMediaType : undefined,
          statusBg
        );
        addNotification("Status shared! ✨");
      } else {
        if (!feedMediaData) {
          addNotification("Please select a photo or clip for your feed.");
          setIsSubmitting(false);
          return;
        }
        await postMood(feedMediaType, feedMediaData, feedCaption.trim());
        addNotification("Posted to your Store Feed! 📸");
      }
      handleClose();
    } catch (err) {
      console.error(err);
      addNotification("Error posting content. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-modal="true"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onAnimationEnd={(e) => {
        if (e.target !== e.currentTarget) return;
        if (animPhase === "entering" && !isClosing) {
          setAnimPhase("stable");
        }
      }}
      className={clsx(
        "absolute inset-0 z-50 bg-white dark:bg-zinc-950 flex flex-col h-full w-full overflow-hidden select-none antialiased subpixel-antialiased",
        isClosing
          ? "animate-slide-out-to-right-edge"
          : animPhase === "entering"
          ? "animate-slide-in-from-right-edge"
          : ""
      )}
      style={{
        pointerEvents: isClosing ? "none" : "auto",
        willChange: isClosing || animPhase === "entering" ? "transform" : "auto",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: animPhase === "stable" && !isClosing ? "none" : undefined,
      }}
    >
      {/* Top Header */}
      <header className="px-3 sm:px-5 py-3 border-b border-[var(--border)] dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-900 sticky top-0 z-20 shadow-xs">
        <div className="max-w-xl mx-auto w-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer shrink-0"
              title="Back"
            >
              <ArrowLeft size={24} className="text-[var(--primary)]" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight truncate">
                {postType === "status" ? "Share New Status" : "New Post / Clip"}
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate">
                {postType === "status"
                  ? "Disappears after 24 hours"
                  : "Permanent post in your store feed"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-[var(--primary)] hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Publishing...</span>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Publish</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer shrink-0"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, postType === "status" ? "status" : "feed")}
      />

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-4 py-5 max-w-xl mx-auto w-full custom-scrollbar flex flex-col gap-5">
        {/* STATUS VIEW */}
        {postType === "status" && (
          <div className="space-y-4">
            {/* Status Card Preview */}
            <div
              className="w-full aspect-[4/3] rounded-3xl relative overflow-hidden flex items-center justify-center p-5 text-center shadow-lg transition-all"
              style={{
                background: statusMediaData ? "#000" : STATUS_GRADIENTS[statusBg]
              }}
            >
              {statusMediaData ? (
                statusMediaType === "video" ? (
                  <video src={statusMediaData} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                ) : (
                  <img src={statusMediaData} className="w-full h-full object-cover" alt="" />
                )
              ) : (
                <textarea
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value.slice(0, 200))}
                  placeholder="What's on your mind? Tap to write..."
                  className="w-full bg-black/35 backdrop-blur-md text-white text-center font-bold text-lg sm:text-xl placeholder:text-white/65 p-4 rounded-2xl outline-none resize-none border border-white/20 shadow-inner"
                  rows={4}
                />
              )}
            </div>

            {/* Gradient Selector */}
            {!statusMediaData && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500 dark:text-zinc-400">Background Colors</p>
                <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
                  {Object.keys(STATUS_GRADIENTS).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStatusBg(key)}
                      className={clsx(
                        "w-9 h-9 rounded-full shrink-0 border-2 transition-transform cursor-pointer",
                        statusBg === key ? "scale-110 border-black dark:border-white shadow-md ring-2 ring-[var(--primary)]" : "border-transparent"
                      )}
                      style={{ background: STATUS_GRADIENTS[key] }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* File Upload Button */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-xs font-bold text-gray-800 dark:text-zinc-200 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                <ImageIcon size={17} />
                <span>{statusMediaData ? "Change Photo/Video" : "Add Photo/Video"}</span>
              </button>
              {statusMediaData && (
                <button
                  type="button"
                  onClick={() => setStatusMediaData(null)}
                  className="text-xs text-red-500 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  <span>Clear Media</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* FEED POST VIEW */}
        {postType === "feed" && (
          <div className="space-y-4">
            {feedMediaData ? (
              <div className="w-full aspect-square max-h-96 rounded-3xl overflow-hidden relative bg-black flex items-center justify-center shadow-md">
                {feedMediaType === "video" ? (
                  <video src={feedMediaData} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                ) : (
                  <img src={feedMediaData} className="w-full h-full object-cover" alt="" />
                )}
                <button
                  type="button"
                  onClick={() => setFeedMediaData(null)}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-black text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-64 rounded-3xl border-2 border-dashed border-gray-200 dark:border-zinc-700 hover:border-[var(--primary)] flex flex-col items-center justify-center gap-3 cursor-pointer bg-gray-50 dark:bg-zinc-900/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-[var(--primary)] flex items-center justify-center shadow-xs">
                  <Film size={28} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-800 dark:text-zinc-200">Tap to upload Photo or Clip</p>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Supports JPG, PNG, MP4, WebM up to 100MB</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-1.5">Caption</label>
              <textarea
                value={feedCaption}
                onChange={(e) => setFeedCaption(e.target.value)}
                placeholder="Write a caption for your store feed..."
                className="w-full bg-gray-100 dark:bg-zinc-800/80 text-gray-900 dark:text-white text-sm p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none transition-all"
                rows={4}
              />
            </div>
          </div>
        )}

      </div>

      {/* Bottom Sticky Action Bar */}
      <div
        className="px-4 py-3.5 border-t border-[var(--border)] dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 1rem))" }}
      >
        <div className="max-w-xl mx-auto w-full">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="w-full py-3.5 bg-[var(--primary)] hover:bg-emerald-600 text-white font-bold text-sm rounded-2xl shadow-md shadow-emerald-600/20 transition-all active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span>Publishing...</span>
            ) : (
              <>
                <Sparkles size={17} />
                <span>{postType === "status" ? "Share Status" : "Publish to Store Feed"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. STORE FEED VIEW (Merged Photos & Clips)
// ─────────────────────────────────────────────────────────────
interface StoreFeedViewProps {
  sellerUser: User;
  isMe: boolean;
  onOpenCreatePost: () => void;
}

export function StoreFeedView({ sellerUser, isMe, onOpenCreatePost }: StoreFeedViewProps) {
  const { getMoodsForUser } = useMockData();
  const [selectedPost, setSelectedPost] = useState<Mood | null>(null);
  const [closingPost, setClosingPost] = useState<Mood | null>(null);

  const moodsList = useMemo(() => {
    const list = getMoodsForUser(sellerUser.id) || [];
    return [...list].reverse();
  }, [getMoodsForUser, sellerUser.id]);

  const handleCloseDetail = () => {
    if (!selectedPost || closingPost) return;
    setClosingPost(selectedPost);
    setSelectedPost(null);
    setTimeout(() => {
      setClosingPost(null);
    }, 280);
  };

  return (
    <div className="pt-1">
      {/* Grid of Feed Items */}
      {moodsList.length === 0 ? (
        <div className="text-center py-12 px-4 bg-gray-50/40 dark:bg-zinc-900/30 rounded-3xl border border-gray-100/70 dark:border-zinc-800">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-[var(--primary)] flex items-center justify-center">
            <Film size={26} />
          </div>
          <h3 className="font-bold text-sm text-gray-800 dark:text-zinc-200 mb-1">No Posts in Feed Yet</h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-xs mx-auto">
            {isMe ? "Post photos and video clips to show off your products and store vibe." : "This seller hasn't posted any photos or clips yet."}
          </p>

          {/* Centered New Post / Clip button directly below the description line */}
          {isMe && (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={onOpenCreatePost}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[var(--primary)] hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
              >
                <Plus size={16} />
                <span>New Post / Clip</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {moodsList.map((mood) => {
            const isVideo = mood.type === "video";
            return (
              <div
                key={mood.id}
                onClick={() => setSelectedPost(mood)}
                className="aspect-square rounded-2xl overflow-hidden relative bg-zinc-100 dark:bg-zinc-800 group cursor-pointer border border-gray-100 dark:border-zinc-800 shadow-2xs"
              >
                {isVideo ? (
                  <video src={mood.mediaUrl} className="w-full h-full object-cover" />
                ) : (
                  <img src={mood.mediaUrl} alt={mood.caption} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                )}

                {/* Video Badge */}
                {isVideo && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-xs">
                    <Play size={10} fill="currentColor" />
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white text-xs font-bold">
                  <span className="flex items-center gap-1">
                    <Heart size={14} fill="currentColor" />
                    <span>{mood.likes?.length || 0}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare size={14} fill="currentColor" />
                    <span>{mood.comments?.length || 0}</span>
                  </span>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* Continuous Sliding Feed Detail Viewer */}
      {(selectedPost || closingPost) && (
        <FeedDetailModal
          initialPost={selectedPost || closingPost!}
          allPosts={moodsList}
          sellerUser={sellerUser}
          isMe={isMe}
          isClosing={!!closingPost}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. FEED DETAIL MODAL (Sliding Continuous Feed with comments)
// ─────────────────────────────────────────────────────────────
interface FeedDetailModalProps {
  initialPost: Mood;
  allPosts: Mood[];
  sellerUser: User;
  isMe: boolean;
  isClosing: boolean;
  onClose: () => void;
}

const formatFeedTime = (timestampString?: string): string => {
  if (!timestampString) return "Just now";
  try {
    const date = new Date(timestampString);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
};

function FeedDetailModal({
  initialPost,
  allPosts,
  sellerUser,
  isMe,
  isClosing,
  onClose
}: FeedDetailModalProps) {
  const { currentUser, likeMood, commentOnMood, deleteMood, updateMood } = useMockData();
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState<string>("");
  const [isSavingCaption, setIsSavingCaption] = useState(false);

  const handleStartEditCaption = (postId: string, currentCaption: string) => {
    setEditingPostId(postId);
    setEditingCaption(currentCaption || "");
  };

  const handleSaveCaption = async (postId: string) => {
    setIsSavingCaption(true);
    try {
      await updateMood(postId, { caption: editingCaption.trim() });
      setEditingPostId(null);
    } catch (err) {
      console.error("Failed to update caption:", err);
    } finally {
      setIsSavingCaption(false);
    }
  };

  useModalHistory(`storeFeedViewer-${initialPost.id}`, !isClosing, () => {
    onClose();
  });

  // Multi-post continuous scroll feed starting with the clicked photo/clip
  const orderedPosts = useMemo(() => {
    if (!allPosts || allPosts.length <= 1) return [initialPost];
    const idx = allPosts.findIndex((p) => p.id === initialPost.id);
    if (idx === -1) return [initialPost, ...allPosts.filter((p) => p.id !== initialPost.id)];
    return [...allPosts.slice(idx), ...allPosts.slice(0, idx)];
  }, [allPosts, initialPost.id]);

  const handleSendComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    await commentOnMood(postId, text);
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
  };

  const storeDisplayName =
    sellerUser?.marketplaceStore?.storeName || sellerUser?.name || "Store";

  return (
    <div
      className={clsx(
        "absolute inset-0 z-[70] flex items-center justify-center p-0 sm:p-4 bg-transparent",
        isClosing ? "pointer-events-none" : ""
      )}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          "bg-white dark:bg-zinc-950 w-full sm:max-w-xl h-full sm:h-auto sm:max-h-[92%] rounded-none sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-gray-150 dark:border-zinc-800 antialiased text-gray-900 dark:text-zinc-100",
          isClosing
            ? "animate-slide-out-to-right-edge"
            : "animate-slide-in-from-right-edge"
        )}
      >
        {/* Sticky Header */}
        <header className="px-3 md:px-5 py-3 flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer shrink-0"
              title="Back"
            >
              <ArrowLeft size={22} className="text-[var(--primary)]" />
            </button>
            <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-xs shrink-0">
              {sellerUser?.avatar ? (
                <img src={sellerUser.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                storeDisplayName.charAt(0)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {storeDisplayName}&apos;s Feed
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate">
                {orderedPosts.length} {orderedPosts.length === 1 ? "post" : "posts"} • Scroll down for more
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X size={18} />
          </button>
        </header>

        {/* Continuous Scroll Feed Body */}
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar overscroll-contain divide-y divide-gray-150 dark:divide-zinc-800">
          {orderedPosts.map((post, idx) => {
            const isLiked = post.likes?.includes(currentUser?.id || "");
            const isVideo = post.type === "video";
            const commentVal = commentInputs[post.id] || "";

            return (
              <article key={post.id} className="p-4 sm:p-5 space-y-3.5">
                {/* Post Creator Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {post.userAvatar ? (
                        <img src={post.userAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (post.userName || storeDisplayName).charAt(0)
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                        {post.userName || storeDisplayName}
                      </h4>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500">
                        Store update • {formatFeedTime(post.createdAt)}
                      </p>
                    </div>
                  </div>

                  {isMe && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEditCaption(post.id, post.caption || "")}
                        className="p-2 text-gray-400 hover:text-[var(--primary)] rounded-full transition-colors cursor-pointer"
                        title="Edit caption"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteMood(post.id);
                          if (orderedPosts.length <= 1) {
                            onClose();
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-full transition-colors cursor-pointer"
                        title="Delete post"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Media (Photo or Video) */}
                <div className="relative w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center shadow-xs">
                  {isVideo ? (
                    <video
                      src={post.mediaUrl}
                      controls
                      loop
                      playsInline
                      className="w-full max-h-[60vh] object-contain"
                    />
                  ) : (
                    <img
                      src={post.mediaUrl}
                      alt={post.caption || "Store feed photo"}
                      className="w-full max-h-[60vh] object-contain"
                    />
                  )}
                </div>

                {/* Actions: Like & Comment Counters */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => likeMood(post.id)}
                      className={clsx(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
                        isLiked
                          ? "bg-rose-50 text-rose-600 dark:bg-rose-950/50"
                          : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200"
                      )}
                    >
                      <Heart size={15} className={clsx(isLiked && "fill-rose-600 text-rose-600")} />
                      <span>{post.likes?.length || 0}</span>
                    </button>

                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">
                      <MessageSquare size={15} />
                      <span>{post.comments?.length || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Caption / Edit Caption */}
                {editingPostId === post.id ? (
                  <div className="space-y-2 pt-1 bg-gray-50 dark:bg-zinc-900/60 p-3 rounded-2xl border border-gray-200/80 dark:border-zinc-800">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-zinc-400">
                      <span>Edit Caption</span>
                      {isSavingCaption && <span className="text-[var(--primary)] animate-pulse">Saving...</span>}
                    </div>
                    <textarea
                      value={editingCaption}
                      onChange={(e) => setEditingCaption(e.target.value)}
                      placeholder="Write a caption..."
                      className="w-full bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-xs p-3 rounded-xl outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none border border-gray-200 dark:border-zinc-700"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2 pt-0.5">
                      <button
                        type="button"
                        disabled={isSavingCaption}
                        onClick={() => setEditingPostId(null)}
                        className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSavingCaption}
                        onClick={() => handleSaveCaption(post.id)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[var(--primary)] hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <Check size={14} />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                ) : post.caption ? (
                  <div className="pt-0.5 flex items-start justify-between gap-2 group">
                    <p className="text-xs text-gray-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap flex-1">
                      <span className="font-bold text-gray-900 dark:text-white mr-1.5">
                        {post.userName || storeDisplayName}
                      </span>
                      {post.caption}
                    </p>
                    {isMe && (
                      <button
                        type="button"
                        onClick={() => handleStartEditCaption(post.id, post.caption || "")}
                        className="opacity-0 group-hover:opacity-100 sm:opacity-0 focus:opacity-100 p-1 text-gray-400 hover:text-[var(--primary)] transition-opacity cursor-pointer shrink-0"
                        title="Edit caption"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                  </div>
                ) : isMe ? (
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleStartEditCaption(post.id, "")}
                      className="text-xs text-gray-400 hover:text-[var(--primary)] italic cursor-pointer flex items-center gap-1.5 transition-colors"
                    >
                      <Edit2 size={13} />
                      <span>Add a caption...</span>
                    </button>
                  </div>
                ) : null}

                {/* Comments Thread */}
                {post.comments && post.comments.length > 0 && (
                  <div className="space-y-1.5 pt-2 max-h-36 overflow-y-auto pr-1">
                    {post.comments.map((c) => (
                      <div key={c.id} className="text-xs flex items-start gap-1.5 leading-relaxed">
                        <span className="font-bold text-gray-900 dark:text-white">{c.userName}:</span>
                        <span className="text-gray-700 dark:text-zinc-300 flex-1">{c.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Comment Input */}
                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={commentVal}
                    onChange={(e) =>
                      setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                    }
                    placeholder="Write a comment..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendComment(post.id);
                    }}
                    className="flex-1 bg-gray-100 dark:bg-zinc-800 text-xs px-3.5 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-[var(--primary)] text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    disabled={!commentVal.trim()}
                    onClick={() => handleSendComment(post.id)}
                    className="px-3.5 py-2.5 bg-[var(--primary)] text-white text-xs font-bold rounded-xl disabled:opacity-40 hover:bg-emerald-600 transition-colors cursor-pointer shrink-0"
                  >
                    Send
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

