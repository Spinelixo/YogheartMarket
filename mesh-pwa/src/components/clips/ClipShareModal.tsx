"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Search,
  Send,
  Check,
  Share2,
  Copy,
  Music,
  Flame
} from "lucide-react";
import { clsx } from "clsx";
import { YogheartClip, formatClipNumber } from "./clipsData";
import { useMockData, User } from "@/context/MockContext";
import { useModalHistory } from "@/hooks/useModalHistory";

interface ClipShareModalProps {
  clip: YogheartClip;
  onClose: () => void;
}

export function ClipShareModal({ clip, onClose }: ClipShareModalProps) {
  const {
    currentUser,
    threads,
    allDatingUsers,
    suggestions,
    sendMessage,
    startDirectChat,
    addNotification
  } = useMockData();

  useModalHistory("clipShareModal", true, onClose);

  const [searchQuery, setSearchQuery] = useState("");
  const [customNote, setCustomNote] = useState("Check out this Yogheart Clip! 🔥🎬");
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});
  const [isSendingToId, setIsSendingToId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Quick preset notes
  const presetNotes = [
    "Check out this clip! 🔥🎬",
    "This is hilarious 😂✨",
    "Thought you would love this! 💫",
    "Watch this till the end! 👀",
  ];

  // Contacts from active threads & matches
  const contactsList = useMemo(() => {
    const list: { id: string; user: User; threadId?: string; subtitle?: string }[] = [];
    const seenUserIds = new Set<string>();

    // 1. Active threads
    (threads || []).forEach((t) => {
      if (t.user && t.user.id !== currentUser?.id && t.user.id !== "me") {
        seenUserIds.add(t.user.id);
        list.push({
          id: t.id,
          user: t.user,
          threadId: t.id,
          subtitle: t.lastMessage || "Active chat",
        });
      }
    });

    // 2. Friends & other suggestions
    (allDatingUsers || []).concat(suggestions || []).forEach((u) => {
      if (u.id !== currentUser?.id && u.id !== "me" && !seenUserIds.has(u.id)) {
        seenUserIds.add(u.id);
        list.push({
          id: `user_${u.id}`,
          user: u,
          subtitle: u.location ? `Based in ${u.location}` : "Yogheart member",
        });
      }
    });

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (c) =>
        c.user.name.toLowerCase().includes(q) ||
        (c.user.location && c.user.location.toLowerCase().includes(q))
    );
  }, [threads, allDatingUsers, suggestions, currentUser, searchQuery]);

  const handleSendToContact = async (contact: { id: string; user: User; threadId?: string }) => {
    setIsSendingToId(contact.id);
    try {
      let targetThreadId = contact.threadId;
      if (!targetThreadId) {
        targetThreadId = await startDirectChat(contact.user, false);
      }

      const noteText = customNote.trim() ? `${customNote.trim()}\n` : "";
      const shareMessage = `${noteText}Check out this clip by @${clip.creator.username}: "${clip.caption}" 🎬\n${clip.videoUrl}`;

      sendMessage(targetThreadId, shareMessage);
      setSentMap((prev) => ({ ...prev, [contact.id]: true }));
      addNotification(`Clip sent to ${contact.user.name}! 🚀`);
    } catch (err) {
      console.error("Failed to share clip:", err);
      addNotification("Failed to send clip");
    } finally {
      setIsSendingToId(null);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/requests?tab=clips&clipId=${clip.id}`;
      navigator.clipboard?.writeText(url);
      setCopiedLink(true);
      addNotification("Clip link copied to clipboard! 📋");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/requests?tab=clips&clipId=${clip.id}`;
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Yogheart Clip by @${clip.creator.username}`,
            text: clip.caption,
            url,
          });
        } catch {}
      } else {
        handleCopyLink();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 w-full max-w-lg max-h-[85vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-5 py-3.5 border-b border-zinc-150 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Share2 size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white leading-none">
                Share Yogheart Clip
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Send to friends, chat groups or copy link
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* Clip Card Preview */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-750">
            <div className="w-16 h-24 rounded-xl overflow-hidden bg-zinc-900 shrink-0 select-none relative shadow-sm">
              <img src={clip.posterUrl} alt={clip.caption} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-1 left-1 text-[9px] font-bold text-white flex items-center gap-0.5">
                <Flame size={10} className="fill-emerald-400 text-emerald-400" />
                <span>{formatClipNumber(clip.likesCount)}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <img
                  src={clip.creator.avatar}
                  alt={clip.creator.name}
                  className="w-4 h-4 rounded-full object-cover border border-emerald-500"
                />
                <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                  {clip.creator.name}
                </span>
                <span className="text-[10px] text-zinc-400 truncate">
                  @{clip.creator.username}
                </span>
              </div>
              <p className="font-semibold text-xs text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-tight">
                {clip.caption}
              </p>
              {clip.musicTitle && (
                <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 truncate">
                  <Music size={10} />
                  <span>{clip.musicTitle}</span>
                </p>
              )}
            </div>
          </div>

          {/* Quick Notes Presets */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Add a personal note
            </label>
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 no-scrollbar text-xs">
              {presetNotes.map((note) => (
                <button
                  key={note}
                  type="button"
                  onClick={() => setCustomNote(note)}
                  className={clsx(
                    "px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer text-xs",
                    customNote === note
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  )}
                >
                  {note}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Write a custom message..."
              className="w-full mt-1.5 px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Search Contacts Bar */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Send in Yogheart Chat
            </label>
            <div className="relative flex items-center mb-2">
              <Search className="absolute left-3 text-zinc-400" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search friends & conversations..."
                className="w-full pl-9 pr-8 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 text-zinc-400 hover:text-zinc-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Contacts & Chat Threads List */}
            <div className="max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {contactsList.length > 0 ? (
                contactsList.map((contact) => {
                  const isSent = !!sentMap[contact.id];
                  const isSending = isSendingToId === contact.id;

                  return (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-750 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={contact.user.avatar || undefined}
                          alt={contact.user.name}
                          className="w-9 h-9 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 bg-zinc-800"
                        />
                        <div className="min-w-0">
                          <h5 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white truncate">
                            {contact.user.name}
                          </h5>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                            {contact.subtitle}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSendToContact(contact)}
                        disabled={isSending || isSent}
                        className={clsx(
                          "px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-xs",
                          isSent
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95"
                        )}
                      >
                        {isSending ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : isSent ? (
                          <>
                            <Check size={13} className="stroke-[3]" />
                            <span>Sent</span>
                          </>
                        ) : (
                          <>
                            <Send size={12} />
                            <span>Send</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-zinc-400">
                  <p className="text-xs font-semibold">No contacts found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/90 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2.5">
          <button
            onClick={handleCopyLink}
            className="flex-1 py-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            {copiedLink ? <Check size={14} className="text-emerald-500 stroke-[3]" /> : <Copy size={14} />}
            <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
          </button>
          <button
            onClick={handleNativeShare}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Share2 size={14} />
            <span>More Options</span>
          </button>
        </div>
      </div>
    </div>
  );
}
