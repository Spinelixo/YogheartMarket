"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { MarketplaceItem, useMockData, User } from "@/context/MockContext";
import {
  X,
  Search,
  Send,
  Check,
  Share2,
  Copy,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Tag
} from "lucide-react";
import { clsx } from "clsx";
import { shareContent } from "@/utils/nativeShare";

interface ShareToChatModalProps {
  item: MarketplaceItem;
  onClose: () => void;
}

export function ShareToChatModal({ item, onClose }: ShareToChatModalProps) {
  const {
    currentUser,
    threads,
    allDatingUsers,
    suggestions,
    sendMessage,
    startDirectChat,
    setActiveTab,
    setActiveThreadId,
    addNotification
  } = useMockData();

  const [searchQuery, setSearchQuery] = useState("");
  const [customNote, setCustomNote] = useState(
    "Look at this item I found on Yogheart Marketplace! Can you get this for me? 😍✨"
  );
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});
  const [isSendingToId, setIsSendingToId] = useState<string | null>(null);

  // Quick preset notes
  const presetNotes = [
    "Look at this! Can you get this for me? 😍✨",
    "Thought of you when I saw this on Marketplace! 🎁",
    "Check this out, what do you think? 👀",
    "Should I buy this? Let me know! 💭",
  ];

  // Merge available chat contacts from threads and users
  const contactsList = useMemo(() => {
    const list: { id: string; user: User; threadId?: string; lastMessage?: string }[] = [];
    const seenUserIds = new Set<string>();

    // First add active threads
    (threads || []).forEach((t) => {
      if (t.user && t.user.id !== currentUser?.id && t.user.id !== "me") {
        seenUserIds.add(t.user.id);
        list.push({
          id: t.id,
          user: t.user,
          threadId: t.id,
          lastMessage: t.lastMessage || "Active conversation",
        });
      }
    });

    // Then add other users / matches who don't have an active thread yet
    (allDatingUsers || []).concat(suggestions || []).forEach((u) => {
      if (u.id !== currentUser?.id && u.id !== "me" && !seenUserIds.has(u.id)) {
        seenUserIds.add(u.id);
        list.push({
          id: `user_${u.id}`,
          user: u,
          lastMessage: u.location ? `Based in ${u.location}` : "Yogheart member",
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

      const noteText = customNote.trim() || `Check out "${item.title}" on Marketplace!`;
      const itemCover = item.images && item.images.length > 0 ? item.images[0] : undefined;

      await sendMessage(targetThreadId, noteText, "text", {
        imageUrl: itemCover,
        replyTo: {
          id: item.id,
          sender: "them",
          senderId: item.sellerId,
          text: `🛍️ Marketplace Listing: ${item.title} (${item.price === 0 ? "FREE" : `$${item.price.toLocaleString()}`})`,
        },
      });

      setSentMap((prev) => ({ ...prev, [contact.id]: true }));
      addNotification(`Sent to ${contact.user.name}! 🎉`);
    } catch (err) {
      console.error("Failed to share to chat:", err);
      addNotification("Failed to send message.");
    } finally {
      setIsSendingToId(null);
    }
  };

  const handleCopyLink = () => {
    let url = typeof window !== "undefined" ? window.location.href : "https://yoghearts.web.app";
    if (url.includes("localhost") || url.startsWith("capacitor://") || url.startsWith("file://")) {
      url = `https://yoghearts.web.app/marketplace?subpage=items`;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    addNotification("Link copied to clipboard! 📋");
  };

  const handleNativeShare = async () => {
    const res = await shareContent({
      title: item.title,
      text: `Look at this on Yogheart Marketplace: ${item.title} (${item.price === 0 ? "FREE" : `$${item.price}`})`,
      dialogTitle: `Share ${item.title}`,
    });
    if (res === "copied") {
      addNotification("Link copied to clipboard! 📋");
    }
  };

  const coverImg =
    item.images && item.images.length > 0
      ? item.images[0]
      : "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80";

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const modalContent = (
    <div
      className="modal-overlay fixed inset-0 z-[150] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 w-full max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-gray-200 dark:border-zinc-800 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-5 py-3.5 border-b border-gray-150 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[var(--primary)] flex items-center justify-center">
              <Share2 size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white leading-none">
                Share to Chat
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                Send this listing to friends or matches in your inbox
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 pb-8 space-y-4">
          {/* Item Preview Card */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-150 dark:border-zinc-750">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-700 shrink-0 select-none">
              <img src={coverImg} alt={item.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-black text-[var(--primary)]">
                  {item.price === 0 ? "FREE" : `$${item.price.toLocaleString()}`}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300">
                  {item.condition}
                </span>
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                {item.title}
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate">
                📍 {item.location} • Seller: {item.sellerName}
              </p>
            </div>
          </div>

          {/* Personal Note Input */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Add a personal note
            </label>
            <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar text-xs">
              {presetNotes.map((note) => (
                <button
                  key={note}
                  type="button"
                  onClick={() => setCustomNote(note)}
                  className={clsx(
                    "px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer text-xs",
                    customNote === note
                      ? "bg-[var(--primary)] text-white"
                      : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200"
                  )}
                >
                  {note}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Write what you want to tell them..."
              className="w-full bg-gray-50 dark:bg-zinc-800/80 text-gray-900 dark:text-white px-3.5 py-2.5 rounded-2xl border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[var(--primary)] outline-none text-xs sm:text-sm resize-none"
            />
          </div>

          {/* Search Contacts */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              Send to Contacts ({contactsList.length})
            </label>
            <div className="relative mb-2">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or city..."
                className="w-full bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white pl-9 pr-4 py-2 rounded-xl border-0 text-xs focus:ring-2 focus:ring-[var(--primary)] outline-none"
              />
            </div>

            {/* Contacts Scrollable List */}
            <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-zinc-800 rounded-2xl border border-gray-150 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              {contactsList.length > 0 ? (
                contactsList.map((contact) => {
                  const isSent = sentMap[contact.id];
                  const isSending = isSendingToId === contact.id;

                  return (
                    <div
                      key={contact.id}
                      className="p-2.5 sm:p-3 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      {/* Avatar & User Info */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-zinc-700 shrink-0 flex items-center justify-center">
                          {contact.user.avatar ? (
                            <img
                              src={contact.user.avatar}
                              alt={contact.user.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="font-bold text-sm text-gray-700 dark:text-zinc-200">
                              {contact.user.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                            {contact.user.name}
                          </h5>
                          <p className="text-[11px] text-gray-400 dark:text-zinc-500 truncate">
                            {contact.lastMessage}
                          </p>
                        </div>
                      </div>

                      {/* Send / Sent Action */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSent ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1.5 rounded-xl flex items-center gap-1 border border-emerald-200 dark:border-emerald-900/40">
                              <Check size={13} /> Sent
                            </span>
                            {contact.threadId && (
                              <button
                                onClick={() => {
                                  setActiveTab("chats");
                                  setActiveThreadId(contact.threadId!);
                                  window.history.pushState(null, "", `/inbox?id=${contact.threadId}`);
                                  onClose();
                                }}
                                className="text-xs font-bold text-[var(--primary)] hover:underline px-2 py-1 cursor-pointer"
                              >
                                View Chat
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSendToContact(contact)}
                            disabled={isSending}
                            className="py-1.5 px-3 bg-[var(--primary)] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                          >
                            <Send size={12} />
                            <span>{isSending ? "Sending..." : "Send"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-gray-400">
                  No matching contacts found.
                </div>
              )}
            </div>
          </div>

          {/* Quick Share Links */}
          <div className="flex gap-2 pt-1 pb-6 sm:pb-1">
            <button
              onClick={handleCopyLink}
              className="flex-1 py-2.5 px-3 bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <Copy size={14} />
              <span>Copy Link</span>
            </button>
            <button
              onClick={handleNativeShare}
              className="flex-1 py-2.5 px-3 bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <ExternalLink size={14} />
              <span>More Options</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
