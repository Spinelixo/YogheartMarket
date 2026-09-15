"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  SlidersHorizontal,
  ArrowLeft,
  Eye,
  Play,
  Flame,
  Sparkles,
  Smile,
  TrendingUp,
  Smartphone,
  Laugh,
  Dumbbell,
  UtensilsCrossed,
  Music,
  Compass,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { clsx } from "clsx";
import { YogheartClip, formatClipNumber } from "./clipsData";

interface ClipsExploreGridViewProps {
  clips: YogheartClip[];
  onSelectClip: (clip: YogheartClip, index: number) => void;
  onClose: () => void;
  isClosing?: boolean;
}

const CATEGORIES = [
  { label: "For you", icon: Sparkles },
  { label: "Relationship humor", icon: Smile },
  { label: "Success Mindset", icon: TrendingUp },
  { label: "Comedy & Skits", icon: Laugh },
  { label: "Fitness & Gym", icon: Dumbbell },
  { label: "Food & Dining", icon: UtensilsCrossed },
  { label: "Music & Vibes", icon: Music },
  { label: "Travel & Vibes", icon: Compass }
];

export function ClipsExploreGridView({
  clips,
  onSelectClip,
  onClose,
  isClosing = false,
}: ClipsExploreGridViewProps) {
  const [selectedCategory, setSelectedCategory] = useState("For you");
  const [searchQuery, setSearchQuery] = useState("");
  const [isExiting, setIsExiting] = useState(false);

  const categoriesRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Left Edge Swipe Back Gesture state
  const touchStartRef = useRef<{ x: number; y: number; isEdge: boolean }>({ x: 0, y: 0, isEdge: false });

  const checkCategoryScroll = () => {
    if (categoriesRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoriesRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkCategoryScroll();
    window.addEventListener("resize", checkCategoryScroll);
    return () => window.removeEventListener("resize", checkCategoryScroll);
  }, []);

  const scrollCategories = (direction: "left" | "right") => {
    if (categoriesRef.current) {
      const offset = direction === "left" ? -180 : 180;
      categoriesRef.current.scrollBy({ left: offset, behavior: "smooth" });
      setTimeout(checkCategoryScroll, 250);
    }
  };

  // Smooth slide exit before dismissing
  const handleClose = () => {
    if (isExiting || isClosing) return;
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 220);
  };

  // Edge Swipe Handlers for mobile swipe-to-back
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        isEdge: touch.clientX < 45
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current.isEdge) return;
    if (e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
      if (deltaX > 45 && deltaY < 80) {
        handleClose();
      }
    }
    touchStartRef.current = { x: 0, y: 0, isEdge: false };
  };

  // Filter clips by selected category and search
  const filteredClips = useMemo(() => {
    return clips.filter((clip) => {
      if (selectedCategory !== "For you") {
        const matchesCategory =
          clip.category?.toLowerCase() === selectedCategory.toLowerCase() ||
          clip.caption.toLowerCase().includes(selectedCategory.toLowerCase()) ||
          clip.hashtags.some((t) => t.toLowerCase().includes(selectedCategory.toLowerCase()));
        if (!matchesCategory) return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesText =
          clip.caption.toLowerCase().includes(query) ||
          clip.creator.name.toLowerCase().includes(query) ||
          clip.creator.username.toLowerCase().includes(query) ||
          clip.category?.toLowerCase().includes(query) ||
          clip.hashtags.some((t) => t.toLowerCase().includes(query));
        if (!matchesText) return false;
      }

      return true;
    });
  }, [clips, selectedCategory, searchQuery]);

  const effectiveClosing = isClosing || isExiting;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={clsx(
        "w-full h-full flex flex-col bg-[var(--background)] dark:bg-zinc-950 text-[var(--foreground)] dark:text-white select-none overflow-hidden antialiased",
        effectiveClosing ? "animate-slide-out-to-right-edge" : "animate-slide-in-from-right-edge"
      )}
    >
      {/* ── Top Header with Back Button & Yogheart Search Bar ── */}
      <div className="px-3 pt-3 pb-2 flex flex-col gap-2.5 shrink-0 bg-white dark:bg-zinc-950 border-b border-[var(--border)] dark:border-zinc-900 z-20">
        <div className="flex items-center gap-2">
          {/* Back Arrow to close Explore Grid */}
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
            title="Back to Clips"
          >
            <ArrowLeft size={20} />
          </button>

          {/* Yogheart Clips Search Bar */}
          <div className="flex-1 relative flex items-center">
            <div className="absolute left-3 text-gray-400 dark:text-zinc-400 pointer-events-none">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Yogheart clips, creators & topics..."
              className="w-full pl-9 pr-9 py-2 bg-gray-100 dark:bg-zinc-900 border border-[var(--border)] dark:border-zinc-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-zinc-400 text-xs sm:text-sm font-medium rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            ) : (
              <div className="absolute right-3 text-gray-400 dark:text-zinc-500 pointer-events-none">
                <SlidersHorizontal size={15} />
              </div>
            )}
          </div>
        </div>

        {/* ── Horizontal Category Filter Pills ── */}
        <div className="relative flex items-center w-full">
          {canScrollLeft && (
            <button
              onClick={() => scrollCategories("left")}
              className="absolute -left-1 z-10 w-7 h-7 rounded-full bg-white dark:bg-zinc-800 shadow-md border border-gray-200 dark:border-zinc-700 flex items-center justify-center text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
          )}

          <div
            ref={categoriesRef}
            onScroll={checkCategoryScroll}
            className="flex gap-2 overflow-x-auto py-1 px-1 no-scrollbar text-xs select-none w-full"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.label;
              return (
                <button
                  key={cat.label}
                  onClick={() => setSelectedCategory(cat.label)}
                  className={clsx(
                    "px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors shrink-0 cursor-pointer text-xs",
                    isSelected
                      ? "bg-[var(--primary)] text-white shadow-xs"
                      : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-white border border-gray-200/60 dark:border-zinc-700/60"
                  )}
                >
                  <Icon size={13} className={isSelected ? "text-white" : "text-gray-500 dark:text-zinc-400"} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {canScrollRight && (
            <button
              onClick={() => scrollCategories("right")}
              className="absolute -right-1 z-10 w-7 h-7 rounded-full bg-white dark:bg-zinc-800 shadow-md border border-gray-200 dark:border-zinc-700 flex items-center justify-center text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── 3-Column Instagram Reels Grid (Strictly isolated so image hover never triggers text re-rasterization) ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1 pb-16">
        {filteredClips.length > 0 ? (
          <div className="grid grid-cols-3 gap-1" style={{ isolation: "isolate" }}>
            {filteredClips.map((clip) => {
              const originalIndex = clips.findIndex((c) => c.id === clip.id);
              const viewsDisplay = formatClipNumber(
                clip.viewsCount || clip.likesCount * 25 + 120000
              );

              return (
                <div
                  key={clip.id}
                  onClick={() => onSelectClip(clip, originalIndex >= 0 ? originalIndex : 0)}
                  className="relative aspect-[9/16] bg-zinc-900 rounded-xs overflow-hidden group cursor-pointer select-none"
                  style={{ contain: "paint", isolation: "isolate" }}
                >
                  {/* Thumbnail Poster */}
                  <img
                    src={clip.posterUrl}
                    alt={clip.caption}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    style={{ willChange: "transform" }}
                    loading="lazy"
                  />

                  {/* Dark Vignette Gradients */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                  {/* Reel Icon in Top Right */}
                  <div className="absolute top-1.5 right-1.5 text-white/80 drop-shadow-md">
                    <Play size={12} className="fill-white/80" />
                  </div>

                  {/* Top / Center Caption Overlay (Instagram Style) */}
                  {clip.caption && (
                    <div className="absolute top-2 left-2 right-6 pointer-events-none">
                      <p className="text-[10px] font-bold text-white line-clamp-2 leading-tight drop-shadow-md">
                        {clip.caption}
                      </p>
                    </div>
                  )}

                  {/* Bottom View Count Badge (e.g. 👁 4.9M) */}
                  <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-white font-bold text-[10px] drop-shadow-md pointer-events-none">
                    <Eye size={11} className="stroke-[2.5]" />
                    <span>{viewsDisplay}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-gray-400 dark:text-zinc-500">
            <Flame size={36} className="text-gray-400 dark:text-zinc-700 mb-2" />
            <p className="font-bold text-sm text-gray-800 dark:text-zinc-300">No clips found for "{searchQuery || selectedCategory}"</p>
            <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">Try searching for another topic or hashtag</p>
          </div>
        )}
      </div>
    </div>
  );
}
