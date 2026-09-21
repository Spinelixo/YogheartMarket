"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { MarketplaceItem, useMockData } from "@/context/MockContext";
import {
  ArrowLeft,
  X,
  Bookmark,
  Share2,
  MapPin,
  Clock,
  ShieldCheck,
  Send,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Trash2,
  Edit3,
  Gift,
  ShoppingBag,
  Play,
  Film
} from "lucide-react";
import { clsx } from "clsx";
import { useModalHistory } from "@/hooks/useModalHistory";
import { ShareToChatModal } from "./ShareToChatModal";
import { SellerStorefrontModal } from "./SellerStorefrontModal";
import { calculateItemDistanceKm } from "../views/MarketplaceView";
import { trackUserViewedCategory } from "@/utils/marketplaceRanking";

interface ItemDetailModalProps {
  item: MarketplaceItem;
  feedItems?: MarketplaceItem[];
  onClose: () => void;
  onEdit?: (item: MarketplaceItem) => void;
  onOpenStore?: (sellerId: string, sellerName?: string, sellerAvatar?: string | null, sellerLocation?: string) => void;
  mode?: "page" | "modal";
  isClosing?: boolean;
  hideSellerInfo?: boolean;
}

export function ItemDetailModal({
  item,
  feedItems,
  onClose,
  onEdit,
  onOpenStore,
  mode = "page",
  isClosing: externalIsClosing,
  hideSellerInfo = false
}: ItemDetailModalProps) {
  const {
    currentUser,
    marketplaceItems,
    allDatingUsers,
    suggestions,
    toggleSaveMarketplaceItem,
    updateMarketplaceListing,
    deleteMarketplaceListing,
    sendMarketplaceInquiry,
    activeTab,
    setActiveTab,
    setActiveThreadId,
    addNotification
  } = useMockData();

  // Instant reactive saved checker linked to live marketplaceItems state
  const isItemSaved = useCallback(
    (targetId: string, fallbackSavedBy?: string[]) => {
      if (!currentUser) return false;
      const live = marketplaceItems.find((i) => i.id === targetId);
      const list = live?.savedBy ?? fallbackSavedBy ?? [];
      return list.includes(currentUser.id);
    },
    [currentUser, marketplaceItems]
  );

  // Multi-item feed list starting with the tapped item (only for storefront feed)
  const orderedFeedItems = useMemo(() => {
    const isStorefrontFeed = hideSellerInfo || mode === "modal";
    if (!isStorefrontFeed || !feedItems || feedItems.length <= 1) return [item];
    const idx = feedItems.findIndex((i) => i.id === item.id);
    if (idx === -1) return [item, ...feedItems.filter((i) => i.id !== item.id)];
    return [...feedItems.slice(idx), ...feedItems.slice(0, idx)];
  }, [feedItems, item.id, hideSellerInfo, mode]);

  // Per-item state tracking (active image, custom message, isSending)
  const [activeImageIndexes, setActiveImageIndexes] = useState<Record<string, number>>({});
  const [customMessages, setCustomMessages] = useState<Record<string, string>>({});
  const [sendingStates, setSendingStates] = useState<Record<string, boolean>>({});
  const [deleteConfirmItemId, setDeleteConfirmItemId] = useState<string | null>(null);
  const [shareItem, setShareItem] = useState<MarketplaceItem | null>(null);
  const [showSellerStorefront, setShowSellerStorefront] = useState(false);
  const [closingSellerStorefront, setClosingSellerStorefront] = useState(false);

  const handleCloseSellerStorefront = () => {
    if (!showSellerStorefront || closingSellerStorefront) return;
    setClosingSellerStorefront(true);
    setShowSellerStorefront(false);
    setTimeout(() => {
      setClosingSellerStorefront(false);
    }, 440);
  };

  const [internalIsClosing, setInternalIsClosing] = useState(false);
  const isClosing = externalIsClosing || internalIsClosing;
  const isTopItemOwner = currentUser?.id === item.sellerId || item.sellerId === "me";
  const [animPhase, setAnimPhase] = useState<"entering" | "stable">("entering");

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimPhase("stable");
    }, 460);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (item.category) {
      trackUserViewedCategory(item.category);
    }
  }, [item.category]);

  // Touch drag-down-to-dismiss gesture state for modal mode
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "BUTTON" || target.closest("button") || target.tagName === "INPUT" || target.closest("input")) {
      setIsDragging(false);
      return;
    }
    if (scrollRef.current && scrollRef.current.scrollTop > 5) {
      return;
    }
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
    if (!isDragging) return;
    setIsDragging(false);
    if (dragY > 80) {
      handleBack();
    } else {
      setDragY(0);
    }
  };

  // Modal history hook for ItemDetailModal itself
  useModalHistory(`itemDetailModal-${item.id}`, true, () => {
    handleBack();
  });

  // Modal history hook for internal share modal
  useModalHistory(`itemShareModal-${item.id}`, !!shareItem, () => {
    setShareItem(null);
  });

  const handleBack = () => {
    onClose();
  };

  const handleSendMessage = async (targetItem: MarketplaceItem, textToSend?: string) => {
    const isOwner = currentUser?.id === targetItem.sellerId || targetItem.sellerId === "me";
    if (isOwner) {
      addNotification("You cannot message yourself about your own listing.");
      return;
    }
    const message = textToSend || customMessages[targetItem.id] || `Hi ${targetItem.sellerName}, is this still available?`;
    if (!message.trim()) return;

    setSendingStates((prev) => ({ ...prev, [targetItem.id]: true }));

    const sellerUser =
      allDatingUsers.find((u) => u.id === targetItem.sellerId) ||
      suggestions.find((u) => u.id === targetItem.sellerId) || {
        id: targetItem.sellerId,
        name: targetItem.sellerName,
        age: 26,
        bio: "Marketplace member",
        color: targetItem.sellerColor || "bg-blue-200",
        interests: [],
        avatar: targetItem.sellerAvatar,
        photos: [],
        location: targetItem.sellerLocation || targetItem.location,
        settings: {} as any,
      };

    try {
      const threadId = await sendMarketplaceInquiry(sellerUser, targetItem, message);
      setActiveTab("chats");
      setActiveThreadId(threadId);
      window.history.pushState(null, "", `/inbox?id=${threadId}`);
      onClose();
    } catch (err) {
      console.error("Failed to send inquiry:", err);
      addNotification("Failed to send message to seller.");
    } finally {
      setSendingStates((prev) => ({ ...prev, [targetItem.id]: false }));
    }
  };

  const handleToggleSold = async (targetItem: MarketplaceItem) => {
    const nextStatus = targetItem.status === "sold" ? "active" : "sold";
    await updateMarketplaceListing(targetItem.id, { status: nextStatus });
  };

  const handleDelete = async (targetItemId: string) => {
    await deleteMarketplaceListing(targetItemId);
    setDeleteConfirmItemId(null);
    if (orderedFeedItems.length <= 1) {
      handleBack();
    }
  };

  const handleOpenStorefront = (sellerId: string, sellerName?: string, sellerAvatar?: string | null, sellerLocation?: string) => {
    if (onOpenStore) {
      onOpenStore(sellerId, sellerName, sellerAvatar, sellerLocation);
    } else {
      setShowSellerStorefront(true);
    }
  };

  // Helper to render a single listing section in the feed
  const renderSingleListing = (curItem: MarketplaceItem, index: number) => {
    const isOwner = currentUser?.id === curItem.sellerId || curItem.sellerId === "me";
    const isSaved = isItemSaved(curItem.id, curItem.savedBy);
    const activeImgIdx = activeImageIndexes[curItem.id] || 0;
    const curMessage = customMessages[curItem.id] ?? `Hi ${curItem.sellerName}, is this still available?`;
    const isSending = sendingStates[curItem.id] || false;

    const images = curItem.images && curItem.images.length > 0
      ? curItem.images
      : ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80"];

    const sellerUser =
      allDatingUsers.find((u) => u.id === curItem.sellerId) ||
      suggestions.find((u) => u.id === curItem.sellerId) || {
        id: curItem.sellerId,
        name: curItem.sellerName,
        age: 26,
        bio: "Marketplace member",
        color: curItem.sellerColor || "bg-blue-200",
        interests: [],
        avatar: curItem.sellerAvatar,
        photos: [],
        location: curItem.sellerLocation || curItem.location,
        settings: {} as any,
      };

    return (
      <div key={curItem.id} className="w-full">
        {/* Item Header (shown for subsequent items in continuous feed) */}
        {index > 0 && (
          <div className="px-4 py-3 bg-gray-50/80 dark:bg-zinc-900/80 border-t border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="min-w-0 flex-1 mr-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {curItem.title}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate">
                {curItem.category} • {curItem.condition}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setShareItem(curItem)}
                className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center text-gray-700 dark:text-zinc-200 shadow-xs cursor-pointer"
                title="Share"
              >
                <Share2 size={14} />
              </button>
              <button
                type="button"
                onClick={() => toggleSaveMarketplaceItem(curItem.id)}
                className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center shadow-xs cursor-pointer",
                  isSaved ? "bg-rose-50 dark:bg-rose-950/40 text-rose-500" : "bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200"
                )}
                title={isSaved ? "Saved" : "Save Item"}
              >
                <Bookmark size={15} className={clsx(isSaved ? "fill-rose-500 text-rose-500" : "text-gray-700 dark:text-zinc-200")} />
              </button>
            </div>
          </div>
        )}

        {/* Main Image/Video Carousel */}
        <div className="relative w-full aspect-[4/3] bg-zinc-950 flex items-center justify-center overflow-hidden group select-none">
          {images[activeImgIdx]?.startsWith("data:video") || /\.(mp4|mov|webm|m4v|3gp)/i.test(images[activeImgIdx]) ? (
            <video
              src={images[activeImgIdx]}
              controls
              playsInline
              autoPlay
              muted
              className="w-full h-full object-contain"
            />
          ) : (
            <img
              src={images[activeImgIdx]}
              alt={curItem.title}
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
              className="w-full h-full object-contain sm:object-cover"
            />
          )}

          {curItem.status === "sold" && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
              <span className="bg-red-600 text-white font-black text-xl px-6 py-2 rounded-2xl uppercase tracking-widest rotate-[-6deg] shadow-xl border-2 border-white">
                SOLD
              </span>
            </div>
          )}

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndexes((prev) => ({
                    ...prev,
                    [curItem.id]: activeImgIdx > 0 ? activeImgIdx - 1 : images.length - 1
                  }));
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndexes((prev) => ({
                    ...prev,
                    [curItem.id]: activeImgIdx < images.length - 1 ? activeImgIdx + 1 : 0
                  }));
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <ChevronRight size={20} />
              </button>

              {/* Dot indicators */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full">
                {images.map((_, idx) => (
                  <div
                    key={idx}
                    className={clsx(
                      "h-1.5 rounded-full transition-all",
                      idx === activeImgIdx ? "w-5 bg-white" : "w-1.5 bg-white/50"
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Thumbnails Row if multiple images */}
        {images.length > 1 && (
          <div className="flex gap-2 p-3 bg-gray-50 dark:bg-zinc-950/50 border-b border-gray-100 dark:border-zinc-800 overflow-x-auto no-scrollbar">
            {images.map((img, idx) => {
              const isThumbVideo = img?.startsWith("data:video") || /\.(mp4|mov|webm|m4v|3gp)/i.test(img);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    setActiveImageIndexes((prev) => ({ ...prev, [curItem.id]: idx }))
                  }
                  className={clsx(
                    "w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer relative bg-zinc-950",
                    activeImgIdx === idx ? "border-[var(--primary)] scale-95 shadow-sm" : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  {isThumbVideo ? (
                    <>
                      <video src={img} className="w-full h-full object-cover" muted playsInline />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play size={14} fill="currentColor" className="text-white" />
                      </div>
                    </>
                  ) : (
                    <img src={img} alt="thumb" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Listing Details */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* 1. Price, Title, Condition, Location, Date, Protection */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="text-3xl font-black text-[var(--primary)] tracking-tight">
                {curItem.price === 0 ? "FREE" : `$${curItem.price.toLocaleString()}`}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {curItem.status === "sold" && (
                  <span className="text-xs font-black px-3 py-1 rounded-full bg-red-600 text-white shadow-xs uppercase tracking-wider">
                    SOLD
                  </span>
                )}
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                  {curItem.condition}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300">
                  {curItem.category}
                </span>
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-snug">
              {curItem.title}
            </h2>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <MapPin size={14} className="text-rose-500 shrink-0" />
                <span className="font-bold text-gray-800 dark:text-zinc-200">
                  {calculateItemDistanceKm(curItem, currentUser?.location)} km away
                </span>
                <span className="text-gray-300 dark:text-zinc-600">•</span>
                <span>{curItem.location}</span>
              </span>
              <span className="flex items-center gap-1">
                <Clock size={14} className="text-gray-400" />
                {new Date(curItem.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck size={14} />
                Buyer Protection
              </span>
            </div>
          </div>

          <hr className="border-gray-100 dark:border-zinc-800" />

          {/* 2. Description */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
              Description
            </h3>
            <p className="text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
              {curItem.description || "No description provided."}
            </p>
          </div>

          {/* 3. Action Section / Quick Inquire Input (Above Seller Info) */}
          {/* Seller Actions (If owner) */}
          {isOwner && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Sparkles size={14} /> You manage this listing
                </span>
                <span className={clsx(
                  "text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[11px]",
                  curItem.status === "sold"
                    ? "bg-red-500 text-white"
                    : (curItem.status === "pending" || curItem.status === "reserved")
                    ? "bg-amber-500 text-white"
                    : "bg-emerald-500 text-white"
                )}>
                  {curItem.status === "reserved" ? "pending" : (curItem.status || "active")}
                </span>
              </div>

              {/* Status Switcher */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-amber-950 dark:text-amber-200 uppercase tracking-wider">
                  Listing Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => updateMarketplaceListing(curItem.id, { status: "active" })}
                    className={clsx(
                      "py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border",
                      curItem.status === "active" || !curItem.status
                        ? "bg-emerald-500 text-white border-emerald-600 shadow-xs shadow-emerald-500/25"
                        : "bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 border-gray-200 dark:border-zinc-700 hover:border-emerald-400 hover:text-emerald-600"
                    )}
                  >
                    <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", (curItem.status === "active" || !curItem.status) ? "bg-white" : "bg-emerald-500")} />
                    <span>Available</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateMarketplaceListing(curItem.id, { status: "pending" })}
                    className={clsx(
                      "py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border",
                      curItem.status === "pending" || curItem.status === "reserved"
                        ? "bg-amber-500 text-white border-amber-600 shadow-xs shadow-amber-500/25"
                        : "bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 border-gray-200 dark:border-zinc-700 hover:border-amber-400 hover:text-amber-600"
                    )}
                  >
                    <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", (curItem.status === "pending" || curItem.status === "reserved") ? "bg-white" : "bg-amber-500 animate-pulse")} />
                    <span>Pending</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateMarketplaceListing(curItem.id, { status: "sold" })}
                    className={clsx(
                      "py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border",
                      curItem.status === "sold"
                        ? "bg-red-500 text-white border-red-600 shadow-xs shadow-red-500/25"
                        : "bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 border-gray-200 dark:border-zinc-700 hover:border-red-400 hover:text-red-600"
                    )}
                  >
                    <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", curItem.status === "sold" ? "bg-white" : "bg-red-500")} />
                    <span>Sold</span>
                  </button>
                </div>
              </div>

              {/* Secondary Actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(curItem)}
                    className="flex-1 py-2 px-3 bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-100 font-bold text-xs rounded-xl border border-gray-200 dark:border-zinc-700 flex items-center justify-center gap-1.5 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    <Edit3 size={15} /> Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDeleteConfirmItemId(curItem.id)}
                  className="py-2 px-3 bg-red-50 dark:bg-red-950/30 text-red-600 font-bold text-xs rounded-xl border border-red-200 dark:border-red-900/40 flex items-center justify-center gap-1.5 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
                >
                  <Trash2 size={15} /> Delete
                </button>
              </div>
            </div>
          )}

          {/* Inquire Bar (If buyer) */}
          {!isOwner && (
            curItem.status === "sold" ? (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/25 border border-red-200 dark:border-red-900/40 text-center space-y-1">
                <span className="inline-block px-3 py-0.5 rounded-full bg-red-500 text-white font-bold text-xs uppercase tracking-wider mb-1">
                  Sold Out
                </span>
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  This item has been marked as sold by the seller.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {(curItem.status === "pending" || curItem.status === "reserved") && (
                  <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                    <span><strong>Pending Sale:</strong> This item is reserved, but you can still message the seller.</span>
                  </div>
                )}
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                {[
                  "Hi, is this still available?",
                  "Is the price negotiable?",
                  "Where can we meet for pickup?"
                ].map((msg) => (
                  <button
                    key={msg}
                    type="button"
                    onClick={() =>
                      setCustomMessages((prev) => ({ ...prev, [curItem.id]: msg }))
                    }
                    className="shrink-0 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 transition-colors cursor-pointer"
                  >
                    {msg}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={curMessage}
                  onChange={(e) =>
                    setCustomMessages((prev) => ({
                      ...prev,
                      [curItem.id]: e.target.value
                    }))
                  }
                  placeholder={`Send a message about ${curItem.title}...`}
                  className="flex-1 bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm px-4 py-3 rounded-2xl border-0 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleSendMessage(curItem)}
                  disabled={isSending || !curMessage.trim()}
                  className="py-3 px-5 bg-[var(--primary)] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all shrink-0 cursor-pointer"
                >
                  <Send size={16} />
                  <span>{isSending ? "Sending..." : "Message"}</span>
                </button>
              </div>
            </div>
            )
          )}

          {/* 4. Seller Information Card (Below message input - only shown when not already viewing the storefront) */}
          {mode !== "modal" && !hideSellerInfo && (
            <>
              <hr className="border-gray-100 dark:border-zinc-800" />
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
                  Seller Information
                </h3>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 shadow-xs">
                  <div
                    className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
                    onClick={() => handleOpenStorefront(curItem.sellerId, curItem.sellerName, curItem.sellerAvatar, curItem.sellerLocation || curItem.location)}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0 border border-gray-150 dark:border-zinc-700 flex items-center justify-center shadow-xs">
                      {curItem.sellerAvatar ? (
                        <img src={curItem.sellerAvatar} alt={curItem.sellerName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold text-lg text-gray-700 dark:text-zinc-200">
                          {curItem.sellerName.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-[var(--primary)] transition-colors truncate">
                        {curItem.sellerOwnerName || curItem.sellerName}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                        {curItem.sellerOwnerName && curItem.sellerName && curItem.sellerName !== curItem.sellerOwnerName ? `${curItem.sellerName} • ` : ""}
                        {curItem.sellerLocation || curItem.location} • Active on Isoko
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenStorefront(curItem.sellerId, curItem.sellerName, curItem.sellerAvatar, curItem.sellerLocation || curItem.location)}
                    className="text-xs font-bold text-[var(--primary)] hover:underline px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 transition-colors cursor-pointer shrink-0 ml-2"
                  >
                    View Store
                  </button>
                </div>
              </div>
            </>
          )}

          {/* 5. Share to Inbox / Wishlist Banner (At the bottom of the page) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-50 via-purple-50 to-blue-50 dark:from-pink-950/30 dark:via-purple-950/30 dark:to-blue-950/30 border border-purple-100 dark:border-purple-900/40 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-800 text-pink-500 flex items-center justify-center shrink-0 shadow-xs">
                <Gift size={20} />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                  Show someone in your inbox
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                  Send to a friend & ask them to buy it for you!
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShareItem(curItem)}
              className="py-2 px-3.5 bg-[var(--primary)] hover:bg-blue-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer transition-all"
            >
              <Share2 size={13} />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* Divider before next item if more items follow (only in storefront feed) */}
        {index < orderedFeedItems.length - 1 && (
          <div className="py-6 px-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-800" />
            <span className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <ShoppingBag size={12} className="text-[var(--primary)]" />
              <span>{`Next in ${curItem.sellerName}'s Store`}</span>
            </span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-800" />
          </div>
        )}
      </div>
    );
  };

  // Shared Inner Content (Renders items in feed)
  const renderItemContent = () => (
    <div
      ref={scrollRef}
      className={clsx(
        "flex-1 overflow-y-auto min-h-0 custom-scrollbar overscroll-contain",
        isTopItemOwner ? "pb-20 sm:pb-8" : "pb-8"
      )}
    >
      <div className={clsx(mode === "page" ? "max-w-2xl mx-auto w-full" : "w-full")}>
        {orderedFeedItems.map((feedItem, idx) => renderSingleListing(feedItem, idx))}

        {/* End of Storefront Feed Banner */}
        {orderedFeedItems.length > 1 && (
          <div className="py-8 text-center space-y-1 bg-gray-50/60 dark:bg-zinc-900/40 rounded-3xl mx-4 my-6 border border-dashed border-gray-200 dark:border-zinc-800">
            <p className="text-xs font-bold text-gray-700 dark:text-zinc-300">
              {`You've seen all ${orderedFeedItems.length} items from ${item.sellerName}`}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-zinc-500">
              Swipe or tap close to return to the store catalogue
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // Overlays (Delete confirm, Share modal, Storefront modal)
  const renderOverlays = () => (
    <>
      {/* Delete Confirmation Dialog */}
      {deleteConfirmItemId && (
        <div className="fixed inset-0 z-[190] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 max-w-xs w-full shadow-2xl border border-gray-100 dark:border-zinc-800 space-y-3 text-center">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white">
              Delete this listing?
            </h4>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              This item will be permanently removed from Isoko.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmItemId(null)}
                className="flex-1 py-3 bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 font-bold text-xs rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmItemId)}
                className="flex-1 py-3 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share to Chat Modal */}
      {shareItem && (
        <ShareToChatModal
          item={shareItem}
          onClose={() => setShareItem(null)}
        />
      )}

      {/* Seller Dedicated Marketplace Storefront Sliding Page (only when not delegated to parent) */}
      {!onOpenStore && (showSellerStorefront || closingSellerStorefront) && (
        <SellerStorefrontModal
          sellerId={item.sellerId}
          sellerName={item.sellerName}
          sellerAvatar={item.sellerAvatar}
          sellerLocation={item.sellerLocation || item.location}
          isClosing={closingSellerStorefront}
          onClose={handleCloseSellerStorefront}
        />
      )}
    </>
  );

  // ═══════════════════════════════════════════════════════════════
  // MODE 1: POP-UP MODAL (Feed scrolling when clicked from within Seller's Storefront)
  // ═══════════════════════════════════════════════════════════════
  if (mode === "modal") {
    const isSavedTop = isItemSaved(item.id, item.savedBy);

    return (
      <div
        className={clsx(
          "absolute inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 bg-transparent",
          isClosing ? "pointer-events-none" : ""
        )}
        onClick={handleBack}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={clsx(
            "bg-white dark:bg-zinc-950 w-full sm:max-w-xl h-full sm:h-auto sm:max-h-[90%] rounded-none sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-gray-150 dark:border-zinc-800 antialiased subpixel-antialiased text-gray-900 dark:text-zinc-100",
            isClosing
              ? "animate-slide-out-to-right-edge"
              : animPhase === "entering"
              ? "animate-slide-in-from-right-edge"
              : ""
          )}
          style={{
            transform: !isClosing && dragY > 0 ? `translateY(${dragY}px)` : (isClosing || animPhase === "entering") ? undefined : "none",
            willChange: isClosing || animPhase === "entering" ? "transform" : "auto",
            transition: isDragging ? "none" : undefined
          }}
          onAnimationEnd={(e) => {
            if (e.target !== e.currentTarget) return;
            if (animPhase === "entering") {
              setAnimPhase("stable");
            }
          }}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onTouchCancel={handleDragEnd}
        >
          {/* Top Sticky Header */}
          <div className="px-3 md:px-5 py-3 flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
            <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
              <button
                type="button"
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer shrink-0"
                title="Back"
              >
                <ArrowLeft size={22} className="text-[var(--primary)]" />
              </button>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {item.sellerName}&apos;s Store Catalogue
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate">
                  {orderedFeedItems.length} {orderedFeedItems.length === 1 ? "item" : "items"} • Scroll for more
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShareItem(item)}
                className="w-9 h-9 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-700 dark:text-zinc-200 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                title="Share"
              >
                <Share2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => toggleSaveMarketplaceItem(item.id)}
                title={isSavedTop ? "Saved" : "Save Item"}
                className={clsx(
                  "w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer",
                  isSavedTop
                    ? "bg-rose-50 dark:bg-rose-950/40 text-rose-500"
                    : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-200 dark:hover:bg-zinc-700"
                )}
              >
                <Bookmark size={17} className={clsx(isSavedTop ? "fill-rose-500 text-rose-500" : "text-gray-700 dark:text-zinc-200")} />
              </button>
            </div>
          </div>

          {/* Continuous Scroll Feed */}
          {renderItemContent()}
        </div>
        {renderOverlays()}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MODE 2: FULL SLIDING PAGE (In Marketplace View)
  // ═══════════════════════════════════════════════════════════════
  const isSavedMain = isItemSaved(item.id, item.savedBy);

  return (
    <div
      data-item-detail-page="true"
      className={clsx(
        "absolute inset-0 z-40 h-full w-full bg-white dark:bg-zinc-950 flex flex-col overflow-hidden antialiased subpixel-antialiased text-gray-900 dark:text-zinc-100",
        isClosing
          ? "animate-slide-out-to-right-edge"
          : animPhase === "entering"
          ? "animate-slide-in-from-right-edge"
          : ""
      )}
      style={{
        transform: (isClosing || animPhase === "entering") ? undefined : "none",
        willChange: isClosing || animPhase === "entering" ? "transform" : "auto"
      }}
      onAnimationEnd={(e) => {
        if (e.target !== e.currentTarget) return;
        if (animPhase === "entering") {
          setAnimPhase("stable");
        }
      }}
    >
      {/* Fixed Sticky Top Header */}
      <header className="bg-white dark:bg-zinc-900 px-3 md:px-5 py-3 flex items-center justify-between border-b border-[var(--border)] dark:border-zinc-800 sticky top-0 z-30 shrink-0 shadow-xs">
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          <button
            type="button"
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer shrink-0"
            title="Back"
          >
            <ArrowLeft size={24} className="text-[var(--primary)]" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate leading-tight">
              {item.title}
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate">
              {item.category} • {item.condition}
            </p>
          </div>
        </div>

        {/* Right Actions: Share & Save */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShareItem(item)}
            title="Share listing"
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-700 dark:text-zinc-200 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <Share2 size={17} />
          </button>
          <button
            type="button"
            onClick={() => toggleSaveMarketplaceItem(item.id)}
            title={isSavedMain ? "Saved" : "Save Item"}
            className={clsx(
              "w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer",
              isSavedMain
                ? "bg-rose-50 dark:bg-rose-950/40 text-rose-500"
                : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-200 dark:hover:bg-zinc-700"
            )}
          >
            <Bookmark size={18} className={clsx(isSavedMain ? "fill-rose-500 text-rose-500" : "text-gray-700 dark:text-zinc-200")} />
          </button>
        </div>
      </header>

      {/* Scrollable Page Body */}
      {renderItemContent()}

      {/* Overlays */}
      {renderOverlays()}
    </div>
  );
}
