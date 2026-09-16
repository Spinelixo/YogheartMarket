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
  ChevronLeft
} from "lucide-react";
import { clsx } from "clsx";

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
  onOpenCreateStatus: () => void;
  onOpenStatus: (status: Status) => void;
}

export function StatusStoriesRow({
  sellerUser,
  isMe,
  onOpenCreateStatus,
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
            <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium">New</span>
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
          <p className="text-xs text-gray-400 dark:text-zinc-500 py-2">No active stories</p>
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

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 280);
  };

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
      className={clsx(
        "absolute inset-0 z-50 bg-white dark:bg-zinc-950 flex flex-col h-full w-full overflow-hidden select-none",
        isClosing ? "animate-slide-out-to-right-edge" : "animate-slide-in-from-right-edge"
      )}
    >
      {/* Top Header */}
      <header className="px-4 py-3 border-b border-gray-150 dark:border-zinc-800 shrink-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              title="Back"
            >
              <ChevronLeft size={22} />
            </button>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                {postType === "status" ? "Share New Status" : "New Post / Clip"}
              </h2>
              <p className="text-[10px] text-gray-500 dark:text-zinc-400">
                {postType === "status"
                  ? "Disappears after 24 hours"
                  : "Permanent post in your store feed"}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="px-4 py-2 bg-[var(--primary)] hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
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
        className="p-4 border-t border-gray-150 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shrink-0"
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
                <span>Publish to Store</span>
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
  const { getMoodsForUser, likeMood } = useMockData();
  const [selectedPost, setSelectedPost] = useState<Mood | null>(null);

  const moodsList = useMemo(() => {
    const list = getMoodsForUser(sellerUser.id) || [];
    return [...list].reverse();
  }, [getMoodsForUser, sellerUser.id]);

  return (
    <div className="space-y-4 pt-1">
      {/* Create Button Header (when owner and there are posts) */}
      {isMe && moodsList.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onOpenCreatePost}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>New Post / Clip</span>
          </button>
        </div>
      )}

      {/* Grid of Feed Items */}
      {moodsList.length === 0 ? (
        <div className="text-center py-12 px-4 bg-gray-50 dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800">
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
      )}

      {/* Post Detail Viewer */}
      {selectedPost && (
        <FeedDetailModal
          post={selectedPost}
          isMe={isMe}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. FEED DETAIL MODAL (Photo/Clip detail with likes & comments)
// ─────────────────────────────────────────────────────────────
interface FeedDetailModalProps {
  post: Mood;
  isMe: boolean;
  onClose: () => void;
}

function FeedDetailModal({ post, isMe, onClose }: FeedDetailModalProps) {
  const { currentUser, likeMood, commentOnMood, deleteMood } = useMockData();
  const [commentText, setCommentText] = useState("");
  const isLiked = post.likes?.includes(currentUser?.id || "");

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    await commentOnMood(post.id, commentText.trim());
    setCommentText("");
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media Container */}
        <div className="w-full max-h-[50vh] bg-black flex items-center justify-center relative overflow-hidden">
          {post.type === "video" ? (
            <video src={post.mediaUrl} className="w-full h-full max-h-[50vh] object-contain" autoPlay loop controls playsInline />
          ) : (
            <img src={post.mediaUrl} alt="" className="w-full h-full max-h-[50vh] object-contain" />
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Info & Comments */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden flex items-center justify-center text-xs font-bold">
                {post.userAvatar ? <img src={post.userAvatar} alt="" className="w-full h-full object-cover" /> : post.userName?.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{post.userName}</p>
                <p className="text-[10px] text-gray-400">Store Post</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => likeMood(post.id)}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                  isLiked ? "bg-rose-50 text-rose-600 dark:bg-rose-950/50" : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300"
                )}
              >
                <Heart size={14} className={isLiked ? "fill-current" : ""} />
                <span>{post.likes?.length || 0}</span>
              </button>
              {isMe && (
                <button
                  type="button"
                  onClick={async () => {
                    await deleteMood(post.id);
                    onClose();
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-full transition-colors"
                  title="Delete post"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {post.caption && (
            <p className="text-xs text-gray-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
              {post.caption}
            </p>
          )}

          {/* Comments List */}
          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-zinc-800 max-h-40 overflow-y-auto pr-1">
            {post.comments?.length === 0 ? (
              <p className="text-[11px] text-gray-400 text-center py-2">No comments yet. Be the first to comment!</p>
            ) : (
              post.comments?.map((c) => (
                <div key={c.id} className="text-xs flex items-start gap-2">
                  <span className="font-bold text-gray-900 dark:text-white">{c.userName}:</span>
                  <span className="text-gray-700 dark:text-zinc-300 flex-1">{c.text}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Comment Input */}
        <div className="p-3 border-t border-gray-100 dark:border-zinc-800 flex items-center gap-2">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendComment();
            }}
            className="flex-1 bg-gray-100 dark:bg-zinc-800 text-xs px-3 py-2 rounded-xl outline-none focus:ring-1 focus:ring-[var(--primary)] text-gray-900 dark:text-white"
          />
          <button
            type="button"
            onClick={handleSendComment}
            disabled={!commentText.trim()}
            className="px-3 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-xl disabled:opacity-40 hover:bg-emerald-600 transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

