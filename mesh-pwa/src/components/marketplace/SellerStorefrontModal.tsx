"use client";

import { useState, useMemo, useEffect } from "react";
import {
  MarketplaceItem,
  User,
  useMockData
} from "@/context/MockContext";
import {
  ArrowLeft,
  MapPin,
  Star,
  Clock,
  Package,
  ShoppingBag,
  Sparkles,
  Share2,
  MessageCircle,
  Edit2,
  Search,
  UtensilsCrossed,
  Flower2,
  Building2,
  Shirt,
  Tv,
  ShieldCheck,
  ChevronRight,
  MessageSquarePlus,
  Calendar,
  Users,
  Bookmark,
  Plus,
  Film,
  MessageSquare,
  Settings
} from "lucide-react";
import { clsx } from "clsx";
import { useModalHistory } from "@/hooks/useModalHistory";
import { shareContent } from "@/utils/nativeShare";
import { ItemDetailModal } from "./ItemDetailModal";
import { EditMarketplaceProfileModal } from "./EditMarketplaceProfileModal";
import { StoreReviewsModal } from "./StoreReviewsModal";
import {
  StatusStoriesRow,
  StatusViewerModal,
  UnifiedPostModal,
  StoreFeedView
} from "./StorefrontSocialFeed";
import { Status } from "@/context/MockContext";

interface SellerStorefrontModalProps {
  sellerId: string;
  sellerName?: string;
  sellerAvatar?: string | null;
  sellerLocation?: string;
  onClose: () => void;
  onOpenMessage?: (sellerUser: User, item?: MarketplaceItem) => void;
  isClosing?: boolean;
  isStandaloneView?: boolean;
}

