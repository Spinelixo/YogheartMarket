"use client";

import React, { useState, useRef } from "react";
import { X, Upload, Video, Sparkles, Music, Tag, Check, ChevronLeft } from "lucide-react";
import { clsx } from "clsx";
import { YogheartClip } from "./clipsData";
import { User } from "@/context/MockContext";

interface CreateClipModalProps {
  currentUser: User | null;
  onClose: () => void;
  onClipCreated: (newClip: YogheartClip) => void;
}

const PRESET_SAMPLE_VIDEOS = [
  {
    label: "Skatepark Sunset Trick",
    url: "https://assets.mixkit.co/videos/preview/mixkit-young-woman-skater-performing-a-trick-in-a-skatepark-42998-large.mp4",
    poster: "https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?w=800&auto=format&fit=crop&q=80"
  },
  {
    label: "Gourmet Pasta Plating",
    url: "https://assets.mixkit.co/videos/preview/mixkit-chef-garnishing-a-delicious-gourmet-dish-42526-large.mp4",
    poster: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80"
  },
  {
    label: "Mountain Winding Drive",
    url: "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-winding-mountain-road-42416-large.mp4",
    poster: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80"
  },
  {
    label: "Rooftop Workout Motivation",
    url: "https://assets.mixkit.co/videos/preview/mixkit-athlete-exercising-outdoors-in-the-city-43003-large.mp4",
    poster: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80"
  },
  {
    label: "Playful Puppy in Grass",
    url: "https://assets.mixkit.co/videos/preview/mixkit-cute-little-dog-playing-in-the-grass-42790-large.mp4",
    poster: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80"
  }
];

