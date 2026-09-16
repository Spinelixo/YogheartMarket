"use client";

import { useMockData, Message, User, MarketplaceItem, isMarketplaceThread } from "@/context/MockContext";
import { useCall } from "@/context/CallContext";
import { processImageFile } from "@/utils/imageProcessor";

import { ArrowLeft, Phone, Video, Send, Paperclip, Mic, Camera, Image, FileText, BarChart3, MoreVertical, X, Check, CheckCheck, Edit2, Trash2, Copy, Reply, ChevronLeft, ChevronRight, Square, Search, Bell, BellOff, Ban, Flag, Trash, Archive, ChevronUp, ChevronDown, Play, Pause, Pin, RotateCw, Download, Share2, Users, LogOut, UserCheck, MapPin, User as LucideUser, Star, ShoppingBag, Car } from "lucide-react";
import { useState, useRef, useEffect, Fragment, useMemo } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { useModalHistory } from "@/hooks/useModalHistory";
import { formatLastSeen } from "@/lib/date";
import { playSendSound } from "@/lib/sounds";
import ZoomedAvatarModal from "@/components/ZoomedAvatarModal";
import { SellerStorefrontModal } from "@/components/marketplace/SellerStorefrontModal";
import { ItemDetailModal } from "@/components/marketplace/ItemDetailModal";
import localforage from "localforage";

if (typeof window !== "undefined") {
    localforage.config({
        name: "mesh-media-cache",
        storeName: "media"
    });
}

interface LinkPreviewData {
    url: string;
    domain: string;
    title: string;
    description: string;
    image?: string;
    isYouTube?: boolean;
}

const isOnlyUrl = (text: string): boolean => {
    if (!text) return false;
    const urlRegex = /^(https?:\/\/[^\s]+|www\.[^\s]+)$/i;
    return !!text.trim().match(urlRegex);
};

const renderMessageTextWithLinks = (text: string) => {
    if (!text) return "";
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
        if (part.match(urlRegex)) {
            let href = part;
            if (!part.match(/^https?:\/\//i)) {
                href = `https://${part}`;
            }
            return (
                <a
                    key={index}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 dark:text-sky-400 dark:hover:text-sky-300 underline break-all inline-block font-semibold"
                    onClick={(e) => e.stopPropagation()}
                >
                    {part}
                </a>
            );
        }
        return part;
    });
};