export function SellerStorefrontModal({
  sellerId,
  sellerName,
  sellerAvatar,
  sellerLocation,
  onClose,
  onOpenMessage,
  isClosing: externalIsClosing = false,
  isStandaloneView = false
}: SellerStorefrontModalProps) {
  const {
    currentUser,
    allDatingUsers,
    marketplaceItems,
    sendMarketplaceInquiry,
    addNotification,
    setActiveThreadId,
    setActiveTab,
    getStatusesForUser,
    getMoodsForUser
  } = useMockData();

  const isMe = sellerId === "me" || sellerId === currentUser?.id;
  const [internalIsClosing, setInternalIsClosing] = useState(false);
  const isClosing = externalIsClosing || internalIsClosing;
  const [animPhase, setAnimPhase] = useState<"entering" | "stable">("entering");

  useEffect(() => {
    setInternalIsClosing(false);
    setAnimPhase("entering");
    const timer = setTimeout(() => {
      setAnimPhase("stable");
    }, 240);
    return () => clearTimeout(timer);
  }, [sellerId]);

  // Resolve Seller User Object
  const sellerUser = useMemo(() => {
    if (isMe && currentUser) {
      const myAvatar = currentUser.marketplaceStore?.avatar || currentUser.avatar || sellerAvatar || null;
      const myStoreName = currentUser.marketplaceStore?.storeName || currentUser.name || "My Storefront";
      return {
        ...currentUser,
        name: myStoreName,
        avatar: myAvatar,
        marketplaceStore: {
          ...(currentUser.marketplaceStore || {}),
          storeName: myStoreName,
          avatar: myAvatar
        }
      };
    }
    const found = (allDatingUsers || []).find((u) => u.id === sellerId || (sellerName && u.name?.toLowerCase() === sellerName.toLowerCase()));
    if (found) {
      const foundAvatar = found.marketplaceStore?.avatar || found.avatar || sellerAvatar || null;
      const foundStoreName = found.marketplaceStore?.storeName || found.name || sellerName || "Seller Store";
      return {
        ...found,
        name: foundStoreName,
        avatar: foundAvatar,
        marketplaceStore: {
          ...(found.marketplaceStore || {}),
          storeName: foundStoreName,
          avatar: foundAvatar
        }
      };
    }

    // Fallback user object
    return {
      id: sellerId,
      name: sellerName || "Marketplace Seller",
      avatar: sellerAvatar || null,
      color: "bg-blue-200",
      location: sellerLocation || "Local",
      bio: "Active seller on Yogheart Marketplace.",
      interests: [],
      onboardingComplete: true,
      marketplaceStore: {
        storeName: sellerName || "Marketplace Seller",
        avatar: sellerAvatar || null
      }
    } as unknown as User;
  }, [sellerId, sellerName, sellerAvatar, sellerLocation, allDatingUsers, isMe, currentUser]);

  const storeProfile = sellerUser.marketplaceStore || {};
  const effectiveAvatar = storeProfile.avatar || sellerUser.avatar || sellerAvatar || (isMe ? currentUser?.avatar : null);
  const displayName = isMe 
    ? (currentUser?.marketplaceStore?.storeName || currentUser?.name || "My Storefront")
    : (storeProfile.storeName || sellerUser.name || sellerName || "Seller Store");

  // All listings by this seller
  const sellerListings = useMemo(() => {
    return (marketplaceItems || []).filter((item) => {
      if (isMe) {
        return item.sellerId === "me" || item.sellerId === currentUser?.id || item.sellerName === currentUser?.name;
      }
      return (
        item.sellerId === sellerId ||
        item.sellerId === sellerUser.id ||
        (sellerName && item.sellerName?.toLowerCase() === sellerName.toLowerCase())
      );
    });
  }, [marketplaceItems, sellerId, sellerUser.id, sellerName, isMe, currentUser]);

  // Category Icon & Label Helper
  const getSellerTypeInfo = () => {
    const type = storeProfile.sellerType || "chef";
    if (storeProfile.customSellerType) {
      return { label: storeProfile.customSellerType, icon: Sparkles };
    }
    switch (type) {
      case "chef":
      case "restaurant":
        return { label: "Private Chef & Home Culinary", icon: UtensilsCrossed };
      case "florist":
        return { label: "Artisanal Florist & Gifts", icon: Flower2 };
      case "real_estate":
        return { label: "Real Estate & Rentals Host", icon: Building2 };
      case "fashion":
        return { label: "Fashion Brand & Boutique", icon: Shirt };
      case "auto":
        return { label: "Automotive Specialist", icon: Package };
      case "electronics":
        return { label: "Electronics & Tech Specialist", icon: Tv };
      case "artisan":
        return { label: "Handcrafted Artisan & Crafts", icon: Sparkles };
      default:
        return { label: "Verified Marketplace Seller", icon: ShoppingBag };
    }
  };

  const sellerTypeInfo = getSellerTypeInfo();
  const SellerTypeIcon = sellerTypeInfo.icon;

  // Private Saved Items (only accessible to store owner)
  const savedItems = useMemo(() => {
    if (!isMe || !currentUser) return [];
    return (marketplaceItems || []).filter((item) => item.savedBy?.includes(currentUser.id));
  }, [isMe, currentUser, marketplaceItems]);
  const savedCount = savedItems.length;

  const [statusTab, setStatusTab] = useState<"all" | "active" | "sold" | "free" | "saved" | "feed">("all");
  const [viewingStatus, setViewingStatus] = useState<Status | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [postModalType, setPostModalType] = useState<"status" | "feed">("status");

  const userStatuses = useMemo(() => {
    return getStatusesForUser ? getStatusesForUser(sellerUser.id) : [];
  }, [getStatusesForUser, sellerUser.id]);

  const activeStatuses = useMemo(() => {
    return userStatuses.filter(
      (s) => Date.now() - new Date(s.timestamp).getTime() <= 24 * 60 * 60 * 1000
    );
  }, [userStatuses]);

  const hasActiveStatus = activeStatuses.length > 0;

  const userFeedCount = useMemo(() => {
    return getMoodsForUser ? (getMoodsForUser(sellerUser.id) || []).length : 0;
  }, [getMoodsForUser, sellerUser.id]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [showEditStoreModal, setShowEditStoreModal] = useState(false);
  const [closingEditStoreModal, setClosingEditStoreModal] = useState(false);

  const handleCloseEditStoreModal = () => {
    if (!showEditStoreModal || closingEditStoreModal) {
      if (!showEditStoreModal) setClosingEditStoreModal(false);
      return;
    }
    setClosingEditStoreModal(true);
    setShowEditStoreModal(false);
    setTimeout(() => {
      setClosingEditStoreModal(false);
    }, 280);
  };

  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [closingReviewsModal, setClosingReviewsModal] = useState(false);

  const handleCloseReviewsModal = () => {
    if (!showReviewsModal || closingReviewsModal) {
      if (!showReviewsModal) setClosingReviewsModal(false);
      return;
    }
    setClosingReviewsModal(true);
    setShowReviewsModal(false);
    setTimeout(() => {
      setClosingReviewsModal(false);
    }, 220);
  };

  // Filtered store items
  const filteredStoreItems = useMemo(() => {
    const sourceListings = statusTab === "saved" ? savedItems : sellerListings;
    return sourceListings.filter((item) => {
      // Status filtering (only applies to seller listings, not saved items)
      if (statusTab === "active" && item.status === "sold") return false;
      if (statusTab === "sold" && item.status !== "sold") return false;
      if (statusTab === "free" && item.price !== 0) return false;

      // Search filtering
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        const matchCategory = item.category?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCategory) return false;
      }

      return true;
    });
  }, [sellerListings, savedItems, statusTab, searchQuery]);

  const activeCount = sellerListings.filter((i) => i.status !== "sold").length;
  const soldCount = sellerListings.filter((i) => i.status === "sold").length;
  const freeCount = sellerListings.filter((i) => i.price === 0).length;

  const handleBack = () => {
    onClose();
  };

  const handleShareStore = async () => {
    const res = await shareContent({
      title: `${displayName}'s Storefront on Yogheart Market`,
      text: `Check out ${displayName}'s storefront on Yogheart Market!`,
      dialogTitle: `Share ${displayName}'s Store`,
    });
    if (res === "copied") {
      addNotification("Profile link copied to clipboard! 📋");
    }
  };

  const handleMessageSeller = async () => {
    if (isMe) {
      addNotification("This is your own profile!");
      return;
    }
    try {
      if (onOpenMessage) {
        onOpenMessage(sellerUser);
        return;
      }

      const firstItem = sellerListings[0];
      const customMsg = `Hi ${sellerUser.name}, I'm browsing your marketplace store!`;
      if (firstItem) {
        const threadId = await sendMarketplaceInquiry(sellerUser, firstItem, customMsg);
        setActiveTab("chats");
        setActiveThreadId(threadId);
        window.history.pushState(null, "", `/inbox?id=${threadId}`);
        onClose();
      } else {
        window.history.pushState(null, "", `/profile?userId=${sellerUser.id}`);
        onClose();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [closingSelectedItem, setClosingSelectedItem] = useState<MarketplaceItem | null>(null);

  const handleCloseSelectedItem = () => {
    if (!selectedItem || closingSelectedItem) {
      if (!selectedItem) setClosingSelectedItem(null);
      return;
    }
    const cur = selectedItem;
    setClosingSelectedItem(cur);
    setSelectedItem(null);
    setTimeout(() => {
      setClosingSelectedItem(null);
    }, 280);
  };

  // History sync for seller storefront page itself (only when modal overlay)
  useModalHistory(`sellerStorefrontPage-${sellerId}`, !isClosing && !isStandaloneView, handleBack);

  // History sync for catalogue preview modal and edit modal
  useModalHistory(`storefrontItemPreview-${sellerId}`, !!selectedItem, () => {
    handleCloseSelectedItem();
  });
  useModalHistory(`storefrontEditStore-${sellerId}`, showEditStoreModal, () => {
    handleCloseEditStoreModal();
  });
  useModalHistory(`storefrontReviewsModal-${sellerId}`, showReviewsModal, () => {
    handleCloseReviewsModal();
  });

  return (
    <div
      data-seller-storefront-page="true"
      className={clsx(
        isStandaloneView
          ? "h-full w-full bg-white dark:bg-zinc-950 flex flex-col overflow-hidden text-gray-900 dark:text-zinc-100 pb-16 lg:pb-0 relative"
          : "absolute inset-0 z-50 h-full w-full bg-white dark:bg-zinc-950 shadow-[-12px_0_30px_-5px_rgba(0,0,0,0.25)] border-l border-zinc-200/40 dark:border-zinc-800/40 flex flex-col overflow-hidden antialiased subpixel-antialiased text-gray-900 dark:text-zinc-100",
        !isStandaloneView && (
          isClosing
            ? "animate-slide-out-to-right-edge"
            : animPhase === "entering"
            ? "animate-slide-in-from-right-edge"
            : ""
        )
      )}
      style={{
        pointerEvents: isClosing ? "none" : "auto",
        willChange: !isStandaloneView && (isClosing || animPhase === "entering") ? "transform" : "auto",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: !isStandaloneView && animPhase === "stable" && !isClosing ? "translate3d(0, 0, 0)" : undefined,
      }}
    >
      {/* Fixed Sticky Top Header */}
      <header className="bg-white dark:bg-zinc-900 px-3 md:px-5 py-3 flex items-center justify-between border-b border-[var(--border)] dark:border-zinc-800 sticky top-0 z-30 shrink-0 shadow-xs">
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          {!isStandaloneView ? (
            <button
              type="button"
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer shrink-0"
              title="Back"
            >
              <ArrowLeft size={24} className="text-[var(--primary)]" />
            </button>
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-[var(--primary)] shrink-0 shadow-xs border border-emerald-150 dark:border-emerald-900/40">
              <ShoppingBag size={20} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 truncate">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate leading-tight">
                {isStandaloneView ? "My Storefront" : displayName}
              </h2>
              <ShieldCheck size={14} className="text-blue-500 shrink-0" />
            </div>
            {!isStandaloneView && (
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate">
                {sellerTypeInfo.label}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleShareStore}
            title="Share Storefront"
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-700 dark:text-zinc-200 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <Share2 size={17} />
          </button>
          {isMe && (
            <button
              type="button"
              onClick={() => {
                window.history.pushState(null, "", "/profile?userId=me&settings=overlay");
                window.dispatchEvent(new Event("locationchange"));
              }}
              title="Settings & Menu"
              className="w-9 h-9 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-700 dark:text-zinc-200 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <Settings size={17} />
            </button>
          )}
        </div>
      </header>

      {/* Scrollable Page Body */}
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar overscroll-contain pb-36 sm:pb-16">
        <div className="max-w-3xl mx-auto w-full">
          {/* Store Banner */}
          <div className="relative w-full h-40 sm:h-52 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 overflow-hidden select-none">
            {storeProfile.bannerImage ? (
              <img
                src={storeProfile.bannerImage}
                alt="Store Banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-blue-600 to-rose-500 opacity-90">
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
              </div>
            )}
          </div>

          {/* Store Profile Info Card */}
          <div className="px-5 pb-5 -mt-14 sm:-mt-16 relative z-10">
            <div className="flex items-end justify-between gap-3 mb-3">
              {/* Avatar (Square with rounded corners + gradient ring when status active) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (hasActiveStatus) {
                      setViewingStatus(activeStatuses[0]);
                    } else if (isMe) {
                      setPostModalType("status");
                      setShowPostModal(true);
                    }
                  }}
                  className={clsx(
                    "rounded-3xl transition-all cursor-pointer block text-left",
                    hasActiveStatus
                      ? "p-[3px] bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 shadow-xl hover:scale-105 active:scale-95"
                      : "hover:scale-105 active:scale-95"
                  )}
                  title={hasActiveStatus ? "View status story" : isMe ? "Post status" : undefined}
                >
                  <div
                    className={clsx(
                      "w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0 relative flex items-center justify-center",
                      hasActiveStatus
                        ? "border-2 border-white dark:border-zinc-950 p-[1px]"
                        : "border-4 border-white dark:border-zinc-950 shadow-xl"
                    )}
                  >
                    {effectiveAvatar ? (
                      <img
                        src={effectiveAvatar}
                        alt={displayName}
                        className="w-full h-full object-cover rounded-2xl"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-3xl text-gray-700 dark:text-zinc-200">
                        {displayName.charAt(0)}
                      </div>
                    )}
                  </div>
                </button>
                <div className="absolute -bottom-1 -right-1 p-1.5 bg-blue-600 text-white rounded-full border-2 border-white dark:border-zinc-950 shadow-sm pointer-events-none" title="Verified Seller">
                  <ShieldCheck size={15} />
                </div>
              </div>

              {/* Action Button: Edit or Message */}
              <div>
                {isMe ? (
                  <button
                    type="button"
                    onClick={() => setShowEditStoreModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-900 dark:text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    <Edit2 size={14} />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleMessageSeller}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white font-bold text-xs shadow-lg transition-all cursor-pointer bg-[var(--primary)] hover:bg-blue-600 shadow-blue-500/25"
                  >
                    <MessageCircle size={15} />
                    <span>Message Store</span>
                  </button>
                )}
              </div>
            </div>

            {/* Title & Badge */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  {displayName}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50">
                  <SellerTypeIcon size={12} />
                  <span>{sellerTypeInfo.label}</span>
                </span>
              </div>

              {/* Real Name / Owner Name */}
              <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                By {storeProfile.ownerName || (isMe ? currentUser?.marketplaceStore?.ownerName : null) || sellerUser.name || "Seller"}
              </p>

              {/* Tagline / Speciality Headline */}
              <p className="text-sm font-semibold text-gray-800 dark:text-zinc-200 pt-0.5">
                {(isMe ? currentUser?.marketplaceStore?.headline : null) || storeProfile.headline || (storeProfile.bio && !storeProfile.bio.includes("Hey there") ? storeProfile.bio : "Active seller on Yogheart Marketplace.")}
              </p>
            </div>

            {/* Quick Badges Row */}
            <div className="flex flex-wrap items-center gap-2 pt-3 text-[11px]">
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-medium">
                <MapPin size={12} className="text-rose-500" />
                <span>{storeProfile.location || sellerUser.location || sellerLocation || "Montreal"}</span>
              </span>

              <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-medium">
                <Clock size={12} className="text-emerald-500" />
                <span>{storeProfile.responseRate || "Fast Replies (~10m)"}</span>
              </span>

              <button
                type="button"
                onClick={() => setShowReviewsModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold border border-amber-200/60 dark:border-amber-900/50 shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer group"
                title="View Ratings & Customer Reviews"
              >
                <Star size={12} className="fill-amber-500 text-amber-500 group-hover:scale-110 transition-transform" />
                <span>{storeProfile.rating || "4.9"} ({storeProfile.reviewCount || "28"} reviews)</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 underline font-semibold ml-0.5">Read reviews</span>
              </button>
            </div>

            {/* Features / Fulfillment options */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 text-[10px] text-gray-500 dark:text-zinc-400">
              <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md font-bold">
                ✓ Local Delivery Available
              </span>
              <span className="bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 px-2 py-0.5 rounded-md">
                ✓ Doorstep Pickup
              </span>
            </div>

            {/* Status Stories Row (Below fulfillment buttons, above store catalogue) */}
            <StatusStoriesRow
              sellerUser={sellerUser}
              isMe={isMe}
              onOpenCreateStatus={() => {
                setPostModalType("status");
                setShowPostModal(true);
              }}
              onOpenStatus={(status) => setViewingStatus(status)}
            />
          </div>

          <hr className="border-gray-100 dark:border-zinc-800" />

          {/* Store Inventory / Catalogue Header */}
          <div className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    {statusTab === "saved" ? (
                      <>
                        <Bookmark size={18} className="text-rose-500" />
                        <span>Saved Items</span>
                      </>
                    ) : statusTab === "feed" ? (
                      <>
                        <Sparkles size={18} className="text-amber-500" />
                        <span>Store Feed & Clips</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={18} className="text-[var(--primary)]" />
                        <span>Store Catalogue & Listings</span>
                      </>
                    )}
                  </h2>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                    {statusTab === "saved"
                      ? `Showing ${filteredStoreItems.length} of ${savedCount} saved items`
                      : statusTab === "feed"
                      ? `${userFeedCount} photos & clips shared`
                      : `Showing ${filteredStoreItems.length} of ${sellerListings.length} items`}
                  </p>
                </div>

                {/* Search input in store (hidden on feed tab) */}
                {statusTab !== "feed" && (
                  <div className="relative w-36 sm:w-48">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search catalogue..."
                      className="w-full bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white pl-8 pr-3 py-1.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[var(--primary)] border-0"
                    />
                  </div>
                )}
              </div>

              {/* Status & Social Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                <button
                  type="button"
                  onClick={() => setStatusTab("all")}
                  className={clsx(
                    "px-4.5 py-2 sm:px-5 sm:py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap",
                    statusTab === "all"
                      ? "bg-[var(--primary)] text-white shadow-xs"
                      : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700"
                  )}
                >
                  All ({sellerListings.length})
                </button>

                {/* Saved Items Tab — ONLY visible to Store Owner */}
                {isMe && (
                  <button
                    type="button"
                    onClick={() => setStatusTab("saved")}
                    className={clsx(
                      "px-4.5 py-2 sm:px-5 sm:py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap flex items-center gap-2",
                      statusTab === "saved"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700"
                    )}
                  >
                    <Bookmark size={15} />
                    <span>Saved ({savedCount})</span>
                  </button>
                )}

                {/* Feed Tab (Moods & Clips merged) */}
                <button
                  type="button"
                  onClick={() => setStatusTab("feed")}
                  className={clsx(
                    "px-4.5 py-2 sm:px-5 sm:py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap flex items-center gap-2",
                    statusTab === "feed"
                      ? "bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-xs"
                      : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700"
                  )}
                >
                  <Sparkles size={15} />
                  <span>Feed ({userFeedCount})</span>
                </button>

                {/* New Post / Clip button placed right next to the Feed button */}
                {isMe && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusTab("feed");
                      setPostModalType("feed");
                      setShowPostModal(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 sm:px-4.5 sm:py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs sm:text-sm shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Plus size={15} />
                    <span>New Post / Clip</span>
                  </button>
                )}
              </div>

              {/* Content Area: Feed or Product Listings */}
              {statusTab === "feed" ? (
                <StoreFeedView
                  sellerUser={sellerUser}
                  isMe={isMe}
                  onOpenCreatePost={() => {
                    setPostModalType("feed");
                    setShowPostModal(true);
                  }}
                />
              ) : filteredStoreItems.length === 0 ? (
                <div className="py-12 text-center space-y-2 bg-gray-50/40 dark:bg-zinc-900/30 rounded-2xl border border-dashed border-gray-200/60 dark:border-zinc-800">
                  {statusTab === "saved" ? (
                    <Bookmark size={32} className="mx-auto text-rose-400 dark:text-rose-600" />
                  ) : (
                    <ShoppingBag size={32} className="mx-auto text-gray-400 dark:text-zinc-600" />
                  )}
                  <h3 className="font-bold text-sm text-gray-700 dark:text-zinc-300">
                    {statusTab === "saved" ? "No saved items yet" : "No items found in this section"}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-500 max-w-xs mx-auto">
                    {statusTab === "saved"
                      ? "Items you bookmark on the marketplace will appear here."
                      : "Try switching filter tabs or clearing your search."}
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-xs pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 bg-white dark:bg-zinc-900">
                    {filteredStoreItems.map((item) => {
                      const coverImg =
                        item.images && item.images.length > 0
                          ? item.images[0]
                          : "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80";

                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className="group bg-white dark:bg-zinc-900 hover:bg-gray-50/80 dark:hover:bg-zinc-800/60 transition-colors flex flex-col cursor-pointer relative border-b border-r border-gray-100 dark:border-zinc-800/80"
                        >
                        {/* Image & Badges */}
                        <div className="relative w-full aspect-square bg-zinc-100 dark:bg-zinc-800 overflow-hidden select-none">
                          <img
                            src={coverImg}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />

                          {/* Sold or Pending Overlay */}
                          {item.status === "sold" ? (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <span className="bg-red-600 text-white font-black text-xs px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-md">
                                SOLD
                              </span>
                            </div>
                          ) : (item.status === "pending" || item.status === "reserved") ? (
                            <div className="absolute top-2 right-2 z-10">
                              <span className="bg-amber-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-md shadow-md uppercase tracking-wider">
                                PENDING
                              </span>
                            </div>
                          ) : null}

                          {/* Price Badge */}
                          <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-md text-white font-black text-xs px-2 py-0.5 rounded-lg shadow-xs">
                            {item.price === 0 ? "FREE" : `$${item.price.toLocaleString()}`}
                          </div>

                          {/* Condition Badge */}
                          <div className="absolute top-2 left-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md text-gray-800 dark:text-zinc-200 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                            {item.condition}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="p-2.5 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-bold text-xs text-gray-900 dark:text-white line-clamp-2 leading-tight group-hover:text-[var(--primary)] transition-colors">
                              {item.title}
                            </h3>
                            <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-zinc-400 mt-1">
                              <MapPin size={10} className="text-rose-500 shrink-0" />
                              <span className="truncate">{item.location}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>

      {/* Active Story Viewer Modal */}
      {viewingStatus && (
        <StatusViewerModal
          status={viewingStatus}
          onClose={() => setViewingStatus(null)}
        />
      )}

      {/* Unified Post Creator Modal (Status / Feed Post) */}
      {showPostModal && (
        <UnifiedPostModal
          initialType={postModalType}
          onClose={() => setShowPostModal(false)}
        />
      )}

      {/* Instagram-style Feed Modal when an item from the catalogue is clicked */}
      {(selectedItem || closingSelectedItem) && (
        <ItemDetailModal
          mode="modal"
          hideSellerInfo={true}
          item={selectedItem || closingSelectedItem!}
          isClosing={!!closingSelectedItem}
          feedItems={filteredStoreItems}
          onClose={handleCloseSelectedItem}
        />
      )}

      {/* Edit Marketplace Store Profile Modal */}
      {(showEditStoreModal || closingEditStoreModal) && (
        <EditMarketplaceProfileModal
          isClosing={closingEditStoreModal}
          onClose={handleCloseEditStoreModal}
        />
      )}

      {/* Ratings & Customer Reviews Modal */}
      {(showReviewsModal || closingReviewsModal) && (
        <StoreReviewsModal
          sellerUser={sellerUser}
          sellerName={displayName}
          sellerListings={sellerListings}
          currentUser={currentUser}
          isDriver={false}
          isClosing={closingReviewsModal}
          onClose={handleCloseReviewsModal}
        />
      )}
    </div>
  );
}
