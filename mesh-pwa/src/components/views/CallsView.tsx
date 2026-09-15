"use client";

import { useMockData, CallLog, User } from "@/context/MockContext";
import { useCall } from "@/context/CallContext";
import { useState, useEffect, useMemo, useRef } from "react";
import { 
  Phone, 
  Video, 
  Search, 
  Trash2, 
  X, 
  ArrowUpRight, 
  ArrowDownLeft, 
  PhoneOff, 
  PhoneMissed, 
  PhoneIncoming, 
  PhoneOutgoing, 
  ArrowLeft, 
  MoreVertical, 
  MessageSquare, 
  Info, 
  Share2
} from "lucide-react";
import { clsx } from "clsx";
import ZoomedAvatarModal from "@/components/ZoomedAvatarModal";
import { useModalHistory } from "@/hooks/useModalHistory";

function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function getDayKey(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "Today";
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  } catch {
    return "Today";
  }
}

function formatDayLabel(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Recent";
    const now = new Date();
    
    if (now.toDateString() === date.toDateString()) {
      return "Today";
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (yesterday.toDateString() === date.toDateString()) {
      return "Yesterday";
    }

    return date.toLocaleDateString("en-US", { day: "numeric", month: "long" });
  } catch {
    return "Recent";
  }
}

function formatCallTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "12:00";
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "12:00";
  }
}

function formatRelativeCallDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Recently";
    const now = new Date();
    const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

    if (now.toDateString() === date.toDateString()) {
      return `Today, ${timeStr}`;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (yesterday.toDateString() === date.toDateString()) {
      return `Yesterday, ${timeStr}`;
    }

    const dayMonth = date.toLocaleDateString("en-US", { day: "numeric", month: "long" });
    return `${dayMonth}, ${timeStr}`;
  } catch {
    return "Recently";
  }
}

export type ResolvedCallLog = CallLog & {
  isOutgoing: boolean;
  otherPartyId: string;
  otherPartyName: string;
  otherPartyAvatar: string | null;
  otherPartyColor: string;
  otherPartyInitials: string;
  otherPartyPhone?: string;
  otherPartyBio?: string;
  otherPartyLocation?: string;
};

export type GroupedCallLog = {
  id: string;
  otherPartyId: string;
  otherPartyName: string;
  otherPartyAvatar: string | null;
  otherPartyColor: string;
  otherPartyInitials: string;
  otherPartyPhone?: string;
  otherPartyBio?: string;
  otherPartyLocation?: string;
  dayKey: string;
  dayLabel: string;
  isOutgoing: boolean;
  status: "ringing" | "answered" | "ended" | "rejected" | "missed";
  type: "audio" | "video";
  latestTimestamp: string;
  calls: ResolvedCallLog[];
};

export interface CallsViewProps {
  onBack?: () => void;
  isOverlay?: boolean;
}

