"use client";

import { useMockData } from "@/context/MockContext";
import { processImageFile } from "@/utils/imageProcessor";
import { ArrowLeft, Palette, Image, MessageSquare, ChevronRight, Zap, Upload, Music, Check, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { useState, useRef } from "react";
import { useModalHistory } from "@/hooks/useModalHistory";
import { playSendSound } from "@/lib/sounds";

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
const WALLPAPERS = [
    { id: "gradient3", name: "Forest Gradient (Default)", color: "bg-gradient-to-br from-green-200 to-emerald-200" },
    { id: "default", name: "Default (Plain Theme)", color: "bg-[var(--card)]", image: "" },
    { id: "doodle-zoo", name: "Zoo Glow", color: "", image: "" },
    { id: "doodle-space", name: "Space Glow", color: "", image: "" },
    { id: "doodle-science", name: "Science Glow", color: "", image: "" },
    { id: "doodle-love", name: "Love Glow", color: "", image: "" },
    { id: "doodle-magic", name: "Magic Glow", color: "", image: "" },
    { id: "doodle-gaming", name: "Gaming Glow", color: "", image: "" },
    { id: "doodle-winter", name: "Winter Glow", color: "", image: "" },
    { id: "doodle-ocean", name: "Ocean Glow", color: "", image: "" },
    { id: "doodle-cozy", name: "Cozy Glow", color: "", image: "" },
    { id: "doodle-aura", name: "Aura Doodle", color: "", image: "" },
    { id: "mesh-aura", name: "Aura Glow (Yogheart)", color: "bg-gradient-to-tr from-sky-400/20 to-pink-400/20", image: "" },
    { id: "mesh-sunset", name: "Neon Sunset (Yogheart)", color: "bg-gradient-to-tr from-pink-400/20 to-orange-400/20", image: "" },
    { id: "mesh-forest", name: "Forest Aura (Yogheart)", color: "bg-gradient-to-tr from-lime-400/20 to-emerald-400/20", image: "" },
    { id: "gradient1", name: "Sunset Gradient", color: "bg-gradient-to-br from-orange-200 to-pink-200" },
    { id: "gradient2", name: "Ocean Gradient", color: "bg-gradient-to-br from-blue-200 to-cyan-200" },
    { id: "gradient4", name: "Night Gradient", color: "bg-gradient-to-br from-indigo-300 to-purple-300" },
    { id: "solid1", name: "Light Gray", color: "bg-gray-100" },
];

const THEMES = [
    { id: "classic-blue", name: "Classic Blue", icon: "🔵" },
    { id: "light", name: "Green (Default)", icon: "🟢" },
    { id: "light-green", name: "Light Green", icon: "💚" },
    { id: "dark", name: "Dark", icon: "🌙" },
    { id: "system", name: "System", icon: "💻" },
    { id: "glow-light", name: "Glow (Light)", icon: "✨" },
    { id: "glow-dark", name: "Glow (Dark)", icon: "🔥" },
    { id: "cyber-glow", name: "Cyber Emerald Glow", icon: "🟢", glow: "rgba(16, 185, 129, 0.5)" },
    { id: "neon-violet", name: "Neon Velvet Backlight", icon: "🟣", glow: "rgba(168, 85, 247, 0.5)" },
    { id: "sunset-amber", name: "Sunset Amber Glow", icon: "🟡", glow: "rgba(245, 158, 11, 0.5)" },
    { id: "light-glow", name: "Aurora Pearl Glow", icon: "✨", glow: "rgba(52, 211, 153, 0.3)" },
];

const CHAT_THEMES = [
    { id: "default", name: "Default (Light Green)", preview: "bg-[#d9fdd3] border border-emerald-500/10" },
    { id: "whatsapp-green", name: "Green", preview: "bg-[#008069]" },
    { id: "classic-blue", name: "Classic Blue", preview: "bg-[#007AFF]" },
    { id: "gradient1", name: "Sunset Peach", preview: "bg-gradient-to-r from-amber-500 to-rose-500" },
    { id: "gradient2", name: "Ocean Breeze", preview: "bg-gradient-to-r from-blue-500 to-cyan-500" },
    { id: "gradient3", name: "Forest Mint", preview: "bg-gradient-to-r from-emerald-500 to-teal-500" },
    { id: "gradient4", name: "Night Indigo", preview: "bg-gradient-to-r from-violet-500 to-indigo-500" },
    { id: "gradient5", name: "Glow", preview: "bg-gradient-to-r from-amber-600 to-orange-500" },
    { id: "solid1", name: "Light Gray", preview: "bg-zinc-700" },
];

const FONT_SIZES = [
    { id: "small", name: "Small" },
    { id: "medium", name: "Medium" },
    { id: "large", name: "Large" },
];

const APP_ICONS = [
    { id: "default", name: "Default Blue", path: "/app-icons/icon-default.png" },
    { id: "green", name: "Classic Green", path: "/app-icons/icon-green.png" },
    { id: "blue", name: "Classic Blue", path: "/app-icons/icon-blue.png" },
    { id: "neon", name: "Neon Orange", path: "/app-icons/icon-neon.png" },
    { id: "violet", name: "Violet", path: "/app-icons/icon-violet.png" },
    { id: "gold", name: "Dark Gold", path: "/app-icons/icon-gold.png" },
    { id: "glow", name: "Midnight Glow", path: "/app-icons/icon-glow.png" },
    { id: "glitter", name: "Glitter Space", path: "/app-icons/icon-glitter.png" },
    { id: "black", name: "Minimal Black", path: "/app-icons/icon-black.png" },
];

export default function ChatsPage() {
    const { currentUser, updateSettings } = useMockData();
    const [showWallpaperModal, setShowWallpaperModal] = useState(false);
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [showChatThemeModal, setShowChatThemeModal] = useState(false);
    const [showFontSizeModal, setShowFontSizeModal] = useState(false);
    const [showMessageToneModal, setShowMessageToneModal] = useState(false);
    const [showAppIconModal, setShowAppIconModal] = useState(false);

    useModalHistory("wallpaperModal", showWallpaperModal, () => setShowWallpaperModal(false));
    useModalHistory("themeModal", showThemeModal, () => setShowThemeModal(false));
    useModalHistory("chatThemeModal", showChatThemeModal, () => setShowChatThemeModal(false));
    useModalHistory("fontSizeModal", showFontSizeModal, () => setShowFontSizeModal(false));
    useModalHistory("messageToneModal", showMessageToneModal, () => setShowMessageToneModal(false));
    useModalHistory("appIconModal", showAppIconModal, () => setShowAppIconModal(false));

    const wallpaperInputRef = useRef<HTMLInputElement>(null);


    const wallpaperVal = currentUser?.settings?.wallpaper || "default";
    const resolvedWallpaper = wallpaperVal;
    
    const isCustomWallpaper = wallpaperVal && (
        wallpaperVal.startsWith("data:") || 
        wallpaperVal.startsWith("http") || 
        wallpaperVal.startsWith("blob:")
    );
    const isImageWallpaper = isCustomWallpaper || resolvedWallpaper.startsWith("/");
    const isMeshWallpaper = resolvedWallpaper.startsWith("mesh-");
    const isDoodleWallpaper = resolvedWallpaper.startsWith("doodle-");
                             
    const currentWallpaper = WALLPAPERS.find(w => w.id === wallpaperVal) || WALLPAPERS[0];
    const wallpaperColorClass = isImageWallpaper || isMeshWallpaper || isDoodleWallpaper ? "" : currentWallpaper.color;
    
    let wallpaperStyle = undefined;
    if (isImageWallpaper) {
        wallpaperStyle = { backgroundImage: `url(${resolvedWallpaper})`, backgroundSize: "cover", backgroundPosition: "center" };
    } else if (resolvedWallpaper === "mesh-aura") {
        wallpaperStyle = { backgroundImage: "linear-gradient(135deg, #00f2fe 0%, #7f00ff 100%)" };
    } else if (resolvedWallpaper === "mesh-sunset") {
        wallpaperStyle = { backgroundImage: "linear-gradient(135deg, #ff007f 0%, #ff5e62 100%)" };
    } else if (resolvedWallpaper === "mesh-forest") {
        wallpaperStyle = { backgroundImage: "linear-gradient(135deg, #ff4e50 0%, #f9d423 100%)" };
    } else if (isDoodleWallpaper) {
        const isDark = currentUser?.settings?.theme === "dark" || currentUser?.settings?.theme === "glow-dark" || (currentUser?.settings?.theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
        const theme = getDoodleTheme(resolvedWallpaper, isDark);
        wallpaperStyle = { backgroundImage: `linear-gradient(135deg, ${theme.color}22 0%, ${theme.color}44 100%)`, backgroundColor: isDark ? "#000000" : "#ffffff" };
    }

    const currentTheme = THEMES.find(t => t.id === currentUser?.settings?.theme) || THEMES[0];
    const currentFontSize = FONT_SIZES.find(f => f.id === currentUser?.settings?.fontSize) || FONT_SIZES[1];
    const currentChatTheme = CHAT_THEMES.find(ct => ct.id === (currentUser?.settings?.chatTheme || "default")) || CHAT_THEMES[0];
    const currentChatThemePreview = currentChatTheme.preview;

    const handleWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const { dataUrl } = await processImageFile(file);
                updateSettings("wallpaper", dataUrl);
                setShowWallpaperModal(false);
            } catch (err) {
                console.error("Failed to process wallpaper photo:", err);
            }
        }
    };

    return (
        <div className={`w-full h-full overflow-y-auto pb-20 lg:pb-4 bg-[var(--background)] dark:bg-zinc-950 transition-transform`}>
            <header className="bg-white dark:bg-zinc-900 px-3 md:px-4 py-3 flex items-center gap-2 border-b border-[var(--border)] dark:border-zinc-800 sticky top-0 z-10">
                <button 
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent("settings-subpage-back"));
                    }} 
                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                >
                    <ArrowLeft size={24} className="text-[var(--primary)]" />
                </button>
                <h1 className="text-lg font-semibold dark:text-white">Chats</h1>
            </header>

            <div className="p-4 md:p-6 space-y-4">
                <p className="px-1 text-xs font-semibold text-[var(--secondary)] uppercase tracking-wide">Appearance</p>

                <div className="bg-white dark:bg-zinc-900 border border-[var(--border)] dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                    <div
                        onClick={() => {
                            setShowThemeModal(true);
                        }}
                        className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-[var(--border)] dark:border-zinc-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                        <div className="flex items-center gap-4 min-w-0">
                            <Palette size={20} className="text-[var(--secondary)] shrink-0" />
                            <div className="min-w-0">
                                <span className="font-medium block dark:text-white">Theme</span>
                                <span className="text-xs text-[var(--secondary)]">Choose your color scheme</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-auto pl-2">
                            <span className="text-sm text-[var(--primary)] font-semibold text-right">{currentTheme.icon} {currentTheme.name}</span>
                            <ChevronRight size={18} className="text-[var(--secondary)] shrink-0" />
                        </div>
                    </div>

                    <div
                        onClick={() => {
                            setShowChatThemeModal(true);
                        }}
                        className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-[var(--border)] dark:border-zinc-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                        <div className="flex items-center gap-4 min-w-0">
                            <Palette size={20} className="text-[var(--secondary)] shrink-0" />
                            <div className="min-w-0">
                                <span className="font-medium block dark:text-white">Chat Bubble Theme</span>
                                <span className="text-xs text-[var(--secondary)]">Color theme of message bubbles</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-auto pl-2">
                            <div 
                                className={clsx("w-8 h-8 rounded-lg shadow-sm border border-black/5 dark:border-white/5 shrink-0", currentChatThemePreview)} 
                            />
                            <ChevronRight size={18} className="text-[var(--secondary)] shrink-0" />
                        </div>
                    </div>

                    <div
                        onClick={() => {
                            setShowWallpaperModal(true);
                        }}
                        className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-[var(--border)] dark:border-zinc-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                        <div className="flex items-center gap-4 min-w-0">
                            <Image size={20} className="text-[var(--secondary)] shrink-0" />
                            <div className="min-w-0">
                                <span className="font-medium block dark:text-white">Wallpaper</span>
                                <span className="text-xs text-[var(--secondary)]">Chat background</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-auto pl-2">
                            <div 
                                className={clsx("w-8 h-8 rounded-lg shadow-sm border border-black/5 dark:border-white/5 shrink-0", wallpaperColorClass)} 
                                style={wallpaperStyle}
                            />
                            <ChevronRight size={18} className="text-[var(--secondary)] shrink-0" />
                        </div>
                    </div>

                    <div
                        onClick={() => {
                            setShowAppIconModal(true);
                        }}
                        className="flex items-center justify-between px-4 md:px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                        <div className="flex items-center gap-4 min-w-0">
                            <Sparkles size={20} className="text-[var(--secondary)] shrink-0" />
                            <div className="min-w-0">
                                <span className="font-medium block dark:text-white">App Icon</span>
                                <span className="text-xs text-[var(--secondary)]">Customize the logo of the app</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-auto pl-2">
                            <img 
                                src={
                                    (currentUser?.settings?.appIcon === "default" || !currentUser?.settings?.appIcon)
                                    ? "/app-icons/icon-default.png" 
                                    : `/app-icons/icon-${currentUser?.settings?.appIcon}.png`
                                } 
                                alt="Current Icon" 
                                className="w-8 h-8 rounded-lg shadow-sm border border-black/5 dark:border-white/5 object-cover shrink-0"
                            />
                            <ChevronRight size={18} className="text-[var(--secondary)] shrink-0" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-[var(--border)] dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm mt-4">
                    <div 
                        onClick={() => {
                            const targetVal = !currentUser?.settings?.reduceMotion;
                            updateSettings("reduceMotion", targetVal);
                        }}
                        className="flex items-center justify-between px-4 md:px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <Zap size={20} className="text-[var(--secondary)]" />
                            <div>
                                <span className="font-medium block dark:text-white">Reduce Motion</span>
                                <span className="text-xs text-[var(--secondary)]">Disable page transitions</span>
                            </div>
                        </div>
                        <div
                            className={clsx(
                                "w-12 h-7 rounded-full relative transition-colors pointer-events-none",
                                currentUser?.settings?.reduceMotion ? "bg-[var(--primary)]" : "bg-gray-300 dark:bg-zinc-700"
                            )}
                        >
                            <div className={clsx(
                                "w-5 h-5 bg-white rounded-full absolute top-1 shadow-sm transition-all",
                                currentUser?.settings?.reduceMotion ? "left-6" : "left-1"
                            )} />
                        </div>
                    </div>
                </div>

                <p className="px-1 text-xs font-semibold text-[var(--secondary)] uppercase tracking-wide mt-6">Chat Settings</p>

                <div className="bg-white dark:bg-zinc-900 border border-[var(--border)] dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                    <div 
                        onClick={() => {
                            const targetVal = currentUser?.settings?.enterKeySends === false;
                            updateSettings("enterKeySends", targetVal);
                        }}
                        className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-[var(--border)] dark:border-zinc-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <MessageSquare size={20} className="text-[var(--secondary)]" />
                            <span className="font-medium dark:text-white">Enter Key Sends Message</span>
                        </div>
                        <div
                            className={clsx(
                                "w-12 h-7 rounded-full relative transition-colors pointer-events-none",
                                currentUser?.settings?.enterKeySends !== false ? "bg-[var(--success)]" : "bg-gray-300 dark:bg-zinc-700"
                            )}
                        >
                            <div className={clsx(
                                "w-5 h-5 bg-white rounded-full absolute top-1 shadow-sm transition-all",
                                currentUser?.settings?.enterKeySends !== false ? "left-6" : "left-1"
                            )} />
                        </div>
                    </div>

                    <div
                        onClick={() => {
                            setShowFontSizeModal(true);
                        }}
                        className="flex items-center justify-between px-4 md:px-5 py-4 cursor-pointer border-b border-[var(--border)] dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <MessageSquare size={20} className="text-[var(--secondary)]" />
                            <span className="font-medium dark:text-white">Font Size</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-[var(--primary)] font-semibold">{currentFontSize.name}</span>
                            <ChevronRight size={18} className="text-[var(--secondary)]" />
                        </div>
                    </div>

                    <div
                        onClick={() => {
                            setShowMessageToneModal(true);
                        }}
                        className="flex items-center justify-between px-4 md:px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <Music size={20} className="text-[var(--secondary)]" />
                            <span className="font-medium dark:text-white">Message Send Tone</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-[var(--primary)] font-semibold capitalize">
                                {currentUser?.settings?.messageTone || "whoosh"}
                            </span>
                            <ChevronRight size={18} className="text-[var(--secondary)]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Theme Modal */}
            {showThemeModal && (
                <div className="modal-overlay backdrop-blur-sm" onClick={() => setShowThemeModal(false)}>
                    <div className="modal-content p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-850 shadow-2xl rounded-2xl max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="w-10 h-1 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 md:hidden" />
                        <h2 className="text-xl font-bold mb-4 dark:text-white">Choose Theme</h2>
                        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                            {THEMES.map(theme => (
                                <div
                                    key={theme.id}
                                    onClick={() => {
                                        updateSettings("theme", theme.id);
                                        setShowThemeModal(false);
                                    }}
                                    style={{
                                        boxShadow: (currentUser?.settings?.theme || "light") === theme.id && (theme as any).glow ? `0 0 16px ${(theme as any).glow}` : undefined
                                    }}
                                    className={clsx(
                                        "flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] font-medium",
                                        (currentUser?.settings?.theme || "light") === theme.id 
                                            ? "bg-[var(--primary)] text-white shadow-md shadow-blue-500/20" 
                                            : "hover:bg-gray-100 dark:hover:bg-zinc-800 dark:text-zinc-300"
                                    )}
                                >
                                    <span className="text-2xl shrink-0">{theme.icon}</span>
                                    <span className="font-semibold text-base">{theme.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Theme Modal */}
            {showChatThemeModal && (
                <div className="modal-overlay backdrop-blur-sm" onClick={() => setShowChatThemeModal(false)}>
                    <div className="modal-content p-6 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 shadow-2xl rounded-2xl max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="w-10 h-1 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 md:hidden" />
                        <h2 className="text-xl font-bold mb-4 dark:text-white">Choose Bubble Theme</h2>
                        <div className="space-y-2">
                            {CHAT_THEMES.map(theme => (
                                <div
                                    key={theme.id}
                                    onClick={() => {
                                        updateSettings("chatTheme", theme.id);
                                        setShowChatThemeModal(false);
                                    }}
                                    className={clsx(
                                        "flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] font-medium border border-transparent",
                                        (currentUser?.settings?.chatTheme || "default") === theme.id 
                                            ? "bg-gray-100 dark:bg-zinc-800 border-gray-250 dark:border-zinc-700" 
                                            : "hover:bg-gray-50 dark:hover:bg-zinc-800/40 dark:text-zinc-350"
                                    )}
                                >
                                    <span className="font-semibold dark:text-white">{theme.name}</span>
                                    <div className={clsx("w-6 h-6 rounded-full border border-black/10 dark:border-white/10", theme.preview)} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Wallpaper Modal */}
            {showWallpaperModal && (
                <div className="modal-overlay backdrop-blur-sm" onClick={() => setShowWallpaperModal(false)}>
                    <div className="modal-content p-6 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 shadow-2xl rounded-2xl max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="w-10 h-1 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 md:hidden" />
                        <h2 className="text-xl font-bold mb-4 dark:text-white">Choose Wallpaper</h2>
                        
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            {(() => {
                                const systemDark = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)").matches : false;
                                const isDarkPreview = currentUser?.settings?.theme === "dark" || currentUser?.settings?.theme === "glow-dark" || (currentUser?.settings?.theme === "system" && systemDark);
                                return WALLPAPERS.map(wallpaper => {
                                    const isDoodle = wallpaper.id.startsWith("doodle-");
                                    const doodleType = wallpaper.id;
                                    return (
                                        <div
                                            key={wallpaper.id}
                                            onClick={() => {
                                                updateSettings("wallpaper", wallpaper.id);
                                                setShowWallpaperModal(false);
                                            }}
                                            className={clsx(
                                                "aspect-[3/4] rounded-xl cursor-pointer transition-all duration-200 border-2 relative overflow-hidden group hover:scale-[1.02] active:scale-[0.98]",
                                                wallpaper.color || "bg-zinc-100 dark:bg-zinc-800",
                                                (currentUser?.settings?.wallpaper || "default") === wallpaper.id
                                                    ? "border-[var(--primary)] shadow-lg shadow-blue-500/10 scale-95"
                                                    : "border-transparent hover:border-gray-350 dark:hover:border-zinc-700"
                                            )}
                                        style={wallpaper.image ? { backgroundImage: `url(${wallpaper.image})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                                    >
                                        {/* Render Doodle background preview */}
                                        {isDoodle && (
                                            <div className="absolute inset-0 pointer-events-none scale-100">
                                                <GlowingDoodleBackground type={doodleType} isDarkMode={isDarkPreview} preview={true} />
                                            </div>
                                        )}
                                        {/* Render Mesh miniature preview */}
                                        {wallpaper.id.startsWith("mesh-") && (
                                            <div className="absolute inset-0 opacity-80 pointer-events-none">
                                                <div className="absolute inset-0 bg-white dark:bg-zinc-950" />
                                                <div className={clsx(
                                                    "absolute -top-1/4 -left-1/4 w-[120%] h-[120%] rounded-full filter blur-[15px] opacity-40 dark:opacity-75 mix-blend-multiply dark:mix-blend-screen",
                                                    wallpaper.id === "mesh-aura" && "bg-[#00f2fe]",
                                                    wallpaper.id === "mesh-sunset" && "bg-[#ff007f]",
                                                    wallpaper.id === "mesh-forest" && "bg-[#ff4e50]"
                                                )} />
                                                <div className={clsx(
                                                    "absolute -bottom-1/4 -right-1/4 w-[120%] h-[120%] rounded-full filter blur-[20px] opacity-35 dark:opacity-65 mix-blend-multiply dark:mix-blend-screen",
                                                    wallpaper.id === "mesh-aura" && "bg-[#7f00ff]",
                                                    wallpaper.id === "mesh-sunset" && "bg-[#ff5e62]",
                                                    wallpaper.id === "mesh-forest" && "bg-[#f9d423]"
                                                )} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="h-full flex items-end p-2 relative z-10">
                                            <span className="text-[10px] font-semibold bg-white/95 dark:bg-zinc-900/95 dark:text-white px-2 py-0.5 rounded-full shadow-sm truncate max-w-full">
                                                {wallpaper.name}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })})()}

                            {/* Custom Upload Card */}
                            <div
                                onClick={() => wallpaperInputRef.current?.click()}
                                className={clsx(
                                    "aspect-[3/4] rounded-xl cursor-pointer transition-all duration-200 border-2 relative overflow-hidden group hover:scale-[1.02] active:scale-[0.98] flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-800",
                                    isCustomWallpaper
                                        ? "border-[var(--primary)] shadow-lg shadow-blue-500/10 scale-95"
                                        : "border-dashed border-gray-300 dark:border-zinc-700 hover:border-[var(--primary)]"
                                )}
                                style={isCustomWallpaper ? wallpaperStyle : undefined}
                            >
                                <input
                                    ref={wallpaperInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleWallpaperUpload}
                                />
                                {isCustomWallpaper ? (
                                    <>
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Upload className="text-white" size={20} />
                                        </div>
                                        <div className="h-full flex items-end p-2 relative z-10 w-full">
                                            <span className="text-[10px] font-semibold bg-white/95 dark:bg-zinc-900/95 dark:text-white px-2 py-0.5 rounded-full shadow-sm truncate max-w-full">
                                                Custom
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-1.5 p-2 text-center">
                                        <Upload size={20} className="text-[var(--secondary)] group-hover:text-[var(--primary)] transition-colors" />
                                        <span className="text-[10px] font-semibold text-[var(--secondary)] group-hover:text-[var(--primary)] transition-colors">
                                            Upload Photo
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Font Size Modal */}
            {showFontSizeModal && (
                <div className="modal-overlay backdrop-blur-sm" onClick={() => setShowFontSizeModal(false)}>
                    <div className="modal-content p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-850 shadow-2xl rounded-2xl max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="w-10 h-1 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 md:hidden" />
                        <h2 className="text-xl font-bold mb-4 dark:text-white">Font Size</h2>
                        <div className="space-y-2">
                            {FONT_SIZES.map(opt => (
                                <div
                                    key={opt.id}
                                    onClick={() => {
                                        updateSettings("fontSize", opt.id);
                                        setShowFontSizeModal(false);
                                    }}
                                    className={clsx(
                                        "px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] font-semibold",
                                        (currentUser?.settings?.fontSize || "medium") === opt.id 
                                            ? "bg-[var(--primary)] text-white shadow-md shadow-blue-500/20" 
                                            : "hover:bg-gray-100 dark:hover:bg-zinc-800 dark:text-zinc-300"
                                    )}
                                >
                                    {opt.name}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Message Tone Modal */}
            {showMessageToneModal && (
                <div className="modal-overlay backdrop-blur-sm" onClick={() => setShowMessageToneModal(false)}>
                    <div className="modal-content p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-850 shadow-2xl rounded-2xl max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="w-10 h-1 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 md:hidden" />
                        <h2 className="text-xl font-bold mb-4 dark:text-white">Choose Message Tone</h2>
                        <div className="space-y-2">
                            {[
                                { id: "whoosh", name: "Whoosh (Default)" },
                                { id: "pop", name: "Keyboard Pop" },
                                { id: "chime", name: "Sweet Chime" },
                                { id: "silent", name: "Silent" }
                            ].map(tone => (
                                <div
                                    key={tone.id}
                                    onClick={() => {
                                        updateSettings("messageTone", tone.id);
                                        playSendSound(tone.id);
                                        setShowMessageToneModal(false);
                                    }}
                                    className={clsx(
                                        "flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] font-semibold",
                                        (currentUser?.settings?.messageTone || "whoosh") === tone.id 
                                            ? "bg-[var(--primary)] text-white shadow-md shadow-blue-500/20" 
                                            : "bg-gray-50 dark:bg-zinc-800 text-gray-850 dark:text-gray-250 hover:bg-gray-100 dark:hover:bg-zinc-750"
                                    )}
                                >
                                    <span>{tone.name}</span>
                                    {(currentUser?.settings?.messageTone || "whoosh") === tone.id && (
                                        <Check size={16} className="text-white" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* App Icon Modal */}
            {showAppIconModal && (
                <div className="modal-overlay backdrop-blur-sm" onClick={() => setShowAppIconModal(false)}>
                    <div className="modal-content p-6 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 shadow-2xl rounded-2xl max-w-sm w-[90%] md:w-full" onClick={e => e.stopPropagation()}>
                        <div className="w-10 h-1 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 md:hidden" />
                        <h2 className="text-xl font-bold mb-4 dark:text-white">Choose App Icon</h2>
                        
                        <div className="grid grid-cols-3 gap-4 max-h-[350px] overflow-y-auto pr-1 py-1">
                            {APP_ICONS.map(icon => {
                                const isSelected = (currentUser?.settings?.appIcon || "default") === icon.id;
                                return (
                                    <div
                                        key={icon.id}
                                        onClick={() => {
                                            updateSettings("appIcon", icon.id);
                                            setShowAppIconModal(false);
                                        }}
                                        className="flex flex-col items-center gap-1.5 cursor-pointer group"
                                    >
                                        <div className={clsx(
                                            "relative w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm",
                                            isSelected ? "border-[var(--primary)] scale-95 shadow-md shadow-blue-500/10" : "border-gray-150 dark:border-zinc-850 hover:border-gray-300 dark:hover:border-zinc-700"
                                        )}>
                                            <img src={icon.path} alt={icon.name} className="w-full h-full object-cover" />
                                            {isSelected && (
                                                <div className="absolute bottom-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 border border-white dark:border-zinc-900 shadow-sm flex items-center justify-center">
                                                    <Check size={8} strokeWidth={4} />
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-semibold text-center leading-tight text-gray-700 dark:text-gray-350 truncate max-w-full">
                                            {icon.name}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
