"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Music,
  Plus,
  Check,
  Maximize2,
  Minimize2
} from "lucide-react";
import { clsx } from "clsx";
import { YogheartClip, formatClipNumber } from "./clipsData";
import { User } from "@/context/MockContext";

interface ClipCardProps {
  clip: YogheartClip;
  isActive: boolean;
  isMuted: boolean;
  currentUser: User | null;
  onToggleMute: () => void;
  onToggleLike: (clipId: string) => void;
  onOpenComments: (clip: YogheartClip) => void;
  onShareClip: (clip: YogheartClip) => void;
  onToggleFollow: (creatorId: string) => void;
  onOpenProfile: (creatorId: string) => void;
}

function ClipCardComponent({
  clip,
  isActive,
  isMuted,
  currentUser,
  onToggleMute,
  onToggleLike,
  onOpenComments,
  onShareClip,
  onToggleFollow,
  onOpenProfile
}: ClipCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [showPlayPulse, setShowPlayPulse] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [burstCoords, setBurstCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isExpandedCaption, setIsExpandedCaption] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isCleanView, setIsCleanView] = useState(false);

  const lastTapTimeRef = useRef(0);

  // Play / Pause video when card becomes active/inactive
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.currentTime = 0;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn("Autoplay prevented:", err);
            setIsPlaying(false);
          });
      }
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  // Keep muted state in sync
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Progress update
  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(pct);
    }
  };

  // Single Tap = Play/Pause; Double Tap = Heart Like Burst
  const handleVideoTap = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    let clientX = 0;
    let clientY = 0;
    if ("clientX" in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    if (now - lastTapTimeRef.current < DOUBLE_TAP_DELAY) {
      // Double Tap -> Like & Burst Heart
      const rect = e.currentTarget.getBoundingClientRect();
      setBurstCoords({
        x: clientX - rect.left,
        y: clientY - rect.top
      });
      setShowHeartBurst(true);
      if (!clip.isLiked) {
        onToggleLike(clip.id);
      }
      setTimeout(() => setShowHeartBurst(false), 900);
      lastTapTimeRef.current = 0;
      return;
    }

    lastTapTimeRef.current = now;

    // Single Tap -> Play / Pause
    setTimeout(() => {
      if (lastTapTimeRef.current === now) {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
          videoRef.current.play();
          setIsPlaying(true);
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
        }
        setShowPlayPulse(true);
        setTimeout(() => setShowPlayPulse(false), 600);
      }
    }, DOUBLE_TAP_DELAY + 20);
  };

  return (
    <div className="relative w-full h-full snap-start snap-always bg-black flex items-center justify-center overflow-hidden select-none">
      {/* Video Player Element */}
      <div
        className="relative w-full h-full flex items-center justify-center cursor-pointer"
        onClick={handleVideoTap}
      >
        <video
          ref={videoRef}
          src={clip.videoUrl}
          poster={clip.posterUrl}
          playsInline
          loop
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          className="w-full h-full object-cover sm:object-contain bg-black"
        />

        {/* Ambient Dark Gradient Overlays for readable text */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/80" />

        {/* Play / Pause Indicator Pulse */}
        {showPlayPulse && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white scale-110 animate-ping">
              {isPlaying ? <Play size={32} className="ml-1" /> : <Pause size={32} />}
            </div>
          </div>
        )}

        {/* Double-tap Animated Bouncing Heart */}
        {showHeartBurst && (
          <div
            className="absolute pointer-events-none z-30 transform -translate-x-1/2 -translate-y-1/2 animate-bounce-short"
            style={{
              left: `${burstCoords.x}px`,
              top: `${burstCoords.y}px`
            }}
          >
            <Heart size={80} className="fill-rose-500 text-rose-500 drop-shadow-2xl filter" />
          </div>
        )}
      </div>

      {/* Bottom Right Floating Mute Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleMute();
        }}
        className="absolute right-3 sm:right-5 bottom-4 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition-all border border-white/20 shadow-xl cursor-pointer hover:scale-105 active:scale-95"
        title={isMuted ? "Unmute sound" : "Mute sound"}
      >
        {isMuted ? <VolumeX size={18} className="text-rose-400" /> : <Volume2 size={18} className="text-emerald-400" />}
      </button>

      {/* Right-side Vertical Interactive Action Bar */}
      <div className="absolute right-3 sm:right-5 bottom-18 z-20 flex flex-col items-center gap-3 text-white">
        {/* Actions that hide in Clean / Full Screen View */}
        <div className={clsx(
          "flex flex-col items-center gap-3.5 transition-all duration-300",
          isCleanView ? "opacity-0 pointer-events-none translate-x-8 scale-90" : "opacity-100 translate-x-0 scale-100"
        )}>
          {/* Creator Avatar with Follow Button */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              onOpenProfile(clip.creator.id);
            }}
            className="relative mb-0.5 cursor-pointer group"
            title={`View @${clip.creator.username}'s dating profile`}
          >
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-lg bg-zinc-800 group-hover:scale-105 transition-transform">
              <img src={clip.creator.avatar} alt={clip.creator.name} className="w-full h-full object-cover" />
            </div>
            {clip.creator.id !== currentUser?.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFollow(clip.creator.id);
                }}
                className={clsx(
                  "absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer",
                  clip.creator.isFollowing
                    ? "bg-emerald-500 text-white"
                    : "bg-rose-500 hover:bg-rose-600 text-white hover:scale-110"
                )}
                title={clip.creator.isFollowing ? "Following" : "Follow Creator"}
              >
                {clip.creator.isFollowing ? <Check size={11} /> : <Plus size={12} />}
              </button>
            )}
          </div>

          {/* Like Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike(clip.id);
            }}
            className="flex flex-col items-center gap-0.5 group cursor-pointer"
          >
            <div className={clsx(
              "w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center transition-all group-active:scale-125 border border-white/10 shadow-md",
              clip.isLiked ? "text-rose-500" : "text-white hover:bg-black/60"
            )}>
              <Heart
                size={22}
                className={clsx(
                  "transition-transform duration-200",
                  clip.isLiked ? "fill-rose-500 scale-110 animate-heartbeat" : ""
                )}
              />
            </div>
            <span className="text-[11px] font-extrabold drop-shadow-md">
              {formatClipNumber(clip.likesCount)}
            </span>
          </button>

          {/* Comments Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenComments(clip);
            }}
            className="flex flex-col items-center gap-0.5 group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-all group-active:scale-110 border border-white/10 shadow-md">
              <MessageCircle size={22} />
            </div>
            <span className="text-[11px] font-extrabold drop-shadow-md">
              {formatClipNumber(clip.commentsCount)}
            </span>
          </button>

          {/* Share Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShareClip(clip);
            }}
            className="flex flex-col items-center gap-0.5 group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-all group-active:scale-110 border border-white/10 shadow-md">
              <Share2 size={20} />
            </div>
            <span className="text-[11px] font-extrabold drop-shadow-md">Share</span>
          </button>
        </div>

        {/* Full Screen / Clean View Toggle Button (Always accessible above Volume) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsCleanView(!isCleanView);
          }}
          className="flex flex-col items-center gap-0.5 group cursor-pointer"
          title={isCleanView ? "Exit Full Screen Clean View" : "Full Screen Clean View (Hide UI)"}
        >
          <div className={clsx(
            "w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all group-active:scale-110 border shadow-md",
            isCleanView
              ? "bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/30"
              : "bg-black/45 hover:bg-black/65 text-white border-white/15"
          )}>
            {isCleanView ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </div>
          <span className="text-[10px] font-extrabold drop-shadow-md">
            {isCleanView ? "Exit" : "Full"}
          </span>
        </button>
      </div>

      {/* Bottom Info Overlay: Creator, Caption, Hashtags & Sound */}
      <div className={clsx(
        "absolute left-4 right-16 bottom-6 z-20 text-white space-y-2 select-text transition-all duration-300",
        isCleanView ? "opacity-0 pointer-events-none translate-y-6" : "opacity-100 translate-y-0"
      )}>
        {/* Creator Handle & Verified Badge */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onOpenProfile(clip.creator.id);
          }}
          className="flex items-center gap-2 cursor-pointer group w-fit"
          title={`View @${clip.creator.username}'s dating profile`}
        >
          <span className="font-extrabold text-sm text-white drop-shadow-md group-hover:underline">
            @{clip.creator.username}
          </span>
          {clip.creator.isVerified && (
            <span className="p-0.5 rounded-full bg-sky-500 text-white" title="Verified Creator">
              <Check size={10} strokeWidth={3} />
            </span>
          )}
          <span className="text-[11px] text-zinc-300 drop-shadow-xs">• {clip.createdAt}</span>
        </div>

        {/* Caption with Hashtags */}
        <div className="text-xs text-zinc-100 leading-relaxed drop-shadow-md">
          <p className={clsx(isExpandedCaption ? "" : "line-clamp-2")}>
            {clip.caption}{" "}
            {clip.hashtags.map((tag) => (
              <span key={tag} className="font-bold text-emerald-300 mr-1 hover:underline cursor-pointer">
                {tag}
              </span>
            ))}
          </p>
          {clip.caption.length > 80 && (
            <button
              onClick={() => setIsExpandedCaption(!isExpandedCaption)}
              className="text-[11px] font-bold text-zinc-300 hover:text-white underline mt-0.5 cursor-pointer"
            >
              {isExpandedCaption ? "less" : "more"}
            </button>
          )}
        </div>

        {/* Music Marquee Banner */}
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full w-fit max-w-[85%] border border-white/10 shadow-xs">
          <Music size={12} className="text-emerald-400 shrink-0" />
          <div className="overflow-hidden whitespace-nowrap">
            <p className="truncate text-[11px]">
              {clip.musicTitle} — {clip.musicAuthor}
            </p>
          </div>
        </div>
      </div>

      {/* Video Progress Bar (Bottom Edge) */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-30">
        <div
          className="h-full bg-emerald-500 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export const ClipCard = React.memo(ClipCardComponent);