export default function CallsView({ onBack, isOverlay }: CallsViewProps = {}) {
  const { 
    currentUser, 
    callLogs, 
    clearCallLogs, 
    allDatingUsers, 
    threads, 
    startDirectChat, 
    setActiveTab: setGlobalActiveTab, 
    setActiveThreadId, 
    markCallLogsAsRead, 
    activeTab: globalActiveTab,
    addNotification
  } = useMockData();

  const { initiateCall } = useCall();

  useEffect(() => {
    if (globalActiveTab === "calls") {
      markCallLogsAsRead();
    }
  }, [globalActiveTab, callLogs.length, currentUser?.id]);

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "missed">("all");
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [zoomedLog, setZoomedLog] = useState<ResolvedCallLog | null>(null);
  
  // Selected call info group for WhatsApp-style slide-out page
  const [selectedCallInfoGroup, setSelectedCallInfoGroup] = useState<GroupedCallLog | null>(null);
  const [isClosingCallInfo, setIsClosingCallInfo] = useState(false);
  const [swipeBackX, setSwipeBackX] = useState(0);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);

  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const isSwipingBackRef = useRef(false);

  const handleCloseCallInfo = () => {
    setIsClosingCallInfo(true);
    setShowMenuDropdown(false);
    setTimeout(() => {
      setSelectedCallInfoGroup(null);
      setIsClosingCallInfo(false);
      setSwipeBackX(0);
    }, 240);
  };

  // Sync with browser history for native edge swipe-back and hardware back button
  useModalHistory(
    "callInfo",
    !!selectedCallInfoGroup,
    handleCloseCallInfo
  );

  const handleTouchStartCallInfo = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isSwipingBackRef.current = false;
  };

  const handleTouchMoveCallInfo = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartXRef.current;
    const dy = e.touches[0].clientY - touchStartYRef.current;

    if (!isSwipingBackRef.current) {
      if (dx > 12 && Math.abs(dx) > Math.abs(dy)) {
        isSwipingBackRef.current = true;
      }
    }

    if (isSwipingBackRef.current && dx > 0) {
      setSwipeBackX(dx);
    }
  };

  const handleTouchEndCallInfo = () => {
    if (isSwipingBackRef.current) {
      if (swipeBackX > 80) {
        handleCloseCallInfo();
      } else {
        setSwipeBackX(0);
      }
    }
    isSwipingBackRef.current = false;
  };

  // Real Firestore call logs
  const rawLogs: CallLog[] = useMemo(() => {
    return callLogs || [];
  }, [callLogs]);

  // Resolve details for the other party in each call log
  const resolvedLogs: ResolvedCallLog[] = useMemo(() => {
    const currentUserId = currentUser?.id || "me";

    return rawLogs.map((log) => {
      const isOutgoing = log.callerId === currentUserId;
      const otherPartyId = isOutgoing ? log.calleeId : log.callerId;

      const registeredUser = allDatingUsers.find((u) => u.id === otherPartyId);

      const name = registeredUser?.name || (isOutgoing ? log.calleeName : log.callerName) || "Unknown User";
      const avatar = registeredUser?.avatar || (isOutgoing ? log.calleeAvatar : log.callerAvatar) || null;
      const color = registeredUser?.color || "bg-emerald-200";
      const initials = name.charAt(0).toUpperCase() || "?";
      
      let phone = registeredUser?.phoneNumber || "";
      if (!phone) {
        if (otherPartyId === "user_mom" || name.includes("Mom")) phone = "+250 732 457 060";
        else if (otherPartyId === "user_esther" || name.includes("Esther")) phone = "+250 788 123 456";
        else if (otherPartyId === "user_mukunzi" || name.includes("792 701 056")) phone = "+250 792 701 056";
        else if (otherPartyId === "user_dany" || name.includes("Dany")) phone = "+250 780 999 888";
        else phone = "+250 788 000 111";
      }

      return {
        ...log,
        isOutgoing,
        otherPartyId,
        otherPartyName: name,
        otherPartyAvatar: avatar,
        otherPartyColor: color,
        otherPartyInitials: initials,
        otherPartyPhone: phone,
        otherPartyBio: registeredUser?.bio,
        otherPartyLocation: registeredUser?.location || "Kigali, Rwanda"
      };
    });
  }, [rawLogs, currentUser?.id, allDatingUsers]);

  // Group same-day calls by contact & call direction (WhatsApp style)
  const groupedLogs: GroupedCallLog[] = useMemo(() => {
    const groups: GroupedCallLog[] = [];

    // Sort logs descending by timestamp
    const sorted = [...resolvedLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    for (const log of sorted) {
      const dayKey = getDayKey(log.timestamp);
      const isMissed = !log.isOutgoing && log.status === "missed";

      // Check if we can merge with the previous group (same user, same day, same direction/category)
      const lastGroup = groups[groups.length - 1];
      if (
        lastGroup &&
        lastGroup.otherPartyId === log.otherPartyId &&
        lastGroup.dayKey === dayKey &&
        (
          (lastGroup.status === "missed" && isMissed) ||
          (lastGroup.isOutgoing === log.isOutgoing && !isMissed && lastGroup.status !== "missed")
        )
      ) {
        lastGroup.calls.push(log);
      } else {
        // Create a new grouped entry
        groups.push({
          id: `group_${log.id}`,
          otherPartyId: log.otherPartyId,
          otherPartyName: log.otherPartyName,
          otherPartyAvatar: log.otherPartyAvatar,
          otherPartyColor: log.otherPartyColor,
          otherPartyInitials: log.otherPartyInitials,
          otherPartyPhone: log.otherPartyPhone,
          otherPartyBio: log.otherPartyBio,
          otherPartyLocation: log.otherPartyLocation,
          dayKey,
          dayLabel: formatDayLabel(log.timestamp),
          isOutgoing: log.isOutgoing,
          status: log.status,
          type: log.type,
          latestTimestamp: log.timestamp,
          calls: [log]
        });
      }
    }

    return groups;
  }, [resolvedLogs]);

  // Filter grouped logs based on active tab ("all" vs "missed") and search query
  const filteredGroups = useMemo(() => {
    return groupedLogs.filter((group) => {
      const isMissedGroup = !group.isOutgoing && group.status === "missed";
      const matchesTab = activeTab === "all" || (activeTab === "missed" && isMissedGroup);
      const matchesSearch =
        group.otherPartyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (group.otherPartyPhone && group.otherPartyPhone.includes(searchQuery));
      return matchesTab && matchesSearch;
    });
  }, [groupedLogs, activeTab, searchQuery]);

  const handleStartChat = async (userId: string, name: string) => {
    setSelectedCallInfoGroup(null);
    if (onBack) {
      onBack();
    }
    const thread = threads.find((t) => t.user?.id === userId);
    if (thread) {
      setGlobalActiveTab("chats");
      setActiveThreadId(thread.id);
      window.history.pushState(null, "", `/inbox?id=${thread.id}`);
    } else {
      try {
        const user = allDatingUsers.find((u) => u.id === userId) || ({
          id: userId,
          name,
          avatar: null,
          color: "bg-emerald-200"
        } as User);
        const threadId = await startDirectChat(user);
        setGlobalActiveTab("chats");
        setActiveThreadId(threadId);
        window.history.pushState(null, "", `/inbox?id=${threadId}`);
      } catch (e) {
        console.error("Start chat error:", e);
      }
    }
  };

  const handleCallback = (userId: string, name: string, avatar: string | null, type: "audio" | "video") => {
    initiateCall(userId, name, avatar, type);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--background)] dark:bg-gray-900 relative overflow-hidden">
      {/* ══════════════════════════════════════════════════════════════════
          SLIDE-OUT "CALL INFO" PAGE (SLIDES FROM RIGHT EDGE WITH SWIPE BACK)
      ══════════════════════════════════════════════════════════════════ */}
      {selectedCallInfoGroup && (
        <div 
          onTouchStart={handleTouchStartCallInfo}
          onTouchMove={handleTouchMoveCallInfo}
          onTouchEnd={handleTouchEndCallInfo}
          className="absolute inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col overflow-y-auto custom-scrollbar shadow-2xl"
          style={{
            transform: isClosingCallInfo 
              ? "translateX(100%)" 
              : swipeBackX > 0 
                ? `translateX(${swipeBackX}px)` 
                : "translateX(0%)",
            transition: swipeBackX > 0 ? "none" : "transform 0.26s cubic-bezier(0.16, 1, 0.3, 1)",
            animation: !isClosingCallInfo && swipeBackX === 0 ? "slideFromRight 0.26s cubic-bezier(0.16, 1, 0.3, 1)" : undefined
          }}
        >
          {/* Top Bar Header */}
          <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md z-20 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleCloseCallInfo}
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
                title="Back to Calls"
              >
                <ArrowLeft size={22} />
              </button>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-none">
                Call info
              </h2>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowMenuDropdown((prev) => !prev)}
                className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                title="More options"
              >
                <MoreVertical size={20} />
              </button>

              {showMenuDropdown && (
                <div 
                  className="absolute right-0 top-11 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-150 dark:border-gray-700 py-1.5 z-30 animate-fade-in"
                  onClick={() => setShowMenuDropdown(false)}
                >
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: selectedCallInfoGroup.otherPartyName,
                          text: `Contact: ${selectedCallInfoGroup.otherPartyName} (${selectedCallInfoGroup.otherPartyPhone})`
                        }).catch(() => {});
                      } else {
                        navigator.clipboard.writeText(`${selectedCallInfoGroup.otherPartyName}: ${selectedCallInfoGroup.otherPartyPhone}`);
                        addNotification("Contact info copied!");
                      }
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2.5"
                  >
                    <Share2 size={14} /> Share contact
                  </button>
                  <button
                    onClick={() => {
                      window.history.pushState(null, "", `/profile?userId=${selectedCallInfoGroup.otherPartyId}&from=calls`);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2.5"
                  >
                    <Info size={14} /> View profile
                  </button>
                  <button
                    onClick={() => {
                      handleCloseCallInfo();
                      addNotification("Call logs for this contact cleared.");
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5"
                  >
                    <Trash2 size={14} /> Remove from call log
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Profile Avatar & Contact Details - Large centered avatar */}
          <div className="flex flex-col items-center justify-center pt-8 pb-6 px-6 text-center">
            <div
              onClick={() => {
                if (selectedCallInfoGroup.otherPartyAvatar) {
                  setZoomedLog(selectedCallInfoGroup.calls[0]);
                }
              }}
              className="relative cursor-pointer group"
              title="Tap to zoom photo"
            >
              <div
                className={clsx(
                  "w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden flex items-center justify-center shadow-xl border-3 border-gray-100 dark:border-gray-800 transition-transform group-hover:scale-105 select-none",
                  selectedCallInfoGroup.otherPartyAvatar ? "bg-white" : selectedCallInfoGroup.otherPartyColor
                )}
              >
                {selectedCallInfoGroup.otherPartyAvatar ? (
                  <img
                    src={selectedCallInfoGroup.otherPartyAvatar}
                    alt={selectedCallInfoGroup.otherPartyName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-5xl sm:text-6xl font-extrabold text-gray-800 dark:text-white">
                    {selectedCallInfoGroup.otherPartyInitials}
                  </span>
                )}
              </div>
            </div>

            <h1 className="text-2xl font-black text-gray-900 dark:text-white mt-4 flex items-center gap-1.5">
              {selectedCallInfoGroup.otherPartyName}
            </h1>

            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
              {selectedCallInfoGroup.otherPartyPhone || "+250 732 457 060"}
            </p>

            {/* Quick Action Buttons Row (Message, Audio, Video, Profile) */}
            <div className="flex items-center justify-center gap-6 sm:gap-8 mt-6">
              {/* Message */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() => handleStartChat(selectedCallInfoGroup.otherPartyId, selectedCallInfoGroup.otherPartyName)}
                  className="w-14 h-14 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-white flex items-center justify-center transition-transform active:scale-95 shadow-xs cursor-pointer"
                  title="Message"
                >
                  <MessageSquare size={22} />
                </button>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Message</span>
              </div>

              {/* Audio Call */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() => handleCallback(selectedCallInfoGroup.otherPartyId, selectedCallInfoGroup.otherPartyName, selectedCallInfoGroup.otherPartyAvatar, "audio")}
                  className="w-14 h-14 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-white flex items-center justify-center transition-transform active:scale-95 shadow-xs cursor-pointer"
                  title="Audio Call"
                >
                  <Phone size={22} />
                </button>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Audio</span>
              </div>

              {/* Video Call */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() => handleCallback(selectedCallInfoGroup.otherPartyId, selectedCallInfoGroup.otherPartyName, selectedCallInfoGroup.otherPartyAvatar, "video")}
                  className="w-14 h-14 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-white flex items-center justify-center transition-transform active:scale-95 shadow-xs cursor-pointer"
                  title="Video Call"
                >
                  <Video size={22} />
                </button>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Video</span>
              </div>

              {/* Profile */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() => {
                    window.history.pushState(null, "", `/profile?userId=${selectedCallInfoGroup.otherPartyId}&from=calls`);
                  }}
                  className="w-14 h-14 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-white flex items-center justify-center transition-transform active:scale-95 shadow-xs cursor-pointer"
                  title="View Profile"
                >
                  <Info size={22} />
                </button>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Profile</span>
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-gray-100 dark:bg-gray-800 my-2" />

          {/* Call Attempts Breakdown List (Tapping any call places callback immediately) */}
          <div className="flex-1 px-4 sm:px-6 py-3 max-w-lg mx-auto w-full">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              {selectedCallInfoGroup.dayLabel}
            </h3>

            <div className="space-y-2">
              {selectedCallInfoGroup.calls.map((call, idx) => {
                const isMissed = !call.isOutgoing && call.status === "missed";
                const isDeclined = call.status === "rejected";
                const timeStr = formatCallTime(call.timestamp);
                const isVideo = call.type === "video";

                return (
                  <div 
                    key={call.id || idx} 
                    onClick={() => handleCallback(selectedCallInfoGroup.otherPartyId, selectedCallInfoGroup.otherPartyName, selectedCallInfoGroup.otherPartyAvatar, call.type || "audio")}
                    className="flex items-center gap-4 py-2.5 px-3 -mx-3 rounded-2xl hover:bg-black/5 dark:hover:bg-gray-800/60 active:scale-[0.99] transition-all cursor-pointer group"
                    title={`Tap to call back (${isVideo ? "Video" : "Voice"})`}
                  >
                    {/* Direction Icon */}
                    <div className="shrink-0">
                      {isMissed ? (
                        <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                          <PhoneMissed size={16} />
                        </div>
                      ) : call.isOutgoing ? (
                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                          <PhoneOutgoing size={16} />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                          <PhoneIncoming size={16} />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={clsx(
                          "text-sm font-semibold",
                          isMissed ? "text-rose-500 dark:text-rose-400" : "text-gray-900 dark:text-white"
                        )}>
                          {isMissed ? "Missed" : call.isOutgoing ? "Outgoing" : isDeclined ? "Declined" : "Incoming"}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                          {timeStr}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        <span>{isVideo ? "Video call" : "Voice call"}</span>
                        {call.duration !== undefined && call.status !== "missed" && (
                          <>
                            <span>•</span>
                            <span>{formatDuration(call.duration)}</span>
                            <span>•</span>
                            <span>{(0.5 + (call.duration / 60) * 0.4).toFixed(1)} MB</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right Instant Callback Icon */}
                    <div className="shrink-0 text-gray-400 group-hover:text-[var(--primary)] transition-colors p-1">
                      {isVideo ? <Video size={16} /> : <Phone size={16} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MAIN CALLS LIST VIEW
      ══════════════════════════════════════════════════════════════════ */}
      {/* Header */}
      <header className="sticky top-0 bg-white dark:bg-gray-900 z-40 border-b border-[var(--border)] dark:border-gray-800 shrink-0">
        <div className="flex items-center justify-between px-4 md:px-6 py-2 min-h-[52px]">
          {/* Left: Title & Input */}
          <div className="flex-1 flex items-center gap-2.5 mr-3">
            {onBack && (
              <button
                onClick={onBack}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-zinc-200 cursor-pointer transition-transform active:scale-95 shrink-0 -ml-1"
                title="Back to Chats"
                aria-label="Back to Chats"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <h1 className="text-xl font-bold dark:text-white shrink-0">Calls</h1>
            {isSearching && (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search calls or contacts..."
                className="flex-1 bg-transparent text-sm font-semibold dark:text-white outline-none border-none placeholder:text-gray-400 dark:placeholder:text-gray-500 py-0.5"
                autoFocus
              />
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {isSearching && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setIsSearching(false);
                }}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 cursor-pointer"
                title="Cancel Search"
              >
                <X size={18} />
              </button>
            )}

            <button
              onClick={() => setIsSearching(true)}
              className={clsx(
                "p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 cursor-pointer",
                isSearching && "text-emerald-500 dark:text-emerald-400"
              )}
              title="Search History"
            >
              <Search size={18} />
            </button>

            {rawLogs.length > 0 && (
              <button
                onClick={() => setShowConfirmClear(true)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-rose-500 cursor-pointer"
                title="Clear Call History"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Tabs: All Calls vs. Missed Calls */}
        <div className="px-4 md:px-6 pb-2.5">
          <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-xl w-full">
            <button
              onClick={() => setActiveTab("all")}
              className={clsx(
                "flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                activeTab === "all"
                  ? "bg-white dark:bg-gray-700 text-[var(--primary)] shadow-xs"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              <Phone size={14} /> All Calls
            </button>
            <button
              onClick={() => setActiveTab("missed")}
              className={clsx(
                "flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                activeTab === "missed"
                  ? "bg-white dark:bg-gray-700 text-[var(--primary)] shadow-xs"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              <PhoneMissed size={14} /> Missed Calls
            </button>
          </div>
        </div>
      </header>

      {/* Main Grouped Calls List */}
      <div className="flex-1 overflow-y-auto pb-20 lg:pb-6 bg-[var(--background)] dark:bg-gray-900 custom-scrollbar">
        {filteredGroups.length > 0 ? (
          <div className="divide-y divide-gray-100/60 dark:divide-gray-800/60">
            {filteredGroups.map((group) => {
              const isMissed = !group.isOutgoing && group.status === "missed";
              const isRejected = group.status === "rejected";
              const callCount = group.calls.length;

              return (
                <div
                  key={group.id}
                  onClick={() => setSelectedCallInfoGroup(group)}
                  className="flex items-center gap-3.5 px-4 md:px-6 py-2.5 sm:py-3 hover:bg-black/5 dark:hover:bg-gray-800/40 transition-colors cursor-pointer select-none group"
                >
                  {/* Avatar (Clicking opens Zoomed Avatar) */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (group.otherPartyAvatar) {
                        setZoomedLog(group.calls[0]);
                      } else {
                        window.history.pushState(null, "", `/profile?userId=${group.otherPartyId}&from=calls`);
                      }
                    }}
                    className="cursor-pointer"
                    title="View Avatar"
                  >
                    <div
                      className={clsx(
                        "w-11 h-11 rounded-full overflow-hidden flex items-center justify-center font-bold shrink-0 shadow-xs transition-transform group-hover:scale-105",
                        group.otherPartyAvatar ? "bg-white" : group.otherPartyColor
                      )}
                    >
                      {group.otherPartyAvatar ? (
                        <img
                          src={group.otherPartyAvatar}
                          alt={group.otherPartyName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg text-gray-800 dark:text-white font-extrabold">
                          {group.otherPartyInitials}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Call Info Row */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3
                        className={clsx(
                          "font-semibold text-[15px] truncate",
                          isMissed ? "text-rose-500 dark:text-rose-400 font-bold" : "text-gray-900 dark:text-white"
                        )}
                      >
                        {group.otherPartyName}
                      </h3>
                      {callCount > 1 && (
                        <span
                          className={clsx(
                            "text-[13px] font-bold",
                            isMissed ? "text-rose-500 dark:text-rose-400" : "text-gray-600 dark:text-gray-400"
                          )}
                        >
                          ({callCount})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      {/* Direction Arrow Icon */}
                      {group.isOutgoing ? (
                        <ArrowUpRight
                          size={15}
                          className={clsx(
                            "shrink-0",
                            group.status === "missed" ? "text-amber-500" : "text-emerald-500"
                          )}
                        />
                      ) : (
                        <ArrowDownLeft
                          size={15}
                          className={clsx(
                            "shrink-0",
                            isMissed ? "text-rose-500" : isRejected ? "text-amber-500" : "text-emerald-500"
                          )}
                        />
                      )}

                      {/* Relative Time string (e.g. Today, 14:30 or Yesterday, 11:43) */}
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {formatRelativeCallDate(group.latestTimestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Right Action: Quick Callback Button */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCallback(group.otherPartyId, group.otherPartyName, group.otherPartyAvatar, group.type || "audio");
                      }}
                      className="p-2.5 bg-black/5 hover:bg-black/10 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full transition-colors text-[var(--primary)] cursor-pointer"
                      title={group.type === "video" ? "Video Call" : "Audio Call"}
                    >
                      {group.type === "video" ? <Video size={17} /> : <Phone size={17} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 px-8 text-gray-500 flex flex-col items-center">
            <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4 text-gray-400 shadow-xs border border-[var(--border)] dark:border-gray-800">
              <PhoneOff size={28} />
            </div>
            <p className="text-base font-semibold text-gray-700 dark:text-gray-300">No calls found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[240px] leading-relaxed">
              {searchQuery ? "No call history matching your search." : "Your audio and video call history will appear here."}
            </p>
          </div>
        )}
      </div>

      {/* Clear Confirmation Modal */}
      {showConfirmClear && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowConfirmClear(false)}>
          <div
            className="modal-content p-6 max-w-sm flex flex-col bg-white dark:bg-gray-850 rounded-3xl border border-gray-150 dark:border-gray-750 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Clear Call History?</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-xs leading-relaxed">
              Are you sure you want to delete all call logs? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await clearCallLogs();
                  setShowConfirmClear(false);
                  addNotification("Call history cleared.");
                }}
                className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors text-xs shadow-sm cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zoomed Avatar Modal on tap of avatar */}
      <ZoomedAvatarModal
        isOpen={!!zoomedLog}
        onClose={() => setZoomedLog(null)}
        userName={zoomedLog?.otherPartyName || ""}
        userAvatar={zoomedLog?.otherPartyAvatar || null}
        userColor={zoomedLog?.otherPartyColor || "bg-emerald-200"}
        location={zoomedLog?.otherPartyLocation || null}
        onMessage={() => {
          if (zoomedLog) {
            const targetLog = zoomedLog;
            setZoomedLog(null);
            handleStartChat(targetLog.otherPartyId, targetLog.otherPartyName);
          }
        }}
        onCall={(type) => {
          if (zoomedLog) {
            initiateCall(zoomedLog.otherPartyId, zoomedLog.otherPartyName, zoomedLog.otherPartyAvatar || null, type);
          }
        }}
        onInfo={() => {
          if (zoomedLog) {
            setZoomedLog(null);
            window.history.pushState(null, "", `/profile?userId=${zoomedLog.otherPartyId}&from=calls`);
          }
        }}
      />
    </div>
  );
}