export function CreateClipModal({
  currentUser,
  onClose,
  onClipCreated
}: CreateClipModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const [isClosing, setIsClosing] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string>(PRESET_SAMPLE_VIDEOS[0].url);
  const [selectedPosterUrl, setSelectedPosterUrl] = useState<string>(PRESET_SAMPLE_VIDEOS[0].poster);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("#yogheart #clips #viral");
  const [musicTitle, setMusicTitle] = useState("Original Audio");
  const [uploadedAudioName, setUploadedAudioName] = useState<string | null>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 220);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const diffX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const diffY = Math.abs(e.changedTouches[0].clientY - touchStartRef.current.y);
    if (diffX > 70 && diffY < 100) {
      handleClose();
    }
    touchStartRef.current = null;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      setSelectedVideoUrl(localUrl);
      setSelectedPosterUrl("https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80");
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      const cleanedName = file.name.replace(/\.[^/.]+$/, "");
      setUploadedAudioName(file.name);
      setUploadedAudioUrl(localUrl);
      setMusicTitle(cleanedName);
    }
  };

  const handleSelectPreset = (preset: typeof PRESET_SAMPLE_VIDEOS[0]) => {
    setSelectedVideoUrl(preset.url);
    setSelectedPosterUrl(preset.poster);
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) return;

    setIsUploading(true);

    const parsedTags = hashtags
      .split(/[\s,]+/)
      .filter((t) => t.startsWith("#") || t.length > 0)
      .map((t) => (t.startsWith("#") ? t : `#${t}`));

    const newClip: YogheartClip = {
      id: `clip_${Date.now()}`,
      videoUrl: selectedVideoUrl,
      posterUrl: selectedPosterUrl,
      creator: {
        id: currentUser?.id || "me",
        name: currentUser?.name || "You",
        username: currentUser?.name ? currentUser.name.toLowerCase().replace(/\s+/g, "_") : "you",
        avatar: currentUser?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
        isVerified: true,
        isFollowing: false
      },
      caption: caption.trim(),
      hashtags: parsedTags.length > 0 ? parsedTags : ["#yogheart", "#clips"],
      musicTitle: musicTitle.trim() || "Original Sound",
      musicAuthor: `${currentUser?.name || "You"} • Original Sound`,
      likesCount: 1,
      commentsCount: 0,
      sharesCount: 0,
      isLiked: true,
      createdAt: "Just now",
      comments: []
    };

    setTimeout(() => {
      onClipCreated(newClip);
      setIsUploading(false);
      handleClose();
    }, 600);
  };

  return (
    <div
      className={clsx(
        "absolute inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs select-none transition-opacity duration-200 overflow-hidden",
        isClosing ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
      onClick={handleClose}
    >
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={clsx(
          "w-full h-full bg-zinc-950 shadow-2xl flex flex-col overflow-hidden",
          isClosing ? "animate-slide-out-to-right-edge" : "animate-slide-in-from-right-edge"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/90 sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Back"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-xs">
                <Video size={14} />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white leading-tight">Create Yogheart Clip</h2>
                <p className="text-[10px] text-zinc-400">Share short vertical video reel</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handlePublish} className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
          {/* Video Preview / Upload Card */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 block">Video Source</label>
            <div className="relative aspect-[9/10] sm:aspect-[9/11] w-full max-w-[200px] mx-auto rounded-2xl overflow-hidden bg-black border border-zinc-700 shadow-md flex items-center justify-center group">
              <video
                src={selectedVideoUrl}
                poster={selectedPosterUrl}
                playsInline
                loop
                muted
                autoPlay
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-1.5 rounded-xl bg-white/90 hover:bg-white text-zinc-900 font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <Upload size={13} />
                  <span>Upload Video</span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Quick Sample Presets */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
              <Sparkles size={12} className="text-amber-400" />
              <span>Or choose a demo video template</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESET_SAMPLE_VIDEOS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={clsx(
                    "px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-left truncate border transition-all cursor-pointer",
                    selectedVideoUrl === preset.url
                      ? "bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold"
                      : "bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-white"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Caption Input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-300 block">Caption & Story</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's happening in this clip? Share your vibes..."
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500 resize-none"
              required
            />
          </div>

          {/* Hashtags Input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1">
              <Tag size={12} className="text-emerald-400" />
              <span>Hashtags</span>
            </label>
            <input
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#yogheart #travel #vibes"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500"
            />
          </div>

          {/* Sound / Music Audio Track Section */}
          <div className="space-y-2 bg-zinc-800/60 p-3.5 rounded-2xl border border-zinc-750">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Music size={14} className="text-emerald-400" />
                <span>Audio Track</span>
              </label>
              <span className="text-[10px] text-zinc-400 font-semibold">Custom or Original</span>
            </div>

            {/* Audio File Upload Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                className={clsx(
                  "flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer",
                  uploadedAudioName
                    ? "bg-emerald-950/70 border-emerald-500/80 text-emerald-300 shadow-sm"
                    : "bg-zinc-800 hover:bg-zinc-750 border-zinc-700 text-zinc-200 hover:text-white"
                )}
              >
                <Upload size={14} className="text-emerald-400 shrink-0" />
                <span className="truncate">
                  {uploadedAudioName ? `Audio: ${uploadedAudioName}` : "Upload Audio Track (.mp3, .wav, .m4a)"}
                </span>
              </button>

              {uploadedAudioName && (
                <button
                  type="button"
                  onClick={() => {
                    setUploadedAudioName(null);
                    setUploadedAudioUrl(null);
                    setMusicTitle("Original Audio");
                  }}
                  className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-rose-400 border border-zinc-700 transition-colors"
                  title="Remove uploaded audio"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
              onChange={handleAudioUpload}
              className="hidden"
            />

            {/* Track Title Input */}
            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-semibold text-zinc-400 block">Sound Title / Credits</label>
              <input
                type="text"
                value={musicTitle}
                onChange={(e) => setMusicTitle(e.target.value)}
                placeholder="Track name or Original Sound"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isUploading || !caption.trim()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isUploading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check size={16} />
                  <span>Publish to Yogheart Clips</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
