"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Flame,
  Plus,
  Share2,
  Copy,
  Check,
  Send,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
  ArrowLeft,
  Sparkles
} from "lucide-react";
import { clsx } from "clsx";
import { YogheartClip, INITIAL_YOGHEART_CLIPS, ClipComment } from "./clipsData";
import { ClipCard } from "./ClipCard";
import { ClipCommentsDrawer } from "./ClipCommentsDrawer";
import { CreateClipModal } from "./CreateClipModal";
import { ClipsExploreGridView } from "./ClipsExploreGridView";
import { ClipShareModal } from "./ClipShareModal";
import { useMockData } from "@/context/MockContext";
import { useModalHistory } from "@/hooks/useModalHistory";

interface YogheartClipsViewProps {
  onOpenDirectChat?: (userId: string) => void;
  initialMode?: "player" | "grid";
  onBackToFeed?: () => void;
}

export function YogheartClipsView({ onOpenDirectChat, initialMode = "player", onBackToFeed }: YogheartClipsViewProps) {
  const { currentUser, addNotification, threads, sendMessage, setActiveThreadId, setActiveTab: setGlobalActiveTab, moods } = useMockData();

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Clips State (with localStorage persistence)
  const [clips, setClips] = useState<YogheartClip[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("mesh_yogheart_clips");
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn("Failed to load clips from storage:", e);
      }
    }
    return INITIAL_YOGHEART_CLIPS;
  });

  // Feed Mode: "forYou" vs "following"
  const [clipsFeedMode, setClipsFeedMode] = useState<"forYou" | "following">("forYou");

  // Real-time video clips synced from Firestore across all devices
  const allClips = useMemo(() => {
    const seenIds = new Set<string>();
    const seenUrls = new Set<string>();
    const merged: YogheartClip[] = [];

    // 1. Synced Firestore video moods
    const videoMoods = (moods || []).filter((m) => m.type === "video");
    for (const vm of videoMoods) {
      const isMyClip = currentUser && vm.userId === currentUser.id;
      seenIds.add(vm.id);
      if (vm.mediaUrl) seenUrls.add(vm.mediaUrl);
      merged.push({
        id: vm.id,
        creator: {
          id: vm.userId,
          name: vm.userName || (isMyClip ? currentUser?.name : "User") || "User",
          username: (vm.userName || "user").toLowerCase().replace(/\s+/g, "_"),
          avatar: vm.userAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
          isVerified: true,
          isFollowing: true,
        },
        videoUrl: vm.mediaUrl,
        posterUrl: vm.userAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
        caption: vm.caption || "Video clip on Yogheart! 🎬✨",
        hashtags: ["#yogheart", "#clips"],
        musicTitle: "Original Sound",
        musicAuthor: "Yogheart",
        likesCount: vm.likes?.length || 1,
        isLiked: currentUser ? vm.likes?.includes(currentUser.id) || false : false,
        commentsCount: vm.comments?.length || 0,
        sharesCount: 0,
        viewsCount: 1,
        createdAt: "Recently",
        comments: [],
      });
    }

    // 2. Local / initial clips
    for (const c of clips) {
      if (!seenIds.has(c.id) && !seenUrls.has(c.videoUrl)) {
        seenIds.add(c.id);
        if (c.videoUrl) seenUrls.add(c.videoUrl);
        merged.push(c);
      }
    }

    return merged;
  }, [moods, clips, currentUser]);

  // Filter clips based on Following vs For You
  const displayedClips = useMemo(() => {
    if (clipsFeedMode === "following") {
      return allClips.filter((c) => c.creator.isFollowing);
    }
    return allClips;
  }, [allClips, clipsFeedMode]);

  // Base Player state
  const [baseActiveIndex, setBaseActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  // Explore Grid Modal/Layer state
  const [isGridOpen, setIsGridOpen] = useState(initialMode === "grid");
  const [isGridClosing, setIsGridClosing] = useState(false);

  // Comments Sheet State
  const [activeCommentsClip, setActiveCommentsClip] = useState<YogheartClip | null>(null);

  // Create Clip Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Share Sheet Modal State
  const [activeShareClip, setActiveShareClip] = useState<YogheartClip | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Save clips changes
  const saveClips = (updated: YogheartClip[]) => {
    setClips(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("mesh_yogheart_clips", JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to save clips:", e);
      }
    }
  };

  // Base Scroll listener
  const handleBaseScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, clientHeight } = containerRef.current;
    const index = Math.round(scrollTop / clientHeight);
    if (index !== baseActiveIndex && index >= 0 && index < displayedClips.length) {
      setBaseActiveIndex(index);
    }
  }, [baseActiveIndex, displayedClips.length]);

  const scrollBaseToIndex = (idx: number) => {
    if (idx < 0 || idx >= displayedClips.length || !containerRef.current) return;
    const clientHeight = containerRef.current.clientHeight;
    containerRef.current.scrollTo({
      top: idx * clientHeight,
      behavior: "smooth"
    });
    setBaseActiveIndex(idx);
  };

  // Toggle Like
  const handleToggleLike = (clipId: string) => {
    const updated = clips.map((c) => {
      if (c.id === clipId) {
        const isLiked = !c.isLiked;
        return {
          ...c,
          isLiked,
          likesCount: isLiked ? c.likesCount + 1 : Math.max(0, c.likesCount - 1)
        };
      }
      return c;
    });
    saveClips(updated);
  };

  // Toggle Follow
  const handleToggleFollow = (creatorId: string) => {
    const updated = clips.map((c) => {
      if (c.creator.id === creatorId) {
        const isFollowing = !c.creator.isFollowing;
        return {
          ...c,
          creator: {
            ...c.creator,
            isFollowing
          }
        };
      }
      return c;
    });
    saveClips(updated);
  };

  // Add Comment
  const handleAddComment = (clipId: string, text: string) => {
    const newComment: ClipComment = {
      id: `comm_${Date.now()}`,
      userId: currentUser?.id || "me",
      userName: currentUser?.name || "You",
      userAvatar: currentUser?.avatar || null,
      text,
      createdAt: "Just now",
      likesCount: 0,
      isLiked: false
    };

    const updated = clips.map((c) => {
      if (c.id === clipId) {
        const updatedComments = [newComment, ...c.comments];
        const newClip = {
          ...c,
          comments: updatedComments,
          commentsCount: c.commentsCount + 1
        };
        if (activeCommentsClip?.id === clipId) {
          setActiveCommentsClip(newClip);
        }
        return newClip;
      }
      return c;
    });

    saveClips(updated);
    addNotification("Comment posted to clip! 💬");
  };

  // Like Comment
  const handleLikeComment = (clipId: string, commentId: string) => {
    const updated = clips.map((c) => {
      if (c.id === clipId) {
        const updatedComments = c.comments.map((comm) => {
          if (comm.id === commentId) {
            const isNowLiked = !comm.isLiked;
            return {
              ...comm,
              isLiked: isNowLiked,
              likesCount: isNowLiked ? comm.likesCount + 1 : Math.max(0, comm.likesCount - 1)
            };
          }
          return comm;
        });
        const newClip = { ...c, comments: updatedComments };
        if (activeCommentsClip?.id === clipId) {
          setActiveCommentsClip(newClip);
        }
        return newClip;
      }
      return c;
    });
    saveClips(updated);
  };

  // Create Clip
  const handleClipCreated = (newClip: YogheartClip) => {
    const updated = [newClip, ...clips];
    saveClips(updated);
    addNotification("Your Yogheart Clip is now live! 🎬🎉");
    scrollBaseToIndex(0);
  };

  // Share Clip Actions
  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(window.location.href);
      setCopiedLink(true);
      addNotification("Clip link copied to clipboard! 📋");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleShareToThread = (threadId: string) => {
    if (activeShareClip) {
      const msg = `Check out this Yogheart Clip by @${activeShareClip.creator.username}: "${activeShareClip.caption}" 🎬✨\n${activeShareClip.videoUrl}`;
      sendMessage(threadId, msg);
      setActiveShareClip(null);
      addNotification("Clip shared to chat! 🚀");
      setGlobalActiveTab("chats");
      setActiveThreadId(threadId);
      window.history.pushState(null, "", `/inbox?id=${threadId}`);
    }
  };

  // Exit Explore Grid with slide-out-to-right-edge animation
  const handleCloseGrid = () => {
    if (isGridClosing || !isGridOpen) return;
    setIsGridClosing(true);
    setTimeout(() => {
      setIsGridOpen(false);
      setIsGridClosing(false);
    }, 220);
  };

  // Synchronize browser history and phone swipe-back navigation for Explore Grid
  useModalHistory("clipsExploreGrid", isGridOpen, handleCloseGrid);

  return (
    <div className="relative w-full h-full flex flex-col bg-black overflow-hidden select-none">
      {/* ══════════════════════════════════════════════════════════════
          1. BASE FULL-SCREEN PLAYER (Initial Viewing: "Yogheart Clips")
         ══════════════════════════════════════════════════════════════ */}
      {/* Top Floating Control Bar (Header Overlay) */}
      <div className="absolute top-0 left-0 right-0 z-20 p-3 sm:p-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-auto">
        {/* Left: Brand */}
        <div
          onClick={() => setIsGridOpen(true)}
          className="flex items-center gap-2 cursor-pointer group hover:opacity-90 transition-all active:scale-[0.98]"
          title="Open Explore Grid (3-Column Feed)"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/30 border border-emerald-300/30 group-hover:scale-105 transition-transform">
            <Flame size={18} className="fill-white" />
          </div>
          <div className="hidden sm:block">
            <h2 className="text-base font-black text-white leading-none tracking-tight flex items-center gap-1.5">
              <span>Yogheart Clips</span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-emerald-500 text-white shadow-xs">
                Hot
              </span>
            </h2>
          </div>
        </div>

        {/* Center: For You | Following Switcher */}
        <div className="flex items-center gap-3 text-sm font-black select-none">
          <button
            onClick={() => {
              setClipsFeedMode("forYou");
              setBaseActiveIndex(0);
              if (containerRef.current) containerRef.current.scrollTop = 0;
            }}
            className={clsx(
              "transition-all cursor-pointer relative py-1",
              clipsFeedMode === "forYou"
                ? "text-white font-black scale-105"
                : "text-zinc-400 hover:text-zinc-200 font-bold"
            )}
          >
            <span>For You</span>
            {clipsFeedMode === "forYou" && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>
          <span className="text-zinc-600 text-xs">|</span>
          <button
            onClick={() => {
              setClipsFeedMode("following");
              setBaseActiveIndex(0);
              if (containerRef.current) containerRef.current.scrollTop = 0;
            }}
            className={clsx(
              "transition-all cursor-pointer relative py-1",
              clipsFeedMode === "following"
                ? "text-white font-black scale-105"
                : "text-zinc-400 hover:text-zinc-200 font-bold"
            )}
          >
            <span>Following</span>
            {clipsFeedMode === "following" && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>
        </div>

        {/* Right: Grid & Create Clip */}
        <div className="flex items-center gap-2">
          {/* Explore Grid Button */}
          <button
            onClick={() => setIsGridOpen(true)}
            className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center border border-white/15 transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Explore Grid"
          >
            <LayoutGrid size={15} />
          </button>

          {/* Create Clip Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-1.5 rounded-full bg-emerald-600/90 hover:bg-emerald-600 backdrop-blur-md text-white font-extrabold text-xs flex items-center gap-1.5 border border-emerald-400/30 shadow-md shadow-emerald-600/25 transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={14} className="stroke-[3]" />
            <span className="hidden sm:inline">Create</span>
          </button>
        </div>
      </div>

      {/* Vertical Snap-Scrolling Video Container */}
      <div
        ref={containerRef}
        onScroll={handleBaseScroll}
        className="flex-1 w-full h-full snap-y snap-mandatory overflow-y-scroll overflow-x-hidden no-scrollbar relative"
      >
        {displayedClips.length > 0 ? (
          displayedClips.map((clip, idx) => (
            <div key={clip.id} className="w-full h-full snap-start snap-always relative">
              <ClipCard
                clip={clip}
                isActive={!isGridOpen && idx === baseActiveIndex}
                isMuted={isMuted}
                currentUser={currentUser}
                onToggleMute={() => setIsMuted(!isMuted)}
                onToggleLike={handleToggleLike}
                onOpenComments={(c) => setActiveCommentsClip(c)}
                onShareClip={(c) => setActiveShareClip(c)}
                onToggleFollow={handleToggleFollow}
                onOpenProfile={(creatorId) => {
                  window.history.pushState(null, "", `/profile?userId=${creatorId}&from=clips`);
                  window.dispatchEvent(new Event("locationchange"));
                }}
              />
            </div>
          ))
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-white bg-zinc-950">
            <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-emerald-400 shadow-xl">
              <Flame size={32} />
            </div>
            <h3 className="text-lg font-black mb-1">No Following Clips Yet</h3>
            <p className="text-xs text-zinc-400 max-w-xs mb-5">
              Follow creators to see their latest clips and reels in this tab!
            </p>
            <button
              onClick={() => {
                setClipsFeedMode("forYou");
                setBaseActiveIndex(0);
                if (containerRef.current) containerRef.current.scrollTop = 0;
              }}
              className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Explore For You Clips</span>
            </button>
          </div>
        )}
      </div>

      {/* Floating Desktop Navigation Arrows (Base Player) */}
      <div className="hidden lg:flex flex-col gap-2.5 absolute left-6 top-1/2 -translate-y-1/2 z-20">
        <button
          onClick={() => scrollBaseToIndex(baseActiveIndex - 1)}
          disabled={baseActiveIndex === 0}
          className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white disabled:opacity-20 flex items-center justify-center border border-white/20 shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
          title="Previous Clip (Up Arrow)"
        >
          <ChevronUp size={22} />
        </button>
        <button
          onClick={() => scrollBaseToIndex(baseActiveIndex + 1)}
          disabled={baseActiveIndex === clips.length - 1}
          className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white disabled:opacity-20 flex items-center justify-center border border-white/20 shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
          title="Next Clip (Down Arrow)"
        >
          <ChevronDown size={22} />
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          2. SLIDE-OUT INSTAGRAM 3-COLUMN EXPLORE GRID OVERLAY
         ══════════════════════════════════════════════════════════════ */}
      {(isGridOpen || isGridClosing) && (
        <div className="absolute inset-0 z-30 w-full h-full bg-transparent overflow-hidden pointer-events-auto">
          <ClipsExploreGridView
            clips={clips}
            isClosing={isGridClosing}
            onSelectClip={(clip, idx) => {
              if (containerRef.current) {
                const clientHeight = containerRef.current.clientHeight;
                if (clientHeight > 0) {
                  containerRef.current.scrollTop = idx * clientHeight;
                }
              }
              setBaseActiveIndex(idx);
              handleCloseGrid();
            }}
            onClose={handleCloseGrid}
          />
        </div>
      )}
      {/* Comments Drawer */}
      {activeCommentsClip && (
        <ClipCommentsDrawer
          clipId={activeCommentsClip.id}
          comments={activeCommentsClip.comments}
          currentUser={currentUser}
          onClose={() => setActiveCommentsClip(null)}
          onAddComment={handleAddComment}
          onLikeComment={handleLikeComment}
        />
      )}

      {/* Create Clip Modal */}
      {showCreateModal && (
        <CreateClipModal
          currentUser={currentUser}
          onClose={() => setShowCreateModal(false)}
          onClipCreated={handleClipCreated}
        />
      )}

      {/* Share Clip Modal Sheet */}
      {activeShareClip && (
        <ClipShareModal
          clip={activeShareClip}
          onClose={() => setActiveShareClip(null)}
        />
      )}
    </div>
  );
}
