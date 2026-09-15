"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  MessageCircle,
  Settings,
  User,
  Phone,
  ShoppingBag,
  Store
} from "lucide-react";
import { useMockData, isMarketplaceThread } from "@/context/MockContext";
import { triggerRipple } from "@/utils/ui";

const navItems = [
  { name: "Market", href: "/marketplace", icon: ShoppingBag },
  { name: "Chats", href: "/chats", icon: MessageCircle },
  { name: "Calls", href: "/calls", icon: Phone },
  { name: "Menu", href: "/profile", icon: Store },
  { name: "Settings", href: "/me", icon: Settings },
];

const desktopSidebarNavItems = [
  { name: "Marketplace", href: "/marketplace", icon: ShoppingBag, id: "marketplace" },
  { name: "Chats", href: "/chats", icon: MessageCircle, id: "chats" },
  { name: "Calls", href: "/calls", icon: Phone, id: "calls" },
];

const mainPaths = ["/", "/marketplace", "/chats", "/calls", "/store", "/profile", "/me", "/inbox"];

function getTabName(name: string) {
  if (name === "Market" || name === "Marketplace") return "marketplace";
  if (name === "Chats") return "chats";
  if (name === "Calls") return "calls";
  if (name === "Menu" || name === "Store / Profile") return "profile";
  return "me";
}