const getLinkPreviewInfo = (text: string): LinkPreviewData | null => {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const match = text.match(urlRegex);
    if (!match) return null;
    
    let url = match[0];
    let href = url;
    if (!url.match(/^https?:\/\//i)) {
        href = `https://${url}`;
    }

    let domain = "";
    try {
        const urlObj = new URL(href);
        domain = urlObj.hostname.replace("www.", "");
    } catch (e) {
        domain = url.replace(/https?:\/\//i, "").split("/")[0];
    }

    let title = `${domain.charAt(0).toUpperCase() + domain.slice(1)} Link`;
    let description = `Visit ${domain} to view this content.`;
    let image = "";
    let isYouTube = false;

    const lowerUrl = href.toLowerCase();
    if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) {
        isYouTube = true;
        let videoId = "";
        if (lowerUrl.includes("watch?v=")) {
            const vIndex = href.toLowerCase().indexOf("watch?v=");
            if (vIndex !== -1) {
                const vParam = href.substring(vIndex + 8);
                videoId = vParam.split("&")[0];
            }
        } else {
            const match = href.match(/youtu\.be\/([^\s\?\/]+)/i);
            if (match) {
                videoId = match[1];
            }
        }
        if (videoId) {
            image = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            title = "Watch this video on YouTube";
            description = "Click to play and stream directly on YouTube.";
        }
    } else if (lowerUrl.includes("github.com")) {
        title = "GitHub: Where the world builds software";
        description = "GitHub is where over 100 million developers shape the future of software, hosting code, collaborating, and building projects together.";
        image = "https://images.unsplash.com/photo-1618401471353-b98aedd07871?w=300&auto=format&fit=crop&q=60";
    } else if (lowerUrl.includes("spotify.com")) {
        title = "Spotify - Web Player: Music for everyone";
        description = "Play music, discover playlists, and stream audio tracks shared in this conversation.";
        image = "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=300&auto=format&fit=crop&q=60";
    } else if (lowerUrl.includes("unsplash.com")) {
        title = "Unsplash: Beautiful Free Images & Pictures";
        description = "Beautiful, free images and photos that you can download and use for any project.";
        image = href;
    } else if (lowerUrl.includes("google.com")) {
        title = "Google Search";
        description = "Search the world's information, including webpages, images, videos and more.";
        image = "https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=300&auto=format&fit=crop&q=60";
    }

    return {
        url: href,
        domain,
        title,
        description,
        image,
        isYouTube
    };
};

const LinkPreviewCard = ({ text }: { text: string }) => {
    const initialPreview = getLinkPreviewInfo(text);
    const [preview, setPreview] = useState<LinkPreviewData | null>(initialPreview);

    useEffect(() => {
        if (!initialPreview) return;
        
        const lowerUrl = initialPreview.url.toLowerCase();
        if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) {
            let videoId = "";
            if (lowerUrl.includes("watch?v=")) {
                const vIndex = initialPreview.url.toLowerCase().indexOf("watch?v=");
                if (vIndex !== -1) {
                    const vParam = initialPreview.url.substring(vIndex + 8);
                    videoId = vParam.split("&")[0];
                }
            } else {
                const match = initialPreview.url.match(/youtu\.be\/([^\s\?\/]+)/i);
                if (match) {
                    videoId = match[1];
                }
            }

            if (videoId) {
                const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
                fetch(oEmbedUrl)
                    .then((res) => {
                        if (!res.ok) throw new Error("Failed to fetch oEmbed");
                        return res.json();
                    })
                    .then((data) => {
                        setPreview({
                            url: initialPreview.url,
                            domain: "YouTube",
                            title: data.title || "YouTube Video",
                            description: `Uploaded by ${data.author_name || "YouTube"}. Click to watch this video.`,
                            image: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                            isYouTube: true
                        });
                    })
                    .catch((err) => {
                        console.error("YouTube oEmbed fetch error:", err);
                    });
            }
        } else {
            // General link preview fetching using free public API (Microlink) to fetch metadata (title, image, etc.)
            const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(initialPreview.url)}`;
            fetch(microlinkUrl)
                .then((res) => {
                    if (!res.ok) throw new Error("Failed to fetch Microlink");
                    return res.json();
                })
                .then((json) => {
                    if (json.status === "success" && json.data) {
                        setPreview({
                            url: initialPreview.url,
                            domain: json.data.publisher || initialPreview.domain,
                            title: json.data.title || initialPreview.title,
                            description: json.data.description || initialPreview.description,
                            image: json.data.image?.url || json.data.logo?.url || undefined,
                            isYouTube: false
                        });
                    }
                })
                .catch((err) => {
                    console.error("Microlink fetch error:", err);
                });
        }
    }, [text]);

    if (!preview) return null;

    const isUrlOnly = isOnlyUrl(text);
    return (
        <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            className={clsx(
                "block transition-colors select-none overflow-hidden self-start",
                isUrlOnly 
                    ? "w-[260px] md:w-[320px] rounded-[14px]" 
                    : "-mx-1.5 mt-1.5 mb-0.5 rounded-xl bg-black/5 dark:bg-white/5"
            )}
            onClick={(e) => e.stopPropagation()}
        >
            {preview.image && (
                <div className="relative w-full aspect-video bg-black/10 dark:bg-white/10 overflow-hidden shadow-sm border-b border-black/5 dark:border-white/5">
                    <img 
                        src={preview.image} 
                        alt={preview.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                    />
                    {preview.isYouTube && (
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                            <span className="text-red-600">▶</span> YouTube
                        </div>
                    )}
                </div>
            )}
            <div className={clsx("px-2.5 py-2 text-left space-y-1", isUrlOnly && "pb-4")}>
                <div className="text-[11px] font-semibold opacity-70 uppercase tracking-wider">
                    {preview.domain}
                </div>
                <div className="text-xs md:text-sm font-bold text-gray-900 dark:text-zinc-100 leading-snug mt-1 group-hover:text-blue-500 dark:group-hover:text-sky-400 transition-colors">
                    {preview.title}
                </div>
                {!isUrlOnly && preview.description && (
                    <div className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed mt-1.5 line-clamp-2">
                        {preview.description}
                    </div>
                )}
            </div>
        </a>
    );
};

const MeshWallpaper = ({ type }: { type: string }) => {
    let blob1 = "bg-[#00f2fe]";
    let blob2 = "bg-[#7f00ff]";
    let blob3 = "bg-[#ff007f]";

    if (type === "mesh-neon") {
        blob1 = "bg-[#ff007f]";
        blob2 = "bg-[#ff5e62]";
        blob3 = "bg-[#a8ff78]";
    } else if (type === "mesh-sunset") {
        blob1 = "bg-[#ff4e50]";
        blob2 = "bg-[#f9d423]";
        blob3 = "bg-[#4a00e0]";
    }

    return (
        <div className="absolute inset-0 overflow-hidden bg-white dark:bg-black transition-colors duration-500">
            <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/10 via-transparent to-pink-500/10 dark:from-sky-950/20 dark:to-pink-950/20" />
            <div className={clsx(
                "absolute top-[-15%] left-[-15%] w-[60%] h-[60%] rounded-full filter blur-[50px] md:blur-[80px] transition-all duration-1000",
                "opacity-35 dark:opacity-85 mix-blend-multiply dark:mix-blend-screen animate-blob-1",
                blob1
            )} />
            <div className={clsx(
                "absolute bottom-[-15%] right-[-15%] w-[65%] h-[65%] rounded-full filter blur-[60px] md:blur-[90px] transition-all duration-1000",
                "opacity-30 dark:opacity-80 mix-blend-multiply dark:mix-blend-screen animate-blob-2",
                blob2
            )} />
            <div className={clsx(
                "absolute top-[30%] right-[-20%] w-[55%] h-[55%] rounded-full filter blur-[50px] md:blur-[70px] transition-all duration-1000",
                "opacity-25 dark:opacity-75 mix-blend-multiply dark:mix-blend-screen animate-blob-3",
                blob3
            )} />
        </div>
    );
};

const renderDoodles = (type: string) => {
    switch (type) {
        case "doodle-google":
            return (
                <>
                    {/* Chat Bubble Icon */}
                    <path d="M 25 25 h 25 a 5 5 0 0 1 5 5 v 15 a 5 5 0 0 1 -5 5 h -20 l -10 8 v -8 a 5 5 0 0 1 -5 -5 v -15 a 5 5 0 0 1 5 -5 z" fill="none" />
                    {/* Smiley Face */}
                    <circle cx="120" cy="35" r="8" fill="none" />
                    <path d="M 117 38 a 4 4 0 0 0 6 0" fill="none" />
                    <circle cx="117" cy="33" r="0.8" />
                    <circle cx="123" cy="33" r="0.8" />
                    
                    {/* Message Bubble Outline */}
                    <path d="M 35 105 h 20 a 4 4 0 0 1 4 4 v 10 a 4 4 0 0 1 -4 4 h -16 l -8 6 v -6 a 4 4 0 0 1 -4 -4 v -10 a 4 4 0 0 1 4 -4 z" fill="none" />
                    
                    {/* Tiny Heart */}
                    <path d="M 120 105 c -2 -3 -6 -2 -6 2 c 0 4 6 8 6 8 c 0 0 6 -4 6 -8 c 0 -4 -4 -5 -6 -2 z" fill="none" />
                    
                    {/* Sparkles / Stars */}
                    <path d="M 75 60 l 1 3 l 3 1 l -3 1 l -1 3 l -1 -3 l -3 -1 l 3 -1 z" fill="none" />
                    <path d="M 135 65 l 1 2 l 2 1 l -2 1 l -1 2 l -1 -2 l -2 -1 l 2 -1 z" fill="none" />
                </>
            );
        case "doodle-zoo":
            return (
                <>
                    {/* Cat Head */}
                    <path d="M 20 30 l 5 -12 l 7 8 l 16 0 l 7 -8 l 5 12 c 1 8 -1 16 -8 16 l -24 0 c -7 0 -9 -8 -8 -16 z" fill="none" />
                    <circle cx="28" cy="28" r="1.5" />
                    <circle cx="44" cy="28" r="1.5" />
                    <path d="M 34 33 l 4 0 l -2 3 z" />
                    
                    {/* Bone */}
                    <path d="M 110 40 c -4 -4 -10 0 -8 4 l 20 20 c 4 -2 8 -8 4 -12 c -2 -2 -8 0 -8 4 l -6 -6 c -4 -4 -10 0 -8 4 z" fill="none" transform="rotate(15 120 50)" />
                    
                    {/* Paw Print */}
                    <path d="M 40 110 c 0 -6 8 -10 12 -10 s 12 4 12 10 c 0 4 -4 8 -12 8 s -12 -4 -12 -8 z" fill="none" />
                    <circle cx="42" cy="94" r="3.5" />
                    <circle cx="52" cy="88" r="3.5" />
                    <circle cx="64" cy="88" r="3.5" />
                    <circle cx="74" cy="94" r="3.5" />
                    
                    {/* Cute Bird */}
                    <path d="M 120 110 c 5 -5 12 -5 16 0 c 4 -5 11 -5 16 0 c -2 -8 -10 -12 -16 -4 c -6 -8 -14 -4 -16 4 z" fill="none" transform="rotate(-10 135 115)" />
                </>
            );
        case "doodle-space":
            return (
                <>
                    {/* Rocket */}
                    <path d="M 35 20 c 0 0 5 -8 10 -8 s 10 8 10 8 l 0 25 l -20 0 z M 30 45 l 5 -5 l 0 10 z M 60 45 l -5 -5 l 0 10 z M 40 50 l 3 6 l 4 -6 l 3 6" fill="none" transform="rotate(25 45 35)" />
                    <circle cx="45" cy="30" r="3" />

                    {/* Saturn */}
                    <circle cx="120" cy="40" r="10" fill="none" />
                    <ellipse cx="120" cy="40" rx="18" ry="4" fill="none" transform="rotate(-15 120 40)" />

                    {/* UFO */}
                    <path d="M 45 105 a 10 10 0 0 1 20 0 M 35 112 a 6 3 0 0 1 40 0 L 70 118 L 40 118 z" fill="none" />
                    
                    {/* Sparkle Star */}
                    <path d="M 120 100 l 2 6 l 6 2 l -6 2 l -2 6 l -2 -6 l -6 -2 l 6 -2 z" fill="none" />
                    <circle cx="140" cy="90" r="1.5" />
                    <circle cx="95" cy="115" r="1" />
                </>
            );
        case "doodle-science":
            return (
                <>
                    {/* Flask */}
                    <path d="M 40 15 l 10 0 M 45 15 l 0 15 l -12 20 a 5 5 0 0 0 4 8 l 26 0 a 5 5 0 0 0 4 -8 l -12 -20 l 0 -15 z M 38 42 l 14 0" fill="none" transform="rotate(-10 45 35)" />
                    
                    {/* Atom */}
                    <circle cx="120" cy="40" r="4" fill="none" />
                    <ellipse cx="120" cy="40" rx="16" ry="5" fill="none" transform="rotate(30 120 40)" />
                    <ellipse cx="120" cy="40" rx="16" ry="5" fill="none" transform="rotate(-30 120 40)" />
                    
                    {/* Math Triangle */}
                    <path d="M 30 115 l 20 -30 l 20 30 z" fill="none" />
                    <path d="M 60 90 L 70 90 M 65 85 L 65 95" />
                    
                    {/* E=mc2 */}
                    <text x="100" y="110" className="font-mono text-[11px]" fill="none" stroke="currentColor" strokeWidth="0.8">E=mc²</text>
                    <path d="M 105 85 c 2 -4 8 -4 10 0" fill="none" />
                    <text x="115" y="88" className="font-mono text-[9px]" fill="none" stroke="currentColor" strokeWidth="0.6">√x</text>
                </>
            );
        case "doodle-love":
            return (
                <>
                    {/* Heart with wings */}
                    <path d="M 45 35 c -6 -8 -18 -4 -18 6 c 0 10 18 20 18 20 c 0 0 18 -10 18 -20 c 0 -10 -12 -14 -18 -6 z" fill="none" />
                    <path d="M 27 38 c -6 -2 -12 2 -12 8 c 0 6 6 6 10 2 M 63 38 c 6 -2 12 2 12 8 c 0 6 -6 6 -10 2" fill="none" />

                    {/* Butterfly */}
                    <path d="M 120 40 c 0 -8 -10 -8 -10 0 c 0 8 10 8 10 0 z M 120 40 c 0 -8 10 -8 10 0 c 0 8 -10 8 -10 0 z M 120 40 l 0 12 M 120 40 l -3 -8 M 120 40 l 3 -8" fill="none" transform="rotate(15 120 40)" />

                    {/* LOVE Banner */}
                    <path d="M 25 105 l 40 0 M 25 115 l 40 0 M 25 105 c -5 2 -5 8 0 10 M 65 105 c 5 2 5 8 0 10" fill="none" />
                    <text x="32" y="113" className="font-semibold text-[8px]" fill="none" stroke="currentColor" strokeWidth="0.6">LOVE</text>

                    {/* Small Hearts */}
                    <path d="M 125 100 c -3 -4 -8 -2 -8 2 c 0 4 8 8 8 8 c 0 0 8 -4 8 -8 c 0 -4 -5 -6 -8 -2 z" fill="none" />
                    <circle cx="105" cy="95" r="1" />
                    <circle cx="138" cy="115" r="1.5" />
                </>
            );
        case "doodle-magic":
            return (
                <>
                    {/* Wizard Hat */}
                    <path d="M 30 45 l 15 -30 l 15 30 l 10 3 c -10 5 -40 5 -50 3 z" fill="none" transform="rotate(-10 45 35)" />
                    <path d="M 37 40 c 5 2 11 2 16 0" fill="none" />

                    {/* Crescent Moon */}
                    <path d="M 125 25 a 12 12 0 0 1 0 20 a 10 10 0 0 0 0 -20 z" fill="none" transform="rotate(15 125 35)" />
                    <path d="M 105 30 l 1 3 l 3 1 l -3 1 l -1 3 l -1 -3 l -3 -1 l 3 -1 z" fill="none" />

                    {/* Potion Bottle */}
                    <path d="M 40 90 l 10 0 M 45 90 l 0 10 l -10 15 a 4 4 0 0 0 4 6 l 12 0 a 4 4 0 0 0 4 -6 l -10 -15 z" fill="none" />
                    <circle cx="45" cy="112" r="2" />

                    {/* Lightning bolt */}
                    <path d="M 125 90 l -10 15 l 8 0 l -10 15 l 18 -18 l -8 0 z" fill="none" />
                    <circle cx="105" cy="105" r="1" />
                </>
            );
        case "doodle-gaming":
            return (
                <>
                    {/* Game Controller */}
                    <rect x="25" y="20" width="35" height="22" rx="8" fill="none" transform="rotate(10 42 31)" />
                    <path d="M 33 31 l 6 0 M 36 28 l 0 6 M 50 31 a 2 2 0 1 1 0 -0.1 M 55 29 a 2 2 0 1 1 0 -0.1" fill="none" transform="rotate(10 42 31)" />

                    {/* Ghost */}
                    <path d="M 115 35 c 0 -8 16 -8 16 0 l 0 15 l -4 -3 l -4 3 l -4 -3 l -4 3 z" fill="none" />
                    <circle cx="120" cy="38" r="1.5" />
                    <circle cx="126" cy="38" r="1.5" />

                    {/* Arcade */}
                    <path d="M 30 118 l 0 -25 l 6 -8 l 18 0 l 6 8 l 0 25 M 36 93 l 18 0 M 33 105 l 24 0" fill="none" />
                    <circle cx="40" cy="101" r="1.5" />

                    {/* Coins */}
                    <circle cx="125" cy="100" r="7" fill="none" />
                    <path d="M 125 96 l 0 8" fill="none" />
                </>
            );
        case "doodle-winter":
            return (
                <>
                    {/* Snowflake */}
                    <path d="M 45 15 l 0 30 M 30 30 l 30 0 M 34 19 l 22 22 M 34 41 l 22 -22" fill="none" />
                    <path d="M 45 20 l 3 -3 M 45 20 l -3 -3 M 45 40 l 3 3 M 45 40 l -3 3 M 35 30 l -3 -3 M 35 30 l -3 3 M 55 30 l 3 -3 M 55 30 l 3 3" fill="none" />

                    {/* Pine Tree */}
                    <path d="M 120 20 l 12 15 l -6 0 l 9 12 l -27 0 l 9 -12 l -6 0 z M 120 47 l 0 8" fill="none" />

                    {/* Snowman */}
                    <circle cx="120" cy="100" r="6" fill="none" />
                    <circle cx="120" cy="112" r="9" fill="none" />
                    <path d="M 115 97 l 10 0 M 117 97 l 3 -7" fill="none" />
                </>
            );
        case "doodle-ocean":
            return (
                <>
                    {/* Fish */}
                    <path d="M 25 35 c 12 -8 24 0 28 5 l 8 -5 l -2 5 l 2 5 l -8 -5 c -4 5 -16 13 -28 5 z" fill="none" transform="rotate(15 40 40)" />
                    <circle cx="34" cy="38" r="1" />

                    {/* Starfish */}
                    <path d="M 120 20 l 3 8 l 8 1 l -6 6 l 2 8 l -7 -4 l -7 4 l 2 -8 l -6 -6 l 8 -1 z" fill="none" transform="rotate(-15 120 30)" />

                    {/* Shell */}
                    <path d="M 45 95 c -10 0 -15 12 0 15 c 15 -3 10 -15 0 -15 M 45 95 l -3 15 M 45 95 l 3 15" fill="none" />

                    {/* Waves */}
                    <path d="M 105 105 c 5 -3 10 -3 15 0 s 10 3 15 0" fill="none" />
                </>
            );
        case "doodle-cozy":
            return (
                <>
                    {/* Mug */}
                    <rect x="30" y="22" width="20" height="20" rx="4" fill="none" />
                    <path d="M 50 27 c 4 0 6 2 6 5 s -2 5 -6 5" fill="none" />
                    <path d="M 35 15 c 1 -2 3 -2 4 0 s 3 2 4 0" fill="none" />

                    {/* Candle */}
                    <rect x="110" y="32" width="16" height="20" rx="2" fill="none" />
                    <path d="M 118 32 l 0 -4 c 0 -3 2 -4 0 -7 c -2 3 0 7 0 11" fill="none" />

                    {/* Clock */}
                    <circle cx="120" cy="105" r="10" fill="none" />
                    <path d="M 120 105 l 0 -6 M 120 105 l 5 4" fill="none" />
                </>
            );
        case "doodle-aura":
            return (
                <>
                    {/* Shapes */}
                    <path d="M 40 25 C 50 15, 60 35, 50 45 C 40 55, 30 35, 40 25 Z" fill="none" />
                    <path d="M 120 30 L 135 45 M 135 30 L 120 45" />
                    <circle cx="45" cy="100" r="10" fill="none" />
                </>
            );
        default:
            return null;
    }
};

const getDoodleTheme = (type: string, isDarkMode: boolean) => {
    switch (type) {
        case "doodle-google":
            return {
                bg: isDarkMode ? "bg-black" : "bg-[#f8f9fa]",
                color: isDarkMode ? "#3c4043" : "#dadce0",
                overlay: "bg-transparent"
            };
        case "doodle-zoo":
            return {
                bg: isDarkMode ? "bg-black" : "bg-white",
                color: isDarkMode ? "#fbbf24" : "#d97706",
                overlay: isDarkMode ? "bg-black/35" : "bg-white/5"
            };
        case "doodle-space":
            return {
                bg: isDarkMode ? "bg-black" : "bg-white",
                color: isDarkMode ? "#38bdf8" : "#0284c7",
                overlay: isDarkMode ? "bg-black/40" : "bg-white/5"
            };
        case "doodle-science":
            return {
                bg: isDarkMode ? "bg-black" : "bg-white",
                color: isDarkMode ? "#34d399" : "#059669",
                overlay: isDarkMode ? "bg-black/35" : "bg-white/5"
            };
        case "doodle-love":
            return {
                bg: isDarkMode ? "bg-black" : "bg-white",
                color: isDarkMode ? "#f472b6" : "#db2777",
                overlay: isDarkMode ? "bg-black/35" : "bg-white/5"
            };
        case "doodle-magic":
            return {
                bg: isDarkMode ? "bg-black" : "bg-white",
                color: isDarkMode ? "#818cf8" : "#4f46e5",
                overlay: isDarkMode ? "bg-black/40" : "bg-white/5"
            };
        case "doodle-gaming":
            return {
                bg: isDarkMode ? "bg-black" : "bg-white",
                color: isDarkMode ? "#a78bfa" : "#7c3aed",
                overlay: isDarkMode ? "bg-black/35" : "bg-white/5"
            };
        case "doodle-winter":
            return {
                bg: isDarkMode ? "bg-black" : "bg-white",
                color: isDarkMode ? "#2dd4bf" : "#0d9488",
                overlay: isDarkMode ? "bg-black/35" : "bg-white/5"
            };
        case "doodle-ocean":
            return {
                bg: isDarkMode ? "bg-black" : "bg-white",
                color: isDarkMode ? "#60a5fa" : "#2563eb",
                overlay: isDarkMode ? "bg-black/40" : "bg-white/5"
            };
        case "doodle-cozy":
            return {
                bg: isDarkMode ? "bg-black" : "bg-white",
                color: isDarkMode ? "#fb923c" : "#ea580c",
                overlay: isDarkMode ? "bg-black/35" : "bg-white/5"
            };
        case "doodle-aura":
            return {
                bg: isDarkMode ? "bg-black" : "bg-white",
                color: isDarkMode ? "#f43f5e" : "#e11d48",
                overlay: isDarkMode ? "bg-black/30" : "bg-white/5"
            };
        default:
            return {
                bg: "bg-[var(--card)]",
                color: "#94a3b8",
                overlay: "bg-transparent"
            };
    }
};

const getDoodleGlowColors = (type: string) => {
    switch (type) {
        case "doodle-google":
            return {
                blob1: "bg-transparent",
                blob2: "bg-transparent",
                blob3: "bg-transparent",
            };
        case "doodle-zoo":
            return {
                blob1: "bg-[#fbbf24]", // Gold/Amber
                blob2: "bg-[#10b981]", // Emerald
                blob3: "bg-[#a3e635]", // Lime
            };
        case "doodle-space":
            return {
                blob1: "bg-[#06b6d4]", // Cyan
                blob2: "bg-[#8b5cf6]", // Violet
                blob3: "bg-[#3b82f6]", // Blue
            };
        case "doodle-science":
            return {
                blob1: "bg-[#84cc16]", // Lime
                blob2: "bg-[#10b981]", // Emerald
                blob3: "bg-[#06b6d4]", // Cyan
            };
        case "doodle-love":
            return {
                blob1: "bg-[#ec4899]", // Magenta
                blob2: "bg-[#6366f1]", // Indigo
                blob3: "bg-[#f43f5e]", // Rose
            };
        case "doodle-magic":
            return {
                blob1: "bg-[#8b5cf6]", // Violet
                blob2: "bg-[#d946ef]", // Fuchsia
                blob3: "bg-[#6366f1]", // Indigo
            };
        case "doodle-gaming":
            return {
                blob1: "bg-[#a855f7]", // Purple
                blob2: "bg-[#06b6d4]", // Cyan
                blob3: "bg-[#fbbf24]", // Amber
            };
        case "doodle-winter":
            return {
                blob1: "bg-[#14b8a6]", // Mint/Teal
                blob2: "bg-[#3b82f6]", // Blue
                blob3: "bg-[#06b6d4]", // Cyan
            };
        case "doodle-ocean":
            return {
                blob1: "bg-[#2563eb]", // Deep Blue
                blob2: "bg-[#06b6d4]", // Cyan
                blob3: "bg-[#6366f1]", // Indigo
            };
        case "doodle-cozy":
            return {
                blob1: "bg-[#f97316]", // Neon Orange
                blob2: "bg-[#ef4444]", // Red/Rose
                blob3: "bg-[#fbbf24]", // Yellow
            };
        case "doodle-aura":
        default:
            return {
                blob1: "bg-[#f43f5e]", // Bright Rose
                blob2: "bg-[#8b5cf6]", // Deep Violet
                blob3: "bg-[#ec4899]", // Magenta
            };
    }
};

const GlowingDoodleBackground = ({ type, isDarkMode, preview = false }: { type: string; isDarkMode: boolean; preview?: boolean }) => {
    const theme = getDoodleTheme(type, isDarkMode);
    const glows = getDoodleGlowColors(type);
    
    const getRadialGradient = () => {
        const c1 = glows.blob1.replace("bg-[", "").replace("]", "");
        const c2 = glows.blob2.replace("bg-[", "").replace("]", "");
        return isDarkMode 
            ? `radial-gradient(circle at 50% 50%, ${c1}33 0%, ${c2}15 70%, #000000 100%)`
            : `radial-gradient(circle at 50% 50%, ${c1}12 0%, ${c2}08 80%, #ffffff 100%)`;
    };

    return (
        <div 
            className={clsx("absolute inset-0 overflow-hidden", theme.bg)}
            style={preview ? { backgroundImage: getRadialGradient() } : undefined}
        >
            {!preview && (
                <>
                    {/* Ambient Floating Glow Blobs */}
                    <div className={clsx(
                        "absolute top-[-15%] left-[-15%] w-[60%] h-[60%] rounded-full filter blur-[50px] md:blur-[75px] transition-all duration-1000 pointer-events-none",
                        isDarkMode 
                            ? "opacity-80 mix-blend-screen animate-blob-1" 
                            : "opacity-25 mix-blend-multiply animate-blob-1",
                        glows.blob1
                    )} />
                    <div className={clsx(
                        "absolute bottom-[-15%] right-[-15%] w-[65%] h-[65%] rounded-full filter blur-[55px] md:blur-[80px] transition-all duration-1000 pointer-events-none",
                        isDarkMode 
                            ? "opacity-75 mix-blend-screen animate-blob-2" 
                            : "opacity-20 mix-blend-multiply animate-blob-2",
                        glows.blob2
                    )} />
                    <div className={clsx(
                        "absolute top-[25%] right-[-20%] w-[55%] h-[55%] rounded-full filter blur-[50px] md:blur-[70px] transition-all duration-1000 pointer-events-none",
                        isDarkMode 
                            ? "opacity-70 mix-blend-screen animate-blob-3" 
                            : "opacity-20 mix-blend-multiply animate-blob-3",
                        glows.blob3
                    )} />

                    {/* Extra subtle base gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/5 via-transparent to-pink-500/5 dark:from-sky-950/10 dark:to-pink-950/10 pointer-events-none" />
                </>
            )}
            
            {!preview && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ color: theme.color }}>
                    <defs>
                        <pattern id={`pat-${type}`} x="0" y="0" width="160" height="160" patternUnits="userSpaceOnUse">
                            <g 
                                stroke="currentColor" 
                                strokeWidth="1.2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                                fill="none"
                                className="opacity-30 dark:opacity-55"
                                style={{ filter: "drop-shadow(0 0 3px currentColor) drop-shadow(0 0 1px currentColor)" }}
                            >
                                {renderDoodles(type)}
                            </g>
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill={`url(#pat-${type})`} />
                </svg>
            )}
            {!preview && <div className={clsx("absolute inset-0 pointer-events-none", theme.overlay)} />}
        </div>
    );
};

const WALLPAPERS: { [key: string]: string } = {
    default: "bg-[var(--card)]",
    gradient1: "bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-950/40 dark:to-pink-950/40",
    gradient2: "bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-950/40 dark:to-cyan-950/40",
    gradient3: "bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-950/40 dark:to-emerald-950/40",
    gradient4: "bg-gradient-to-br from-indigo-200 to-purple-200 dark:from-indigo-950/40 dark:to-purple-950/40",
    gradient5: "bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/20 dark:from-slate-950 dark:via-black dark:to-amber-950/40",
    solid1: "bg-gray-100 dark:bg-zinc-900",
};

const getBubbleTheme = (isMe: boolean, chatTheme: string | undefined, wallpaper: string | undefined, globalTheme: string | undefined) => {
    let themeKey = chatTheme || "default";

    // Fall back to whatsapp bubble style if global theme is whatsapp and bubble theme is default
    if (themeKey === "default" && globalTheme === "whatsapp") {
        themeKey = "whatsapp";
    }
    
    // Fall back to preset wallpaper if theme is default and wallpaper is a preset ID
    if (themeKey === "default" && wallpaper && WALLPAPERS[wallpaper] && wallpaper !== "default" && wallpaper !== "gradient3") {
        themeKey = wallpaper;
    }
    
    const wp = wallpaper || "default";
    const resolvedWp = wp;
    const isImage = resolvedWp.startsWith("data:") || 
                    resolvedWp.startsWith("http") || 
                    resolvedWp.startsWith("blob:") || 
                    resolvedWp.startsWith("/");
    const isMesh = resolvedWp.startsWith("mesh-");
    const isDoodle = resolvedWp.startsWith("doodle-");
    
    if ((isImage || isMesh || isDoodle) && themeKey === "default") {
        return {
            bg: isMe 
                ? "bg-[#d9fdd3]/90 dark:bg-[#005c4b]/95 backdrop-blur-md text-[#111b21] dark:text-[#e9edef] border border-white/10" 
                : "bg-white/80 dark:bg-[#202c33]/85 backdrop-blur-md text-[#111b21] dark:text-[#e9edef] border border-black/5 dark:border-white/5",
            readTick: "text-[#34b7f1] dark:text-[#53bdeb]",
            unreadTick: isMe ? "text-[#8696a0]" : "text-black/40 dark:text-white/40",
            replyBg: isMe ? "bg-[#cfe9ba]/90 dark:bg-[#025141]/90 border-[#00a884]" : "bg-[#f0f2f5]/90 dark:bg-[#2a3942]/90 border-[#00a884]",
            replyText: isMe ? "text-[#54656f] dark:text-[#aebac1]" : "text-[#00a884]",
            replyHeader: isMe ? "text-[#008069] dark:text-[#00c89a]" : "text-[#00a884]"
        };
    }

    switch (themeKey) {
        case "classic-blue":
            return {
                bg: isMe
                    ? "bg-[#007AFF] text-white shadow-sm"
                    : "bg-[#e5e5ea] dark:bg-[#202c33] text-black dark:text-[#e9edef] shadow-sm border border-transparent",
                readTick: "text-sky-300",
                unreadTick: "text-white/60",
                replyBg: isMe ? "bg-white/20 border-white/60" : "bg-[#d1d1d6] dark:bg-[#2a3942] border-[#007AFF]",
                replyText: isMe ? "text-white/80" : "text-[#007AFF]",
                replyHeader: isMe ? "text-white font-bold" : "text-[#007AFF]"
            };
        case "whatsapp":
            return {
                bg: isMe
                    ? "bg-[#d9fdd3] text-[#111b21] dark:bg-[#005c4b] dark:text-[#e9edef] shadow-sm border border-transparent"
                    : "bg-white text-[#111b21] dark:bg-[#202c33] dark:text-[#e9edef] shadow-sm border border-transparent",
                readTick: "text-[#34b7f1] dark:text-[#53bdeb]",
                unreadTick: "text-[#8696a0]",
                replyBg: isMe ? "bg-[#cfe9ba] dark:bg-[#025141] border-[#00a884]" : "bg-[#f0f2f5] dark:bg-[#2a3942] border-[#00a884]",
                replyText: isMe ? "text-[#54656f] dark:text-[#aebac1]" : "text-[#00a884]",
                replyHeader: isMe ? "text-[#008069] dark:text-[#00c89a]" : "text-[#00a884]"
            };
        case "whatsapp-green":
            return {
                bg: isMe
                    ? "bg-[#008069] text-white dark:bg-[#005c4b] dark:text-[#e9edef] shadow-sm border border-transparent"
                    : "bg-white text-[#111b21] dark:bg-[#202c33] dark:text-[#e9edef] shadow-sm border border-transparent",
                readTick: "text-[#34b7f1] dark:text-[#53bdeb]",
                unreadTick: isMe ? "text-white/60 dark:text-[#8696a0]" : "text-[#8696a0]",
                replyBg: isMe ? "bg-[#005c4b]/50 dark:bg-[#025141]/50 border-emerald-500" : "bg-[#f0f2f5] dark:bg-[#2a3942] border-[#008069]",
                replyText: isMe ? "text-[#54656f] dark:text-[#aebac1]" : "text-[#008069]",
                replyHeader: isMe ? "text-[#d9fdd3] dark:text-[#00c89a]" : "text-[#008069]"
            };
        case "gradient1": // Sunset
            return {
                bg: isMe
                    ? "bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm shadow-rose-500/10"
                    : "bg-orange-50/95 dark:bg-orange-950/20 text-orange-950 dark:text-orange-200 border border-orange-100/50 dark:border-orange-900/30",
                readTick: "text-orange-200",
                unreadTick: "text-white/60",
                replyBg: isMe ? "bg-white/20 border-white/60" : "bg-orange-100/40 dark:bg-orange-950/40 border-rose-450",
                replyText: isMe ? "text-white/80" : "text-orange-900/85 dark:text-orange-350",
                replyHeader: isMe ? "text-white font-bold" : "text-orange-600 dark:text-orange-400"
            };
        case "gradient2": // Ocean
            return {
                bg: isMe
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm shadow-cyan-500/10"
                    : "bg-cyan-50/95 dark:bg-cyan-950/20 text-cyan-950 dark:text-cyan-200 border border-cyan-100/50 dark:border-cyan-900/30",
                readTick: "text-cyan-200",
                unreadTick: "text-white/60",
                replyBg: isMe ? "bg-white/20 border-white/60" : "bg-cyan-100/40 dark:bg-cyan-950/40 border-blue-450",
                replyText: isMe ? "text-white/80" : "text-cyan-900/85 dark:text-cyan-350",
                replyHeader: isMe ? "text-white font-bold" : "text-cyan-600 dark:text-cyan-400"
            };
        case "gradient3": // Forest
            return {
                bg: isMe
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm shadow-teal-500/10"
                    : "bg-emerald-50/95 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-200 border border-emerald-100/50 dark:border-emerald-900/30",
                readTick: "text-[#3cd2ff] dark:text-[#3cd2ff]",
                unreadTick: "text-white/60",
                replyBg: isMe ? "bg-white/20 border-white/60" : "bg-emerald-100/40 dark:bg-emerald-950/40 border-emerald-450",
                replyText: isMe ? "text-white/80" : "text-emerald-900/85 dark:text-emerald-350",
                replyHeader: isMe ? "text-white font-bold" : "text-emerald-600 dark:text-emerald-400"
            };
        case "gradient4": // Night
            return {
                bg: isMe
                    ? "bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-sm shadow-indigo-500/10"
                    : "bg-indigo-50/95 dark:bg-indigo-950/20 text-indigo-950 dark:text-indigo-200 border border-indigo-100/50 dark:border-indigo-900/30",
                readTick: "text-indigo-200",
                unreadTick: "text-white/60",
                replyBg: isMe ? "bg-white/20 border-white/60" : "bg-indigo-100/40 dark:bg-indigo-950/40 border-indigo-450",
                replyText: isMe ? "text-white/80" : "text-indigo-900/85 dark:text-indigo-350",
                replyHeader: isMe ? "text-white font-bold" : "text-indigo-600 dark:text-indigo-400"
            };
        case "gradient5": // Glow
            return {
                bg: isMe
                    ? "bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-sm shadow-orange-500/25 border border-amber-500/20"
                    : "bg-slate-900/90 dark:bg-slate-950/90 text-slate-100 border border-amber-500/20",
                readTick: "text-amber-400",
                unreadTick: "text-white/60",
                replyBg: isMe ? "bg-white/20 border-white/60" : "bg-amber-950/40 border-amber-500",
                replyText: isMe ? "text-white/80" : "text-amber-300",
                replyHeader: isMe ? "text-white font-bold" : "text-amber-500 dark:text-amber-400"
            };
        case "solid1": // Light Gray
            return {
                bg: isMe
                    ? "bg-zinc-700 dark:bg-zinc-800 text-white shadow-sm"
                    : "bg-zinc-150 dark:bg-zinc-900 text-zinc-950 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-800/80",
                readTick: "text-sky-300",
                unreadTick: "text-white/60",
                replyBg: isMe ? "bg-white/20 border-white/60" : "bg-zinc-200/40 dark:bg-zinc-800/40 border-zinc-500",
                replyText: isMe ? "text-white/80" : "text-zinc-650 dark:text-zinc-400",
                replyHeader: isMe ? "text-white font-bold" : "text-zinc-700 dark:text-zinc-300"
            };
        default: // default
            return {
                bg: isMe
                    ? "bg-[#d9fdd3] text-[#111b21] dark:bg-[#005c4b] dark:text-[#e9edef] shadow-sm border border-transparent"
                    : "bg-white text-[#111b21] dark:bg-[#202c33] dark:text-[#e9edef] shadow-sm border border-transparent",
                readTick: "text-[#34b7f1] dark:text-[#53bdeb]",
                unreadTick: isMe ? "text-[#8696a0]" : "text-black/40 dark:text-white/40",
                replyBg: isMe ? "bg-[#cfe9ba] dark:bg-[#025141] border-[#00a884]" : "bg-[#f0f2f5] dark:bg-[#2a3942] border-[#00a884]",
                replyText: isMe ? "text-[#54656f] dark:text-[#aebac1]" : "text-[#00a884]",
                replyHeader: isMe ? "text-[#008069] dark:text-[#00c89a]" : "text-[#00a884]"
            };
    }
};

function getMessageDateDividerString(createdAtString: string | undefined): string {
    if (!createdAtString) return "Today";
    
    try {
        const msgDate = new Date(createdAtString);
        if (isNaN(msgDate.getTime())) return "Today";
        const today = new Date();
        
        const isToday = msgDate.getDate() === today.getDate() &&
                        msgDate.getMonth() === today.getMonth() &&
                        msgDate.getFullYear() === today.getFullYear();
                        
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const isYesterday = msgDate.getDate() === yesterday.getDate() &&
                            msgDate.getMonth() === yesterday.getMonth() &&
                            msgDate.getFullYear() === yesterday.getFullYear();
                            
        if (isToday) return "Today";
        if (isYesterday) return "Yesterday";
        
        const diffTime = Math.abs(today.getTime() - msgDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 7) {
            return msgDate.toLocaleDateString("en-US", { weekday: "long" });
        }
        
        return msgDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } catch (e) { /* eslint-disable-line @typescript-eslint/no-unused-vars */
        return "Today";
    }
}

function getMessageBubbleTimeString(createdAtString: string | undefined, originalTimeString: string): string {
    if (!createdAtString) return originalTimeString;
    try {
        const date = new Date(createdAtString);
        if (isNaN(date.getTime())) return originalTimeString;
        return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch {
        return originalTimeString;
    }
}

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
}

function getWaveAmplitudes(msgId: string, count: number = 24): number[] {
    const amplitudes: number[] = [];
    let hash = 0;
    for (let i = 0; i < msgId.length; i++) {
        hash = msgId.charCodeAt(i) + ((hash << 5) - hash);
    }
    for (let i = 0; i < count; i++) {
        const wave = Math.abs(Math.sin((i / count) * Math.PI * 2.2));
        const noise = Math.abs(((hash >> (i % 16)) & 0xff) / 255);
        const height = Math.max(3, Math.min(24, 3 + wave * 14 + noise * 7));
        amplitudes.push(height);
    }
    return amplitudes;
}

function getSenderColor(senderId: string) {
    const colors = [
        "text-blue-500 dark:text-blue-400",
        "text-emerald-500 dark:text-emerald-400",
        "text-purple-500 dark:text-purple-400",
        "text-amber-500 dark:text-amber-400",
        "text-rose-500 dark:text-rose-400",
        "text-cyan-500 dark:text-cyan-400",
        "text-indigo-500 dark:text-indigo-400",
        "text-teal-500 dark:text-teal-400"
    ];
    let hash = 0;
    for (let i = 0; i < senderId.length; i++) {
        hash = senderId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
}
interface MediaMessageBubbleProps {
    msg: Message;
    isMe: boolean;
    theme: any;
    setFullscreenMedia: (media: { id: string; url: string; type: "image" | "video" }) => void;
}

function MediaMessageBubble({ msg, isMe, theme, setFullscreenMedia, isGrouped = false }: MediaMessageBubbleProps & { isGrouped?: boolean }) {
    const [localUrl, setLocalUrl] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

    // On mount, check if media is already cached in localforage
    useEffect(() => {
        let active = true;
        let objectUrlToRevoke: string | null = null;

        const checkCache = async () => {
            try {
                const cachedBlob = await localforage.getItem<Blob>(msg.id);
                if (cachedBlob && active) {
                    const url = URL.createObjectURL(cachedBlob);
                    objectUrlToRevoke = url;
                    setLocalUrl(url);
                }
            } catch (err) {
                console.error("Failed to read media from localforage:", err);
            }
        };

        checkCache();

        return () => {
            active = false;
            if (objectUrlToRevoke) {
                URL.revokeObjectURL(objectUrlToRevoke);
            }
        };
    }, [msg.id]);

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isDownloading || !msg.imageUrl) return;

        setIsDownloading(true);
        setDownloadProgress(0);

        try {
            // Perform standard fetch request
            const response = await fetch(msg.imageUrl);
            if (!response.ok) throw new Error("Network response was not ok");
            
            // Read stream to support progress
            const contentLength = response.headers.get("content-length");
            const total = contentLength ? parseInt(contentLength, 10) : 0;
            
            const reader = response.body?.getReader();
            if (!reader) {
                const blob = await response.blob();
                await localforage.setItem(msg.id, blob);
                const url = URL.createObjectURL(blob);
                setLocalUrl(url);
                setIsDownloading(false);
                return;
            }

            let loaded = 0;
            const chunks: Uint8Array[] = [];
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) {
                    chunks.push(value);
                    loaded += value.length;
                    if (total > 0) {
                        setDownloadProgress(Math.round((loaded / total) * 100));
                    }
                }
            }

            const blob = new Blob(chunks as any);
            await localforage.setItem(msg.id, blob);
            const url = URL.createObjectURL(blob);
            setLocalUrl(url);
        } catch (err) {
            console.error("Failed to download media:", err);
            alert("Failed to download media. Please try again.");
        } finally {
            setIsDownloading(false);
            setDownloadProgress(null);
        }
    };

    // Helper to get time string
    const timeStr = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (msg.time || "");

    // 1. If it's already downloaded and we have a local Object URL
    if (localUrl) {
        if (msg.type === "image") {
            return (
                <div 
                    className={clsx(
                        "relative cursor-pointer hover:opacity-95 transition-opacity block overflow-hidden animate-fade-in bg-zinc-200 dark:bg-zinc-800",
                        isGrouped ? "w-full h-full" : "rounded-2xl w-[260px] md:w-[320px] max-h-80 h-60 overflow-hidden self-start"
                    )}
                    onClick={() => setFullscreenMedia({ id: msg.id, url: localUrl, type: "image" })}
                >
                    <img src={localUrl} alt="Media content" className="w-full h-full object-cover block" />
                    {/* Timestamp overlay */}
                    {!isGrouped && (
                        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 text-white rounded-full px-2 py-0.5 backdrop-blur-sm text-[9px] pointer-events-none select-none">
                            <span>{timeStr}</span>
                            {isMe && (
                                msg.read ? <CheckCheck size={12} className={theme.readTick} /> : <Check size={12} className={theme.unreadTick} />
                            )}
                        </div>
                    )}
                </div>
            );
        } else {
            // Video type
            return (
                <div 
                    className={clsx(
                        "relative cursor-pointer hover:opacity-95 transition-opacity block overflow-hidden animate-fade-in bg-zinc-200 dark:bg-zinc-800",
                        isGrouped ? "w-full h-full" : "rounded-2xl w-[260px] md:w-[320px] max-h-80 h-60 overflow-hidden self-start"
                    )}
                    onClick={() => setFullscreenMedia({ id: msg.id, url: localUrl, type: "video" })}
                >
                    <video src={localUrl} className="w-full h-full object-cover block" muted playsInline />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                        <div className={clsx("rounded-full bg-white/95 dark:bg-zinc-900/95 flex items-center justify-center text-black dark:text-white shadow-md hover:scale-105 active:scale-95 transition-transform", isGrouped ? "w-10 h-10" : "w-12 h-12")}>
                            <Play size={isGrouped ? 16 : 20} className="ml-0.5 fill-current" />
                        </div>
                    </div>
                    {/* Timestamp overlay */}
                    {!isGrouped && (
                        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 text-white rounded-full px-2 py-0.5 backdrop-blur-sm text-[9px] pointer-events-none select-none">
                            <span>{timeStr}</span>
                            {isMe && (
                                msg.read ? <CheckCheck size={12} className={theme.readTick} /> : <Check size={12} className={theme.unreadTick} />
                            )}
                        </div>
                    )}
                </div>
            );
        }
    }

    // 2. If it's NOT downloaded yet, render blurred thumbnail placeholder with download overlay
    const placeholderSrc = msg.thumbnail || msg.imageUrl || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100%' height='100%' fill='%23e2e8f0'/></svg>";

    return (
        <div className={clsx(
            "relative overflow-hidden select-none bg-zinc-200 dark:bg-zinc-800",
            isGrouped ? "w-full h-full" : "rounded-2xl w-[260px] md:w-[320px] max-h-80 h-60 overflow-hidden self-start"
        )}>
            {/* Blurred placeholder image */}
            <img 
                src={placeholderSrc} 
                alt="Blurred placeholder" 
                className="w-full h-full object-cover filter blur-[4px] scale-110 opacity-75 select-none pointer-events-none"
                loading="lazy"
            />
            
            {/* Center Download Action */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 select-none">
                <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className={clsx("rounded-full bg-black/60 hover:bg-black/75 text-white flex flex-col items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 duration-150 border border-white/10", isGrouped ? "w-10 h-10" : "w-14 h-14")}
                >
                    {isDownloading ? (
                        <RotateCw size={isGrouped ? 18 : 22} className="animate-spin text-white" />
                    ) : (
                        <Download size={isGrouped ? 18 : 22} className="text-white" />
                    )}
                </button>
                <span className="text-white text-[9px] md:text-[10px] font-medium tracking-wide mt-2 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm shadow-sm select-none">
                    {isDownloading 
                        ? (downloadProgress !== null ? `${downloadProgress}%` : "...")
                        : (msg.fileSize || "Download")
                    }
                </span>
            </div>

            {/* Video overlay icon if video */}
            {msg.type === "video" && !isDownloading && (
                <div className="absolute top-2 left-2 bg-black/55 text-white px-2 py-0.5 rounded-md text-[9px] font-semibold tracking-wider uppercase select-none pointer-events-none">
                    Video
                </div>
            )}

            {/* Timestamp overlay */}
            {!isGrouped && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 text-white rounded-full px-2 py-0.5 backdrop-blur-sm text-[9px] pointer-events-none select-none">
                    <span>{timeStr}</span>
                    {isMe && (
                        msg.read ? <CheckCheck size={12} className={theme.readTick} /> : <Check size={12} className={theme.unreadTick} />
                    )}
                </div>
            )}
        </div>
    );
}

interface MediaGroupBubbleProps {
    msg: {
        id: string;
        type: "media-group";
        sender: string;
        senderId: string;
        createdAt: string;
        time: string;
        read: boolean;
        messages: Message[];
    };
    isMe: boolean;
    theme: any;
    setFullscreenMedia: (media: { id: string; url: string; type: "image" | "video" }) => void;
}

function MediaGroupBubble({ msg, isMe, theme, setFullscreenMedia }: MediaGroupBubbleProps) {
    const hasMoreThanFour = msg.messages.length > 4;
    const displayMessages = hasMoreThanFour ? msg.messages.slice(0, 3) : msg.messages.slice(0, 4);
    const remainingCount = msg.messages.length - 3;
    const timeStr = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (msg.time || "");

    const [uncachedIds, setUncachedIds] = useState<string[]>([]);
    const [isGroupDownloading, setIsGroupDownloading] = useState(false);
    const [groupDownloadProgress, setGroupDownloadProgress] = useState<number | null>(null);

    // Check which images are uncached in IndexedDB
    useEffect(() => {
        let active = true;
        const checkCache = async () => {
            const uncached: string[] = [];
            for (const m of msg.messages) {
                const cached = await localforage.getItem(m.id);
                if (!cached) {
                    uncached.push(m.id);
                }
            }
            if (active) {
                setUncachedIds(uncached);
            }
        };
        checkCache();
    }, [msg.messages]);

    // Hidden uncached are those at index >= 3
    const hiddenUncached = uncachedIds.filter(id => {
        const idx = msg.messages.findIndex(m => m.id === id);
        return idx >= 3;
    });

    const downloadRemaining = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isGroupDownloading || hiddenUncached.length === 0) return;
        setIsGroupDownloading(true);
        setGroupDownloadProgress(0);

        try {
            let doneCount = 0;
            for (const id of hiddenUncached) {
                const m = msg.messages.find(item => item.id === id);
                if (!m || !m.imageUrl) continue;
                const res = await fetch(m.imageUrl);
                if (res.ok) {
                    const blob = await res.blob();
                    await localforage.setItem(id, blob);
                }
                doneCount++;
                setGroupDownloadProgress(Math.round((doneCount / hiddenUncached.length) * 100));
            }
            // Update local state
            const remainingUncached = uncachedIds.filter(id => !hiddenUncached.includes(id));
            setUncachedIds(remainingUncached);
        } catch (err) {
            console.error("Group download failed:", err);
            alert("Failed to download remaining media. Please try again.");
        } finally {
            setIsGroupDownloading(false);
            setGroupDownloadProgress(null);
        }
    };

    return (
        <div className="relative p-1 bg-transparent select-none w-[340px] h-[340px] md:w-[440px] md:h-[440px] max-w-full">
            <div className="grid grid-cols-2 grid-rows-2 gap-0.5 w-full h-full overflow-hidden rounded-2xl">
                {displayMessages.map((m) => (
                    <div key={m.id} className="relative w-full h-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                        <MediaMessageBubble
                            msg={m}
                            isMe={isMe}
                            theme={theme}
                            setFullscreenMedia={setFullscreenMedia}
                            isGrouped={true}
                        />
                    </div>
                ))}
                
                {hasMoreThanFour && (
                    <div 
                        onClick={hiddenUncached.length > 0 ? downloadRemaining : () => {
                            const m4 = msg.messages[3];
                            setFullscreenMedia({ id: m4.id, url: m4.imageUrl || "", type: m4.type as "image" | "video" });
                        }}
                        className="relative w-full h-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 select-none cursor-pointer z-10"
                    >
                        <MediaMessageBubble
                            msg={msg.messages[3]}
                            isMe={isMe}
                            theme={theme}
                            setFullscreenMedia={() => {}}
                            isGrouped={true}
                        />
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
                            {isGroupDownloading ? (
                                <>
                                    <RotateCw size={22} className="animate-spin text-white" />
                                    <span className="text-[10px] font-semibold tracking-wider text-white mt-1">{groupDownloadProgress}%</span>
                                </>
                            ) : hiddenUncached.length > 0 ? (
                                <>
                                    <Download size={22} className="text-white" />
                                    <span className="text-[10px] font-semibold text-center tracking-wide text-white mt-1">Download +{remainingCount}</span>
                                </>
                            ) : (
                                <span className="text-lg md:text-xl font-bold text-white">+ {remainingCount}</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
            
            {/* Unified timestamp overlay at bottom-right of whole media group */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/50 text-white rounded-full px-2 py-0.5 backdrop-blur-sm text-[9px] pointer-events-none select-none z-10">
                <span>{timeStr}</span>
                {isMe && (
                    msg.read ? <CheckCheck size={12} className={theme.readTick} /> : <Check size={12} className={theme.unreadTick} />
                )}
            </div>
        </div>
    );
}

export default function ChatThreadView({ threadId, onClose }: { threadId: string | null; onClose: () => void }) {
    const { threads, archivedThreads, currentUser, allDatingUsers, marketplaceItems = [], rides = [], updateMarketplaceListing, sendMessage, editMessage, deleteMessage, votePoll, addNotification, deleteThread, addReaction, removeReaction, markThreadRead, clearChat, archiveChat, muteChat, blockUser, reportUser, isProfileLoaded, togglePinThread, callLogs, setActiveThreadId, startDirectChat, leaveGroup, removeUserFromGroup, addUsersToGroup, sendIcebreaker, acceptThread, declineRequest, requests } = useMockData();
    const { initiateCall } = useCall();

    const [currentThreadId, setCurrentThreadId] = useState<string | null>(() => threadId);
    const [prevThreadId, setPrevThreadId] = useState<string | null>(() => threadId);

    // Sync prop to state synchronously during render to render the chatroom content immediately in the first pass
    if (threadId !== prevThreadId) {
        setPrevThreadId(threadId);
        if (threadId) {
            setCurrentThreadId(threadId);
        }
    }

    const id = threadId || currentThreadId;
    const thread = (threads || []).find((t) => t.id === id) || (archivedThreads || []).find((t: any) => t.id === id);
    const isCreator = thread?.isGroup 
        ? (thread.adminIds && thread.adminIds.length > 0 ? thread.adminIds : [thread.creatorId || thread.initiatedBy || ""]).includes(currentUser?.id || "")
        : false;

    const isFromMarketplace = !!(thread && isMarketplaceThread(thread)) || (typeof window !== "undefined" && (new URLSearchParams(window.location.search).get("from") === "marketplace" || new URLSearchParams(window.location.search).get("from") === "rides"));
    const fromParamValue = isFromMarketplace ? "marketplace" : "chat";

    // Marketplace item associated with this chat thread
    const marketplaceItem = useMemo(() => {
        if (!thread) return null;
        if ((thread as any).marketplaceItemId) {
            const found = (marketplaceItems || []).find(i => i.id === (thread as any).marketplaceItemId);
            if (found) return found;
        }
        if (thread.id.startsWith("mkt_")) {
            const parts = thread.id.split("_");
            if (parts.length >= 4) {
                const potentialItemId = parts.slice(3).join("_");
                const found = (marketplaceItems || []).find(i => i.id === potentialItemId);
                if (found) return found;
            }
        }
        const reversedMessages = [...(thread.messages || [])].reverse();
        for (const m of reversedMessages) {
            if (m.replyTo?.id) {
                const found = (marketplaceItems || []).find(i => i.id === m.replyTo?.id);
                if (found) return found;
            }
            if (m.replyTo?.text?.includes("Marketplace Listing:")) {
                const titlePart = m.replyTo.text.replace("Marketplace Listing:", "").split("(")[0].trim();
                const found = (marketplaceItems || []).find(i => i.title.toLowerCase() === titlePart.toLowerCase());
                if (found) return found;
            }
        }
        if (thread.lastMessage?.includes("Marketplace Listing:")) {
            const titlePart = thread.lastMessage.replace("Marketplace Listing:", "").split("(")[0].trim();
            const found = (marketplaceItems || []).find(i => i.title.toLowerCase() === titlePart.toLowerCase());
            if (found) return found;
        }
        if (isFromMarketplace) {
            const sellerListings = (marketplaceItems || []).filter(i => i.sellerId === thread.user.id || i.sellerName?.toLowerCase() === thread.user.name.toLowerCase());
            if (sellerListings.length > 0) return sellerListings[0];
        }
        return null;
    }, [thread, marketplaceItems, isFromMarketplace]);

    // Store catalogue for continuous feed scrolling modal
    const sellerStoreItems = useMemo(() => {
        if (!marketplaceItem && !thread?.user?.id) return [];
        const sid = marketplaceItem?.sellerId || thread?.user?.id;
        return (marketplaceItems || []).filter(i => i.sellerId === sid || (marketplaceItem?.sellerName && i.sellerName?.toLowerCase() === marketplaceItem.sellerName.toLowerCase()));
    }, [marketplaceItem, thread?.user?.id, marketplaceItems]);

    const isCurrentUserSeller = !!(marketplaceItem && (
        currentUser?.id === marketplaceItem.sellerId || 
        marketplaceItem.sellerId === "me" ||
        (currentUser?.name && marketplaceItem.sellerName?.toLowerCase() === currentUser.name.toLowerCase())
    ));
    const [showSellerStatusMenu, setShowSellerStatusMenu] = useState(false);

    const [selectedMarketplaceItem, setSelectedMarketplaceItem] = useState<MarketplaceItem | null>(null);
    const [closingMarketplaceItem, setClosingMarketplaceItem] = useState<MarketplaceItem | null>(null);

    const liveSelectedMarketplaceItem = useMemo(() => {
        if (!selectedMarketplaceItem) return null;
        return (marketplaceItems || []).find(i => i.id === selectedMarketplaceItem.id) || selectedMarketplaceItem;
    }, [selectedMarketplaceItem, marketplaceItems]);

    const handleCloseMarketplaceItem = () => {
        if (!selectedMarketplaceItem || closingMarketplaceItem) {
            if (!selectedMarketplaceItem) setClosingMarketplaceItem(null);
            return;
        }
        const cur = selectedMarketplaceItem;
        setClosingMarketplaceItem(cur);
        setSelectedMarketplaceItem(null);
        setTimeout(() => {
            setClosingMarketplaceItem(null);
        }, 280);
    };

    const checkPrivacy = (targetUser: any /* eslint-disable-line @typescript-eslint/no-explicit-any */, settingKey: 'profilePicture' | 'feeds' | 'datingDetails') => {
        if (!targetUser || !currentUser) return true;
        if (targetUser.id === currentUser.id) return true;
        const settingValue = targetUser.settings?.privacy?.[settingKey] ?? "everyone";
        if (settingValue === "everyone") return true;
        if (settingValue === "contacts") {
            return currentUser.savedContactIds?.includes(targetUser.id) ?? false;
        }
        return false; // "nobody"
    };
    const [inputText, setInputText] = useState("");
    const [newlySentMessageIds, setNewlySentMessageIds] = useState<Set<string>>(new Set());

    // Seller storefront profile modal state for marketplace chats
    const [activeSellerStore, setActiveSellerStore] = useState<{
        id: string;
        name?: string;
        avatar?: string | null;
        location?: string;
    } | null>(null);
    const [closingSellerStore, setClosingSellerStore] = useState<{
        id: string;
        name?: string;
        avatar?: string | null;
        location?: string;
    } | null>(null);

    const handleCloseSellerStore = () => {
        if (!activeSellerStore || closingSellerStore) {
            if (!activeSellerStore) setClosingSellerStore(null);
            return;
        }
        const cur = activeSellerStore;
        setClosingSellerStore(cur);
        setActiveSellerStore(null);
        setTimeout(() => {
            setClosingSellerStore(null);
        }, 280);
    };

    const [showGroupProfile, setShowGroupProfile] = useState(false);
    const [selectedMember, setSelectedMember] = useState<any | null>(null);
    const [showConfirmLeaveGroup, setShowConfirmLeaveGroup] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<User | null>(null);
    const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
    const [mentionSearchQuery, setMentionSearchQuery] = useState("");
    const [mentionStartIndex, setMentionStartIndex] = useState(-1);

    useEffect(() => {
        setNewlySentMessageIds(new Set());
    }, [id]);
    const [hasMounted, setHasMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(() => {
        return !isProfileLoaded || (id && !thread) ? true : false;
    });

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        if (hasMounted && !isLoading) {
            if (thread?.isGroup && thread.groupMemberIds && !thread.groupMemberIds.includes(currentUser.id)) {
                onClose();
            }
        }
    }, [thread, hasMounted, isLoading, currentUser.id, onClose]);

    const [viewportStyle, setViewportStyle] = useState<React.CSSProperties>({});
    const [isTransitioning, setIsTransitioning] = useState(true);

    useEffect(() => {
        setIsTransitioning(true);
        const timer = setTimeout(() => {
            setIsTransitioning(false);
        }, 500);
        return () => clearTimeout(timer);
    }, [threadId]);

    useEffect(() => {
        const textarea = inputRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            const newHeight = Math.min(textarea.scrollHeight, 120);
            textarea.style.height = `${newHeight}px`;
        }
    }, [inputText]);

    useEffect(() => {
        if (typeof window === "undefined" || !window.visualViewport) return;
        if (isTransitioning) return;
        
        const handleViewportChange = () => {
            const vv = window.visualViewport;
            if (!vv) return;
            
            const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
            const isMobile = window.innerWidth < 768;
            if (isMobile && !isAndroid) {
                if (window.scrollY !== 0) {
                    window.scrollTo(0, 0);
                }
                setViewportStyle({
                    position: "fixed",
                    top: `${vv.offsetTop}px`,
                    height: `${vv.height}px`,
                    left: 0,
                    right: 0,
                });
            } else {
                setViewportStyle({});
            }
            
            setTimeout(() => {
                scrollToBottom("smooth");
            }, 100);
        };
        
        window.visualViewport.addEventListener("resize", handleViewportChange);
        window.visualViewport.addEventListener("scroll", handleViewportChange);
        
        // Initial call
        handleViewportChange();
        
        return () => {
            window.visualViewport?.removeEventListener("resize", handleViewportChange);
            window.visualViewport?.removeEventListener("scroll", handleViewportChange);
        };
    }, [isTransitioning]);

    // ── Reset Scroll position and Blur active elements on Unmount ──
    useEffect(() => {
        return () => {
            if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            if (typeof window !== "undefined") {
                window.scrollTo(0, 0);
                window.dispatchEvent(new Event("resize"));
            }
        };
    }, []);

    // ── Blur input when window loses focus or app is minimized ──
    useEffect(() => {
        if (typeof window === "undefined" || typeof document === "undefined") return;

        const handleAppBlur = () => {
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                }
            }
        };

        window.addEventListener("blur", handleAppBlur);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("blur", handleAppBlur);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    // ── iOS Safari Viewport/Keyboard Stability Fixes ──
    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleFocusOut = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT")) {
                setTimeout(() => {
                    window.scrollTo(0, 0);
                    window.dispatchEvent(new Event("resize"));
                }, 100);
            }
        };

        document.addEventListener("focusout", handleFocusOut);
        return () => {
            document.removeEventListener("focusout", handleFocusOut);
        };
    }, []);

    const chatContainerRef = useRef<HTMLDivElement | null>(null);
    const messagesContainerRef = useRef<HTMLDivElement | null>(null);

    const scrollToBottom = (behavior: "auto" | "smooth" = "auto") => {
        const container = messagesContainerRef.current;
        if (container) {
            if (behavior === "smooth") {
                container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
            } else {
                container.scrollTop = container.scrollHeight;
            }
        } else {
            messagesEndRef.current?.scrollIntoView({ behavior });
        }
    };

    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;

        const preventTouchMove = (e: TouchEvent) => {
            const target = e.target as HTMLElement;
            if (!target) return;

            if (
                target.closest(".chat-messages-container") ||
                target.closest(".scrollable-y") ||
                target.tagName === "TEXTAREA" ||
                target.tagName === "INPUT" ||
                target.closest(".allow-scroll")
            ) {
                return;
            }

            if (e.cancelable) {
                e.preventDefault();
            }
        };

        container.addEventListener("touchmove", preventTouchMove, { passive: false });
        return () => {
            container.removeEventListener("touchmove", preventTouchMove);
        };
    }, []);

    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const [voicePlaybackProgress, setVoicePlaybackProgress] = useState<{ [msgId: string]: number }>({});
    const lastPlayedMsgIdRef = useRef<string | null>(null);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const prevScrollThreadIdRef = useRef<string | null>(null);
    const prevMessagesLengthRef = useRef<number>(0);

    const fontSizeClass = {
        small: "text-[13px]",
        medium: "text-[15px]",
        large: "text-[17px]"
    }[currentUser.settings.fontSize || "medium"];

    const playVoice = (msgId: string, url: string, seekToRatio?: number, msgDuration?: number) => {
        // Stop bottom recording preview if it's currently playing
        if (previewAudioRef.current && isPlayingPreview) {
            previewAudioRef.current.pause();
            setIsPlayingPreview(false);
            setPreviewProgress(0);
        }

        if (playingVoiceId === msgId && seekToRatio === undefined) {
            audioPlayerRef.current?.pause();
            setPlayingVoiceId(null);
        } else {
            const isSameAudio = lastPlayedMsgIdRef.current === msgId && audioPlayerRef.current;
            
            if (audioPlayerRef.current && !isSameAudio) {
                audioPlayerRef.current.pause();
                if (playingVoiceId) {
                    setVoicePlaybackProgress(prev => ({ ...prev, [playingVoiceId]: 0 }));
                }
            }

            let audio = audioPlayerRef.current;
            if (!isSameAudio || !audio) {
                audio = new Audio(url);
                audioPlayerRef.current = audio;
                lastPlayedMsgIdRef.current = msgId;
            }
            
            setPlayingVoiceId(msgId);
            
            audio.ontimeupdate = () => {
                const dur = audio.duration && isFinite(audio.duration) && audio.duration > 0
                    ? audio.duration
                    : (msgDuration || 1);
                const progress = (audio.currentTime / dur) * 100 || 0;
                setVoicePlaybackProgress(prev => ({ ...prev, [msgId]: progress }));
            };

            audio.onended = () => {
                setPlayingVoiceId(null);
                setVoicePlaybackProgress(prev => ({ ...prev, [msgId]: 0 }));

                // Find next voice message and auto-play it
                if (thread) {
                    const chatCallLogs = (callLogs || [])
                        .filter(log => 
                            (log.callerId === currentUser.id && log.calleeId === thread.user.id) ||
                            (log.callerId === thread.user.id && log.calleeId === currentUser.id)
                        )
                        .map(log => {
                            const isMe = log.callerId === currentUser.id;
                            return {
                                id: `call-${log.id}`,
                                sender: isMe ? "me" : "them",
                                text: log.type === "video" ? "Video Call" : "Voice Call",
                                type: "call",
                                createdAt: log.timestamp,
                                time: new Date(log.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
                                read: true,
                                callLog: log
                            } as any;
                        });

                    const combinedMessages = [...thread.messages, ...chatCallLogs];
                    combinedMessages.sort((a, b) => {
                        const dateA = new Date(a.createdAt || a.timestamp || 0).getTime();
                        const dateB = new Date(b.createdAt || b.timestamp || 0).getTime();
                        return dateA - dateB;
                    });

                    // Find index of current message
                    const currentIndex = combinedMessages.findIndex(m => m.id === msgId);
                    if (currentIndex !== -1) {
                        // Search downwards for the next voice note message
                        for (let i = currentIndex + 1; i < combinedMessages.length; i++) {
                            const nextMsg = combinedMessages[i];
                            if (nextMsg.type === "voice") {
                                // Auto play it with transition tone!
                                playSendSound("voice-autoplay");
                                setTimeout(() => {
                                    playVoice(nextMsg.id, nextMsg.imageUrl || "", undefined, nextMsg.duration);
                                }, 350); // Small delay to feel premium after the tone plays
                                break;
                            }
                        }
                    }
                }
            };

            const startPlay = () => {
                if (seekToRatio !== undefined) {
                    const dur = audio.duration && isFinite(audio.duration) && audio.duration > 0
                        ? audio.duration
                        : (msgDuration || 1);
                    audio.currentTime = dur * seekToRatio;
                    const progress = seekToRatio * 100;
                    setVoicePlaybackProgress(prev => ({ ...prev, [msgId]: progress }));
                }
                audio.play().catch(err => {
                    console.error("Failed to play voice note:", err);
                    setPlayingVoiceId(null);
                });
            };

            if (audio.readyState >= 1) {
                startPlay();
            } else {
                audio.onloadedmetadata = () => {
                    startPlay();
                };
                // Fallback if metadata event is delayed
                setTimeout(() => {
                    if (lastPlayedMsgIdRef.current === msgId && audio.currentTime === 0 && seekToRatio !== undefined) {
                        startPlay();
                    }
                }, 250);
            }
        }
    };

    const handleVoiceSeek = (e: React.MouseEvent<HTMLDivElement>, msg: Message) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const clickRatio = Math.max(0, Math.min(1, clickX / width));
        playVoice(msg.id, msg.imageUrl || "", clickRatio, msg.duration);
    };


    const [recordingTime, setRecordingTime] = useState(0);
    const [recordingState, setRecordingState] = useState<"idle" | "recording" | "paused" | "preview">("idle");
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);
    const [previewProgress, setPreviewProgress] = useState(0);
    const [audioAmplitudes, setAudioAmplitudes] = useState<number[]>(new Array(20).fill(3));

    const startTimeRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<any>(null);
    const animationFrameRef = useRef<number | null>(null);
    const previewAudioRef = useRef<HTMLAudioElement | null>(null);
    
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [showContactPicker, setShowContactPicker] = useState(false);
    const [contactSearchQuery, setContactSearchQuery] = useState("");
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [showPollCreator, setShowPollCreator] = useState(false);
    const [votingDetailsMessage, setVotingDetailsMessage] = useState<Message | null>(null);
    const [pollQuestion, setPollQuestion] = useState("");
    const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
    const [allowMultipleAnswers, setAllowMultipleAnswers] = useState(true);
    const [isAcquiringLocation, setIsAcquiringLocation] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
    const [swipedMessageId, setSwipedMessageId] = useState<string | null>(null);
    const [swipeOffset, setSwipeOffset] = useState<number>(0);
    const swipeTouchStartRef = useRef<{ x: number; y: number } | null>(null);
    // Call buttons now wired via CallContext (no local modal state needed)
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showConfirmClear, setShowConfirmClear] = useState(false);
    const [showConfirmBlock, setShowConfirmBlock] = useState(false);
    const [showConfirmDeleteMessage, setShowConfirmDeleteMessage] = useState(false);
    const [showConfirmDeleteChat, setShowConfirmDeleteChat] = useState(false);
    const [deleteOption, setDeleteOption] = useState<"me" | "everyone">("me");
    const [bulkDeleteIds, setBulkDeleteIds] = useState<Set<string>>(new Set());
    const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Message[]>([]);
    const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

    const [showAddMembersModal, setShowAddMembersModal] = useState(false);
    const [selectedAddMemberIds, setSelectedAddMemberIds] = useState<Set<string>>(new Set());
    const [addMembersSearch, setAddMembersSearch] = useState("");

    const handleAddMembersConfirm = async () => {
        if (!threadId || selectedAddMemberIds.size === 0) return;
        const userIds = Array.from(selectedAddMemberIds);
        await addUsersToGroup(threadId, userIds);
        setSelectedAddMemberIds(new Set());
        setAddMembersSearch("");
        setShowAddMembersModal(false);
    };

    const handleSendPoll = () => {
        if (!thread) return;
        if (!pollQuestion.trim()) {
            addNotification("Please enter a question");
            return;
        }

        const validOptions = pollOptions
            .map(o => o.trim())
            .filter(o => o !== "");

        if (validOptions.length < 2) {
            addNotification("Please provide at least 2 options");
            return;
        }

        // Send message
        sendMessage(thread.id, `📊 Poll: ${pollQuestion}`, "poll", {
            poll: {
                question: pollQuestion.trim(),
                options: validOptions.map(opt => ({ text: opt, votes: 0 })),
                votedIndices: [],
                allowMultiple: allowMultipleAnswers
            }
        });

        // Close modal
        setShowPollCreator(false);
        setPollQuestion("");
        setPollOptions(["", ""]);
    };

    useEffect(() => {
        hasScrolledToBottomRef.current = false;
        setIsScrollReady(false);
        if (typeof window !== "undefined" && threadId) {
            const searchParams = new URLSearchParams(window.location.search);
            if (searchParams.get("search") === "true") {
                setShowSearch(true);
            } else {
                setShowSearch(false);
            }
        }
    }, [threadId]);


    const [fullscreenMedia, setFullscreenMedia] = useState<{ id: string; url: string; type: "image" | "video" } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hasScrolledToBottomRef = useRef(false);
    const [isScrollReady, setIsScrollReady] = useState(false);
    const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);
    const longPressTimeoutRef = useRef<any>(null);
    const recordingInterval = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const sendGuardRef = useRef(false);
    const pollQuestionInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (showPollCreator) {
            const timer = setTimeout(() => {
                pollQuestionInputRef.current?.focus();
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [showPollCreator]);

    const cameraInputRef = useRef<HTMLInputElement>(null);
    const videoCameraInputRef = useRef<HTMLInputElement>(null);

    const [showCamera, setShowCamera] = useState(false);
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

    const canSeePfp = thread ? checkPrivacy(thread.user, 'profilePicture') : true;
    const wallpaperVal = currentUser.settings.wallpaper || "default";
    const resolvedWallpaper = wallpaperVal;
    const isImageWallpaper = resolvedWallpaper.startsWith("data:") || 
                             resolvedWallpaper.startsWith("http") || 
                             resolvedWallpaper.startsWith("blob:") || 
                             resolvedWallpaper.startsWith("/");
    const isMeshWallpaper = resolvedWallpaper.startsWith("mesh-");
    const isDoodleWallpaper = resolvedWallpaper.startsWith("doodle-");
    const isCustomWallpaper = resolvedWallpaper.startsWith("data:") || 
                              resolvedWallpaper.startsWith("http") || 
                              resolvedWallpaper.startsWith("blob:");
    const wallpaperOpacityClass = isCustomWallpaper 
        ? "opacity-100" 
        : "opacity-40 dark:opacity-20";
    const wallpaperClass = isImageWallpaper || isMeshWallpaper || isDoodleWallpaper ? "" : (WALLPAPERS[wallpaperVal] || WALLPAPERS.default);
    const wallpaperStyle = isImageWallpaper 
        ? { 
            backgroundImage: `url(${resolvedWallpaper})`, 
            backgroundSize: "cover", 
            backgroundPosition: "center" 
          } 
        : undefined;
    useEffect(() => {
        if (!threadId || !thread) return;

        const messagesLength = thread.messages.length;

        if (!hasScrolledToBottomRef.current && messagesLength > 0) {
            hasScrolledToBottomRef.current = true; // Mark done synchronously to prevent race conditions during fast re-renders
            // Use rAF to ensure DOM has laid out before scrolling
            requestAnimationFrame(() => {
                scrollToBottom("auto");
                setIsScrollReady(true);
            });
            const timer1 = setTimeout(() => {
                scrollToBottom("auto");
            }, 30);
            const timer2 = setTimeout(() => {
                scrollToBottom("auto");
            }, 460); // run right after 420ms sliding animation concludes
            prevMessagesLengthRef.current = messagesLength;
            prevScrollThreadIdRef.current = thread.id;
            return () => { clearTimeout(timer1); clearTimeout(timer2); };
        } else {
            const oldLength = prevMessagesLengthRef.current;
            prevMessagesLengthRef.current = messagesLength;
            prevScrollThreadIdRef.current = thread.id;
            if (messagesLength > oldLength) {
                scrollToBottom("smooth");
            }
        }
    }, [thread, threadId]);

    useEffect(() => {
        const isTyping = !!(thread?.typingParticipantIds && thread.typingParticipantIds.includes(thread?.user?.id));
        if (isTyping) {
            scrollToBottom("smooth");
        }
    }, [thread?.typingParticipantIds, thread?.user?.id]);

    useEffect(() => {
        if (threadId && thread && thread.id === threadId && thread.unread) {
            markThreadRead(thread.id);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [thread?.id, threadId]);

    useEffect(() => {
        if (recordingState === "recording") {
            recordingInterval.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            if (recordingInterval.current) clearInterval(recordingInterval.current);
            if (recordingState === "idle") {
                setRecordingTime(0);
            }
        }
        return () => {
            if (recordingInterval.current) clearInterval(recordingInterval.current);
        };
    }, [recordingState]);

    useEffect(() => {
        if (showSearch && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [showSearch]);

    useEffect(() => {
        if (searchQuery && thread) {
            const results = thread.messages.filter(m =>
                m.text.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setSearchResults(results);
            setCurrentSearchIndex(results.length > 0 ? results.length - 1 : 0);
        } else {
            setSearchResults([]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, thread?.messages]);

    useEffect(() => {
        if (searchResults.length > 0 && searchResults[currentSearchIndex]) {
            const msgId = searchResults[currentSearchIndex].id;
            const el = messageRefs.current[msgId];
            const container = messagesContainerRef.current;
            if (el && container) {
                const rect = el.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                const elTop = rect.top - containerRect.top + container.scrollTop;
                container.scrollTo({ top: elTop - container.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" });
            } else {
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }
    }, [currentSearchIndex, searchResults]);

    useEffect(() => {
        if (replyingTo && inputRef.current) {
            inputRef.current.focus();
        }
    }, [replyingTo]);

    useEffect(() => {
        if (thread) {
            setIsLoading(false);
        } else {
            setIsLoading(true);
            if (isProfileLoaded) {
                const timer = setTimeout(() => {
                    setIsLoading(false);
                }, 4000);
                return () => clearTimeout(timer);
            }
        }
    }, [thread, isProfileLoaded]);

    useModalHistory("confirmDeleteChat", showConfirmDeleteChat, () => setShowConfirmDeleteChat(false));
    useModalHistory("addMembersModal", showAddMembersModal, () => setShowAddMembersModal(false));
    useModalHistory("confirmDeleteMsg", showConfirmDeleteMessage, () => { setBulkDeleteIds(new Set()); setIsBulkSelectMode(false); setShowConfirmDeleteMessage(false); setDeleteOption("me"); });
    useModalHistory("confirmBlock", showConfirmBlock, () => setShowConfirmBlock(false));
    useModalHistory("reportModal", showReportModal, () => setShowReportModal(false));
    useModalHistory("confirmClear", showConfirmClear, () => setShowConfirmClear(false));
    useModalHistory("fullscreenMedia", fullscreenMedia !== null, () => setFullscreenMedia(null));

    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [isSavingMedia, setIsSavingMedia] = useState(false);

    const [touchDragOffset, setTouchDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [animatingToIndex, setAnimatingToIndex] = useState<"next" | "prev" | null>(null);
    const [noTransition, setNoTransition] = useState(false);

    const trackTransform = useMemo(() => {
        if (animatingToIndex === "next") return "translateX(-66.666%)";
        if (animatingToIndex === "prev") return "translateX(0%)";
        return `translateX(calc(-33.333% + ${touchDragOffset}px))`;
    }, [animatingToIndex, touchDragOffset]);

    const trackTransition = useMemo(() => {
        if (isDragging || noTransition) return "none";
        return "transform 300ms cubic-bezier(0.16, 1, 0.3, 1)";
    }, [isDragging, noTransition]);

    const [prevMediaUrl, setPrevMediaUrl] = useState<string | null>(null);
    const [currentMediaUrl, setCurrentMediaUrl] = useState<string | null>(null);
    const [nextMediaUrl, setNextMediaUrl] = useState<string | null>(null);

    // Media list and navigation for fullscreen viewer
    const mediaMessages = useMemo(() => {
        if (!thread?.messages) return [];
        const sorted = [...thread.messages].sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateA - dateB;
        });
        return sorted.filter(m => m.type === "image" || m.type === "video");
    }, [thread?.messages]);

    const currentMediaIndex = useMemo(() => {
        if (!fullscreenMedia) return -1;
        return mediaMessages.findIndex(m => m.id === fullscreenMedia.id);
    }, [fullscreenMedia, mediaMessages]);

    const changeFullscreenMedia = async (index: number) => {
        if (index < 0 || index >= mediaMessages.length) return;
        const nextMsg = mediaMessages[index];
        
        let resolvedUrl = nextMsg.imageUrl || "";
        try {
            const cachedBlob = await localforage.getItem<Blob>(nextMsg.id);
            if (cachedBlob) {
                resolvedUrl = URL.createObjectURL(cachedBlob);
            }
        } catch (err) {
            console.error("Error reading next media from cache:", err);
        }

        setFullscreenMedia({
            id: nextMsg.id,
            url: resolvedUrl,
            type: nextMsg.type as "image" | "video"
        });
    };

    const triggerSlideTransition = (direction: "next" | "prev", targetIndex: number) => {
        if (animatingToIndex !== null) return;
        setAnimatingToIndex(direction);
        setIsDragging(false);
        setTouchDragOffset(0);

        setTimeout(() => {
            setNoTransition(true);

            // Shift the URLs synchronously to prevent async loading flicker
            if (direction === "next") {
                setPrevMediaUrl(currentMediaUrl);
                setCurrentMediaUrl(nextMediaUrl);
                setNextMediaUrl(null);
            } else {
                setNextMediaUrl(currentMediaUrl);
                setCurrentMediaUrl(prevMediaUrl);
                setPrevMediaUrl(null);
            }

            changeFullscreenMedia(targetIndex);
            setAnimatingToIndex(null);

            setTimeout(() => {
                setNoTransition(false);
            }, 50);
        }, 300);
    };

    // Keyboard navigation listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (fullscreenMedia && currentMediaIndex !== -1 && mediaMessages.length > 1 && animatingToIndex === null) {
                if (e.key === "ArrowLeft") {
                    const prevIdx = currentMediaIndex > 0 ? currentMediaIndex - 1 : mediaMessages.length - 1;
                    triggerSlideTransition("prev", prevIdx);
                } else if (e.key === "ArrowRight") {
                    const nextIdx = currentMediaIndex < mediaMessages.length - 1 ? currentMediaIndex + 1 : 0;
                    triggerSlideTransition("next", nextIdx);
                } else if (e.key === "Escape") {
                    setFullscreenMedia(null);
                }
            } else if (fullscreenMedia && e.key === "Escape") {
                setFullscreenMedia(null);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [fullscreenMedia, currentMediaIndex, mediaMessages, animatingToIndex]);

    // Resolve current, previous and next media URLs (from IndexedDB cache or fallback)
    useEffect(() => {
        if (!fullscreenMedia || currentMediaIndex === -1) {
            setPrevMediaUrl(null);
            setCurrentMediaUrl(null);
            setNextMediaUrl(null);
            return;
        }

        let active = true;
        const urlsToRevoke: string[] = [];

        const resolveItem = async (msg: Message | undefined) => {
            if (!msg) return null;
            try {
                const cachedBlob = await localforage.getItem<Blob>(msg.id);
                if (cachedBlob && active) {
                    const url = URL.createObjectURL(cachedBlob);
                    urlsToRevoke.push(url);
                    return url;
                }
            } catch (err) {
                console.error("Error reading cache for fullscreen pre-resolution:", err);
            }
            return msg.imageUrl || null;
        };

        const resolveAll = async () => {
            const currentUrl = await resolveItem(mediaMessages[currentMediaIndex]);
            if (!active) return;
            setCurrentMediaUrl(currentUrl);

            // Background auto-cache if viewing a remote image/video
            if (currentUrl && currentUrl.startsWith("https://") && mediaMessages[currentMediaIndex]) {
                const activeMsg = mediaMessages[currentMediaIndex];
                try {
                    const res = await fetch(activeMsg.imageUrl!);
                    if (res.ok) {
                        const blob = await res.blob();
                        await localforage.setItem(activeMsg.id, blob);
                        if (active) {
                            const newLocalUrl = URL.createObjectURL(blob);
                            urlsToRevoke.push(newLocalUrl);
                            setCurrentMediaUrl(newLocalUrl);
                        }
                    }
                } catch (err) {
                    console.warn("Background auto-cache failed for fullscreen media:", err);
                }
            }

            const prevIndex = currentMediaIndex > 0 ? currentMediaIndex - 1 : mediaMessages.length - 1;
            const prevUrl = await resolveItem(mediaMessages[prevIndex]);
            if (!active) return;
            setPrevMediaUrl(prevUrl);

            const nextIndex = currentMediaIndex < mediaMessages.length - 1 ? currentMediaIndex + 1 : 0;
            const nextUrl = await resolveItem(mediaMessages[nextIndex]);
            if (!active) return;
            setNextMediaUrl(nextUrl);
        };

        resolveAll();

        return () => {
            active = false;
            urlsToRevoke.forEach(url => {
                if (url.startsWith("blob:")) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [fullscreenMedia?.id, currentMediaIndex, mediaMessages]);

    const touchStartX = useRef<number | null>(null);
    const touchStartTime = useRef<number>(0);
    const edgeSwipeStartRef = useRef<{ x: number; y: number; isEdge: boolean } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (animatingToIndex !== null) return;
        touchStartX.current = e.touches[0].clientX;
        touchStartTime.current = Date.now();
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartX.current === null || animatingToIndex !== null) return;
        
        // Prevent default browser scrolling and history swipe navigation
        if (e.cancelable) {
            e.preventDefault();
        }
        
        const currentX = e.touches[0].clientX;
        const deltaX = currentX - touchStartX.current;
        setTouchDragOffset(deltaX);
    };

    const handleTouchEnd = () => {
        if (touchStartX.current === null || currentMediaIndex === -1 || animatingToIndex !== null) return;
        setIsDragging(false);

        const elapsed = Date.now() - touchStartTime.current;
        const velocity = Math.abs(touchDragOffset) / Math.max(elapsed, 1); // px per ms
        const isQuickFlick = velocity > 0.3; // fast swipe
        const threshold = isQuickFlick ? 30 : window.innerWidth * 0.1; // 30px for flicks, 10% for slow drags

        if (touchDragOffset < -threshold && mediaMessages.length > 1) {
            // Swipe left -> next message (with loop wrap)
            const nextIdx = currentMediaIndex < mediaMessages.length - 1 ? currentMediaIndex + 1 : 0;
            triggerSlideTransition("next", nextIdx);
        } else if (touchDragOffset > threshold && mediaMessages.length > 1) {
            // Swipe right -> prev message (with loop wrap)
            const prevIdx = currentMediaIndex > 0 ? currentMediaIndex - 1 : mediaMessages.length - 1;
            triggerSlideTransition("prev", prevIdx);
        } else {
            setTouchDragOffset(0);
        }

        touchStartX.current = null;
    };

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => {
            setToastMessage(null);
        }, 2500);
    };

    const saveToGallery = async () => {
        if (!fullscreenMedia || isSavingMedia) return;
        setIsSavingMedia(true);
        try {
            // Firebase Storage URLs are cross-origin — a plain <a download> click
            // is silently blocked by browsers. We must fetch the bytes first,
            // create a same-origin blob: URL, trigger the download from that.
            const response = await fetch(fullscreenMedia.url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const ext = fullscreenMedia.type === "video" ? "mp4" : "jpg";
            const filename = `meshapp_${fullscreenMedia.type}_${Date.now()}.${ext}`;

            // Fallback to classic browser download (ideal for desktops or unsupported browsers)
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            // Revoke after a short delay so the browser has time to start the download
            setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
            showToast("✓ Saved to downloads!");
        } catch (e) {
            console.error("Save failed:", e);
            showToast("Failed to save — please try again");
        } finally {
            setIsSavingMedia(false);
        }
    };

    const shareMedia = async () => {
        if (!fullscreenMedia || isSavingMedia) return;
        setIsSavingMedia(true);
        try {
            const response = await fetch(fullscreenMedia.url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            const ext = fullscreenMedia.type === "video" ? "mp4" : "jpg";
            const mimeType = fullscreenMedia.type === "video" ? "video/mp4" : "image/jpeg";
            const filename = `meshapp_${fullscreenMedia.type}_${Date.now()}.${ext}`;

            // Create a File object for the Web Share API
            const file = new File([blob], filename, { type: mimeType });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: filename,
                });
                showToast("✓ Shared successfully!");
            } else {
                showToast("Sharing not supported on this browser");
            }
        } catch (e) {
            if (e && typeof e === "object" && "name" in e && e.name === "AbortError") {
                console.log("Share cancelled by user");
            } else {
                console.error("Share failed:", e);
                showToast("Failed to share — please try again");
            }
        } finally {
            setIsSavingMedia(false);
        }
    };

    if (!hasMounted) {
        return <div className="h-full w-full bg-[var(--background)] dark:bg-zinc-950" />;
    }

    if (!id) {
        return (
            <div className="h-full w-full bg-[var(--background)] dark:bg-zinc-950 relative overflow-hidden">
                {isMeshWallpaper ? (
                    <MeshWallpaper type={resolvedWallpaper} />
                ) : isDoodleWallpaper ? (
                    <GlowingDoodleBackground type={resolvedWallpaper} isDarkMode={currentUser.settings.theme === "dark" || currentUser.settings.theme === "glow-dark" || (currentUser.settings.theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches)} />
                ) : (
                    <div 
                        className={clsx("absolute inset-0 pointer-events-none", wallpaperOpacityClass, wallpaperClass)}
                        style={wallpaperStyle}
                    />
                )}
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="h-full w-full bg-[var(--background)] dark:bg-zinc-950 relative overflow-hidden">
                {isMeshWallpaper ? (
                    <MeshWallpaper type={resolvedWallpaper} />
                ) : isDoodleWallpaper ? (
                    <GlowingDoodleBackground type={resolvedWallpaper} isDarkMode={currentUser.settings.theme === "dark" || currentUser.settings.theme === "glow-dark" || (currentUser.settings.theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches)} />
                ) : (
                    <div 
                        className={clsx("absolute inset-0 pointer-events-none", wallpaperOpacityClass, wallpaperClass)}
                        style={wallpaperStyle}
                    />
                )}
            </div>
        );
    }

    if (!thread) {
        return (
            <div className="h-full w-full bg-[var(--background)] dark:bg-zinc-950 relative overflow-hidden">
                {isMeshWallpaper ? (
                    <MeshWallpaper type={resolvedWallpaper} />
                ) : isDoodleWallpaper ? (
                    <GlowingDoodleBackground type={resolvedWallpaper} isDarkMode={currentUser.settings.theme === "dark" || currentUser.settings.theme === "glow-dark" || (currentUser.settings.theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches)} />
                ) : (
                    <div 
                        className={clsx("absolute inset-0 pointer-events-none", wallpaperOpacityClass, wallpaperClass)}
                        style={wallpaperStyle}
                    />
                )}
                {!isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--secondary)] p-8 relative z-10">
                        <p className="text-lg mb-4 text-gray-800 dark:text-zinc-200 font-semibold">Conversation not found</p>
                        <button onClick={onClose} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-blue-600">
                            Go Back
                        </button>
                    </div>
                )}
            </div>
        );
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInputText(val);

        if (!thread?.isGroup) {
            setShowMentionSuggestions(false);
            return;
        }

        const selectionStart = e.target.selectionStart || 0;
        const textBeforeCursor = val.slice(0, selectionStart);
        const lastAtIndex = textBeforeCursor.lastIndexOf("@");
        
        if (lastAtIndex !== -1) {
            const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : " ";
            if (charBeforeAt === " " || charBeforeAt === "\n") {
                const queryText = textBeforeCursor.slice(lastAtIndex + 1);
                if (!queryText.includes("@") && queryText.length < 25) {
                    setShowMentionSuggestions(true);
                    setMentionSearchQuery(queryText);
                    setMentionStartIndex(lastAtIndex);
                    return;
                }
            }
        }
        
        setShowMentionSuggestions(false);
        setMentionSearchQuery("");
        setMentionStartIndex(-1);
    };

    const handleSelectMention = (member: User) => {
        const before = inputText.slice(0, mentionStartIndex);
        const after = inputText.slice(inputRef.current?.selectionStart || mentionStartIndex + mentionSearchQuery.length + 1);
        const newText = before + `@${member.name} ` + after;
        setInputText(newText);
        setShowMentionSuggestions(false);
        setMentionSearchQuery("");
        setMentionStartIndex(-1);
        
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                const newPos = before.length + member.name.length + 2;
                inputRef.current.setSelectionRange(newPos, newPos);
            }
        }, 50);
    };

    const handleSend = async () => {
        if (!inputText.trim()) return;
        const textToSend = inputText;
        setInputText("");
        
        // Play configured message send tone sound
        playSendSound(currentUser?.settings?.messageTone || "whoosh");
        
        // Refocus the input immediately to keep the virtual keyboard open on mobile
        inputRef.current?.focus();
        
        if (editingMessage) {
            editMessage(thread.id, editingMessage.id, textToSend);
            setEditingMessage(null);
        } else {
            const extra: Partial<Message> = {};
            if (replyingTo) {
                extra.replyTo = {
                    id: replyingTo.id,
                    sender: replyingTo.sender,
                    text: replyingTo.text
                };
            }
            // Pre-generate the message ID and register it for bounce animation
            // BEFORE the async Firestore write, so the animation class is ready
            // the instant the message DOM node appears via the snapshot listener
            const msgId = crypto.randomUUID();
            extra.id = msgId;
            setNewlySentMessageIds(prev => {
                const next = new Set(prev);
                next.add(msgId);
                return next;
            });
            sendMessage(thread.id, textToSend, "text", extra);
            setReplyingTo(null);
        }
        
        // Secondary refocus to ensure focus is held after all state/DOM updates
        setTimeout(() => {
            inputRef.current?.focus();
        }, 50);
    };

    const handleSendClick = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        // Guard against double-fire from touch + mouse event sequences on mobile
        if (sendGuardRef.current) return;
        sendGuardRef.current = true;
        setTimeout(() => { sendGuardRef.current = false; }, 300);

        if (inputText.trim() || editingMessage) {
            handleSend();
        } else {
            handleVoiceRecord();
        }
    };

    const cleanupAudioAnalyzer = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (audioContextRef.current) {
            if (audioContextRef.current.state !== "closed") {
                audioContextRef.current.close();
            }
            audioContextRef.current = null;
        }
        analyserRef.current = null;
        dataArrayRef.current = null;
    };

    const stopMicrophoneStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const startVoiceRecording = async () => {
        try {
            cleanupAudioAnalyzer();
            setRecordedBlob(null);
            setPreviewUrl(null);
            setIsPlayingPreview(false);
            setPreviewProgress(0);
            setRecordingTime(0);

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            let mimeType = "audio/webm";
            if (typeof MediaRecorder !== "undefined") {
                if (MediaRecorder.isTypeSupported("audio/webm")) {
                    mimeType = "audio/webm";
                } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
                    mimeType = "audio/mp4";
                } else if (MediaRecorder.isTypeSupported("audio/aac")) {
                    mimeType = "audio/aac";
                } else {
                    mimeType = "";
                }
            }

            const options = mimeType ? { mimeType } : {};
            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onerror = (e) => {
                console.error("MediaRecorder error:", e);
                showToast("Recording error occurred. Please try again.");
                cancelVoiceRecording();
            };

            mediaRecorder.onpause = () => {
                if (recordingState === "recording") {
                    setRecordingState("paused");
                    if (audioContextRef.current && audioContextRef.current.state === "running") {
                        audioContextRef.current.suspend();
                    }
                    showToast("Recording was paused by the system.");
                }
            };

            mediaRecorder.onstop = () => {
                const recordedType = mediaRecorder.mimeType || mimeType || "audio/webm";
                const audioBlob = new Blob(audioChunksRef.current, { type: recordedType });
                
                // If the blob is empty or extremely small (less than 1KB), it was interrupted or silent
                if (audioBlob.size < 1000) {
                    showToast("Recording was interrupted or empty. Please record again.");
                    cancelVoiceRecording();
                    return;
                }
                
                setRecordedBlob(audioBlob);
                const url = URL.createObjectURL(audioBlob);
                setPreviewUrl(url);
            };

            // Setup Audio Analyzer
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContextClass();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 64;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;
            dataArrayRef.current = dataArray;

            const updateAmplitudes = () => {
                if (analyserRef.current && dataArrayRef.current) {
                    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
                    const rawData = Array.from(dataArrayRef.current) as number[];
                    const numBars = 20;
                    const step = Math.floor(rawData.length / numBars) || 1;
                    const amplitudes = [];
                    for (let i = 0; i < numBars; i++) {
                        const slice = rawData.slice(i * step, (i + 1) * step);
                        const avg = slice.reduce((sum: number, v: number) => sum + v, 0) / (slice.length || 1);
                        const height = Math.max(3, Math.min(32, (avg / 255) * 32));
                        amplitudes.push(height);
                      }
                      setAudioAmplitudes(amplitudes);
                  }
                  animationFrameRef.current = requestAnimationFrame(updateAmplitudes);
              };
              animationFrameRef.current = requestAnimationFrame(updateAmplitudes);

              mediaRecorder.start(100);
              setRecordingState("recording");
              startTimeRef.current = Date.now();
          } catch (err) {
              console.error("Microphone access denied:", err);
              alert("Please allow microphone access to record voice notes.");
          }
      };

      const pauseVoiceRecording = () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
              mediaRecorderRef.current.pause();
              setRecordingState("paused");
              
              if (animationFrameRef.current) {
                  cancelAnimationFrame(animationFrameRef.current);
                  animationFrameRef.current = null;
              }
              if (audioContextRef.current && audioContextRef.current.state === "running") {
                  audioContextRef.current.suspend();
              }
          }
      };

      const resumeVoiceRecording = () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
              mediaRecorderRef.current.resume();
              setRecordingState("recording");
              
              if (audioContextRef.current && audioContextRef.current.state === "suspended") {
                  audioContextRef.current.resume();
              }
              
              const updateAmplitudes = () => {
                  if (analyserRef.current && dataArrayRef.current) {
                      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
                      const rawData = Array.from(dataArrayRef.current) as number[];
                      const numBars = 20;
                      const step = Math.floor(rawData.length / numBars) || 1;
                      const amplitudes = [];
                      for (let i = 0; i < numBars; i++) {
                          const slice = rawData.slice(i * step, (i + 1) * step);
                          const avg = slice.reduce((sum: number, v: number) => sum + v, 0) / (slice.length || 1);
                          const height = Math.max(3, Math.min(32, (avg / 255) * 32));
                          amplitudes.push(height);
                      }
                      setAudioAmplitudes(amplitudes);
                  }
                  animationFrameRef.current = requestAnimationFrame(updateAmplitudes);
              };
              animationFrameRef.current = requestAnimationFrame(updateAmplitudes);
          }
      };

      const stopAndPreviewVoiceRecording = () => {
          if (mediaRecorderRef.current && (mediaRecorderRef.current.state === "recording" || mediaRecorderRef.current.state === "paused")) {
              cleanupAudioAnalyzer();
              stopMicrophoneStream();
              mediaRecorderRef.current.stop();
              setRecordingState("preview");
          }
      };

      const cancelVoiceRecording = () => {
          cleanupAudioAnalyzer();
          stopMicrophoneStream();
          if (mediaRecorderRef.current) {
              mediaRecorderRef.current.onstop = null;
              if (mediaRecorderRef.current.state !== "inactive") {
                  mediaRecorderRef.current.stop();
              }
              mediaRecorderRef.current = null;
          }
          if (previewAudioRef.current) {
              previewAudioRef.current.pause();
              previewAudioRef.current = null;
          }
          setRecordingState("idle");
          setRecordedBlob(null);
          if (previewUrl) {
              URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
          }
          setIsPlayingPreview(false);
          setPreviewProgress(0);
          setRecordingTime(0);
      };

      const sendVoiceRecording = () => {
          if (recordedBlob && previewUrl) {
              const reader = new FileReader();
              reader.onloadend = () => {
                  sendMessage(thread.id, "", "voice", {
                      imageUrl: reader.result as string,
                      duration: recordingTime
                  });
                  cancelVoiceRecording();
              };
              reader.readAsDataURL(recordedBlob);
          }
      };

      const playPausePreview = () => {
          if (!previewUrl) return;

          // Stop active voice bubble playback if it's currently playing
          if (audioPlayerRef.current && playingVoiceId) {
              audioPlayerRef.current.pause();
              setVoicePlaybackProgress(prev => ({ ...prev, [playingVoiceId]: 0 }));
              setPlayingVoiceId(null);
          }

          if (!previewAudioRef.current) {
              previewAudioRef.current = new Audio(previewUrl);
              previewAudioRef.current.ontimeupdate = () => {
                  if (previewAudioRef.current) {
                      const progress = (previewAudioRef.current.currentTime / previewAudioRef.current.duration) * 100 || 0;
                      setPreviewProgress(progress);
                  }
              };
              previewAudioRef.current.onended = () => {
                  setIsPlayingPreview(false);
                  setPreviewProgress(0);
              };
          }
          
          if (isPlayingPreview) {
              previewAudioRef.current.pause();
              setIsPlayingPreview(false);
          } else {
              previewAudioRef.current.play();
              setIsPlayingPreview(true);
          }
      };

      const handleVoiceRecord = () => {
          if (recordingState !== "idle") {
              stopAndPreviewVoiceRecording();
          } else {
              startVoiceRecording();
          }
      };

    const openCamera = () => {
        setShowAttachMenu(false);
        cameraInputRef.current?.click();
    };

    const handleCameraCaptureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const { dataUrl, name } = await processImageFile(file);
                await sendMessage(thread.id, name, "image", { imageUrl: dataUrl });
            } catch (err) {
                console.error("Failed to process captured camera photo:", err);
                alert("Failed to process captured image.");
            }
        }
        e.target.value = "";
    };

    const openVideoCamera = () => {
        setShowAttachMenu(false);
        videoCameraInputRef.current?.click();
    };

    const handleVideoCameraCaptureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                // Verify duration using a temporary video element
                const videoEl = document.createElement("video");
                videoEl.preload = "metadata";
                const objectUrl = URL.createObjectURL(file);
                videoEl.src = objectUrl;

                const processAndSend = () => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        sendMessage(thread.id, file.name || "Video Recording", "video", { imageUrl: reader.result as string });
                    };
                    reader.readAsDataURL(file);
                };

                videoEl.onloadedmetadata = () => {
                    URL.revokeObjectURL(objectUrl);
                    if (videoEl.duration > 301) {
                        alert("Video exceeds the 5-minute limit. Please record a shorter video.");
                        return;
                    }
                    processAndSend();
                };

                videoEl.onerror = () => {
                    URL.revokeObjectURL(objectUrl);
                    processAndSend();
                };
            } catch (err) {
                console.error("Failed to process recorded video:", err);
                alert("Failed to process video recording.");
            }
        }
        e.target.value = "";
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const fileList = Array.from(files);
            for (const file of fileList) {
                try {
                    const isVideo = file.type.startsWith("video/");
                    if (isVideo) {
                        await new Promise<void>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                sendMessage(thread.id, file.name, "video", { imageUrl: reader.result as string })
                                    .then(() => resolve())
                                    .catch(reject);
                            };
                            reader.onerror = reject;
                            reader.readAsDataURL(file);
                        });
                    } else {
                        const { dataUrl, name } = await processImageFile(file);
                        await sendMessage(thread.id, name, "image", { imageUrl: dataUrl });
                    }
                } catch (err) {
                    console.error(`Failed to process upload for file ${file.name}:`, err);
                }
            }
        }
        setShowAttachMenu(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const size = file.size < 1024 * 1024
                ? `${(file.size / 1024).toFixed(1)} KB`
                : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
            const reader = new FileReader();
            reader.onloadend = () => {
                sendMessage(thread.id, file.name, "file", {
                    fileName: file.name,
                    fileSize: size,
                    imageUrl: reader.result as string
                });
            };
            reader.readAsDataURL(file);
        }
        setShowAttachMenu(false);
    };

    const handleLocationShare = () => {
        if (typeof navigator !== "undefined" && navigator.geolocation) {
            setIsAcquiringLocation(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setIsAcquiringLocation(false);
                    const { latitude, longitude } = position.coords;
                    sendMessage(thread.id, "📍 Shared Location", "location", {
                        latitude,
                        longitude
                    });
                },
                (error) => {
                    console.warn("Geolocation failed or denied:", error);
                    setIsAcquiringLocation(false);
                    // Show our location picker modal with hotspots
                    setShowLocationPicker(true);
                },
                { enableHighAccuracy: true, timeout: 8000 }
            );
        } else {
            setShowLocationPicker(true);
        }
    };

    const handleAttachment = (type: string) => {
        if (type === "camera") {
            openCamera();
        } else if (type === "video") {
            openVideoCamera();
        } else if (type === "photo") {
            imageInputRef.current?.click();
        } else if (type === "file") {
            fileInputRef.current?.click();
        } else if (type === "poll") {
            setShowAttachMenu(false);
            setPollQuestion("");
            setPollOptions(["", ""]);
            setAllowMultipleAnswers(true);
            setShowPollCreator(true);
        } else if (type === "location") {
            setShowAttachMenu(false);
            handleLocationShare();
        } else if (type === "contact") {
            setShowAttachMenu(false);
            setShowContactPicker(true);
        }
    };

    const handleContextMenu = (e: React.MouseEvent, msg: Message) => {
        e.preventDefault();
        setSelectedMessage(msg);
        setContextMenuPos({ x: e.clientX, y: e.clientY });
        setShowContextMenu(true);
    };

    const handleDoubleClick = (msg: Message) => {
        handleReaction(msg.id, "❤️");
    };

    const handleScrollToMessage = (msgId: string) => {
        const element = messageRefs.current[msgId];
        if (element) {
            const container = messagesContainerRef.current;
            if (container) {
                const rect = element.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                const elTop = rect.top - containerRect.top + container.scrollTop;
                container.scrollTo({ top: elTop - container.clientHeight / 2 + element.clientHeight / 2, behavior: "smooth" });
            } else {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            setHighlightedMessageId(msgId);
            if (highlightTimerRef.current) {
                clearTimeout(highlightTimerRef.current);
            }
            highlightTimerRef.current = setTimeout(() => {
                setHighlightedMessageId(null);
                highlightTimerRef.current = null;
            }, 1800);
        } else {
            showToast("Original message was deleted or not loaded");
        }
    };

    const handleMessageTouchStart = (e: React.TouchEvent, msg: Message) => {
        if ((msg.type as string) === "call" || (msg.type as string) === "divider" || isBulkSelectMode) return;
        const touch = e.touches[0];
        swipeTouchStartRef.current = { x: touch.clientX, y: touch.clientY };

        if (longPressTimeoutRef.current) {
            clearTimeout(longPressTimeoutRef.current);
        }

        const clientX = touch.clientX;
        const clientY = touch.clientY;

        longPressTimeoutRef.current = setTimeout(() => {
            swipeTouchStartRef.current = null;
            setSelectedMessage(msg);
            setContextMenuPos({ x: clientX, y: clientY });
            setShowContextMenu(true);

            if (typeof navigator !== "undefined" && navigator.vibrate) {
                navigator.vibrate(20);
            }
            longPressTimeoutRef.current = null;
        }, 500);
    };

    const handleMessageTouchMove = (e: React.TouchEvent, msg: Message) => {
        if (!swipeTouchStartRef.current) return;
        const touch = e.touches[0];
        const diffX = touch.clientX - swipeTouchStartRef.current.x;
        const diffY = touch.clientY - swipeTouchStartRef.current.y;

        if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
            if (longPressTimeoutRef.current) {
                clearTimeout(longPressTimeoutRef.current);
                longPressTimeoutRef.current = null;
            }
        }

        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
            if (e.cancelable) {
                e.preventDefault();
            }
            const offset = Math.max(0, Math.min(75, diffX));
            setSwipedMessageId(msg.id);
            setSwipeOffset(offset);
        }
    };

    const handleMessageTouchEnd = (msg: Message) => {
        if (longPressTimeoutRef.current) {
            clearTimeout(longPressTimeoutRef.current);
            longPressTimeoutRef.current = null;
        }

        swipeTouchStartRef.current = null;
        if (swipedMessageId === msg.id) {
            if (swipeOffset >= 45) {
                setReplyingTo(msg);
                if (typeof navigator !== "undefined" && navigator.vibrate) {
                    navigator.vibrate(15);
                }
            }
            setSwipeOffset(0);
            setTimeout(() => {
                setSwipedMessageId(null);
            }, 250);
        }
    };

    const handleCopy = () => {
        if (selectedMessage) navigator.clipboard.writeText(selectedMessage.text);
        setShowContextMenu(false);
    };

    const handleReply = () => {
        if (selectedMessage) {
            setReplyingTo(selectedMessage);
        }
        setShowContextMenu(false);
    };

    const handleEdit = () => {
        if (selectedMessage && selectedMessage.sender === "me") {
            setEditingMessage(selectedMessage);
            setInputText(selectedMessage.text);
        }
        setShowContextMenu(false);
    };

    const handleDelete = () => {
        if (selectedMessage) {
            // Enter bulk select mode with this message pre-selected
            setBulkDeleteIds(new Set([selectedMessage.id]));
            setIsBulkSelectMode(true);
        }
        setShowContextMenu(false);
    };

    const toggleBulkSelect = (msgId: string) => {
        setBulkDeleteIds(prev => {
            const next = new Set(prev);
            if (next.has(msgId)) {
                next.delete(msgId);
            } else {
                next.add(msgId);
            }
            return next;
        });
    };

    const confirmDeleteMessage = () => {
        if (bulkDeleteIds.size > 0) {
            bulkDeleteIds.forEach(msgId => {
                deleteMessage(thread.id, msgId, deleteOption === "everyone");
            });
            setBulkDeleteIds(new Set());
            setIsBulkSelectMode(false);
            setShowConfirmDeleteMessage(false);
            setDeleteOption("me");
        }
    };

    const cancelBulkDelete = () => {
        setBulkDeleteIds(new Set());
        setIsBulkSelectMode(false);
        setShowConfirmDeleteMessage(false);
        setDeleteOption("me");
    };

    const handleLeaveGroup = () => {
        setShowConfirmLeaveGroup(true);
        setShowMoreMenu(false);
        setShowGroupProfile(false);
    };

    const confirmLeaveGroup = async () => {
        await leaveGroup(thread.id);
        setShowConfirmLeaveGroup(false);
    };

    const confirmRemoveMember = async () => {
        if (memberToRemove) {
            await removeUserFromGroup(thread.id, memberToRemove.id);
            setMemberToRemove(null);
        }
    };


    const handleReaction = (msgId: string, emoji: string) => {
        const msg = thread.messages.find(m => m.id === msgId);
        if (msg) {
            const alreadyReacted = msg.reactions?.some(r => r.emoji === emoji && r.userId === "me");
            if (alreadyReacted) {
                removeReaction(thread.id, msgId, emoji);
            } else {
                addReaction(thread.id, msgId, emoji);
            }
        }
    };

    const handleClearChat = () => {
        clearChat(thread.id);
        setShowConfirmClear(false);
        setShowMoreMenu(false);
    };

    const handleArchiveChat = () => {
        archiveChat(thread.id);
        setShowMoreMenu(false);
        onClose();
    };

    const handleDeleteChat = () => {
        setShowConfirmDeleteChat(true);
        setShowMoreMenu(false);
    };

    const handleMuteToggle = () => {
        muteChat(thread.id, !thread.isMuted);
        setShowMoreMenu(false);
    };

    const handleBlockUser = () => {
        blockUser(thread.user.id);
        setShowConfirmBlock(false);
        setShowMoreMenu(false);
        onClose();
    };

    const handleReport = (reason: string) => {
        reportUser(thread.user.id, reason);
        setShowReportModal(false);
        setShowMoreMenu(false);
    };

    const toggleSearch = () => {
        setShowSearch(!showSearch);
        setShowMoreMenu(false);
        if (showSearch) {
            setSearchQuery("");
            setSearchResults([]);
        }
    };

    const navigateSearch = (direction: "up" | "down") => {
        if (searchResults.length === 0) return;
        if (direction === "up") {
            setCurrentSearchIndex(prev => Math.max(0, prev - 1));
        } else {
            setCurrentSearchIndex(prev => Math.min(searchResults.length - 1, prev + 1));
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const isHighlighted = (msgId: string) => {
        return searchResults.some(r => r.id === msgId) && searchResults[currentSearchIndex]?.id === msgId;
    };

    const getReactionCounts = (reactions: { emoji: string; userId: string }[] | undefined) => {
        if (!reactions || reactions.length === 0) return [];
        const counts: { [emoji: string]: number } = {};
        reactions.forEach(r => {
            counts[r.emoji] = (counts[r.emoji] || 0) + 1;
        });
        return Object.entries(counts).map(([emoji, count]) => ({ emoji, count }));
    };

    const handleBackClick = () => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        onClose();
    };

    const handleEdgeTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        const screenWidth = typeof window !== "undefined" ? window.innerWidth : 380;
        // Edge zone: left 36px or right 36px
        const isLeftEdge = touch.clientX <= 36;
        const isRightEdge = touch.clientX >= screenWidth - 36;
        if (isLeftEdge || isRightEdge) {
            edgeSwipeStartRef.current = { x: touch.clientX, y: touch.clientY, isEdge: true };
        } else {
            edgeSwipeStartRef.current = null;
        }
    };

    const handleEdgeTouchEnd = (e: React.TouchEvent) => {
        if (!edgeSwipeStartRef.current?.isEdge) return;
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - edgeSwipeStartRef.current.x;
        const deltaY = Math.abs(touch.clientY - edgeSwipeStartRef.current.y);

        // If swipe horizontal distance is significant and vertical movement is minimal
        if (Math.abs(deltaX) > 60 && deltaY < 80) {
            handleBackClick();
        }
        edgeSwipeStartRef.current = null;
    };

    if (!thread) {
        return (
            <div 
                ref={chatContainerRef}
                className="absolute inset-0 flex flex-col w-full bg-[var(--background)] dark:bg-zinc-950 items-center justify-center"
                style={viewportStyle}
            >
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-gray-500 dark:text-zinc-400">Loading conversation...</p>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={chatContainerRef}
            className="absolute inset-0 flex flex-col w-full bg-[var(--background)] dark:bg-zinc-950 overscroll-y-none"
            style={viewportStyle}
            onTouchStart={handleEdgeTouchStart}
            onTouchEnd={handleEdgeTouchEnd}
        >

            {/* Hidden file inputs */}
            <input ref={imageInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleImageUpload} multiple />
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCaptureUpload} />
            <input ref={videoCameraInputRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={handleVideoCameraCaptureUpload} />

            {/* Header */}
            <header className="flex items-center justify-between px-3 md:px-4 py-3 border-b border-[var(--border)] dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0 relative z-30">
                <div className="flex items-center gap-3">
                    <button 
                        onPointerDown={(e) => {
                            e.preventDefault();
                            handleBackClick();
                        }}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full"
                    >
                        <ChevronLeft size={24} className="text-[var(--primary)]" />
                    </button>
                    <div className="flex items-center gap-3 p-1 -m-1">
                        {(() => {
                            const isFromMarketplace = isMarketplaceThread(thread) || (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("from") === "marketplace");
                            const fromParamValue = isFromMarketplace ? "marketplace" : "chat";
                            return (
                                <>
                                    <div
                                        onClick={() => {
                                            if (thread.isGroup) {
                                                setShowGroupProfile(true);
                                            } else if (isFromMarketplace) {
                                                setActiveSellerStore({
                                                    id: thread.user.id,
                                                    name: thread.user.name,
                                                    avatar: thread.user.avatar,
                                                    location: thread.user.location
                                                });
                                            } else {
                                                window.history.pushState(null, "", `/profile?userId=${thread.user.id}&from=${fromParamValue}&fromThreadId=${thread.id}`);
                                            }
                                        }}
                                        className={clsx(
                                            "w-10 h-10 md:w-12 md:h-12 rounded-full shrink-0 overflow-hidden flex items-center justify-center cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-transform shadow-sm",
                                            thread.isGroup 
                                                ? (thread.groupAvatar && !thread.groupAvatar.startsWith("http") ? "bg-emerald-100 dark:bg-[#12382f]" : thread.groupAvatar ? "bg-white" : "bg-emerald-100 dark:bg-[#12382f]")
                                                : (thread.user.avatar && canSeePfp) ? "bg-white" : thread.user.color
                                        )}
                                    >
                                        {thread.isGroup ? (
                                            thread.groupAvatar ? (
                                                thread.groupAvatar.startsWith("http") ? (
                                                    <img src={thread.groupAvatar} alt={thread.groupName || "Group"} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xl">{thread.groupAvatar}</span>
                                                )
                                            ) : (
                                                <Users size={22} className="text-[#00a884] dark:text-[#00c89a]" />
                                            )
                                        ) : thread.user.avatar && canSeePfp ? (
                                            <img src={thread.user.avatar} alt={thread.user.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-sm md:text-base font-bold">{thread.user.name.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div
                                        onClick={() => {
                                            if (thread.isGroup) {
                                                window.history.pushState(null, "", `/profile?groupId=${thread.id}&from=chat&fromThreadId=${thread.id}`);
                                            } else if (isFromMarketplace) {
                                                setActiveSellerStore({
                                                    id: thread.user.id,
                                                    name: thread.user.name,
                                                    avatar: thread.user.avatar,
                                                    location: thread.user.location
                                                });
                                            } else {
                                                window.history.pushState(null, "", `/profile?userId=${thread.user.id}&from=${fromParamValue}&fromThreadId=${thread.id}`);
                                            }
                                        }}
                                        className="flex flex-col justify-center cursor-pointer hover:opacity-85 transition-opacity min-w-0"
                                    >
                            <div className="flex items-center gap-2">
                                <h1 className="font-semibold text-[15px] md:text-base leading-tight text-black dark:text-white truncate max-w-[160px] md:max-w-xs">{thread.user.name}</h1>
                                {thread.isMuted && <BellOff size={14} className="text-[var(--secondary)] text-zinc-400 shrink-0" />}
                            </div>
                            {(() => {
                                if (thread.isGroup) {
                                    const memberNames = (thread.groupMemberIds || [])
                                        .map(id => {
                                            if (id === currentUser.id) return "You";
                                            const u = allDatingUsers.find(user => user.id === id);
                                            return u?.name || "Member";
                                        })
                                        .join(", ");
                                    return (
                                        <span className="text-xs text-[var(--secondary)] truncate block max-w-[180px] md:max-w-[280px]">
                                            {memberNames}
                                        </span>
                                    );
                                }
                                const isTyping = !!(thread?.typingParticipantIds && thread.typingParticipantIds.includes(thread.user.id));
                                if (isTyping) {
                                    return (
                                        <span className="text-xs text-[var(--success)] font-medium animate-pulse">
                                            typing...
                                        </span>
                                    );
                                }
                                const privacySettings = currentUser?.settings?.privacy || {};
                                const showOnline = privacySettings.onlineStatus !== false;
                                const showLastSeen = privacySettings.lastSeen !== false;
                                const isOnline = thread.user.lastSeen === "online";
                                // Reciprocity: if you hide yours, you can't see theirs
                                if (isOnline && showOnline) {
                                    return (
                                        <span className="text-xs text-[var(--success)]">
                                            online
                                        </span>
                                    );
                                }
                                if (!isOnline && showLastSeen) {
                                    const lastMsgFromThem = [...(thread.messages || [])]
                                        .reverse()
                                        .find(m => m.sender === "them");
                                    const fallbackTimestamp = lastMsgFromThem?.createdAt || null;
                                    const effectiveLastSeen = thread.user.lastSeen || fallbackTimestamp;
                                    if (effectiveLastSeen) {
                                        return (
                                            <span className="text-xs text-[var(--secondary)]">
                                                last seen {formatLastSeen(thread.user.lastSeen, fallbackTimestamp)}
                                            </span>
                                        );
                                    }
                                }
                                return null;
                            })()}
                        </div>
                    </>
                );
            })()}
        </div>
    </div>
    <div className="flex items-center gap-1">
        {!thread.isGroup && (
            <>
                <button onClick={() => initiateCall(thread.user.id, thread.user.name, thread.user.avatar, "video")} className="p-2.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                    <Video size={22} className="text-[var(--primary)]" />
                </button>
                <button onClick={() => initiateCall(thread.user.id, thread.user.name, thread.user.avatar, "audio")} className="p-2.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                    <Phone size={20} className="text-[var(--primary)]" />
                </button>
            </>
        )}
        <div className="relative">
            <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-2.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
                <MoreVertical size={20} className="text-[var(--secondary)]" />
            </button>
            {showMoreMenu && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-[var(--border)] dark:border-zinc-800 py-2 min-w-[180px] z-50">
                        {!thread.isGroup && (
                            <button
                                onClick={() => {
                                    setShowMoreMenu(false);
                                    if (isFromMarketplace) {
                                        setActiveSellerStore({
                                            id: thread.user.id,
                                            name: thread.user.name,
                                            avatar: thread.user.avatar,
                                            location: thread.user.location
                                        });
                                    } else {
                                        window.history.pushState(null, "", `/profile?userId=${thread.user.id}&from=${fromParamValue}&fromThreadId=${thread.id}`);
                                    }
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800 text-left text-black dark:text-white font-medium transition-colors"
                            >
                                <Image size={18} className="text-[var(--secondary)]" /> {isFromMarketplace ? "View Storefront" : "View Profile"}
                            </button>
                        )}
                                    <button
                                        onClick={toggleSearch}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800 text-left text-black dark:text-white font-medium transition-colors"
                                    >
                                        <Search size={18} className="text-[var(--secondary)]" /> Search
                                    </button>
                                    <button
                                        onClick={handleMuteToggle}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800 text-left text-black dark:text-white font-medium transition-colors"
                                    >
                                        {thread.isMuted ? <Bell size={18} className="text-[var(--secondary)]" /> : <BellOff size={18} className="text-[var(--secondary)]" />}
                                        {thread.isMuted ? "Unmute" : "Mute"}
                                    </button>
                                    <button
                                        onClick={async () => {
                                            await togglePinThread(thread.id);
                                            setShowMoreMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800 text-left text-black dark:text-white font-medium transition-colors"
                                    >
                                        <Pin size={18} className="text-[var(--secondary)] rotate-45" />
                                        {currentUser.pinnedThreadIds?.includes(thread.id) ? "Unpin Chat" : "Pin Chat"}
                                    </button>
                                    <div className="border-t border-[var(--border)] dark:border-zinc-800 my-1" />
                                    <button
                                        onClick={handleArchiveChat}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800 text-left text-black dark:text-white font-medium transition-colors"
                                    >
                                        <Archive size={18} className="text-[var(--secondary)]" /> Archive Chat
                                    </button>
                                    <button
                                        onClick={() => { setShowConfirmClear(true); setShowMoreMenu(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800 text-left text-black dark:text-white font-medium transition-colors"
                                    >
                                        <Trash2 size={18} className="text-[var(--secondary)]" /> Clear Chat
                                    </button>
                                    <button
                                        onClick={handleDeleteChat}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800 text-left text-[var(--danger)] font-medium transition-colors"
                                    >
                                        <Trash size={18} /> Delete Chat
                                    </button>
                                    {thread.isGroup && !thread.leftParticipantIds?.includes(currentUser.id) && (
                                        <button
                                            onClick={handleLeaveGroup}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800 text-left text-[var(--danger)] font-medium transition-colors"
                                        >
                                            <LogOut size={18} /> Leave Blend
                                        </button>
                                    )}
                                    {!thread.isGroup && (
                                        <>
                                            <button
                                                onClick={() => setShowConfirmBlock(true)}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800 text-left text-black dark:text-white font-medium transition-colors"
                                            >
                                                <Ban size={18} className="text-[var(--secondary)]" /> Block
                                            </button>
                                            <button
                                                onClick={() => setShowReportModal(true)}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800 text-left text-[var(--danger)] font-medium transition-colors"
                                            >
                                                <Flag size={18} /> Report
                                            </button>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Facebook Marketplace Style Listing Bar below Header */}
            {isFromMarketplace && marketplaceItem && (
                <div
                    onClick={() => setSelectedMarketplaceItem(marketplaceItem)}
                    className="px-3.5 py-2.5 bg-gray-50/95 dark:bg-zinc-900/95 border-b border-[var(--border)] dark:border-zinc-800 flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-100/80 dark:hover:bg-zinc-850/80 transition-colors shrink-0 shadow-xs z-10 relative"
                >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0 border border-gray-200 dark:border-zinc-700 flex items-center justify-center relative shadow-2xs">
                            {marketplaceItem.images?.[0] ? (
                                <img src={marketplaceItem.images[0]} alt={marketplaceItem.title} className="w-full h-full object-cover" />
                            ) : (
                                <ShoppingBag size={18} className="text-gray-400" />
                            )}
                            {marketplaceItem.status === "sold" && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-[0.5px] flex items-center justify-center">
                                    <span className="text-[9px] font-black text-white uppercase tracking-wider">SOLD</span>
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                                    Marketplace listing
                                </span>
                            </div>
                            <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                                {marketplaceItem.title}
                            </h4>
                            <p className={clsx(
                                "text-[11px] font-semibold truncate",
                                marketplaceItem.status === "sold"
                                    ? "text-gray-400 dark:text-zinc-500 line-through"
                                    : "text-[var(--primary)]"
                            )}>
                                {marketplaceItem.price === 0 ? "FREE" : `$${marketplaceItem.price.toLocaleString()}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 relative">
                        {/* Status / View button with backlight glow */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isCurrentUserSeller) {
                                    setShowSellerStatusMenu(prev => !prev);
                                } else {
                                    setSelectedMarketplaceItem(marketplaceItem);
                                }
                            }}
                            className={clsx(
                                "text-xs font-bold px-3 py-1.5 rounded-xl border transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-xs",
                                marketplaceItem.status === "sold"
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/40 hover:bg-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.22)] dark:shadow-[0_0_14px_rgba(239,68,68,0.35)]"
                                    : (marketplaceItem.status === "pending" || marketplaceItem.status === "reserved")
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.25)] dark:shadow-[0_0_14px_rgba(245,158,11,0.35)]"
                                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.22)] dark:shadow-[0_0_14px_rgba(16,185,129,0.35)]"
                            )}
                            title={isCurrentUserSeller ? "Click to manage status" : "Click to view listing details"}
                        >
                            {marketplaceItem.status === "sold" ? (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 shadow-[0_0_6px_rgba(239,68,68,0.9)]" />
                                    <span>Sold</span>
                                </>
                            ) : (marketplaceItem.status === "pending" || marketplaceItem.status === "reserved") ? (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse shadow-[0_0_6px_rgba(245,158,11,0.9)]" />
                                    <span>Pending</span>
                                </>
                            ) : (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
                                    <span>Available</span>
                                </>
                            )}
                            <ChevronRight size={13} className="opacity-60 -mr-0.5 shrink-0" />
                        </button>

                        {/* Seller Quick Status Popover */}
                        {isCurrentUserSeller && showSellerStatusMenu && (
                            <>
                                <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowSellerStatusMenu(false);
                                    }} 
                                />
                                <div 
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                                >
                                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                                        Update Status
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            updateMarketplaceListing(marketplaceItem.id, { status: "active" });
                                            setShowSellerStatusMenu(false);
                                        }}
                                        className={clsx(
                                            "w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer",
                                            marketplaceItem.status === "active" || !marketplaceItem.status
                                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                                                : "hover:bg-gray-100 dark:hover:bg-zinc-850 text-gray-700 dark:text-zinc-300"
                                        )}
                                    >
                                        <span className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                                            Available
                                        </span>
                                        {(marketplaceItem.status === "active" || !marketplaceItem.status) && <Check size={14} className="text-emerald-600" />}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            updateMarketplaceListing(marketplaceItem.id, { status: "pending" });
                                            setShowSellerStatusMenu(false);
                                        }}
                                        className={clsx(
                                            "w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer",
                                            marketplaceItem.status === "pending" || marketplaceItem.status === "reserved"
                                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                                                : "hover:bg-gray-100 dark:hover:bg-zinc-850 text-gray-700 dark:text-zinc-300"
                                        )}
                                    >
                                        <span className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                                            Pending
                                        </span>
                                        {(marketplaceItem.status === "pending" || marketplaceItem.status === "reserved") && <Check size={14} className="text-amber-600" />}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            updateMarketplaceListing(marketplaceItem.id, { status: "sold" });
                                            setShowSellerStatusMenu(false);
                                        }}
                                        className={clsx(
                                            "w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer",
                                            marketplaceItem.status === "sold"
                                                ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                                                : "hover:bg-gray-100 dark:hover:bg-zinc-850 text-gray-700 dark:text-zinc-300"
                                        )}
                                    >
                                        <span className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                                            Sold
                                        </span>
                                        {marketplaceItem.status === "sold" && <Check size={14} className="text-red-600" />}
                                    </button>

                                    <div className="my-1 border-t border-gray-100 dark:border-zinc-800" />

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowSellerStatusMenu(false);
                                            setSelectedMarketplaceItem(marketplaceItem);
                                        }}
                                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-850 transition-colors cursor-pointer"
                                    >
                                        <span>View Listing Details</span>
                                        <ChevronRight size={13} className="opacity-50" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Search Bar */}
            {showSearch && (
                <div className="flex items-center gap-2 px-4 py-2 bg-[var(--card)] dark:bg-zinc-950 border-b border-[var(--border)] dark:border-zinc-800">
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search in chat..."
                        className="flex-1 px-3 py-2 bg-[var(--card)] text-black dark:text-white rounded-lg outline-none text-sm"
                    />
                    {searchResults.length > 0 && (
                        <span className="text-xs text-[var(--secondary)]">
                            {currentSearchIndex + 1} of {searchResults.length}
                        </span>
                    )}
                    <button
                        onClick={() => navigateSearch("up")}
                        disabled={currentSearchIndex <= 0}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-850 rounded-full disabled:opacity-30"
                    >
                        <ChevronUp size={18} />
                    </button>
                    <button
                        onClick={() => navigateSearch("down")}
                        disabled={currentSearchIndex >= searchResults.length - 1}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-850 rounded-full disabled:opacity-30"
                    >
                        <ChevronDown size={18} />
                    </button>
                    <button onClick={toggleSearch} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-850 rounded-full">
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* Messages Wrapper */}
            <div className="flex-1 relative overflow-hidden">
                {/* Wallpaper background */}
                {isMeshWallpaper ? (
                    <MeshWallpaper type={resolvedWallpaper} />
                ) : isDoodleWallpaper ? (
                    <GlowingDoodleBackground type={resolvedWallpaper} isDarkMode={currentUser.settings.theme === "dark" || currentUser.settings.theme === "glow-dark" || (currentUser.settings.theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches)} />
                ) : (
                    <div 
                        className={clsx("absolute inset-0 pointer-events-none", wallpaperOpacityClass, wallpaperClass)}
                        style={wallpaperStyle}
                    />
                )}
                {/* Safe contrast overlay for image/mesh/doodle wallpapers */}
                {(isImageWallpaper || isMeshWallpaper || isDoodleWallpaper) && (
                    <div className="absolute inset-0 bg-white/10 dark:bg-black/35 backdrop-blur-[0.5px] pointer-events-none" />
                )}
                
                {/* Messages scroll container */}
                <div 
                    ref={messagesContainerRef}
                    className={`absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-y-contain px-2 md:px-3 py-3 space-y-1 z-10 bg-transparent chat-messages-container ${!isScrollReady && thread.messages.length > 0 ? 'opacity-0' : 'opacity-100'}`}
                    style={{ transition: 'none' }}
                >
                {thread.messages.length === 0 && (
                    <div className="text-center py-20 text-[var(--secondary)]">
                        <p>No messages yet</p>
                        <p className="text-sm mt-1">Send a message to start the conversation</p>
                    </div>
                )}
                {(() => {
                    let lastDateStr = "";
                    const chatCallLogs = (callLogs || [])
                        .filter(log => 
                            (log.callerId === currentUser.id && log.calleeId === thread.user.id) ||
                            (log.callerId === thread.user.id && log.calleeId === currentUser.id)
                        )
                        .map(log => {
                            const isMe = log.callerId === currentUser.id;
                            return {
                                id: `call-${log.id}`,
                                sender: isMe ? "me" : "them",
                                text: log.type === "video" ? "Video Call" : "Voice Call",
                                type: "call",
                                createdAt: log.timestamp,
                                time: new Date(log.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
                                read: true,
                                callLog: log
                            } as any;
                        });

                    const combinedMessages = [...thread.messages, ...chatCallLogs];
                    combinedMessages.sort((a, b) => {
                        const dateA = new Date(a.createdAt || a.timestamp || 0).getTime();
                        const dateB = new Date(b.createdAt || b.timestamp || 0).getTime();
                        return dateA - dateB;
                    });

                    // Dynamic WhatsApp Media Grouping
                    const processedMessages: any[] = [];
                    let groupIdx = 0;
                    while (groupIdx < combinedMessages.length) {
                        const current = combinedMessages[groupIdx];
                        const isMedia = current.type === "image" || current.type === "video";
                        
                        if (isMedia) {
                            const group: any[] = [current];
                            let lookAheadIdx = groupIdx + 1;
                            
                            while (lookAheadIdx < combinedMessages.length) {
                                const next = combinedMessages[lookAheadIdx];
                                const nextIsMedia = next.type === "image" || next.type === "video";
                                
                                // Group criteria: contiguous media, same sender, within 60 seconds
                                if (
                                    nextIsMedia &&
                                    next.sender === current.sender &&
                                    next.senderId === current.senderId &&
                                    Math.abs(new Date(next.createdAt || next.timestamp || 0).getTime() - new Date(current.createdAt || current.timestamp || 0).getTime()) <= 60000
                                ) {
                                    group.push(next);
                                    lookAheadIdx++;
                                } else {
                                    break;
                                }
                            }
                            
                            if (group.length >= 4) {
                                processedMessages.push({
                                    id: `group-${current.id}`,
                                    type: "media-group",
                                    sender: current.sender,
                                    senderId: current.senderId,
                                    createdAt: current.createdAt,
                                    time: current.time,
                                    read: group.every(m => m.read),
                                    messages: group
                                });
                                groupIdx = lookAheadIdx;
                            } else {
                                processedMessages.push(current);
                                groupIdx++;
                            }
                        } else {
                            processedMessages.push(current);
                            groupIdx++;
                        }
                    }

                    return processedMessages.map((msg) => {
                        const isMe = msg.sender === "me";
                        const theme = getBubbleTheme(isMe, currentUser?.settings?.chatTheme, currentUser?.settings?.wallpaper, currentUser?.settings?.theme);
                        const highlighted = isHighlighted(msg.id);
                        const reactionCounts = getReactionCounts(msg.reactions);
                        const msgDateStr = getMessageDateDividerString(msg.createdAt);
                        const showDivider = msgDateStr !== lastDateStr;
                        if (showDivider) {
                            lastDateStr = msgDateStr;
                        }

                        if (msg.type === "system" || msg.sender === "system") {
                            let displayText = msg.text;
                            if (currentUser) {
                                const myNames = [currentUser.name];
                                if (currentUser.id === "5bc4bOg4fHYjNhutsstxO2GuENE3" || currentUser.id === "G9AZEt3LhfXWGYyTn3QTm8WwNi62") {
                                    myNames.push("Lionel RaMa");
                                    myNames.push("Lionel Rama");
                                }
                                if (currentUser.id === "BXMyJRrbIDTBkTQ9e7Z92WAWUFB2" || currentUser.id === "NQ8D7dt6QAb7slidewpkMfl2zB9b6IRF3") {
                                    myNames.push("Spineli");
                                }
                                for (const name of myNames) {
                                    if (name && displayText.startsWith(name)) {
                                        displayText = "You" + displayText.substring(name.length);
                                        break;
                                    }
                                }
                            }
                            return (
                                <Fragment key={msg.id}>
                                    {showDivider && (
                                        <div className="sticky top-2 z-10 flex justify-center my-3 w-full pointer-events-none">
                                            <span className="px-3 py-1 text-[11px] font-semibold bg-gray-200/90 dark:bg-zinc-800/95 text-gray-600 dark:text-zinc-400 rounded-full shadow-sm backdrop-blur-md">
                                                {msgDateStr}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-center my-2.5 w-full">
                                        <span className="px-4 py-1.5 text-[11.5px] font-semibold bg-[#fcd5d9]/40 border border-[#f2e9d2]/60 text-[#9c8070] rounded-2xl text-center max-w-[80%]">
                                            {displayText}
                                        </span>
                                    </div>
                                </Fragment>
                            );
                        }

                        return (
                            <Fragment key={msg.id}>
                                {showDivider && (
                                    <div className="sticky top-2 z-10 flex justify-center my-3 w-full pointer-events-none">
                                        <span className="px-3 py-1 text-[11px] font-semibold bg-gray-200/90 dark:bg-zinc-800/95 text-gray-600 dark:text-zinc-400 rounded-full shadow-sm backdrop-blur-md">
                                            {msgDateStr}
                                        </span>
                                    </div>
                                )}
                                <div 
                                    onClick={isBulkSelectMode ? () => toggleBulkSelect(msg.id) : undefined}
                                    className={clsx(
                                        "flex items-start w-full transition-colors duration-200 px-1.5 py-0.5 rounded-2xl",
                                        isMe ? "flex-row-reverse" : "flex-row",
                                        isBulkSelectMode && bulkDeleteIds.has(msg.id) && "bg-blue-600/10 dark:bg-blue-400/10",
                                        isBulkSelectMode && "cursor-pointer active:bg-blue-600/5"
                                    )}
                                >
                                <div className={clsx("relative max-w-[85%] md:max-w-[85%] overflow-visible flex flex-col z-0", isMe ? "ml-auto" : "")}>
                                    {/* Swipe-to-reply WhatsApp indicator behind the bubble */}
                                    {swipedMessageId === msg.id && swipeOffset > 0 && (
                                        <div 
                                            className={clsx(
                                                "absolute top-1/2 -translate-y-1/2 flex items-center justify-center bg-gray-200/80 dark:bg-zinc-800/80 text-gray-600 dark:text-zinc-300 w-8 h-8 rounded-full shadow-sm z-0",
                                                isMe ? "left-[-40px]" : "left-3"
                                            )}
                                            style={{
                                                opacity: Math.min(1, swipeOffset / 40),
                                                transform: `translateY(-50%) scale(${Math.min(1.1, swipeOffset / 45)})`
                                            }}
                                        >
                                            <Reply size={16} />
                                        </div>
                                    )}
                                    <div
                                        ref={(el) => { messageRefs.current[msg.id] = el; }}
                                        className={clsx(
                                            "flex flex-col relative w-fit max-w-full z-10", 
                                            isMe ? "ml-auto items-end message-bubble" : "items-start message-bubble-received",
                                            isMe && newlySentMessageIds.has(msg.id) && "animate-sent-bounce",
                                            isBulkSelectMode && bulkDeleteIds.has(msg.id) && "opacity-60"
                                        )}
                                        onContextMenu={(e) => msg.type !== "call" && handleContextMenu(e, msg)}
                                        onDoubleClick={() => msg.type !== "call" && handleDoubleClick(msg)}
                                        onClick={isBulkSelectMode ? () => toggleBulkSelect(msg.id) : undefined}
                                        onTouchStart={(e) => handleMessageTouchStart(e, msg)}
                                        onTouchMove={(e) => handleMessageTouchMove(e, msg)}
                                        onTouchEnd={() => handleMessageTouchEnd(msg)}
                                        onTouchCancel={() => handleMessageTouchEnd(msg)}
                                        style={{
                                            transform: swipedMessageId === msg.id ? `translateX(${swipeOffset}px)` : undefined,
                                            transition: swipedMessageId === msg.id && swipeOffset === 0 ? 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'
                                        }}
                                    >
                                <div
                                    className={clsx(
                                        fontSizeClass,
                                        "leading-relaxed shadow-sm relative group transition-all flex flex-col w-fit max-w-full",
                                        msg.type === "image" || msg.type === "video" || msg.type === "media-group"
                                            ? "rounded-2xl overflow-hidden cursor-pointer"
                                            : msg.type === "location"
                                                ? clsx(theme.bg, "rounded-2xl overflow-hidden")
                                                : msg.type === "call"
                                                    ? "bg-gray-50 dark:bg-zinc-900 text-gray-800 dark:text-gray-100 rounded-2xl border border-gray-200 dark:border-zinc-800/80 shadow-sm"
                                                    : isMe
                                                        ? clsx(theme.bg, "rounded-2xl rounded-br-md")
                                                        : clsx(theme.bg, "rounded-2xl rounded-bl-md"),
                                        (highlighted || msg.id === highlightedMessageId) && "ring-2 ring-yellow-400 dark:ring-yellow-500 ring-offset-2 dark:ring-offset-zinc-950 scale-[1.02] shadow-md transition-all duration-300"
                                    )}
                                >
                                    {/* Group Chat Sender Name */}
                                    {thread.isGroup && !isMe && msg.senderId && (
                                        <div 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onClose();
                                                setTimeout(() => {
                                                    window.history.pushState(null, "", `/profile?userId=${msg.senderId}&from=chat&fromThreadId=${thread.id}`);
                                                }, 150);
                                            }}
                                            className={clsx(
                                                "px-3 pt-2 pb-0.5 text-[11.5px] font-extrabold select-none tracking-wide cursor-pointer hover:underline",
                                                getSenderColor(msg.senderId)
                                            )}
                                        >
                                            {allDatingUsers.find(u => u.id === msg.senderId)?.name || "Member"}
                                        </div>
                                    )}

                                    {/* Reply Preview */}
                                    {msg.replyTo && (
                                        <div
                                            onClick={() => handleScrollToMessage(msg.replyTo!.id)}
                                            className={clsx(
                                                "px-3 py-2 border-l-4 mb-2 text-xs cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 active:scale-98 transition-all rounded-r-md select-none",
                                                theme.replyBg
                                            )}
                                            title="Jump to message"
                                        >
                                            <span className={clsx(
                                                "font-semibold block text-[11px] mb-0.5",
                                                theme.replyHeader
                                            )}>
                                                {msg.replyTo.sender === "me" 
                                                    ? "You" 
                                                    : thread.isGroup && msg.replyTo.senderId 
                                                        ? (allDatingUsers.find(u => u.id === msg.replyTo!.senderId)?.name || "Member")
                                                        : thread.user.name}
                                            </span>
                                            <span className={clsx(
                                                "truncate block",
                                                theme.replyText
                                            )}>
                                                {msg.replyTo.text}
                                            </span>
                                        </div>
                                    )}

                                 <div className={clsx(
                                     (msg.type === "image" || msg.type === "video" || msg.type === "media-group" || msg.type === "location" || (msg.type === "text" && isOnlyUrl(msg.text)))
                                         ? ""
                                         : msg.type === "text"
                                             ? "px-2.5 py-1 md:px-3 md:py-1"
                                             : msg.type === "call"
                                                 ? "px-3 py-2"
                                                 : "px-4 pt-2.5 pb-1"
                                 )}>
                                     {msg.type === "text" && (
                                         <div className="relative text-[14px] md:text-[15px] leading-snug">
                                             {!isOnlyUrl(msg.text) && (
                                                 <>
                                                     <span className="whitespace-pre-wrap break-words">{renderMessageTextWithLinks(msg.text)}</span>
                                                     <span className={clsx("inline-block h-[10px]", isMe ? "w-[60px]" : "w-[46px]")} />
                                                 </>
                                             )}
                                             {isOnlyUrl(msg.text) && (
                                                 <div className="h-[2px]" />
                                             )}
                                             <span className={clsx(
                                                 "inline-flex items-center gap-0.5 text-[9px] absolute select-none pointer-events-none z-10",
                                                 isOnlyUrl(msg.text)
                                                     ? (isMe ? "bottom-[4px] right-[6px]" : "bottom-[4px] right-[10px]")
                                                     : "bottom-[-1px] right-[-2px]"
                                             )}>
                                                 <span className="opacity-65">{getMessageBubbleTimeString(msg.createdAt, msg.time)}</span>
                                                 {isMe && (
                                                     msg.read ? (
                                                         <CheckCheck size={12} className={clsx(theme.readTick, "opacity-100")} />
                                                     ) : msg.delivered ? (
                                                         <CheckCheck size={12} className={clsx(theme.unreadTick, "opacity-65")} />
                                                     ) : (
                                                         <Check size={12} className={clsx(theme.unreadTick, "opacity-65")} />
                                                     )
                                                 )}
                                             </span>
                                             <LinkPreviewCard text={msg.text} />
                                         </div>
                                     )}
                                    {(msg.type === "image" || msg.type === "video") && (
                                        <MediaMessageBubble
                                            msg={msg}
                                            isMe={isMe}
                                            theme={theme}
                                            setFullscreenMedia={setFullscreenMedia}
                                        />
                                    )}
                                    {msg.type === "media-group" && (
                                        <MediaGroupBubble
                                            msg={msg}
                                            isMe={isMe}
                                            theme={theme}
                                            setFullscreenMedia={setFullscreenMedia}
                                        />
                                    )}
                                    {msg.type === "voice" && (() => {
                                        const chatTheme = currentUser?.settings?.chatTheme || "default";
                                        const isDefaultOrWhatsapp = chatTheme === "default" || chatTheme === "whatsapp";
                                        
                                        return (
                                            <div className="flex items-center gap-3 min-w-[200px] py-1">
                                                <button
                                                    onClick={() => playVoice(msg.id, msg.imageUrl || "", undefined, msg.duration)}
                                                    className={clsx(
                                                        "w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shrink-0", 
                                                        isMe 
                                                            ? (isDefaultOrWhatsapp ? "bg-black/8 text-zinc-750 dark:bg-white/15 dark:text-[#e9edef]" : "bg-white/20 text-white") 
                                                            : "bg-black/8 text-zinc-750 dark:bg-white/15 dark:text-[#e9edef]"
                                                    )}
                                                >
                                                    {playingVoiceId === msg.id ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                                                </button>
                                                <div className="flex-1">
                                                    <div 
                                                        onClick={(e) => handleVoiceSeek(e, msg)}
                                                        className="h-8 w-full flex items-center justify-start gap-[2.5px] cursor-pointer"
                                                    >
                                                        {getWaveAmplitudes(msg.id).map((amp, idx, arr) => {
                                                            const threshold = (idx / arr.length) * 100;
                                                            const isPlayed = (voicePlaybackProgress[msg.id] || 0) >= threshold;
                                                            return (
                                                                <div 
                                                                    key={idx} 
                                                                    className={clsx(
                                                                        "w-[3px] rounded-full transition-all duration-75",
                                                                        isPlayed 
                                                                            ? (isMe ? (isDefaultOrWhatsapp ? "bg-[#00a884] dark:bg-[#00c89a]" : "bg-white") : "bg-[#00a884] dark:bg-[#00c89a]") 
                                                                            : (isMe ? (isDefaultOrWhatsapp ? "bg-black/15 dark:bg-white/20" : "bg-white/30") : "bg-black/15 dark:bg-white/20")
                                                                    )}
                                                                    style={{ height: `${amp}px` }}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                    <span className="text-[10px] opacity-75 mt-1 block select-none pointer-events-none">
                                                        🎤 Voice Note ({msg.duration ? formatTime(msg.duration) : "0:00"})
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    {msg.type === "file" && (
                                        <a 
                                            href={msg.imageUrl || msg.fileUrl || "#"} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            download={msg.fileName || "file"}
                                            className="flex items-center gap-3 p-2 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl border border-black/5 dark:border-white/5 transition-colors cursor-pointer"
                                        >
                                            <FileText size={24} className="text-[var(--secondary)] shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold truncate hover:underline">{msg.fileName || "file"}</p>
                                                <p className="text-[10px] opacity-70 mt-0.5">{msg.fileSize || "0 KB"}</p>
                                            </div>
                                            {(msg.imageUrl || msg.fileUrl) && (
                                                <Download size={16} className="text-gray-400 hover:text-gray-650 dark:hover:text-gray-200 shrink-0 ml-1" />
                                            )}
                                        </a>
                                    )}
                                    {msg.type === "poll" && msg.poll && (
                                         <div className="min-w-[260px] md:min-w-[300px] p-1.5 flex flex-col">
                                             <div className="flex flex-col space-y-1 pl-1">
                                                 <p className="text-sm font-bold leading-tight">{msg.poll.question}</p>
                                                 <div className="flex items-center gap-1.5 text-[11px] opacity-75 font-medium">
                                                     {msg.poll.allowMultiple ? (
                                                         <>
                                                             <CheckCheck size={12} className="stroke-[2.5]" />
                                                             <span>Select one or more</span>
                                                         </>
                                                     ) : (
                                                         <>
                                                             <Check size={12} className="stroke-[2.5]" />
                                                             <span>Select one</span>
                                                         </>
                                                     )}
                                                 </div>
                                             </div>
                                             <div className="space-y-3 mt-4">
                                                 {msg.poll.options.map((opt: any, oIdx: number) => {
                                                     const totalVotes = msg.poll!.options.reduce((sum: number, o: any) => sum + (o.votes || 0), 0);
                                                     const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                                                     const isVoted = msg.poll!.votedIndices?.includes(oIdx);

                                                     return (
                                                         <div
                                                             key={oIdx}
                                                             onClick={() => votePoll(thread.id, msg.id, oIdx)}
                                                             className="flex items-start gap-3 cursor-pointer group select-none relative"
                                                         >
                                                             {/* Circle/Checkbox Indicator */}
                                                             <div className={clsx(
                                                                 "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200",
                                                                 isVoted
                                                                     ? "bg-emerald-500 border-emerald-500 text-white"
                                                                     : "border-current/40 group-hover:border-current/60"
                                                             )}>
                                                                 {isVoted && (
                                                                     msg.poll!.allowMultiple ? (
                                                                         <Check size={12} className="stroke-[3.5]" />
                                                                     ) : (
                                                                         <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                                                     )
                                                                 )}
                                                             </div>

                                                             {/* Progress and Option Label */}
                                                             <div className="flex-1 space-y-1.5">
                                                                 <div className="flex justify-between items-center text-xs font-semibold text-current leading-none pr-1">
                                                                     <span>{opt.text}</span>
                                                                     <span className="opacity-75 text-[10.5px]">{opt.votes || 0}</span>
                                                                 </div>
                                                                 {/* Custom Progress Track and Bar */}
                                                                 <div className="w-full h-[6px] bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                                                     <div 
                                                                         className="h-full bg-current/25 rounded-full transition-all duration-300" 
                                                                         style={{ width: `${percentage}%` }} 
                                                                     />
                                                                 </div>
                                                             </div>
                                                         </div>
                                                     );
                                                 })}
                                             </div>
                                             {/* Footer View Votes button */}
                                             <div className="border-t border-black/5 dark:border-white/5 mt-4 pt-2.5 text-center">
                                                 <button 
                                                     className="text-xs font-semibold text-current hover:opacity-80 transition-opacity"
                                                     onClick={(e) => {
                                                         e.stopPropagation();
                                                         setVotingDetailsMessage(msg);
                                                     }}
                                                 >
                                                     View votes
                                                 </button>
                                             </div>
                                         </div>
                                     )}

                                    {msg.type === "call" && msg.callLog && (
                                        <div className="min-w-[170px] py-0.5 flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <div className={clsx(
                                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                                                    msg.callLog.status === "missed" || msg.callLog.status === "rejected"
                                                        ? "bg-red-50 dark:bg-red-950/30 text-red-500"
                                                        : "bg-green-50 dark:bg-green-950/30 text-green-500"
                                                )}>
                                                    {msg.callLog.type === "video" ? <Video size={14} /> : <Phone size={14} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                                        {msg.callLog.type === "video" ? "Video Call" : "Voice Call"}
                                                    </p>
                                                    <p className="text-[10px] text-[var(--secondary)] truncate">
                                                        {msg.callLog.status === "missed" && "Missed"}
                                                        {msg.callLog.status === "rejected" && "Declined"}
                                                        {msg.callLog.status === "answered" && "Answered"}
                                                        {msg.callLog.status === "ringing" && "Ringing"}
                                                        {msg.callLog.status === "ended" && `Ended • ${msg.callLog.duration !== undefined ? formatDuration(msg.callLog.duration) : "0s"}`}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {/* Action Button: Call Back */}
                                            <button
                                                onClick={() => initiateCall(thread.user.id, thread.user.name, thread.user.avatar, msg.callLog.type)}
                                                className="w-full py-1 bg-white hover:bg-gray-50 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 text-[11px] font-semibold text-[var(--primary)] dark:text-blue-400 rounded-xl transition-all flex items-center justify-center gap-1.5 border border-gray-150 dark:border-zinc-700/50 hover:scale-[1.01] active:scale-[0.98]"
                                            >
                                                {msg.callLog.type === "video" ? <Video size={11} /> : <Phone size={11} />}
                                                {isMe ? "Call Again" : "Call Back"}
                                            </button>
                                        </div>
                                    )}
                                    {msg.type === "location" && (
                                         <div className="w-[260px] md:w-[280px] flex flex-col">
                                             <a
                                                 href={`https://www.google.com/maps/search/?api=1&query=${msg.latitude},${msg.longitude}`}
                                                 target="_blank"
                                                 rel="noopener noreferrer"
                                                 onClick={(e) => e.stopPropagation()}
                                                 className="relative w-full h-[140px] overflow-hidden block hover:opacity-95 transition-opacity"
                                             >
                                                 {/* Beautiful Map Fallback Vector Background */}
                                                 <div className="absolute inset-0 bg-[#e5e9f0] dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                                                     <div className="absolute inset-0 opacity-[0.15] dark:opacity-[0.08]" style={{
                                                         backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px), linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)',
                                                         backgroundSize: '8px 8px, 40px 40px, 40px 40px'
                                                     }} />
                                                     <div className="absolute w-[200%] h-[12px] bg-white/60 dark:bg-zinc-700/40 rotate-[35deg] transform -translate-y-8" />
                                                     <div className="absolute w-[200%] h-[16px] bg-white/60 dark:bg-zinc-700/40 rotate-[-15deg] transform translate-y-12" />
                                                     <div className="absolute w-[14px] h-[200%] bg-white/60 dark:bg-zinc-700/40 left-1/3 transform -translate-x-1/2" />
                                                 </div>
                                                 <img 
                                                     src={`https://staticmap.openstreetmap.de/staticmap.php?center=${msg.latitude},${msg.longitude}&zoom=15&size=280x140&maptype=mapnik&markers=${msg.latitude},${msg.longitude},red-pushpin`}
                                                     alt="Map location"
                                                     className="absolute inset-0 w-full h-full object-cover"
                                                     onError={(e) => {
                                                         e.currentTarget.style.display = 'none';
                                                     }}
                                                     loading="lazy"
                                                 />
                                                 <div className="absolute inset-0 flex items-center justify-center">
                                                     <div className="w-10 h-10 rounded-full bg-white/95 dark:bg-zinc-900/95 shadow-md flex items-center justify-center text-emerald-500 hover:scale-105 active:scale-[0.95] transition-transform">
                                                         <MapPin size={20} className="fill-current text-emerald-600 dark:text-emerald-500" />
                                                     </div>
                                                 </div>
                                             </a>
                                             <div className="px-3.5 pt-3 pb-3 flex flex-col gap-2.5">
                                                 <div className="flex flex-col gap-0.5">
                                                     <p className="text-[13px] font-bold text-gray-900 dark:text-white leading-tight">Shared Location</p>
                                                     <p className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">
                                                         Lat: {Number(msg.latitude).toFixed(4)}, Lng: {Number(msg.longitude).toFixed(4)}
                                                     </p>
                                                 </div>
                                                 <a
                                                     href={`https://www.google.com/maps/search/?api=1&query=${msg.latitude},${msg.longitude}`}
                                                     target="_blank"
                                                     rel="noopener noreferrer"
                                                     onClick={(e) => e.stopPropagation()}
                                                     className="w-full py-2 bg-white/90 hover:bg-white dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-xs font-bold text-[var(--primary)] dark:text-blue-400 rounded-xl transition-all flex items-center justify-center gap-1.5 border border-black/5 dark:border-white/10 hover:scale-[1.01] active:scale-[0.98] shadow-xs"
                                                 >
                                                     <Share2 size={12} />
                                                     Open in Maps
                                                 </a>
                                             </div>
                                         </div>
                                     )}

                                    {msg.type === "contact" && msg.contactUser && (
                                        <div className="min-w-[210px] max-w-[260px] p-1 flex flex-col gap-3">
                                            <div className="flex items-center gap-3">
                                                {msg.contactUser.avatar ? (
                                                    <img 
                                                        src={msg.contactUser.avatar} 
                                                        alt={msg.contactUser.name} 
                                                        className="w-11 h-11 rounded-full object-cover shrink-0 border border-gray-100 dark:border-zinc-700 shadow-sm" 
                                                    />
                                                ) : (
                                                    <div className={clsx("w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 text-white shadow-sm", msg.contactUser.color || "bg-indigo-500")}>
                                                        {msg.contactUser.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                                        {msg.contactUser.name}
                                                    </p>
                                                    <p className="text-[10px] text-[var(--secondary)] truncate">
                                                        {msg.contactUser.bio || "Dating Profile Contact"}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.history.pushState(null, "", `/profile?userId=${msg.contactUser?.id}&from=chat&fromThreadId=${thread.id}`);
                                                }}
                                                className="w-full py-2 bg-white hover:bg-gray-50 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 text-xs font-semibold text-[var(--primary)] dark:text-blue-400 rounded-xl transition-all flex items-center justify-center gap-1.5 border border-gray-150 dark:border-zinc-700/50 hover:scale-[1.01] active:scale-[0.98]"
                                            >
                                                <Users size={12} />
                                                View Profile
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {!(msg.type === "image" || msg.type === "video" || msg.type === "text" || msg.type === "media-group" || msg.type === "location" || msg.type === "contact") && (
                                    <div className="flex items-center justify-end gap-1 text-[9px] px-4 pb-1.5 -mt-0.5 self-end pointer-events-none select-none">
                                        <span className="opacity-70">{getMessageBubbleTimeString(msg.createdAt, msg.time)}</span>
                                        {isMe && (
                                            msg.read ? <CheckCheck size={12} className={clsx(theme.readTick, "opacity-100")} /> : <Check size={12} className={clsx(theme.unreadTick, "opacity-60")} />
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Reactions display badge */}
                            {reactionCounts.length > 0 && (
                                <div className={clsx("flex gap-0.5 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-full px-2 py-0.5 -mt-2.5 z-10 shadow-sm text-xs select-none", isMe ? "mr-2" : "ml-2")}>
                                    {reactionCounts.map(({ emoji, count }) => (
                                        <span key={emoji} className="cursor-pointer hover:scale-110 active:scale-90 transition-transform">{emoji} {count > 1 && <span className="text-[10px] font-semibold">{count}</span>}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                        </div>
                        </div>
                        </Fragment>
                    );
                });
            })()}
            {(() => {
                const isTyping = !!(thread?.typingParticipantIds && thread.typingParticipantIds.includes(thread?.user?.id));
                if (!isTyping) return null;
                const typingBubbleTheme = getBubbleTheme(
                    false,
                    currentUser?.settings?.chatTheme,
                    currentUser?.settings?.wallpaper,
                    currentUser?.settings?.theme
                );
                return (
                    <div className="flex items-start w-full px-3 py-1 flex-row animate-fade-in duration-200">
                        <div className="relative w-fit overflow-visible flex flex-col z-0">
                            <div className={clsx("flex items-center gap-1 px-4 py-3 rounded-2xl shadow-sm max-w-[70%]", typingBubbleTheme.bg)}>
                                <div className="flex gap-1.5 items-center h-3 select-none">
                                    <span className="w-2.5 h-2.5 bg-gray-500/70 dark:bg-gray-400/80 rounded-full typing-dot"></span>
                                    <span className="w-2.5 h-2.5 bg-gray-500/70 dark:bg-gray-400/80 rounded-full typing-dot"></span>
                                    <span className="w-2.5 h-2.5 bg-gray-500/70 dark:bg-gray-400/80 rounded-full typing-dot"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
                <div ref={messagesEndRef} />
            </div>
        </div>

            {/* Bottom Input Area */}
            <div className="border-t border-[var(--border)] dark:border-zinc-800 bg-[var(--card)] dark:bg-zinc-950 p-2 md:p-3 pb-6 md:pb-3 flex flex-col gap-2 shrink-0 z-10">
                {thread?.isGroup && thread.leftParticipantIds?.includes(currentUser.id) ? (
                    <div className="flex items-center justify-center gap-2 py-3.5 px-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
                        <LogOut size={16} className="text-zinc-400 shrink-0" />
                        <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">You left this blend</span>
                    </div>
                ) : isBulkSelectMode ? (
                    <div className="flex items-center justify-between px-3 py-2 animate-in slide-in-from-bottom duration-200">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={cancelBulkDelete}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-gray-500 dark:text-zinc-400"
                                title="Cancel Selection"
                            >
                                <X size={20} />
                            </button>
                            <span className="font-semibold text-sm dark:text-white">
                                {bulkDeleteIds.size} selected
                            </span>
                        </div>

                        <button
                            onClick={() => setShowConfirmDeleteMessage(true)}
                            disabled={bulkDeleteIds.size === 0}
                            className={clsx(
                                "p-2.5 rounded-full transition-all flex items-center justify-center",
                                bulkDeleteIds.size === 0
                                    ? "text-gray-400 cursor-not-allowed opacity-50"
                                    : "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-95"
                            )}
                            title="Delete Messages"
                        >
                            <Trash2 size={22} />
                        </button>
                    </div>
                ) : (
                    <>
                        {replyingTo && (
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-zinc-900 px-3 py-2 rounded-xl border border-gray-100 dark:border-zinc-800 text-xs">
                                <div className="flex items-center gap-2 border-l-3 border-[var(--primary)] pl-2 min-w-0">
                                    <Reply size={14} className="text-[var(--primary)] shrink-0" />
                                    <div className="truncate">
                                        <span className="font-bold text-[var(--primary)] block">Replying to {replyingTo.sender === "me" ? "yourself" : thread.isGroup && replyingTo.senderId ? (allDatingUsers.find(u => u.id === replyingTo.senderId)?.name || "Member") : thread.user.name}</span>
                                        <span className="text-[var(--secondary)] truncate block">{replyingTo.text}</span>
                                    </div>
                                </div>
                                <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-full">
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                        {editingMessage && (
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-zinc-900 px-3 py-2 rounded-xl border border-gray-100 dark:border-zinc-800 text-xs">
                                <div className="flex items-center gap-2 border-l-3 border-[var(--primary)] pl-2 min-w-0">
                                    <Edit2 size={14} className="text-[var(--primary)] shrink-0" />
                                    <div className="truncate">
                                        <span className="font-bold text-[var(--primary)] block">Editing Message</span>
                                        <span className="text-[var(--secondary)] truncate block">{editingMessage.text}</span>
                                    </div>
                                </div>
                                <button onClick={() => { setEditingMessage(null); setInputText(""); }} className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-full">
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        {recordingState !== "idle" ? (
                            <div className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 dark:bg-zinc-900 rounded-full border border-gray-150 dark:border-zinc-800 animate-fade-in transition-all">
                                <button
                                    onClick={cancelVoiceRecording}
                                    className="p-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-500 rounded-full transition-colors shrink-0"
                                    title="Discard Recording"
                                >
                                    <Trash2 size={18} />
                                </button>

                                <div className="flex-1 flex items-center justify-center gap-3 min-w-0">
                                    {recordingState === "preview" ? (
                                        <div className="w-full flex items-center gap-3 px-2">
                                            <button
                                                onClick={playPausePreview}
                                                className="p-2 bg-[var(--primary)] text-white rounded-full transition-all shrink-0 hover:scale-105 active:scale-95 flex items-center justify-center"
                                            >
                                                {isPlayingPreview ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                                            </button>
                                            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full relative overflow-hidden">
                                                <div 
                                                    className="h-full bg-[var(--primary)] rounded-full transition-all duration-75" 
                                                    style={{ width: `${previewProgress}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 shrink-0">
                                                {formatTime(recordingTime)}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 w-full justify-between px-2">
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <div className={clsx(
                                                    "w-2 h-2 rounded-full bg-red-500",
                                                    recordingState === "recording" && "animate-ping"
                                                )} />
                                                <span className="text-xs font-semibold text-gray-650 dark:text-zinc-300">
                                                    {recordingState === "recording" ? "Recording" : "Paused"}
                                                </span>
                                            </div>
                                            
                                            <div className="flex-1 flex items-center justify-center gap-[3px] h-8 max-w-[160px] overflow-hidden px-2">
                                                {audioAmplitudes.map((amp, idx) => (
                                                    <div 
                                                        key={idx} 
                                                        className={clsx(
                                                            "w-[3px] rounded-full bg-[var(--primary)] transition-all duration-75",
                                                            recordingState === "paused" && "opacity-50"
                                                        )}
                                                        style={{ height: `${amp}px` }}
                                                    />
                                                ))}
                                            </div>

                                            <span className="text-xs font-mono text-gray-650 dark:text-zinc-400 shrink-0">
                                                {formatTime(recordingTime)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {recordingState === "recording" && (
                                        <>
                                            <button
                                                onClick={pauseVoiceRecording}
                                                className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 rounded-full transition-colors"
                                                title="Pause Recording"
                                            >
                                                <Pause size={16} />
                                            </button>
                                            <button
                                                onClick={stopAndPreviewVoiceRecording}
                                                className="p-2.5 bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-[var(--primary)] rounded-full transition-colors"
                                                title="Stop & Preview"
                                            >
                                                <Square size={14} className="fill-[var(--primary)]" />
                                            </button>
                                        </>
                                    )}
                                    {recordingState === "paused" && (
                                        <>
                                            <button
                                                onClick={resumeVoiceRecording}
                                                className="p-2.5 bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-900/40 text-green-600 rounded-full transition-colors"
                                                title="Resume Recording"
                                            >
                                                <Mic size={16} />
                                            </button>
                                            <button
                                                onClick={stopAndPreviewVoiceRecording}
                                                className="p-2.5 bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-[var(--primary)] rounded-full transition-colors"
                                                title="Stop & Preview"
                                            >
                                                <Square size={14} className="fill-[var(--primary)]" />
                                            </button>
                                        </>
                                    )}
                                    {recordingState === "preview" && (
                                        <button
                                            onClick={sendVoiceRecording}
                                            className="p-3 bg-[var(--primary)] text-white rounded-full transition-all hover:scale-[1.03] active:scale-[0.97]"
                                            title="Send Voice Note"
                                        >
                                            <Send size={18} className="ml-0.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                             <div className="flex items-center gap-2 relative">
                                 {showMentionSuggestions && thread?.isGroup && (
                                     (() => {
                                         const otherMembers = (thread.groupMemberIds || [])
                                             .filter((mid: string) => mid !== currentUser?.id)
                                             .map((mid: string) => allDatingUsers.find(u => u.id === mid))
                                             .filter((u): u is User => !!u);
                                         const filtered = otherMembers.filter(m =>
                                             m.name.toLowerCase().includes(mentionSearchQuery.toLowerCase())
                                         );

                                         if (filtered.length === 0) return null;

                                         return (
                                             <div className="absolute bottom-[56px] left-0 right-0 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-xl p-2 z-50 flex flex-col gap-0.5 max-h-[220px] overflow-y-auto scrollbar-thin">
                                                 <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                                     Mention Member
                                                 </div>
                                                 {filtered.map(member => (
                                                     <button
                                                         key={member.id}
                                                         onClick={() => handleSelectMention(member)}
                                                         className="flex items-center gap-3 w-full px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-850 dark:hover:bg-zinc-800/60 rounded-xl transition-colors text-left cursor-pointer select-none"
                                                     >
                                                         {member.avatar ? (
                                                             <img src={member.avatar} alt={member.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                                                         ) : (
                                                             <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white", member.color || "bg-emerald-500")}>
                                                                 {member.name.charAt(0).toUpperCase()}
                                                             </div>
                                                         )}
                                                         <div className="flex-1 min-w-0">
                                                             <span className="font-semibold text-xs text-black dark:text-white block truncate">{member.name}</span>
                                                             <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block truncate">{member.marketplaceStore?.headline || (member.bio && !member.bio.includes("Hey there") ? member.bio : "Verified local seller on Yogheart Marketplace.")}</span>
                                                         </div>
                                                     </button>
                                                 ))}
                                             </div>
                                         );
                                     })()
                                 )}
                                 <button
                                     onClick={() => setShowAttachMenu(!showAttachMenu)}
                                     className={clsx("p-2.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors", showAttachMenu && "bg-gray-100 dark:bg-zinc-800 text-[var(--primary)]")}
                                 >
                                     <Paperclip size={20} className={clsx("transition-transform duration-250", showAttachMenu && "rotate-45")} />
                                 </button>
                                 <textarea
                                     ref={inputRef}
                                     value={inputText}
                                     onChange={handleInputChange}
                                     onKeyDown={(e) => {
                                         if (e.key === "Enter" && !e.shiftKey) {
                                             e.preventDefault();
                                             handleSend();
                                         }
                                     }}
                                     onFocus={() => {
                                         if (typeof window !== "undefined") {
                                             window.scrollTo(0, 0);
                                         }
                                         setTimeout(() => {
                                             scrollToBottom("smooth");
                                         }, 150);
                                     }}
                                     placeholder="Type a message..."
                                     rows={1}
                                     className="flex-1 px-4 py-3 bg-[var(--card)] dark:bg-zinc-900 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-gray-400 text-sm resize-none overflow-y-auto max-h-[120px]"
                                 />
                                 <button
                                     onTouchEnd={handleSendClick}
                                     onClick={handleSendClick}
                                     className={clsx("p-3 text-white rounded-full transition-all shrink-0 hover:scale-[1.03] active:scale-[0.97]", "bg-[var(--primary)]")}
                                 >
                                     {inputText.trim() || editingMessage ? <Send size={18} /> : <Mic size={18} />}
                                 </button>
                             </div>
                        )}
                    </>
                )}
            </div>

            {/* Attach Menu overlay */}
            {showAttachMenu && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
                    <div className="absolute left-4 bottom-20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-gray-150/40 dark:border-zinc-800/40 shadow-2xl p-4 rounded-[28px] max-w-[340px] grid grid-cols-4 gap-4 z-50 animate-in slide-in-from-bottom duration-200">
                        {([
                            { type: "photo", icon: Image, color: "text-blue-500", label: "Photos" },
                            { type: "camera", icon: Camera, color: "text-rose-500", label: "Camera" },
                            { type: "video", icon: Video, color: "text-purple-500", label: "Video" },
                            { type: "location", icon: MapPin, color: "text-emerald-500", label: "Location" },
                            { type: "contact", icon: LucideUser, color: "text-amber-500", label: "Contact" },
                            { type: "file", icon: FileText, color: "text-sky-500", label: "Document" },
                            { type: "poll", icon: BarChart3, color: "text-indigo-500", label: "Poll" },
                        ] as any[]).map(opt => (
                            <button
                                key={opt.type}
                                onClick={() => handleAttachment(opt.type)}
                                className="flex flex-col items-center gap-1.5 hover:scale-105 active:scale-95 transition-transform"
                            >
                                <div className="w-14 h-14 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center shadow-sm border border-gray-100 dark:border-zinc-700/30">
                                    <opt.icon size={22} className={opt.color} />
                                </div>
                                <span className="text-[11px] font-medium text-gray-700 dark:text-zinc-300 mt-1">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}

            {/* Delete Chat Modal */}
            {showConfirmDeleteChat && (
                <div className="modal-overlay" onClick={() => setShowConfirmDeleteChat(false)}>
                    <div className="modal-content p-6 max-w-sm" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-2 dark:text-white">
                            {thread.isGroup ? "Delete Blend?" : "Delete Chat?"}
                        </h3>
                        <p className="text-[var(--secondary)] text-sm mb-4">
                            {thread.isGroup 
                                ? (isCreator 
                                    ? `Are you sure you want to permanently delete the blend "${thread.groupName || "Group Chat"}"? This will remove the group and all messages for every member. This action cannot be undone.`
                                    : `Are you sure you want to delete the blend "${thread.groupName || "Group Chat"}" from your conversations? The group will still exist for other members.`)
                                : `Are you sure you want to delete the chat with ${thread.user.name}? This action cannot be undone.`}
                        </p>
                        {!thread.isGroup && (
                            <div className="space-y-3 mb-6">
                                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-zinc-700">
                                    <input
                                        type="radio"
                                        name="deleteOption"
                                        checked={deleteOption === "me"}
                                        onChange={() => setDeleteOption("me")}
                                        className="text-[var(--primary)] focus:ring-[var(--primary)]"
                                    />
                                    <div>
                                        <p className="text-sm font-semibold dark:text-white">Delete for me</p>
                                        <p className="text-[10px] text-[var(--secondary)]">Only remove it from your device</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-zinc-700">
                                    <input
                                        type="radio"
                                        name="deleteOption"
                                        checked={deleteOption === "everyone"}
                                        onChange={() => setDeleteOption("everyone")}
                                        className="text-[var(--primary)] focus:ring-[var(--primary)]"
                                    />
                                    <div>
                                        <p className="text-sm font-semibold dark:text-white">Delete for everyone</p>
                                        <p className="text-[10px] text-[var(--secondary)]">Remove it for both participants</p>
                                    </div>
                                </label>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmDeleteChat(false)}
                                className="flex-1 py-3 bg-[var(--card)] dark:bg-zinc-800 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-zinc-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (thread.isGroup && isCreator) {
                                        deleteThread(thread.id, true);
                                    } else if (thread.isGroup) {
                                        deleteThread(thread.id, false);
                                    } else {
                                        deleteThread(thread.id, deleteOption === "everyone");
                                    }
                                    setShowConfirmDeleteChat(false);
                                    onClose();
                                }}
                                className="flex-1 py-3 bg-[var(--danger)] text-white rounded-xl font-medium hover:opacity-90"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Group Members Modal */}
            {showAddMembersModal && (
                <div className="modal-overlay" onClick={() => setShowAddMembersModal(false)}>
                    <div className="modal-content p-5 max-w-md w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800 shrink-0">
                            <h3 className="text-lg font-bold text-black dark:text-white">Add Members</h3>
                            <button onClick={() => setShowAddMembersModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full">
                                <X size={20} className="text-zinc-500" />
                            </button>
                        </div>
                        
                        {/* Search candidates */}
                        <div className="py-3 shrink-0">
                            <input 
                                type="text"
                                placeholder="Search contacts..."
                                value={addMembersSearch}
                                onChange={e => setAddMembersSearch(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-transparent focus:border-zinc-200 focus:bg-white rounded-xl text-sm outline-none text-black dark:text-white dark:focus:bg-zinc-900 dark:focus:border-zinc-800"
                            />
                        </div>

                        {/* List of candidates */}
                        <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[40vh] space-y-2 py-1 pr-1 scrollbar-thin">
                            {(() => {
                                // Build matched contacts from phone list
                                const registeredUsersByPhone = new Map<string, any>();
                                allDatingUsers.forEach(u => {
                                    if (u.phoneNumber) {
                                        const clean = u.phoneNumber.replace(/\D/g, "");
                                        registeredUsersByPhone.set(clean, u);
                                    }
                                });

                                const localContacts = currentUser?.localContacts || [];
                                const matchedContacts: { contactName: string; user: any }[] = [];
                                localContacts.forEach(contact => {
                                    if (!contact.phoneNumber) return;
                                    const clean = contact.phoneNumber.replace(/\D/g, "");
                                    const matchedUser = registeredUsersByPhone.get(clean);
                                    if (matchedUser && matchedUser.id !== currentUser.id) {
                                        if (!matchedContacts.some(m => m.user.id === matchedUser.id)) {
                                            matchedContacts.push({ contactName: contact.name, user: matchedUser });
                                        }
                                    }
                                });

                                const candidates: { id: string; name: string; avatar: string | null; color?: string; bio?: string }[] = [];
                                const seenIds = new Set<string>();

                                // Add active chat partners (who are not groups)
                                threads.forEach(t => {
                                    if (!t.isGroup && t.user && !seenIds.has(t.user.id)) {
                                        const isAlreadyMember = thread?.groupMemberIds?.includes(t.user.id);
                                        if (!isAlreadyMember) {
                                            candidates.push({
                                                id: t.user.id,
                                                name: t.user.name,
                                                avatar: t.user.avatar,
                                                color: t.user.color,
                                                bio: t.user.bio
                                            });
                                            seenIds.add(t.user.id);
                                        }
                                    }
                                });

                                // Add matched contacts who are not already added
                                matchedContacts.forEach(m => {
                                    if (m.user && !seenIds.has(m.user.id)) {
                                        const isAlreadyMember = thread?.groupMemberIds?.includes(m.user.id);
                                        if (!isAlreadyMember) {
                                            candidates.push({
                                                id: m.user.id,
                                                name: m.contactName,
                                                avatar: m.user.avatar,
                                                color: m.user.color,
                                                bio: m.user.bio
                                            });
                                            seenIds.add(m.user.id);
                                        }
                                    }
                                });

                                // Apply search query filter
                                const filteredCandidates = candidates.filter(cand => {
                                    if (!addMembersSearch.trim()) return true;
                                    return cand.name.toLowerCase().includes(addMembersSearch.toLowerCase());
                                });

                                if (filteredCandidates.length === 0) {
                                    return (
                                        <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-sm">
                                            No eligible contacts to add
                                        </div>
                                    );
                                }

                                return filteredCandidates.map(cand => {
                                    const isChecked = selectedAddMemberIds.has(cand.id);
                                    const initial = cand.name.charAt(0).toUpperCase() || "?";
                                    return (
                                        <div 
                                            key={cand.id}
                                            onClick={() => {
                                                const next = new Set(selectedAddMemberIds);
                                                if (isChecked) next.delete(cand.id);
                                                else next.add(cand.id);
                                                setSelectedAddMemberIds(next);
                                            }}
                                            className="flex items-center justify-between p-2.5 hover:bg-gray-50 dark:hover:bg-zinc-900/50 rounded-xl cursor-pointer transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                {cand.avatar ? (
                                                    <img src={cand.avatar} alt={cand.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                                                ) : (
                                                    <div className={clsx("w-9 h-9 rounded-full flex items-center justify-center font-bold text-gray-950 text-sm shrink-0", cand.color || "bg-emerald-150")}>
                                                        {initial}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <span className="font-semibold text-xs text-black dark:text-white block truncate">{cand.name}</span>
                                                    <span className="text-[10px] text-zinc-450 dark:text-zinc-500 block truncate">{(cand as any).marketplaceStore?.headline || (cand.bio && !cand.bio.includes("Hey there") ? cand.bio : "Verified local seller on Yogheart Marketplace.")}</span>
                                                </div>
                                            </div>
                                            <input 
                                                type="checkbox"
                                                checked={isChecked}
                                                readOnly
                                                className="rounded border-zinc-300 text-[var(--primary)] focus:ring-[var(--primary)] pointer-events-none"
                                            />
                                        </div>
                                    );
                                });
                            })()}
                        </div>

                        {/* Footer buttons */}
                        <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-end gap-3 shrink-0">
                            <button 
                                onClick={() => setShowAddMembersModal(false)}
                                className="px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleAddMembersConfirm}
                                disabled={selectedAddMemberIds.size === 0}
                                className="px-5 py-2.5 bg-[var(--primary)] hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                            >
                                Add ({selectedAddMemberIds.size})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Leave Group Confirmation Modal */}
            {showConfirmLeaveGroup && (
                <div className="modal-overlay" onClick={() => setShowConfirmLeaveGroup(false)}>
                    <div className="modal-content p-6 max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-2 text-black dark:text-white">Leave Blend?</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
                            Are you sure you want to leave the blend "{thread.groupName || "Group Chat"}"? You will no longer receive messages from this conversation.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmLeaveGroup(false)}
                                className="flex-1 py-3 bg-gray-100 dark:bg-zinc-800 text-black dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmLeaveGroup}
                                className="flex-1 py-3 bg-[var(--danger)] text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                            >
                                Leave
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Member Confirmation Modal */}
            {memberToRemove && (
                <div className="modal-overlay" onClick={() => setMemberToRemove(null)}>
                    <div className="modal-content p-6 max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-2 text-black dark:text-white">Remove Member?</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
                            Are you sure you want to remove {memberToRemove.name} from the blend? They will be removed from the conversation and won't see new messages.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setMemberToRemove(null)}
                                className="flex-1 py-3 bg-gray-100 dark:bg-zinc-800 text-black dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmRemoveMember}
                                className="flex-1 py-3 bg-[var(--danger)] text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Message Modal */}
            {showConfirmDeleteMessage && (
                <div className="modal-overlay" onClick={cancelBulkDelete}>
                    <div className="modal-content p-6 max-w-sm" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-1 dark:text-white">
                            Delete {bulkDeleteIds.size === 1 ? "Message" : `${bulkDeleteIds.size} Messages`}?
                        </h3>
                        <p className="text-[var(--secondary)] text-sm mb-1">
                            {bulkDeleteIds.size === 1
                                ? "Are you sure you want to delete this message?"
                                : `You have selected ${bulkDeleteIds.size} messages to delete.`}
                        </p>
                        <p className="text-[var(--primary)] text-xs font-semibold mb-4">
                            Tap messages in the chat to select more
                        </p>
                        <div className="space-y-3 mb-6">
                            <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-zinc-700">
                                <input
                                    type="radio"
                                    name="deleteMsgOption"
                                    checked={deleteOption === "me"}
                                    onChange={() => setDeleteOption("me")}
                                    className="text-[var(--primary)] focus:ring-[var(--primary)]"
                                />
                                <div>
                                    <p className="text-sm font-semibold dark:text-white">Delete for me</p>
                                    <p className="text-[10px] text-[var(--secondary)]">Only remove from your device</p>
                                </div>
                            </label>
                            <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-zinc-700">
                                <input
                                    type="radio"
                                    name="deleteMsgOption"
                                    checked={deleteOption === "everyone"}
                                    onChange={() => setDeleteOption("everyone")}
                                    className="text-[var(--primary)] focus:ring-[var(--primary)]"
                                />
                                <div>
                                    <p className="text-sm font-semibold dark:text-white">Delete for everyone</p>
                                    <p className="text-[10px] text-[var(--secondary)]">Remove for both participants</p>
                                </div>
                            </label>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={cancelBulkDelete}
                                className="flex-1 py-3 bg-[var(--card)] dark:bg-zinc-800 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-zinc-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteMessage}
                                disabled={bulkDeleteIds.size === 0}
                                className={clsx(
                                    "flex-1 py-3 text-white rounded-xl font-medium transition-opacity",
                                    bulkDeleteIds.size === 0 ? "bg-gray-400 opacity-50 cursor-not-allowed" : "bg-[var(--danger)] hover:opacity-90"
                                )}
                            >
                                Delete{bulkDeleteIds.size > 1 ? ` (${bulkDeleteIds.size})` : ""}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Block Confirmation Modal */}
            {showConfirmBlock && (
                <div className="modal-overlay" onClick={() => setShowConfirmBlock(false)}>
                    <div className="modal-content p-6 max-w-sm" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-2 dark:text-white">Block {thread.user.name}?</h3>
                        <p className="text-[var(--secondary)] mb-6 text-sm">
                            {"They won't be able to message you or see your profile. This can be undone in settings."}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmBlock(false)}
                                className="flex-1 py-3 bg-[var(--card)] dark:bg-zinc-800 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-zinc-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBlockUser}
                                className="flex-1 py-3 bg-[var(--danger)] text-white rounded-xl font-medium hover:opacity-90"
                            >
                                Block
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Modal */}
            {showReportModal && (
                <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
                    <div className="modal-content p-6 max-w-sm" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-4 dark:text-white">Report {thread.user.name}</h3>
                        <p className="text-[var(--secondary)] text-sm mb-4">Why are you reporting this user?</p>
                        <div className="space-y-2">
                            {["Spam", "Inappropriate content", "Harassment", "Fake profile", "Other"].map(reason => (
                                <button
                                    key={reason}
                                    onClick={() => handleReport(reason)}
                                    className="w-full py-3 text-left px-4 bg-gray-50 dark:bg-zinc-800 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors dark:text-white text-sm"
                                >
                                    {reason}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowReportModal(false)}
                            className="w-full py-3 mt-4 text-[var(--secondary)] font-medium text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Clear Chat Modal */}
            {showConfirmClear && (
                <div className="modal-overlay" onClick={() => setShowConfirmClear(false)}>
                    <div className="modal-content p-6 max-w-sm" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-2 dark:text-white">Clear Chat?</h3>
                        <p className="text-[var(--secondary)] mb-6 text-sm">
                            Are you sure you want to clear all messages in this conversation? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmClear(false)}
                                className="flex-1 py-3 bg-[var(--card)] dark:bg-zinc-800 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-zinc-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleClearChat}
                                className="flex-1 py-3 bg-[var(--danger)] text-white rounded-xl font-medium hover:opacity-90"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Message Context Menu overlay */}
            {typeof window !== "undefined" && showContextMenu && selectedMessage && createPortal(
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowContextMenu(false)} />
                    <div
                        className="fixed bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-[var(--border)] dark:border-zinc-800 py-1.5 min-w-[180px] z-50 animate-in fade-in zoom-in-95 duration-150"
                        style={{
                            ...(contextMenuPos.y > window.innerHeight / 2 ? { bottom: window.innerHeight - contextMenuPos.y } : { top: contextMenuPos.y }),
                            ...(contextMenuPos.x > window.innerWidth / 2 ? { right: window.innerWidth - contextMenuPos.x } : { left: contextMenuPos.x })
                        }}
                    >
                        <button
                            onClick={handleReply}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800 text-left text-black dark:text-white font-medium transition-colors text-sm"
                        >
                            <Reply size={16} className="text-[var(--secondary)]" /> Reply
                        </button>
                        <button
                            onClick={handleCopy}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800 text-left text-black dark:text-white font-medium transition-colors text-sm"
                        >
                            <Copy size={16} className="text-[var(--secondary)]" /> Copy Text
                        </button>
                        {selectedMessage.sender === "me" && (
                            <button
                                onClick={handleEdit}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800 text-left text-black dark:text-white font-medium transition-colors text-sm"
                            >
                                <Edit2 size={16} className="text-[var(--secondary)]" /> Edit
                            </button>
                        )}
                        <button
                            onClick={handleDelete}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800 text-left text-[var(--danger)] font-medium transition-colors text-sm"
                        >
                            <Trash2 size={16} /> Delete
                        </button>
                    </div>
                </>,
                document.body
            )}



            {/* Fullscreen Media Viewer */}
            {fullscreenMedia && (
                <div 
                    className="fixed md:absolute inset-0 bg-black/95 backdrop-blur-md z-[150] flex flex-col justify-between select-none animate-in fade-in duration-200"
                    onClick={() => setFullscreenMedia(null)}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Top Bar */}
                    <div 
                        className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent shrink-0 z-10 text-white"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setFullscreenMedia(null)}
                            className="p-2.5 bg-zinc-900/60 hover:bg-zinc-800 rounded-full transition-all border border-zinc-800 active:scale-95 flex items-center justify-center"
                            title="Close"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <span className="text-sm font-semibold text-zinc-200">
                            {fullscreenMedia.type === "video" ? "Video" : "Photo"}
                        </span>
                        <div className="flex items-center gap-2">
                            {typeof navigator !== "undefined" && !!navigator.share && (
                                <button
                                    onClick={shareMedia}
                                    disabled={isSavingMedia}
                                    className="p-2.5 bg-zinc-900/60 hover:bg-zinc-800 rounded-full transition-all border border-zinc-800 active:scale-95 flex items-center justify-center text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Share"
                                >
                                    <Share2 size={20} />
                                </button>
                            )}
                            <button
                                onClick={saveToGallery}
                                disabled={isSavingMedia}
                                className="p-2.5 bg-zinc-900/60 hover:bg-zinc-800 rounded-full transition-all border border-zinc-800 active:scale-95 flex items-center justify-center text-[var(--primary)] dark:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Save to Gallery"
                            >
                                {isSavingMedia
                                    ? <svg className="animate-spin" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                                    : <Download size={20} />}
                            </button>
                        </div>
                    </div>
 
                    {/* Media Display Area */}
                    <div className="flex-1 w-full relative overflow-hidden flex items-center justify-center">
                        <div 
                            className="absolute left-0 top-0 flex items-center h-full"
                            style={{
                                width: '300%',
                                transform: trackTransform,
                                transition: trackTransition,
                            }}
                        >
                            {/* Slide 1: Previous Media */}
                            <div className="w-1/3 h-full flex items-center justify-center p-4 shrink-0">
                                {mediaMessages.length > 1 && prevMediaUrl && (
                                    (mediaMessages[currentMediaIndex > 0 ? currentMediaIndex - 1 : mediaMessages.length - 1]?.type === "image") ? (
                                        <img src={prevMediaUrl} className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl" alt="Prev" />
                                    ) : (
                                        <video src={prevMediaUrl} className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl" muted playsInline />
                                    )
                                )}
                            </div>

                            {/* Slide 2: Current Active Media */}
                            <div className="w-1/3 h-full flex items-center justify-center p-4 shrink-0">
                                {mediaMessages[currentMediaIndex] && currentMediaUrl && (
                                    mediaMessages[currentMediaIndex].type === "image" ? (
                                        <img key={fullscreenMedia.id} src={currentMediaUrl} className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-200" alt="Current" onClick={e => e.stopPropagation()} />
                                    ) : (
                                        <video key={fullscreenMedia.id} src={currentMediaUrl} className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl" controls autoPlay loop onClick={e => e.stopPropagation()} />
                                    )
                                )}
                            </div>

                            {/* Slide 3: Next Media */}
                            <div className="w-1/3 h-full flex items-center justify-center p-4 shrink-0">
                                {mediaMessages.length > 1 && nextMediaUrl && (
                                    (mediaMessages[currentMediaIndex < mediaMessages.length - 1 ? currentMediaIndex + 1 : 0]?.type === "image") ? (
                                        <img src={nextMediaUrl} className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl" alt="Next" />
                                    ) : (
                                        <video src={nextMediaUrl} className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl" muted playsInline />
                                    )
                                )}
                            </div>
                        </div>

                        {/* Desktop Navigation Chevrons */}
                        {mediaMessages.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const prevIdx = currentMediaIndex > 0 ? currentMediaIndex - 1 : mediaMessages.length - 1;
                                    triggerSlideTransition("prev", prevIdx);
                                }}
                                className="absolute left-4 p-3 bg-zinc-900/50 hover:bg-zinc-800/80 rounded-full text-white/80 hover:text-white transition-all active:scale-95 z-20 hidden md:flex items-center justify-center shadow-lg border border-zinc-800"
                                title="Previous"
                            >
                                <ChevronLeft size={24} />
                            </button>
                        )}

                        {mediaMessages.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const nextIdx = currentMediaIndex < mediaMessages.length - 1 ? currentMediaIndex + 1 : 0;
                                    triggerSlideTransition("next", nextIdx);
                                }}
                                className="absolute right-4 p-3 bg-zinc-900/50 hover:bg-zinc-800/80 rounded-full text-white/80 hover:text-white transition-all active:scale-95 z-20 hidden md:flex items-center justify-center shadow-lg border border-zinc-800"
                                title="Next"
                            >
                                <ChevronRight size={24} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Transient Toast Notification */}
            {toastMessage && (
                <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] text-white px-5 py-2.5 rounded-full text-xs font-semibold shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300 ${toastMessage.startsWith("✓") ? "bg-emerald-600/90 border border-emerald-500/60" : toastMessage.startsWith("Failed") ? "bg-red-600/90 border border-red-500/60" : "bg-zinc-900/90 border border-zinc-700"}`}>
                    {toastMessage}
                </div>
            )}

            {/* Group Profile slide-in overlay */}
            {showGroupProfile && (
                <div 
                    className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setShowGroupProfile(false)}
                >
                    <div 
                        className="w-full max-w-[450px] h-full bg-[var(--background)] dark:bg-zinc-950 shadow-2xl flex flex-col animate-in slide-in-from-right duration-250"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border)] dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-950">
                            <button 
                                onClick={() => setShowGroupProfile(false)}
                                className="p-1 hover:bg-gray-150 dark:hover:bg-zinc-800 rounded-full"
                            >
                                <ArrowLeft size={20} className="text-[var(--primary)]" />
                            </button>
                            <h2 className="text-base font-bold text-black dark:text-white">Blend Details</h2>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-white dark:bg-zinc-950">
                            {/* Group Card Info */}
                            <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-[var(--border)] dark:border-zinc-800">
                                <div className={clsx(
                                    "w-20 h-20 rounded-full flex items-center justify-center shadow-sm shrink-0 overflow-hidden",
                                    thread?.groupAvatar && !thread.groupAvatar.startsWith("http") ? "bg-emerald-100 dark:bg-[#12382f]" : thread?.groupAvatar ? "bg-white" : "bg-emerald-100 dark:bg-[#12382f]"
                                )}>
                                    {thread?.groupAvatar ? (
                                        thread.groupAvatar.startsWith("http") ? (
                                            <img src={thread.groupAvatar} alt={thread.groupName || "Group"} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-3xl">{thread.groupAvatar}</span>
                                        )
                                    ) : (
                                        <Users size={38} className="text-[#00a884] dark:text-[#00c89a]" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-black dark:text-white leading-tight">{thread?.groupName || "Group Chat"}</h3>
                                    <p className="text-xs text-zinc-400 mt-1">{thread?.groupMemberIds?.length || 0} blend members</p>
                                </div>
                            </div>

                            {/* Section 1: Members List */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider px-1">Blend Members</h4>
                                <div className="space-y-1">
                                    {isCreator && (
                                        <button 
                                            onClick={() => setShowAddMembersModal(true)}
                                            className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-xl transition-colors text-left text-[#00a884] dark:text-[#00c89a] font-semibold text-[14px] cursor-pointer mb-1"
                                        >
                                            <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center shrink-0">
                                                <Users size={16} className="text-[#00a884] dark:text-[#00c89a]" />
                                            </div>
                                            <span>Add Members</span>
                                        </button>
                                    )}
                                    {(thread?.groupMemberIds || []).map(memberId => {
                                        const isSelfMember = memberId === currentUser.id;
                                        const memberUser = isSelfMember ? currentUser : allDatingUsers.find(u => u.id === memberId);
                                        if (!memberUser) return null;
                                        const initial = memberUser.name.charAt(0).toUpperCase() || "?";
                                        return (
                                            <div 
                                                key={memberId}
                                                onClick={() => {
                                                    if (!isSelfMember) {
                                                        setSelectedMember(memberUser);
                                                    }
                                                }}
                                                className={clsx(
                                                    "flex items-center gap-3 p-2 rounded-xl transition-colors",
                                                    isSelfMember ? "cursor-default" : "cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900"
                                                )}
                                            >
                                                {memberUser.avatar ? (
                                                    <img src={memberUser.avatar} alt={memberUser.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                                                ) : (
                                                    <div className={clsx("w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0", memberUser.color || "bg-emerald-150")}>
                                                        {initial}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <span className="font-semibold text-[14px] text-black dark:text-white block truncate">
                                                        {memberUser.name} {isSelfMember && <span className="text-xs text-zinc-400 font-normal ml-1">(You)</span>}
                                                    </span>
                                                    <span className="text-[11px] text-zinc-400 block truncate">
                                                        {memberUser.marketplaceStore?.headline || (memberUser.bio && !memberUser.bio.includes("Hey there") ? memberUser.bio : "Verified local seller on Yogheart Marketplace.")}
                                                    </span>
                                                </div>
                                                {isCreator && !isSelfMember && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setMemberToRemove(memberUser);
                                                        }}
                                                        className="p-2 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition-all shrink-0 cursor-pointer"
                                                        title="Remove from Blend"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Section 3: Blend Actions */}
                            <div className="pt-6 border-t border-[var(--border)] dark:border-zinc-800 space-y-3">
                                <button
                                    onClick={() => { setShowConfirmDeleteChat(true); setShowGroupProfile(false); }}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-50 dark:bg-red-950/20 text-[var(--danger)] dark:text-red-400 font-semibold rounded-xl hover:bg-red-100 dark:hover:bg-red-950/30 active:scale-[0.98] transition-all text-sm cursor-pointer"
                                >
                                    <Trash size={16} /> Delete Blend
                                </button>
                                {thread?.leftParticipantIds?.includes(currentUser.id) ? (
                                    <div className="flex items-center justify-center gap-2 py-3 px-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
                                        <LogOut size={16} className="text-zinc-400 shrink-0" />
                                        <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">You left this blend</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleLeaveGroup}
                                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-[0.98] transition-all text-sm cursor-pointer"
                                    >
                                        <LogOut size={16} /> Leave Blend
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Contact zoom modal for group member selection */}
            <ZoomedAvatarModal
                isOpen={!!selectedMember}
                onClose={() => setSelectedMember(null)}
                userName={selectedMember?.name || ""}
                userAvatar={selectedMember?.avatar || null}
                userColor={selectedMember?.color || "bg-gray-200"}
                location={selectedMember?.location || null}
                showSendMessage={true}
                onMessage={async () => {
                    if (selectedMember) {
                        const directThread = threads.find(t => !t.isGroup && t.user?.id === selectedMember.id);
                        if (directThread) {
                            setSelectedMember(null);
                            setShowGroupProfile(false);
                            setActiveThreadId(directThread.id);
                            window.history.replaceState(null, "", `/inbox?id=${directThread.id}`);
                        } else {
                            try {
                                setSelectedMember(null);
                                setShowGroupProfile(false);
                                const newThreadId = await startDirectChat(selectedMember);
                                setActiveThreadId(newThreadId);
                                window.history.replaceState(null, "", `/inbox?id=${newThreadId}`);
                            } catch (e) {
                                console.error(e);
                            }
                        }
                    }
                }}
                onCall={(type) => selectedMember && initiateCall(selectedMember.id, selectedMember.name, selectedMember.avatar || null, type)}
                onInfo={() => {
                    if (selectedMember) {
                        setSelectedMember(null);
                        setShowGroupProfile(false);
                        onClose();
                        setTimeout(() => {
                            window.history.pushState(null, "", `/profile?userId=${selectedMember.id}&from=chat&fromThreadId=${thread.id}`);
                        }, 150);
                    }
                }}
            />

             {/* Location Hotspot Picker Modal */}
             {showLocationPicker && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowLocationPicker(false)}>
                    <div className="bg-white dark:bg-zinc-900 border border-[var(--border)] dark:border-zinc-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-850/50">
                            <div>
                                <h3 className="font-bold text-base dark:text-white flex items-center gap-2">
                                    <MapPin className="text-emerald-500" size={18} />
                                    Choose Hotspot
                                </h3>
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Pick a hotspot to share or request location</p>
                            </div>
                            <button onClick={() => setShowLocationPicker(false)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 dark:text-zinc-500">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-3 max-h-[300px] overflow-y-auto space-y-1.5 scrollbar-thin">
                            {[
                                { name: "Central Park Lake, NYC", lat: 40.7789, lng: -73.9691, desc: "Perfect spot for rowing boats 🚣" },
                                { name: "Eiffel Tower Garden, Paris", lat: 48.8584, lng: 2.2945, desc: "A cozy romantic picnic spot 🍷" },
                                { name: "Shibuya Crossing, Tokyo", lat: 35.6595, lng: 139.7005, desc: "Neon lights & exciting vibes 🏙️" },
                                { name: "Sydney Opera House, Sydney", lat: -33.8568, lng: 151.2153, desc: "Harbor views & opera night 🎭" },
                                { name: "Tiber River Walk, Rome", lat: 41.8902, lng: 12.4922, desc: "Beautiful historic sunset walk 🌅" },
                            ].map((spot) => (
                                <button
                                    key={spot.name}
                                    onClick={() => {
                                        setShowLocationPicker(false);
                                        sendMessage(thread.id, "📍 Shared Location", "location", {
                                            latitude: spot.lat,
                                            longitude: spot.lng
                                        });
                                    }}
                                    className="w-full flex items-center gap-3.5 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-2xl transition-all text-left border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800/80 cursor-pointer"
                                >
                                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-500 shrink-0 shadow-sm">
                                        <MapPin size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{spot.name}</p>
                                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">{spot.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Location acquiring loading screen */}
            {isAcquiringLocation && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white/95 dark:bg-zinc-900/95 border border-[var(--border)] dark:border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4 text-center max-w-[200px] animate-in zoom-in-95">
                        <RotateCw size={24} className="animate-spin text-emerald-500" />
                        <div className="space-y-1">
                            <h4 className="font-bold text-xs dark:text-white">Locating...</h4>
                            <p className="text-[9px] text-zinc-400 dark:text-zinc-500">Acquiring GPS coordinates</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Contact Picker Modal */}
            {showContactPicker && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowContactPicker(false)}>
                    <div className="bg-white dark:bg-zinc-900 border border-[var(--border)] dark:border-zinc-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col h-[460px] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-850/50">
                            <div>
                                <h3 className="font-bold text-base dark:text-white flex items-center gap-2">
                                    <Users className="text-indigo-500" size={18} />
                                    Select Contact
                                </h3>
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Share a member's dating profile</p>
                            </div>
                            <button onClick={() => setShowContactPicker(false)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 dark:text-zinc-500">
                                <X size={16} />
                            </button>
                        </div>
                        
                        <div className="p-3 border-b border-gray-100 dark:border-zinc-800">
                            <div className="flex items-center gap-2.5 px-3 py-2 bg-gray-100 dark:bg-zinc-800 rounded-2xl">
                                <Search size={14} className="text-zinc-400 dark:text-zinc-500" />
                                <input
                                    type="text"
                                    placeholder="Search contacts..."
                                    value={contactSearchQuery}
                                    onChange={(e) => setContactSearchQuery(e.target.value)}
                                    className="bg-transparent border-none outline-none w-full text-xs text-black dark:text-white placeholder:text-zinc-455 dark:placeholder:text-zinc-500"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
                            {(() => {
                                const filtered = allDatingUsers
                                    .filter(u => u.id !== currentUser?.id && u.name.toLowerCase().includes(contactSearchQuery.toLowerCase()));
                                
                                if (filtered.length === 0) {
                                    return (
                                        <div className="h-full flex flex-col items-center justify-center p-5 text-center">
                                            <p className="text-xs text-zinc-400 dark:text-zinc-500">No members found</p>
                                        </div>
                                    );
                                }

                                return filtered.map(member => (
                                    <button
                                        key={member.id}
                                        onClick={() => {
                                            setShowContactPicker(false);
                                            setContactSearchQuery("");
                                            sendMessage(thread.id, `👤 Contact: ${member.name}`, "contact", {
                                                contactUser: {
                                                    id: member.id,
                                                    name: member.name,
                                                    avatar: member.avatar || "",
                                                    bio: member.bio || "",
                                                    color: member.color || ""
                                                }
                                            });
                                        }}
                                        className="w-full flex items-center gap-3.5 p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-2xl transition-all text-left border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800/80 cursor-pointer"
                                    >
                                        {member.avatar ? (
                                            <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-100 dark:border-zinc-850" />
                                        ) : (
                                            <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white shadow-sm", member.color || "bg-indigo-500")}>
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{member.name}</p>
                                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">{member.bio || "Dating Profile Contact"}</p>
                                        </div>
                                    </button>
                                ));
                            })()}
                        </div>
                    </div>
                </div>
            )}

             {/* Poll Votes Details Modal */}
             {votingDetailsMessage && votingDetailsMessage.poll && (
                 <>
                     {/* Backdrop Overlay */}
                     <div 
                         className="fixed inset-0 bg-black/35 backdrop-blur-xs z-50 animate-backdrop-fade-in" 
                         onClick={() => setVotingDetailsMessage(null)} 
                     />
                     {/* Bottom Sheet Modal Container */}
                     <div 
                         className="fixed left-0 right-0 bottom-0 top-10 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-full md:max-w-md bg-[#f2f2f7] dark:bg-zinc-950 rounded-t-[36px] shadow-2xl flex flex-col z-50 overflow-hidden animate-bottom-sheet-slide-up"
                         onClick={e => e.stopPropagation()}
                     >
                         {/* Header */}
                         <div className="px-5 py-4 flex justify-between items-center bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 shrink-0">
                             <button 
                                 onClick={() => setVotingDetailsMessage(null)} 
                                 className="w-9 h-9 flex items-center justify-center bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 rounded-full transition-colors text-gray-900 dark:text-white shadow-xs border border-gray-100/80 dark:border-zinc-800"
                             >
                                 <X size={18} />
                             </button>
                             <h3 className="font-bold text-base text-gray-900 dark:text-white">
                                 Poll votes
                             </h3>
                             <div className="w-9" /> {/* spacer to center the title */}
                         </div>

                         {/* Content Area */}
                         <div className="p-5 flex-1 overflow-y-auto space-y-4 scrollbar-thin pb-10">
                             {/* Question Card */}
                             <div className="bg-white dark:bg-zinc-900 rounded-[20px] px-5 py-4 shadow-xs text-sm font-bold text-gray-900 dark:text-white">
                                 {votingDetailsMessage.poll.question}
                             </div>

                             {/* Options and Voters */}
                             {(() => {
                                 const votesArray = votingDetailsMessage.poll.options.map((o: any) => o.votes || 0);
                                 const maxVotes = Math.max(...votesArray);
                                 const winnerCount = votesArray.filter((v: number) => v === maxVotes).length;
                                 const hasWinner = maxVotes > 0 && winnerCount === 1;
                                 
                                 return votingDetailsMessage.poll.options.map((opt: any, idx: number) => {
                                     const isClearWinner = hasWinner && opt.votes === maxVotes;
                                     const isLosingOption = hasWinner && opt.votes < maxVotes;

                                     let cardBgClass = "bg-white dark:bg-zinc-900 border border-gray-100/50 dark:border-zinc-800/50 text-gray-900 dark:text-white";
                                     let starClass = "text-zinc-400 dark:text-zinc-500";
                                     let borderClass = "border-t border-gray-100 dark:border-zinc-800";
                                     let nameClass = "text-gray-800 dark:text-gray-200";
                                     let timeClass = "text-zinc-400 dark:text-zinc-500 font-medium";
                                     let voteCountClass = "text-zinc-400 dark:text-zinc-500";

                                     if (isClearWinner) {
                                         cardBgClass = "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-100";
                                         starClass = "text-yellow-500 fill-current";
                                         borderClass = "border-t border-emerald-200/40 dark:border-emerald-900/30";
                                         nameClass = "text-emerald-800 dark:text-emerald-250";
                                         timeClass = "text-emerald-600/70 dark:text-emerald-400/60 font-medium";
                                         voteCountClass = "text-emerald-600 dark:text-emerald-400";
                                     } else if (isLosingOption) {
                                         cardBgClass = "bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-rose-900 dark:text-rose-100";
                                         borderClass = "border-t border-rose-200/40 dark:border-rose-900/30";
                                         nameClass = "text-rose-800 dark:text-rose-250";
                                         timeClass = "text-rose-600/70 dark:text-rose-400/60 font-medium";
                                         voteCountClass = "text-rose-600 dark:text-rose-400";
                                     }

                                     // Parse or compute the voted time:
                                     let timeStr = votingDetailsMessage.time || "";
                                     if (votingDetailsMessage.createdAt) {
                                         try {
                                             const date = new Date(votingDetailsMessage.createdAt);
                                             if (!isNaN(date.getTime())) {
                                                 const hours = String(date.getHours()).padStart(2, '0');
                                                 const minutes = String(date.getMinutes()).padStart(2, '0');
                                                 timeStr = `${hours}:${minutes}`;
                                             }
                                         } catch {}
                                     }
                                     const votedTimeStr = `today ${timeStr}`;

                                     return (
                                         <div key={idx} className={clsx("rounded-[24px] p-4 shadow-xs space-y-3 transition-all duration-300", cardBgClass)}>
                                             {/* Option Header */}
                                             <div className="flex justify-between items-center px-1">
                                                 <span className="text-sm font-bold">
                                                     {opt.text}
                                                 </span>
                                                 <div className={clsx("flex items-center gap-1.5 text-xs font-semibold", voteCountClass)}>
                                                     <span>
                                                         {opt.votes || 0} {opt.votes === 1 ? "vote" : "votes"}
                                                     </span>
                                                     {(isClearWinner || (!hasWinner && opt.votes === maxVotes && maxVotes > 0)) && (
                                                         <Star size={12} className={starClass} />
                                                     )}
                                                 </div>
                                             </div>

                                             {/* Divider & Voters list */}
                                             {opt.voters && opt.voters.length > 0 && (
                                                 <div className={clsx("pt-3.5 space-y-3.5", borderClass)}>
                                                     {opt.voters.map((voterId: string) => {
                                                         const voterUser = voterId === currentUser.id 
                                                             ? currentUser 
                                                             : allDatingUsers.find((u: any) => u.id === voterId);
                                                         
                                                         const displayName = voterId === currentUser.id ? "You" : (voterUser?.name || "Unknown User");
                                                         const avatarUrl = voterUser?.avatar;

                                                         return (
                                                             <div key={voterId} className="flex items-center justify-between px-1">
                                                                 <div className="flex items-center gap-3">
                                                                     {avatarUrl ? (
                                                                         <img 
                                                                             src={avatarUrl} 
                                                                             alt={displayName} 
                                                                             className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-105 dark:border-zinc-800" 
                                                                         />
                                                                     ) : (
                                                                         <div className="w-8 h-8 rounded-full flex items-center justify-center bg-orange-100 dark:bg-orange-950/30 text-orange-600 shrink-0">
                                                                             <LucideUser size={14} className="fill-current" />
                                                                         </div>
                                                                     )}
                                                                     <span className={clsx("text-xs font-semibold", nameClass)}>
                                                                         {displayName}
                                                                     </span>
                                                                 </div>
                                                                 <span className={clsx("text-[10px]", timeClass)}>
                                                                     {votedTimeStr}
                                                                 </span>
                                                             </div>
                                                         );
                                                     })}
                                                 </div>
                                             )}
                                         </div>
                                     );
                                 });
                             })()}
                         </div>
                     </div>
                 </>
             )}

             {/* Poll Creator Modal */}
             {showPollCreator && (
                 <>
                     {/* Backdrop Overlay */}
                     <div 
                         className="fixed inset-0 bg-black/35 backdrop-blur-xs z-50 animate-backdrop-fade-in" 
                         onClick={() => setShowPollCreator(false)} 
                     />
                     {/* Bottom Sheet Modal Container */}
                     <div 
                         className="fixed left-0 right-0 bottom-0 top-10 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-full md:max-w-md bg-[#f2f2f7] dark:bg-zinc-950 rounded-t-[36px] shadow-2xl flex flex-col z-50 overflow-hidden animate-bottom-sheet-slide-up"
                         onClick={e => e.stopPropagation()}
                     >
                         {/* Header */}
                         <div className="px-5 py-4 flex justify-between items-center bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 shrink-0">
                             <button 
                                 onClick={() => setShowPollCreator(false)} 
                                 className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-full transition-colors text-zinc-650 dark:text-zinc-400"
                             >
                                 <X size={18} />
                             </button>
                             <h3 className="font-bold text-base text-gray-900 dark:text-white">
                                 Create poll
                             </h3>
                             <button 
                                 onClick={handleSendPoll} 
                                 className="px-6 py-2 bg-[#10b981] hover:bg-[#059669] text-white font-semibold rounded-full text-sm shadow-sm transition-all duration-150 active:scale-95 shrink-0"
                             >
                                 Send
                             </button>
                         </div>

                         {/* Form Area */}
                         <div className="p-5 flex-1 overflow-y-auto space-y-6 scrollbar-thin pb-10">
                             {/* QUESTION SECTION */}
                             <div className="space-y-2">
                                 <label className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider pl-1.5">
                                     Question
                                 </label>
                                 <input
                                     ref={pollQuestionInputRef}
                                     autoFocus
                                     type="text"
                                     value={pollQuestion}
                                     onChange={(e) => setPollQuestion(e.target.value)}
                                     placeholder="Ask question"
                                     className="w-full bg-white dark:bg-zinc-900 text-sm font-semibold rounded-2xl px-4 py-3.5 border-none shadow-xs focus:outline-none text-gray-900 dark:text-white placeholder-gray-300 transition-all"
                                 />
                             </div>

                             {/* OPTIONS SECTION */}
                             <div className="space-y-2">
                                 <label className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider pl-1.5">
                                     Options
                                 </label>
                                 <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xs divide-y divide-gray-100 dark:divide-zinc-850 overflow-hidden">
                                     {pollOptions.map((opt, idx) => {
                                         const isFilled = opt.trim() !== "";
                                         return (
                                             <div key={idx} className="flex items-center px-4 py-3 group">
                                                 <input
                                                     type="text"
                                                     value={opt}
                                                     onChange={(e) => {
                                                         const val = e.target.value;
                                                         const updated = [...pollOptions];
                                                         updated[idx] = val;
                                                         
                                                         // If editing the last field and it's not empty, append a new empty slot
                                                         if (idx === pollOptions.length - 1 && val.trim() !== "") {
                                                             updated.push("");
                                                         }
                                                         setPollOptions(updated);
                                                     }}
                                                     onBlur={() => {
                                                         // If empty and length > 2, remove it
                                                         if (opt.trim() === "" && pollOptions.length > 2) {
                                                             const updated = pollOptions.filter((_, i) => i !== idx);
                                                             if (updated[updated.length - 1].trim() !== "") {
                                                                 updated.push("");
                                                             }
                                                             setPollOptions(updated);
                                                         }
                                                     }}
                                                     placeholder="Add"
                                                     className="flex-1 bg-transparent text-sm font-semibold border-none focus:outline-none text-gray-900 dark:text-white placeholder-gray-300"
                                                 />
                                                 {isFilled && (
                                                     <>
                                                         <button 
                                                             onClick={() => {
                                                                 const updated = pollOptions.filter((_, i) => i !== idx);
                                                                 if (updated.length < 2) {
                                                                     while (updated.length < 2) updated.push("");
                                                                 }
                                                                 if (updated[updated.length - 1].trim() !== "") {
                                                                     updated.push("");
                                                                 }
                                                                 setPollOptions(updated);
                                                             }}
                                                             className="p-1 hover:bg-gray-150 dark:hover:bg-zinc-800 rounded-full transition-colors text-gray-400 hover:text-red-500 mr-2 shrink-0"
                                                         >
                                                             <X size={13} />
                                                         </button>
                                                         <div className="text-gray-300 dark:text-zinc-700 text-lg font-normal tracking-tight select-none cursor-grab leading-none shrink-0">≡</div>
                                                     </>
                                                 )}
                                             </div>
                                         );
                                     })}
                                 </div>
                             </div>

                             {/* ALLOW MULTIPLE ANSWERS TOGGLE */}
                             <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-2xl px-4 py-3.5 shadow-xs">
                                 <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                     Allow multiple answers
                                 </span>
                                 <button 
                                     onClick={() => setAllowMultipleAnswers(!allowMultipleAnswers)} 
                                     className={clsx(
                                         "w-12 h-7 rounded-full transition-colors relative flex items-center px-0.5 shrink-0",
                                         allowMultipleAnswers ? "bg-[#10b981]" : "bg-gray-200 dark:bg-zinc-800"
                                     )}
                                 >
                                     <div 
                                         className={clsx(
                                             "w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200",
                                             allowMultipleAnswers ? "translate-x-5" : "translate-x-0"
                                         )}
                                     />
                                 </button>
                             </div>
                         </div>
                     </div>
                 </>
             )}

             {/* Dedicated Seller Storefront Page for Marketplace Chats */}
             {(activeSellerStore || closingSellerStore) && (
                 <SellerStorefrontModal
                     sellerId={(activeSellerStore || closingSellerStore)!.id}
                     sellerName={(activeSellerStore || closingSellerStore)!.name}
                     sellerAvatar={(activeSellerStore || closingSellerStore)!.avatar}
                     sellerLocation={(activeSellerStore || closingSellerStore)!.location}
                     isClosing={!!closingSellerStore}
                     onClose={handleCloseSellerStore}
                 />
             )}

             {/* Marketplace Item Details Modal (From chat listing banner) */}
             {(selectedMarketplaceItem || closingMarketplaceItem) && (
                 <ItemDetailModal
                     mode="modal"
                     item={liveSelectedMarketplaceItem || closingMarketplaceItem!}
                     isClosing={!!closingMarketplaceItem}
                     feedItems={[liveSelectedMarketplaceItem || closingMarketplaceItem!]}
                     onClose={handleCloseMarketplaceItem}
                     onOpenStore={(sellerId, sellerName) => {
                         setSelectedMarketplaceItem(null);
                         setClosingMarketplaceItem(null);
                         setActiveSellerStore({
                             id: sellerId,
                             name: sellerName,
                         });
                     }}
                 />
             )}



            {/* Call Overlay is now rendered globally via CallContext/CallOverlay */}
        </div>
    );
}
