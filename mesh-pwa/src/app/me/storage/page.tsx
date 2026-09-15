"use client";

import { useMockData, Thread } from "@/context/MockContext";
import { 
    ArrowLeft, 
    Wifi, 
    Download, 
    Trash2, 
    Search, 
    ChevronRight, 
    Check, 
    Square, 
    CheckSquare, 
    Play, 
    FileText, 
    Sparkles,
    Folder
} from "lucide-react";
import { clsx } from "clsx";
import { useState, useMemo, useEffect } from "react";
import { useModalHistory } from "@/hooks/useModalHistory";

interface StorageMediaItem {
    id: string;
    messageId: string;
    threadId: string;
    type: "image" | "video" | "file";
    url: string;
    fileName: string;
    sizeBytes: number;
    fileSizeStr: string;
    duration?: string;
    date: string;
}

export default function StoragePage() {
    const { currentUser, updateSettings, threads, deleteMessage } = useMockData();
    const [view, setView] = useState<'main' | 'manage' | 'chatMedia'>('main');
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null); // "larger_than_5_mb" or thread ID
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [activeTabSub, setActiveTabSub] = useState<"all" | "chats" | "channels">("chats");

    const [showClearModal, setShowClearModal] = useState(false);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

    // Track locally deleted media IDs
    const [deletedMediaIds, setDeletedMediaIds] = useState<Set<string>>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("mesh_deleted_media");
            return saved ? new Set(JSON.parse(saved)) : new Set();
        }
        return new Set();
    });

    // Save deleted media to localStorage
    const saveDeletedMedia = (newSet: Set<string>) => {
        setDeletedMediaIds(newSet);
        if (typeof window !== "undefined") {
            localStorage.setItem("mesh_deleted_media", JSON.stringify(Array.from(newSet)));
        }
    };

    const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());

    const [browserQuota, setBrowserQuota] = useState(256 * 1024 * 1024 * 1024); // default 256 GB

    useEffect(() => {
        if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
            navigator.storage.estimate().then(estimate => {
                if (estimate.quota) {
                    setBrowserQuota(estimate.quota);
                }
            });
        }
    }, []);

    useModalHistory("clearModal", showClearModal, () => setShowClearModal(false));
    useModalHistory("downloadModal", showDownloadModal, () => setShowDownloadModal(false));
    useModalHistory("deleteConfirmModal", showDeleteConfirmModal, () => setShowDeleteConfirmModal(false));

    // Dynamic sizing helper
    const formatSize = (bytes: number): string => {
        if (bytes >= 1024 * 1024 * 1024) {
            return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
        }
        if (bytes >= 1024 * 1024) {
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        }
        if (bytes >= 1024) {
            return `${(bytes / 1024).toFixed(0)} kB`;
        }
        return `${bytes} B`;
    };

    // Parse fileSize text to bytes
    const parseSize = (sizeStr?: string): number => {
        if (!sizeStr) return 0;
        const match = sizeStr.trim().match(/^([\d.]+)\s*(MB|KB|GB|B|kB)$/i);
        if (!match) return 0;
        const val = parseFloat(match[1]);
        const unit = match[2].toLowerCase();
        if (unit === "gb") return val * 1024 * 1024 * 1024;
        if (unit === "mb") return val * 1024 * 1024;
        if (unit === "kb" || unit === "kb") return val * 1024;
        return val;
    };

    // Calculate all media across all active threads (real Firestore only)
    const allMediaItems = useMemo<StorageMediaItem[]>(() => {
        const items: StorageMediaItem[] = [];
        
        threads.forEach(thread => {
            // Merge Firestore media messages only
            const firestoreMedia = thread.messages
                .filter(m => m.type === "image" || m.type === "video" || m.type === "file")
                .map(m => {
                    let size = parseSize(m.fileSize);
                    if (size === 0) {
                        const hash = m.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
                        size = m.type === "video" ? (hash % 10 + 2) * 1024 * 1024 : (hash % 1000 + 100) * 1024;
                    }
                    return {
                        id: m.id,
                        messageId: m.id,
                        threadId: thread.id,
                        type: m.type,
                        url: m.imageUrl || "",
                        fileName: m.fileName || (m.type === "image" ? "Photo.jpg" : m.type === "video" ? "Video.mp4" : "Doc.pdf"),
                        sizeBytes: size,
                        fileSizeStr: m.fileSize || formatSize(size),
                        duration: m.duration ? `0:${m.duration < 10 ? '0' : ''}${m.duration}` : undefined,
                        date: m.time || "Just now"
                    } as StorageMediaItem;
                });

            // Filter out deleted ones
            firestoreMedia.forEach(item => {
                if (!deletedMediaIds.has(item.id)) {
                    items.push(item);
                }
            });
        });

        return items;
    }, [threads, deletedMediaIds]);

    // Group items by thread
    const threadsStorageDetails = useMemo(() => {
        const map = new Map<string, { thread: Thread; totalBytes: number; itemsCount: number }>();
        
        allMediaItems.forEach(item => {
            const thread = threads.find(t => t.id === item.threadId);
            if (!thread) return;

            const existing = map.get(item.threadId);
            if (existing) {
                existing.totalBytes += item.sizeBytes;
                existing.itemsCount += 1;
            } else {
                map.set(item.threadId, {
                    thread,
                    totalBytes: item.sizeBytes,
                    itemsCount: 1
                });
            }
        });

        return Array.from(map.values()).sort((a, b) => b.totalBytes - a.totalBytes);
    }, [allMediaItems, threads]);

    // Items larger than 5 MB
    const largerThan5MBItems = useMemo(() => {
        return allMediaItems.filter(item => item.sizeBytes > 5 * 1024 * 1024);
    }, [allMediaItems]);

    const totalLargerThan5MBSize = useMemo(() => {
        return largerThan5MBItems.reduce((acc, curr) => acc + curr.sizeBytes, 0);
    }, [largerThan5MBItems]);

    // Total storage calculated
    const totalAppStorageUsed = useMemo(() => {
        return allMediaItems.reduce((acc, curr) => acc + curr.sizeBytes, 0);
    }, [allMediaItems]);

    // Storage info states derived dynamically from Storage Estimate API
    const totalSpace = useMemo(() => {
        const quotaGB = browserQuota / (1024 * 1024 * 1024);
        const standardCapacities = [16, 32, 64, 128, 256, 512, 1024];
        let matched = 256;
        for (const cap of standardCapacities) {
            if (cap > quotaGB) {
                matched = cap;
                break;
            }
        }
        return matched * 1024 * 1024 * 1024;
    }, [browserQuota]);

    const freeSpaceSize = useMemo(() => {
        return Math.max(0, browserQuota - totalAppStorageUsed);
    }, [browserQuota, totalAppStorageUsed]);

    const otherAppsSize = useMemo(() => {
        return Math.max(0, totalSpace - browserQuota);
    }, [totalSpace, browserQuota]);

    // Navigation and back states
    const handleBack = () => {
        if (view === 'chatMedia') {
            setView('manage');
            setSelectedThreadId(null);
            setSelectedMediaIds(new Set());
        } else if (view === 'manage') {
            setView('main');
        } else {
            window.dispatchEvent(new CustomEvent("settings-subpage-back"));
        }
    };

    // Filter media items for selected chat media view
    const activeMediaItems = useMemo(() => {
        if (selectedThreadId === "larger_than_5_mb") {
            return largerThan5MBItems;
        }
        return allMediaItems.filter(item => item.threadId === selectedThreadId);
    }, [selectedThreadId, allMediaItems, largerThan5MBItems]);

    // Selected thread details
    const selectedThreadName = useMemo(() => {
        if (selectedThreadId === "larger_than_5_mb") return "Larger than 5 MB";
        const thread = threads.find(t => t.id === selectedThreadId);
        return thread ? thread.user.name : "Chat Media";
    }, [selectedThreadId, threads]);

    const selectedThreadTotalSize = useMemo(() => {
        const total = activeMediaItems.reduce((acc, curr) => acc + curr.sizeBytes, 0);
        return formatSize(total);
    }, [activeMediaItems]);

    // Toggle select helper
    const toggleSelectMedia = (id: string) => {
        const newSet = new Set(selectedMediaIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedMediaIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedMediaIds.size === activeMediaItems.length) {
            setSelectedMediaIds(new Set());
        } else {
            setSelectedMediaIds(new Set(activeMediaItems.map(item => item.id)));
        }
    };

    // Delete selected items
    const handleDeleteSelected = async () => {
        const newDeletedSet = new Set(deletedMediaIds);
        
        for (const mediaId of selectedMediaIds) {
            newDeletedSet.add(mediaId);
            const mediaItem = activeMediaItems.find(item => item.id === mediaId);
            if (mediaItem) {
                try {
                    await deleteMessage(mediaItem.threadId, mediaItem.messageId, true);
                } catch (e) {
                    console.error("Failed to delete message:", e);
                }
            }
        }

        saveDeletedMedia(newDeletedSet);
        setSelectedMediaIds(new Set());
        setShowDeleteConfirmModal(false);
    };

    const lessData = currentUser?.settings?.storage?.lessDataForCalls || false;
    const autoDownloadVal = currentUser?.settings?.storage?.autoDownload || "wifi";

    const downloadOptions = ["Wi-Fi Only", "Wi-Fi & Cellular", "Never"];
    const currentDownload = autoDownloadVal === "wifi" ? 0 : autoDownloadVal === "cellular" ? 1 : 2;

    const setDownloadOption = (idx: number) => {
        const value = idx === 0 ? "wifi" : idx === 1 ? "cellular" : "never";
        updateSettings('storage.autoDownload', value);
        setShowDownloadModal(false);
    };

    // Filtered chats list in Manage Storage page
    const filteredStorageDetails = useMemo(() => {
        if (!searchQuery.trim()) return threadsStorageDetails;
        return threadsStorageDetails.filter(detail => 
            detail.thread.user.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [threadsStorageDetails, searchQuery]);

    // Network mock stats
    const networkMockStats = useMemo(() => {
        const totalMsgs = threads.reduce((acc, t) => acc + (t.messages?.length || 0), 0);
        const sentBytes = totalMsgs * 3.4 * 1024 * 1024; // 3.4MB sent per msg avg
        const recvBytes = totalMsgs * 5.8 * 1024 * 1024; // 5.8MB recv per msg avg
        return {
            sent: formatSize(sentBytes),
            recv: formatSize(recvBytes)
        };
    }, [threads]);

    return (
        <div className={`w-full h-full bg-[var(--card)] dark:bg-gray-950 flex flex-col overflow-hidden transition-transform`}>
            {/* Header */}
            <header className="bg-white dark:bg-zinc-900 px-3 md:px-4 py-3.5 flex items-center justify-between border-b border-[var(--border)] dark:border-zinc-800 sticky top-0 z-40 shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={handleBack} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer">
                        <ArrowLeft size={22} className="text-[var(--primary)]" />
                    </button>
                    <h1 className="text-lg font-bold dark:text-white">
                        {view === 'main' && "Storage and Data"}
                        {view === 'manage' && "Manage storage"}
                        {view === 'chatMedia' && selectedThreadName}
                    </h1>
                </div>
                {view === 'manage' && (
                    <button 
                        onClick={() => {
                            setShowSearch(!showSearch);
                            setSearchQuery("");
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer text-gray-700 dark:text-white"
                    >
                        <Search size={20} />
                    </button>
                )}
            </header>

            {/* Main Area */}
            <div className="flex-1 overflow-y-auto pb-20 md:pb-6">
                
                {/* 1. MAIN STORAGE SETTINGS VIEW */}
                {view === 'main' && (
                    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
                        
                        {/* Manage Storage Row */}
                        <div 
                            onClick={() => setView('manage')}
                            className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/85 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:scale-[1.01] transition-transform cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <Folder size={22} />
                                </div>
                                <div className="text-left">
                                    <span className="font-bold block dark:text-white">Manage storage</span>
                                    <span className="text-xs text-[var(--secondary)]">{formatSize(totalAppStorageUsed)} used</span>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-[var(--secondary)]" />
                        </div>

                        {/* Network usage stats block */}
                        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/85 rounded-2xl p-4 shadow-sm">
                            <h2 className="text-xs font-semibold text-[var(--secondary)] uppercase tracking-wider mb-3">Network Usage</h2>
                            <div className="flex justify-between text-sm py-1">
                                <span className="text-gray-600 dark:text-gray-400">Sent data</span>
                                <span className="font-semibold dark:text-white">{networkMockStats.sent}</span>
                            </div>
                            <div className="flex justify-between text-sm py-1 border-t border-gray-100 dark:border-zinc-800/60 mt-1 pt-2">
                                <span className="text-gray-600 dark:text-gray-400">Received data</span>
                                <span className="font-semibold dark:text-white">{networkMockStats.recv}</span>
                            </div>
                        </div>

                        {/* Media Auto-Download */}
                        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/85 rounded-2xl overflow-hidden shadow-sm">
                            <div
                                onClick={() => setShowDownloadModal(true)}
                                className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-[var(--border)] dark:border-zinc-800/60 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <Download size={20} className="text-[var(--secondary)]" />
                                    <div className="text-left">
                                        <span className="font-medium block dark:text-white text-sm">Media Auto-Download</span>
                                        <span className="text-xs text-[var(--secondary)]">When to download media</span>
                                    </div>
                                </div>
                                <span className="text-sm text-[var(--primary)] font-semibold">{downloadOptions[currentDownload]}</span>
                            </div>

                            <div className="flex items-center justify-between px-4 md:px-5 py-4">
                                <div className="flex items-center gap-4">
                                    <Wifi size={20} className="text-[var(--secondary)]" />
                                    <span className="font-medium dark:text-white text-sm">Use Less Data for Calls</span>
                                </div>
                                <button
                                    onClick={() => updateSettings('storage.lessDataForCalls', !lessData)}
                                    className={clsx("w-12 h-7 rounded-full transition-colors relative shrink-0", lessData ? "bg-[var(--success)]" : "bg-gray-300 dark:bg-zinc-700")}
                                >
                                    <div className={clsx("w-5 h-5 bg-white rounded-full absolute top-1 shadow-sm transition-all", lessData ? "left-6" : "left-1")} />
                                </button>
                            </div>
                        </div>

                        {/* Clear Cache */}
                        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/85 rounded-2xl overflow-hidden shadow-sm">
                            <div
                                onClick={() => setShowClearModal(true)}
                                className="flex items-center gap-4 px-4 md:px-5 py-4 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                            >
                                <Trash2 size={20} className="text-[var(--danger)]" />
                                <span className="font-bold text-[var(--danger)] text-sm">Clear Cache</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. MANAGE STORAGE VIEW */}
                {view === 'manage' && (
                    <div className="p-4 space-y-4 max-w-5xl mx-auto">
                        
                        {/* Storage Capacity display */}
                        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/85 rounded-2xl p-5 shadow-sm">
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <h2 className="text-2xl font-black dark:text-white">{formatSize(totalAppStorageUsed)}</h2>
                                    <p className="text-xs text-[var(--secondary)] mt-0.5">Used</p>
                                </div>
                                <div className="text-right">
                                    <h2 className="text-2xl font-bold text-gray-400 dark:text-gray-500">{formatSize(freeSpaceSize)}</h2>
                                    <p className="text-xs text-[var(--secondary)] mt-0.5">Free</p>
                                </div>
                            </div>
                            
                            {/* Horizontal Storage Bar */}
                            <div className="w-full h-3 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner">
                                <div 
                                    className="bg-emerald-500 h-full transition-all duration-500" 
                                    style={{ width: `${Math.max((totalAppStorageUsed / totalSpace) * 100, 1.5)}%` }} 
                                />
                                <div 
                                    className="bg-yellow-500 h-full transition-all duration-500" 
                                    style={{ width: `${(otherAppsSize / totalSpace) * 100}%` }} 
                                />
                            </div>
                            
                            {/* Legends */}
                            <div className="flex gap-4 mt-4 text-[10px] font-semibold text-[var(--secondary)]">
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Yogheart ({formatSize(totalAppStorageUsed)})</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> Other apps ({formatSize(otherAppsSize)})</span>
                            </div>
                        </div>

                        {/* Search input if active */}
                        {showSearch && (
                            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/85 rounded-2xl px-4 py-2 flex items-center gap-2 shadow-sm">
                                <Search size={16} className="text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search chat storage..."
                                    className="w-full bg-transparent border-none outline-none text-sm text-gray-950 dark:text-white"
                                    autoFocus
                                />
                            </div>
                        )}

                        {/* Review and delete items */}
                        {largerThan5MBItems.length > 0 && (
                            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/85 rounded-2xl p-4 shadow-sm">
                                <h3 className="text-xs font-bold text-[var(--secondary)] uppercase tracking-wider mb-3">Review and delete items</h3>
                                <div 
                                    onClick={() => {
                                        setSelectedThreadId("larger_than_5_mb");
                                        setView('chatMedia');
                                    }}
                                    className="flex justify-between items-center cursor-pointer group"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex -space-x-4 overflow-hidden rounded-xl bg-gray-50 dark:bg-zinc-800 p-1.5 border border-gray-200 dark:border-zinc-700 shrink-0">
                                            {largerThan5MBItems.slice(0, 3).map((item) => (
                                                <div key={item.id} className="w-14 h-14 rounded-lg overflow-hidden border border-white dark:border-zinc-800 shadow-sm relative z-10">
                                                    {item.type === 'image' || item.type === 'video' ? (
                                                        <img src={item.url} alt="media preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-red-100 dark:bg-red-950/20 text-red-500 flex items-center justify-center">
                                                            <FileText size={20} />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="text-left mt-1">
                                            <span className="font-bold block dark:text-white group-hover:text-[var(--primary)] transition-colors">Larger than 5 MB</span>
                                            <span className="text-xs text-[var(--secondary)] block mt-0.5">{formatSize(totalLargerThan5MBSize)}</span>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-[var(--secondary)]" />
                                </div>
                            </div>
                        )}

                        {/* Storage Details Tabs */}
                        <div className="flex bg-gray-100 dark:bg-gray-800/60 p-1 rounded-2xl w-full">
                            <button
                                onClick={() => setActiveTabSub("all")}
                                className={clsx(
                                    "flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                                    activeTabSub === "all"
                                        ? "bg-white dark:bg-gray-700 text-[var(--primary)] shadow-sm"
                                        : "text-gray-500 dark:text-gray-400"
                                )}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setActiveTabSub("chats")}
                                className={clsx(
                                    "flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                                    activeTabSub === "chats"
                                        ? "bg-white dark:bg-gray-700 text-[var(--primary)] shadow-sm"
                                        : "text-gray-500 dark:text-gray-400"
                                )}
                            >
                                Chats
                            </button>
                            <button
                                onClick={() => setActiveTabSub("channels")}
                                className={clsx(
                                    "flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                                    activeTabSub === "channels"
                                        ? "bg-white dark:bg-gray-700 text-[var(--primary)] shadow-sm"
                                        : "text-gray-500 dark:text-gray-400"
                                )}
                            >
                                Channels
                            </button>
                        </div>

                        {/* Storage details chats list */}
                        {activeTabSub === 'channels' ? (
                            <div className="text-center py-12 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/85 rounded-2xl shadow-sm animate-fade-in">
                                <Sparkles size={28} className="text-gray-300 mx-auto mb-3" />
                                <p className="text-sm text-[var(--secondary)]">No channels found</p>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/85 rounded-2xl overflow-hidden shadow-sm">
                                <div className="px-4 py-3 bg-gray-50 dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800/60 flex items-center justify-between shrink-0">
                                    <span className="text-xs font-bold text-[var(--secondary)] uppercase tracking-wider">Storage details</span>
                                </div>
                                <div className="divide-y divide-gray-100 dark:divide-zinc-800/60">
                                    {filteredStorageDetails.length > 0 ? (
                                        filteredStorageDetails.map(detail => (
                                            <div 
                                                key={detail.thread.id}
                                                onClick={() => {
                                                    setSelectedThreadId(detail.thread.id);
                                                    setView('chatMedia');
                                                }}
                                                className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {detail.thread.user.avatar ? (
                                                        <img src={detail.thread.user.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover shrink-0" />
                                                    ) : (
                                                        <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center text-gray-800 font-bold shrink-0", detail.thread.user.color)}>
                                                            {detail.thread.user.name?.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div className="text-left">
                                                        <span className="font-semibold block dark:text-white text-sm leading-snug">{detail.thread.user.name}</span>
                                                        <span className="text-[10px] text-[var(--secondary)] block mt-0.5">{detail.itemsCount} media items</span>
                                                    </div>
                                                </div>
                                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{formatSize(detail.totalBytes)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12">
                                            <p className="text-sm text-[var(--secondary)]">No chats with media found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. CHAT MEDIA GRID VIEW */}
                {view === 'chatMedia' && (
                    <div className="flex flex-col h-full bg-[var(--card)] dark:bg-zinc-900/10">
                        {/* Selector info bar */}
                        <div className="px-4 py-3 bg-gray-50 dark:bg-zinc-900/60 border-b border-gray-100 dark:border-zinc-800/60 flex justify-between items-center shrink-0">
                            <span className="text-xs font-bold text-[var(--secondary)]">TOTAL: {selectedThreadTotalSize}</span>
                            <button 
                                onClick={toggleSelectAll}
                                className="text-xs text-[var(--primary)] font-bold flex items-center gap-1.5 cursor-pointer"
                            >
                                {selectedMediaIds.size === activeMediaItems.length ? (
                                    <>
                                        <CheckSquare size={14} /> Deselect All
                                    </>
                                ) : (
                                    <>
                                        <Square size={14} /> Select All
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Media Grid */}
                        <div className="p-4 max-w-5xl mx-auto w-full">
                            {activeMediaItems.length > 0 ? (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                    {activeMediaItems.map(item => {
                                        const isSelected = selectedMediaIds.has(item.id);
                                        return (
                                            <div 
                                                key={item.id}
                                                onClick={() => toggleSelectMedia(item.id)}
                                                className={clsx(
                                                    "aspect-square rounded-2xl overflow-hidden border relative cursor-pointer group transition-all select-none shadow-sm",
                                                    isSelected ? "border-[var(--primary)] ring-3 ring-[var(--primary)]/20 scale-95" : "border-gray-200 dark:border-zinc-700/80 hover:scale-[1.02]"
                                                )}
                                            >
                                                {/* File / Doc View */}
                                                {item.type === 'file' ? (
                                                    <div className="w-full h-full bg-red-50 dark:bg-red-950/20 text-red-500 flex flex-col items-center justify-center p-2 text-center">
                                                        <FileText size={28} className="mb-1" />
                                                        <span className="text-[10px] font-bold truncate w-full px-1">{item.fileName}</span>
                                                    </div>
                                                ) : (
                                                    /* Image or Video View */
                                                    <img src={item.url} alt="media thumb" className="w-full h-full object-cover pointer-events-none" />
                                                )}

                                                {/* Video Indicator */}
                                                {item.type === 'video' && (
                                                    <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-xs text-white text-[9px] font-black">
                                                        <Play size={8} className="fill-white" />
                                                        <span>{item.duration || "0:12"}</span>
                                                    </div>
                                                )}

                                                {/* Size Tag (Always Visible) */}
                                                <div className="absolute top-1.5 left-2 bg-black/55 text-white text-[9px] font-black px-1.5 py-0.5 rounded backdrop-blur-xs">
                                                    {item.fileSizeStr}
                                                </div>

                                                {/* Select Indicator */}
                                                <div className="absolute top-2 right-2 z-10">
                                                    {isSelected ? (
                                                        <div className="w-5 h-5 rounded-full bg-[var(--primary)] border border-white flex items-center justify-center text-white">
                                                            <Check size={12} strokeWidth={3} />
                                                        </div>
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-full bg-black/25 border border-white/60 group-hover:bg-black/40 transition-colors" />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-20">
                                    <p className="text-sm text-[var(--secondary)]">No media in this chat</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Delete selected bar at the bottom */}
            {view === 'chatMedia' && selectedMediaIds.size > 0 && (
                <div className="fixed bottom-0 inset-x-0 bg-white dark:bg-zinc-900 border-t border-[var(--border)] dark:border-zinc-800 px-4 py-3 flex justify-between items-center z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] fade-in">
                    <div>
                        <span className="text-sm font-bold dark:text-white block">{selectedMediaIds.size} items selected</span>
                        <span className="text-xs text-[var(--secondary)] mt-0.5">
                            Total: {formatSize(activeMediaItems.filter(item => selectedMediaIds.has(item.id)).reduce((acc, c) => acc + c.sizeBytes, 0))}
                        </span>
                    </div>
                    <button 
                        onClick={() => setShowDeleteConfirmModal(true)}
                        className="px-5 py-2.5 bg-[var(--danger)] text-white font-bold text-sm rounded-xl flex items-center gap-1.5 hover:bg-red-600 transition-colors shadow-sm shadow-red-500/10 cursor-pointer"
                    >
                        <Trash2 size={16} /> Delete Selected
                    </button>
                </div>
            )}

            {/* Download Settings Modal */}
            {showDownloadModal && (
                <div className="modal-overlay" onClick={() => setShowDownloadModal(false)}>
                    <div className="modal-content p-6 dark:bg-gray-800 flex flex-col" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4 dark:text-white">Media Auto-Download</h2>
                        <div className="space-y-1">
                            {downloadOptions.map((opt, idx) => (
                                <div
                                    key={opt}
                                    onClick={() => setDownloadOption(idx)}
                                    className={clsx(
                                        "px-4 py-3 rounded-xl cursor-pointer transition-colors dark:text-white text-sm font-medium",
                                        currentDownload === idx ? "bg-[var(--primary)] text-white" : "hover:bg-gray-100 dark:hover:bg-gray-700"
                                    )}
                                >
                                    {opt}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Clear Cache Confirmation Modal */}
            {showClearModal && (
                <div className="modal-overlay" onClick={() => setShowClearModal(false)}>
                    <div className="modal-content p-6 dark:bg-gray-800 flex flex-col" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4 dark:text-white">Clear Cache?</h2>
                        <p className="text-sm text-[var(--secondary)] mb-6">This will clear 1.2 GB of cached data. Your messages and media will not be deleted.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowClearModal(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-250 dark:bg-gray-700 dark:text-white rounded-xl text-sm font-semibold cursor-pointer">Cancel</button>
                            <button onClick={() => {
                                setShowClearModal(false);
                            }} className="flex-1 py-3 bg-[var(--danger)] text-white rounded-xl text-sm font-semibold cursor-pointer">Clear</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Selected Media Confirmation Modal */}
            {showDeleteConfirmModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirmModal(false)}>
                    <div className="modal-content p-6 dark:bg-gray-800 flex flex-col" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4 dark:text-white">Delete media?</h2>
                        <p className="text-sm text-[var(--secondary)] mb-6">Are you sure you want to delete these {selectedMediaIds.size} media items? This will remove them permanently from your chat histories.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteConfirmModal(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-250 dark:bg-gray-700 dark:text-white rounded-xl text-sm font-semibold cursor-pointer">Cancel</button>
                            <button onClick={handleDeleteSelected} className="flex-1 py-3 bg-[var(--danger)] text-white rounded-xl text-sm font-semibold cursor-pointer">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