// Sidebar for desktop
export function Sidebar() {
  const {
    currentUser,
    threads,
    callLogs,
    activeTab,
    setActiveTab,
    setActiveThreadId,
    currentPath: pathname,
    currentSearchParams: searchParams
  } = useMockData();
  const router = useRouter();

  if (
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup')
  ) {
    return null;
  }

  const isCurrentlyOnMainPath = mainPaths.includes(pathname);

  const handleTabPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    triggerRipple(e as any);
  };

  const handleDesktopNavClick = (e: React.MouseEvent, item: typeof desktopSidebarNavItems[0]) => {
    e.preventDefault();
    setActiveThreadId(null);

    if (item.id === "marketplace") {
      setActiveTab("marketplace");
      window.history.pushState(null, "", "/marketplace");
    } else if (item.id === "chats") {
      setActiveTab("chats");
      window.history.pushState(null, "", "/chats");
    } else if (item.id === "calls") {
      setActiveTab("calls");
      window.history.pushState(null, "", "/calls");
    } else if (item.id === "profile") {
      setActiveTab("profile");
      window.history.pushState(null, "", "/profile?userId=me");
    }
    window.dispatchEvent(new CustomEvent("closeMarketplaceOverlays"));
    window.dispatchEvent(new Event("locationchange"));
  };

  const unreadChatsCount = threads ? threads.filter((t: any) => t.unread).length : 0;
  const unreadMarketCount = 0;
  const missedCallsCount = (callLogs && currentUser) 
    ? callLogs.filter((log: any) => log.callerId !== currentUser.id && log.status === "missed" && log.read !== true).length 
    : 0;

  return (
    <div className="sidebar">
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
        <h1 className="text-xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          Yogheart Market
        </h1>
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto custom-scrollbar">
        {desktopSidebarNavItems.map((item) => {
          let isActive = false;
          const isViewingThread = pathname.startsWith("/inbox");
          const fromParam = searchParams?.get("from");
          const isSettingsOverlay = searchParams?.get("settings") === "overlay" || pathname.startsWith("/me") || activeTab === "me";
          const isViewingOtherProfile = !isSettingsOverlay && pathname.startsWith("/profile") && (searchParams?.get("userId") && searchParams?.get("userId") !== "me" || !!fromParam || !!searchParams?.get("groupId"));

          if (isSettingsOverlay) {
            isActive = false;
          } else if (isViewingThread) {
            if (fromParam === "marketplace") {
              isActive = item.id === "marketplace";
            } else {
              isActive = item.id === "chats";
            }
          } else if (isViewingOtherProfile) {
            if (fromParam === "marketplace") {
              isActive = item.id === "marketplace";
            } else if (fromParam === "calls") {
              isActive = item.id === "calls";
            } else {
              isActive = item.id === "chats";
            }
          } else {
            if (fromParam === "marketplace") {
              isActive = item.id === "marketplace";
            } else if (fromParam === "calls") {
              isActive = item.id === "calls";
            } else if (fromParam === "chat" || fromParam === "chats" || fromParam === "archived") {
              isActive = item.id === "chats";
            } else if (item.id === "marketplace") {
              isActive = activeTab === "marketplace" || (pathname === "/" && activeTab !== "profile" && activeTab !== "calls" && activeTab !== "chats") || pathname.startsWith("/marketplace");
            } else if (item.id === "chats") {
              isActive = (activeTab === "chats" || pathname === "/chats") && !pathname.startsWith("/profile") && !pathname.startsWith("/marketplace") && !pathname.startsWith("/calls") && !pathname.startsWith("/me");
            } else if (item.id === "calls") {
              isActive = activeTab === "calls" || pathname.startsWith("/calls");
            }
          }

          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              scroll={false}
              onPointerDown={handleTabPointerDown}
              onClick={(e) => handleDesktopNavClick(e, item)}
              className={clsx(
                "flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all select-none relative overflow-hidden touch-manipulation cursor-pointer",
                isActive
                  ? "bg-[var(--primary)] text-white shadow-md shadow-emerald-600/20 font-bold"
                  : "text-gray-800 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-zinc-800/60 font-medium"
              )}
            >
              <div className="flex items-center gap-3 relative z-10 pointer-events-none">
                <Icon
                  size={19}
                  className="shrink-0"
                />
                <span className="text-sm">{item.name}</span>
              </div>

              {/* Badges */}
              {item.id === "chats" && unreadChatsCount > 0 && (
                <span className={clsx(
                  "text-xs font-bold px-2 py-0.5 rounded-full shrink-0 relative z-10 pointer-events-none",
                  isActive ? "bg-white text-[var(--primary)]" : "bg-red-500 text-white"
                )}>
                  {unreadChatsCount}
                </span>
              )}
              {item.id === "marketplace" && unreadMarketCount > 0 && (
                <span className={clsx(
                  "text-xs font-bold px-2 py-0.5 rounded-full shrink-0 relative z-10 pointer-events-none",
                  isActive ? "bg-white text-[var(--primary)]" : "bg-red-500 text-white"
                )}>
                  {unreadMarketCount}
                </span>
              )}
              {item.id === "calls" && missedCallsCount > 0 && (
                <span className={clsx(
                  "text-xs font-bold px-2 py-0.5 rounded-full shrink-0 relative z-10 pointer-events-none",
                  isActive ? "bg-white text-[var(--primary)]" : "bg-red-500 text-white"
                )}>
                  {missedCallsCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-2 border-t border-[var(--border)] mt-auto">
        {(() => {
          const isSettingsOverlay = searchParams?.get("settings") === "overlay" || pathname.startsWith("/me") || activeTab === "me";
          const isStoreProfileActive =
            isSettingsOverlay ||
            activeTab === "profile" ||
            activeTab === "store" ||
            pathname.startsWith("/profile") ||
            pathname.startsWith("/store");

          return (
            <Link
              href="/profile?userId=me"
              scroll={false}
              onPointerDown={handleTabPointerDown}
              onClick={(e) => {
                e.preventDefault();
                setActiveThreadId(null);
                setActiveTab("profile");
                window.history.pushState(null, "", "/profile?userId=me");
                window.dispatchEvent(new CustomEvent("closeMarketplaceOverlays"));
                window.dispatchEvent(new Event("locationchange"));
              }}
              className={clsx(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all select-none relative overflow-hidden touch-manipulation cursor-pointer",
                isStoreProfileActive
                  ? "bg-[var(--primary)] text-white shadow-md shadow-emerald-600/20 font-bold"
                  : "text-gray-800 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-zinc-800/60 font-medium"
              )}
            >
              <Store size={19} className="relative z-10 pointer-events-none" />
              <span className="text-sm relative z-10 pointer-events-none">Store / Profile</span>
            </Link>
          );
        })()}
      </div>
    </div>
  );
}

// Bottom nav for mobile
export function BottomNav() {
  const { currentUser, threads, callLogs, activeTab, setActiveTab, setActiveThreadId, activeThreadId, currentPath: pathname, currentSearchParams: searchParams } = useMockData();
  const router = useRouter();

  const [hasActiveModal, setHasActiveModal] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleFocusChange = () => {
      const activeEl = document.activeElement;
      const isInputFocused = !!(
        activeEl && (
          activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable
        )
      );
      setIsKeyboardOpen((prev) => (prev !== isInputFocused ? isInputFocused : prev));
    };

    let resizeTimer: NodeJS.Timeout | null = null;
    const handleViewportResize = () => {
      if (!window.visualViewport) return;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!window.visualViewport) return;
        const heightRatio = window.visualViewport.height / window.innerHeight;
        const shouldHide = heightRatio < 0.75;
        setIsKeyboardOpen((prev) => (prev !== shouldHide ? shouldHide : prev));
      }, 60);
    };

    window.addEventListener("focusin", handleFocusChange);
    window.addEventListener("focusout", handleFocusChange);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportResize);
    }

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("focusin", handleFocusChange);
      window.removeEventListener("focusout", handleFocusChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleViewportResize);
      }
    };
  }, []);

  useEffect(() => {
    const checkModals = () => {
      const modalExists = 
        !!document.querySelector('.modal-overlay') || 
        !!document.querySelector('[data-admin-dashboard]') ||
        !!document.querySelector('[data-settings-subpage]') ||
        !!document.querySelector('[data-modal]');
      setHasActiveModal(modalExists);
    };

    checkModals();
    
    const observer = new MutationObserver(checkModals);
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => observer.disconnect();
  }, []);

  const userIdParam = searchParams.get("userId");
  const subpageParam = searchParams.get("subpage");
  const isViewingOther = userIdParam && userIdParam !== "me" && currentUser && userIdParam !== currentUser.id;

  const isHidden = (
    activeThreadId !== null ||
    isViewingOther ||
    !!subpageParam ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    hasActiveModal ||
    isKeyboardOpen
  );

  const isCurrentlyOnMainPath = mainPaths.includes(pathname);

  const handleTabPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    triggerRipple(e as any);
  };

  const mobileBottomNavItems = [
    { name: "Market", href: "/marketplace", icon: ShoppingBag, id: "marketplace" },
    { name: "Chats", href: "/chats", icon: MessageCircle, id: "chats" },
    { name: "Calls", href: "/calls", icon: Phone, id: "calls" },
    { name: "Menu", href: "/profile", icon: Store, id: "profile" },
  ];

  const handleMobileTabClick = (e: React.MouseEvent, item: typeof mobileBottomNavItems[0]) => {
    e.preventDefault();
    setActiveThreadId(null);

    if (item.id === "calls") {
      setActiveTab("calls");
      window.history.pushState(null, "", "/calls");
    } else if (item.id === "marketplace") {
      setActiveTab("marketplace");
      window.history.pushState(null, "", "/marketplace");
    } else if (item.id === "profile") {
      setActiveTab("profile");
      window.history.pushState(null, "", "/profile?userId=me");
    } else if (item.id === "chats") {
      setActiveTab("chats");
      window.history.pushState(null, "", "/chats");
    }
    if (item.id !== "marketplace") {
      window.dispatchEvent(new CustomEvent("closeMarketplaceOverlays"));
    }
    window.dispatchEvent(new Event("locationchange"));
  };

  const unreadChatsCount = threads ? threads.filter((t: any) => t.unread).length : 0;
  const unreadMarketCount = 0;
  const missedCallsCount = (callLogs && currentUser) 
    ? callLogs.filter((log: any) => log.callerId !== currentUser.id && log.status === "missed" && log.read !== true).length 
    : 0;

  return (
    <div className={clsx(
      "mobile-nav touch-manipulation transition-all duration-200 ease-out",
      isHidden ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
    )}>
      <div className="max-w-lg mx-auto w-full flex justify-around items-center py-1">
        {mobileBottomNavItems.map((item) => {
          let isActive = false;
          const fromParam = searchParams?.get("from");
          const isViewingThread = pathname.startsWith("/inbox");

          const isSettingsOverlay = searchParams?.get("settings") === "overlay" || pathname.startsWith("/me") || activeTab === "me";

          if (isSettingsOverlay) {
            isActive = item.id === "profile";
          } else if (isViewingThread) {
            isActive = false;
          } else if (fromParam === "calls") {
            isActive = item.id === "calls";
          } else if (fromParam === "marketplace") {
            isActive = item.id === "marketplace";
          } else if (fromParam === "chat" || fromParam === "chats" || fromParam === "archived") {
            isActive = item.id === "chats";
          } else if (item.id === "marketplace") {
            isActive = activeTab === "marketplace" || (pathname === "/" && activeTab !== "profile" && activeTab !== "calls" && activeTab !== "chats") || pathname.startsWith("/marketplace");
          } else if (item.id === "chats") {
            isActive = (activeTab === "chats" || pathname === "/chats") && !pathname.startsWith("/marketplace") && !pathname.startsWith("/profile") && !pathname.startsWith("/calls") && !pathname.startsWith("/me");
          } else if (item.id === "calls") {
            isActive = (activeTab === "calls" || pathname.startsWith("/calls")) && !pathname.startsWith("/profile");
          } else if (item.id === "profile") {
            const userIdParam = searchParams?.get("userId");
            const groupIdParam = searchParams?.get("groupId");
            const isViewingOther = (userIdParam && userIdParam !== "me" && currentUser && userIdParam !== currentUser.id) || !!groupIdParam;
            isActive = (activeTab === "profile" || activeTab === "store" || pathname.startsWith("/profile") || pathname.startsWith("/store")) && !isViewingOther && !fromParam;
          }

          const Icon = item.icon;
          const hasNewMarket = item.id === "marketplace" && unreadMarketCount > 0;
          const hasMissedCalls = item.id === "calls" && missedCallsCount > 0;

          return (
            <Link
              key={item.id}
              href={item.href}
              scroll={false}
              onPointerDown={handleTabPointerDown}
              onClick={(e) => handleMobileTabClick(e, item)}
              className={clsx(
                "flex flex-col items-center gap-0.5 py-0.5 px-3 transition-colors select-none relative overflow-visible touch-manipulation",
                isActive ? "text-[var(--primary)] font-bold" : "text-gray-900 dark:text-zinc-200"
              )}
            >
              <div className="w-5 h-5 relative flex items-center justify-center pointer-events-none z-10">
                <Icon
                  size={21}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={clsx(
                    "shrink-0 transition-transform",
                    hasMissedCalls && "animate-pulse text-rose-500",
                    hasNewMarket && "animate-bounce-magnify text-emerald-500"
                  )}
                />
                {hasMissedCalls && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-extrabold h-4 min-w-4 px-1 rounded-full flex items-center justify-center leading-none z-20 animate-pulse shadow-xs">
                    {missedCallsCount}
                  </span>
                )}
                {item.id === "chats" && unreadChatsCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[9px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center leading-none z-20">
                    {unreadChatsCount}
                  </span>
                )}
                {item.id === "marketplace" && unreadMarketCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-white text-[9px] font-extrabold h-4 min-w-4 px-1 rounded-full flex items-center justify-center leading-none z-20 animate-bounce-magnify shadow-xs">
                    {unreadMarketCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium pointer-events-none z-10">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
