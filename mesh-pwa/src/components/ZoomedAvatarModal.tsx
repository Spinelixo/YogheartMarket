import clsx from "clsx";
import { MessageSquare, Phone, Video, Info, X, Heart, LogOut, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ZoomedAvatarModalProps {
    userName: string;
    userAvatar: string | null;
    userColor: string;
    isOpen: boolean;
    onClose: () => void;
    onMessage?: () => void;
    onCall: (type: "audio" | "video") => void;
    onInfo: () => void;
    location?: string | null;
    isGroup?: boolean;
    onLeaveGroup?: () => void;
    isSelf?: boolean;
    onChangeAvatar?: (dataUrl: string) => void;
    showSendMessage?: boolean;
}

export default function ZoomedAvatarModal({
    userName,
    userAvatar,
    userColor,
    isOpen,
    onClose,
    onMessage,
    onCall,
    onInfo,
    location,
    isGroup = false,
    onLeaveGroup,
    isSelf = false,
    onChangeAvatar,
    showSendMessage = true
}: ZoomedAvatarModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    className="absolute inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-xs"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    onClick={onClose}
                >
                    <motion.div 
                        className="max-w-[380px] w-[90vw] bg-white dark:bg-gray-900 overflow-hidden shadow-2xl flex flex-col origin-center border border-gray-150 dark:border-gray-800 transform-gpu"
                        style={{ borderRadius: '1.75rem' }}
                        initial={{ scale: 0.92, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.92, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Photo Area */}
                        <div className="w-full aspect-square shrink-0 relative bg-gray-100 dark:bg-gray-800 cursor-pointer group overflow-hidden" onClick={onClose}>
                            {userAvatar && (userAvatar.startsWith("http") || userAvatar.startsWith("data:") || userAvatar.startsWith("/")) ? (
                                <img 
                                    src={userAvatar} 
                                    alt={userName} 
                                    decoding="async"
                                    className="w-full h-full object-cover object-[center_20%] transition-transform duration-700 group-hover:scale-105 select-none" 
                                />
                            ) : userAvatar ? (
                                <div className={clsx("w-full h-full flex items-center justify-center text-8xl transition-transform duration-700 group-hover:scale-105 select-none", userColor)}>
                                    {userAvatar}
                                </div>
                            ) : (
                                <div className={clsx("w-full h-full flex items-center justify-center text-8xl transition-transform duration-700 group-hover:scale-105 select-none", userColor)}>
                                    👤
                                </div>
                            )}

                            {/* Close button overlay */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); onClose(); }}
                                className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 active:scale-90 text-white rounded-full backdrop-blur-md transition-all shadow-md z-10 cursor-pointer"
                                title="Close"
                            >
                                <X size={16} />
                            </button>

                            {/* Gradient & Name overlay */}
                            <div className="absolute bottom-0 left-0 w-full p-5 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none flex flex-col">
                                <span className="text-white font-bold text-xl drop-shadow-md tracking-wide">{userName}</span>
                                {location && (
                                    <span className="text-gray-300 text-xs drop-shadow-sm font-medium mt-1 flex items-center gap-1">
                                        📍 {location}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Actions Bar */}
                        <div className="flex items-center justify-around px-6 py-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800/80">
                            {isSelf ? (
                                <div className="flex items-center gap-3 w-full">
                                    <label className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-[var(--primary)] dark:text-blue-400 font-bold text-xs uppercase tracking-wide transition-all shadow-sm border border-blue-100/20 dark:border-blue-900/10 cursor-pointer select-none">
                                        <Camera size={16} /> Change Profile Picture
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = (event) => {
                                                        const res = event.target?.result;
                                                        if (typeof res === "string") {
                                                            onChangeAvatar?.(res);
                                                        }
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                                onClose();
                                            }}
                                        />
                                    </label>
                                </div>
                            ) : isGroup ? (
                                <div className="flex items-center gap-3 w-full">
                                    <button 
                                        type="button"
                                        onClick={() => { onClose(); onLeaveGroup?.(); }} 
                                        className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-red-50 hover:bg-red-150 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wide transition-all shadow-sm border border-red-100/20 dark:border-red-900/10 cursor-pointer"
                                        title="Leave Group"
                                    >
                                        <LogOut size={16} /> Leave Group
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => { onClose(); onInfo(); }} 
                                        className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:scale-110 active:scale-95 transition-all shadow-sm border border-amber-100/20 dark:border-amber-900/10 cursor-pointer"
                                        title="View Details"
                                    >
                                        <Info size={20} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {showSendMessage && onMessage && (
                                        <button 
                                            onClick={() => { onClose(); onMessage(); }} 
                                            className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:scale-110 active:scale-95 transition-all shadow-sm border border-indigo-100/20 dark:border-indigo-900/10 cursor-pointer"
                                            title="Send Message"
                                        >
                                            <MessageSquare size={20} className="fill-transparent" />
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => { onClose(); onCall('audio'); }} 
                                        className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:scale-110 active:scale-95 transition-all shadow-sm border border-emerald-100/20 dark:border-emerald-900/10 cursor-pointer"
                                        title="Voice Call"
                                    >
                                        <Phone size={20} />
                                    </button>
                                    <button 
                                        onClick={() => { onClose(); onCall('video'); }} 
                                        className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:scale-110 active:scale-95 transition-all shadow-sm border border-rose-100/20 dark:border-rose-900/10 cursor-pointer"
                                        title="Video Call"
                                    >
                                        <Video size={20} />
                                    </button>
                                    <button 
                                        onClick={() => { onClose(); onInfo(); }} 
                                        className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:scale-110 active:scale-95 transition-all shadow-sm border border-amber-100/20 dark:border-amber-900/10 cursor-pointer"
                                        title="View Details"
                                    >
                                        <Info size={20} />
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
