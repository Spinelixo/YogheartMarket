"use client";

import React, { useState } from "react";
import { X, Heart, Send, MessageCircle } from "lucide-react";
import { clsx } from "clsx";
import { ClipComment } from "./clipsData";
import { User } from "@/context/MockContext";

interface ClipCommentsDrawerProps {
  clipId: string;
  comments: ClipComment[];
  currentUser: User | null;
  onClose: () => void;
  onAddComment: (clipId: string, text: string) => void;
  onLikeComment: (clipId: string, commentId: string) => void;
}

const QUICK_EMOJIS = ["❤️", "🔥", "👏", "😂", "😍", "🙌", "💯", "✨"];

export function ClipCommentsDrawer({
  clipId,
  comments,
  currentUser,
  onClose,
  onAddComment,
  onLikeComment
}: ClipCommentsDrawerProps) {
  const [commentText, setCommentText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(clipId, commentText.trim());
    setCommentText("");
  };

  const handleAddEmoji = (emoji: string) => {
    setCommentText((prev) => prev + emoji);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-3xl h-[70vh] sm:h-[580px] max-h-[90vh] flex flex-col overflow-hidden animate-slide-up sm:animate-fade-in shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Handle & Title */}
        <div className="px-5 pt-3.5 pb-3 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/90">
          <div className="w-8" />
          <div className="flex flex-col items-center">
            <div className="w-10 h-1 bg-zinc-700 rounded-full mb-2 sm:hidden" />
            <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
              <span>Comments</span>
              <span className="text-xs font-semibold text-zinc-400">({comments.length})</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Comments Scrollable List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          {comments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2">
              <MessageCircle size={36} className="text-zinc-600" />
              <p className="text-sm font-bold text-zinc-400">No comments yet</p>
              <p className="text-xs">Be the first to share your thoughts on this clip!</p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex items-start gap-3 group">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 shrink-0 border border-zinc-700">
                  {c.userAvatar ? (
                    <img src={c.userAvatar} alt={c.userName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-xs text-zinc-300">
                      {c.userName.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Comment Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-xs text-zinc-200 truncate">{c.userName}</span>
                    <span className="text-[10px] text-zinc-500">{c.createdAt}</span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed break-words">{c.text}</p>
                </div>

                {/* Like Button */}
                <button
                  onClick={() => onLikeComment(clipId, c.id)}
                  className="flex flex-col items-center gap-0.5 text-zinc-400 hover:text-rose-500 shrink-0 transition-colors p-1 cursor-pointer"
                >
                  <Heart
                    size={14}
                    className={clsx(
                      "transition-transform active:scale-125",
                      c.isLiked ? "fill-rose-500 text-rose-500" : "text-zinc-400"
                    )}
                  />
                  {c.likesCount > 0 && (
                    <span className={clsx("text-[10px] font-semibold", c.isLiked ? "text-rose-500" : "text-zinc-500")}>
                      {c.likesCount}
                    </span>
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Quick Emoji Bar */}
        <div className="px-4 py-1.5 bg-zinc-950/60 border-t border-zinc-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleAddEmoji(emoji)}
              className="text-base hover:scale-125 active:scale-95 transition-transform p-1 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Comment Input */}
        <form onSubmit={handleSubmit} className="p-3 pb-20 sm:pb-3 bg-zinc-950 border-t border-zinc-800 flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-800 shrink-0 border border-zinc-700">
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt="You" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-[10px] text-zinc-300">
                {currentUser?.name?.charAt(0) || "U"}
              </div>
            )}
          </div>

          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-zinc-800/90 text-xs text-white placeholder:text-zinc-500 px-3.5 py-2.5 rounded-full outline-none focus:ring-1 focus:ring-emerald-500 border border-zinc-700/60"
          />

          <button
            type="submit"
            disabled={!commentText.trim()}
            className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-md shadow-emerald-600/30"
          >
            <Send size={14} className="ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
