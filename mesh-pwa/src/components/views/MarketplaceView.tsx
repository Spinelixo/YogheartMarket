"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { MarketplaceItem, useMockData, User } from "@/context/MockContext";
import {
  Search,
  Plus,
  Heart,
  Tag,
  MapPin,
  Sparkles,
  X,
  ShoppingBag,
  Layers,
  Bookmark,
  MessageSquare,
  MessageCircle,
  Clock,
  Tv,
  Car,
  Home,
  Shirt,
  Dumbbell,
  Gift,
  HelpCircle,
  ArrowRight,
  Send,
  ChevronLeft,
  ChevronRight,
  Share2,
  SlidersHorizontal,
  ArrowLeft,
  Check,
  CheckCheck,
  Pin,
  Bell,
  BellOff,
  Trash,
  Trash2,
  Ban,
  Flag,
  Archive,
  Image as ImageIcon,
  AlertTriangle,
  Flower2,
  Building2,
  UtensilsCrossed,
  Store,
  Edit3
} from "lucide-react";
import { clsx } from "clsx";
import { useModalHistory } from "@/hooks/useModalHistory";
import { ItemDetailModal } from "../marketplace/ItemDetailModal";
import { CreateListingModal } from "../marketplace/CreateListingModal";
import { ShareToChatModal } from "../marketplace/ShareToChatModal";
import { SellerStorefrontModal } from "../marketplace/SellerStorefrontModal";
import { EditMarketplaceProfileModal } from "../marketplace/EditMarketplaceProfileModal";
import { triggerRipple } from "@/utils/ui";

const CATEGORIES = [
  { label: "All", icon: Layers },
  { label: "Flowers", icon: Flower2 },
  { label: "Rentals", icon: Building2 },
  { label: "Foods", icon: UtensilsCrossed },
  { label: "Electronics", icon: Tv },
  { label: "Vehicles", icon: Car },
  { label: "Home & Living", icon: Home },
  { label: "Fashion & Apparel", icon: Shirt },
  { label: "Sports & Hobbies", icon: Dumbbell },
  { label: "Free / Giveaways", icon: Gift },
  { label: "Other", icon: HelpCircle },
];

const ALL_FILTER_CATEGORIES = [
  "Any",
  "Flowers & Gifts",
  "Rentals & Real Estate",
  "Foods & Home Culinary",
  "Antiques & Collectibles",
  "Arts & Crafts",
  "Auto Parts",
  "Baby",
  "Books, Movies & Music",
  "Electronics",
  "Furniture",
  "Garage Sale",
  "Health & Beauty",
  "Home & Kitchen",
  "Home Improvement",
  "Jewelry & Watches",
  "Kidswear & Baby",
  "Luggage & Bags",
  "Menswear",
  "Miscellaneous",
  "Musical Instruments",
  "Patio & Garden",
  "Pet Supplies",
  "Sporting Goods",
  "Toys & Games",
  "Womenswear"
];

// Distance calculation helper (km)
export const calculateItemDistanceKm = (item: MarketplaceItem, userLocation?: string): number => {
  if ((item as any).distanceKm !== undefined) {
    return (item as any).distanceKm;
  }

  const isSameLocation = userLocation && item.location && 
    (item.location.toLowerCase().includes(userLocation.toLowerCase()) || 
     userLocation.toLowerCase().includes(item.location.toLowerCase()));

  let hash = 0;
  for (let i = 0; i < item.id.length; i++) {
    hash = (hash << 5) - hash + item.id.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash);

  if (isSameLocation) {
    return Math.round(((seed % 100) / 100 * 8 + 2) * 10) / 10;
  }

  const distances = [3.2, 5.8, 8.4, 12.1, 16.5, 23.0, 31.2, 45.0, 62.5, 84.0];
  const idx = seed % distances.length;
  return distances[idx];
};

export default function MarketplaceView() {
  const {
    currentUser,
    marketplaceItems,
    toggleSaveMarketplaceItem,
    activeTab,
    setActiveTab: setGlobalActiveTab,
    setActiveThreadId,
    addNotification
  } = useMockData();

  // Browse subpage tab (Explore | My Listings | Saved)
  const [browseTab, setBrowseTab] = useState<"explore" | "my_items" | "saved">("explore");

  // Browse subpage filters & states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [closingItem, setClosingItem] = useState<MarketplaceItem | null>(null);
  const [editingItem, setEditingItem] = useState<MarketplaceItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [closingCreateModal, setClosingCreateModal] = useState(false);
  const [sharingItem, setSharingItem] = useState<MarketplaceItem | null>(null);

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
  const [showEditMarketplaceProfileModal, setShowEditMarketplaceProfileModal] = useState(false);

  const closeAllOverlays = useCallback((_immediateOrEvent?: boolean | Event) => {
    setSelectedItem(null);
    setClosingItem(null);
    setActiveSellerStore(null);
    setClosingSellerStore(null);
    setShowCreateModal(false);
    setClosingCreateModal(false);
    setEditingItem(null);
    setShowEditMarketplaceProfileModal(false);
    setSharingItem(null);
  }, []);

  // When switching away from marketplace tab, immediately reset overlays
  useEffect(() => {
    if (activeTab !== "marketplace") {
      closeAllOverlays();
    }
  }, [activeTab, closeAllOverlays]);

  useEffect(() => {
    window.addEventListener("closeMarketplaceOverlays", closeAllOverlays);
    return () => {
      window.removeEventListener("closeMarketplaceOverlays", closeAllOverlays);
    };
  }, [closeAllOverlays]);

  // Handlers for item & modal management

  const handleCloseSelectedItem = () => {
    if (!selectedItem || closingItem) {
      if (!selectedItem) setClosingItem(null);
      return;
    }
    const cur = selectedItem;
    setClosingItem(cur);
    setSelectedItem(null);
    setTimeout(() => {
      setClosingItem(null);
    }, 220);
  };

  const handleCloseCreateModal = () => {
    if (!showCreateModal || closingCreateModal) {
      if (!showCreateModal) setClosingCreateModal(false);
      return;
    }
    setClosingCreateModal(true);
    setShowCreateModal(false);
    setTimeout(() => {
      setClosingCreateModal(false);
      setEditingItem(null);
    }, 220);
  };

  const handleCloseActiveSellerStore = () => {
    if (!activeSellerStore) {
      setClosingSellerStore(null);
      return;
    }
    const cur = activeSellerStore;
    setClosingSellerStore(cur);
    setActiveSellerStore(null);
    setTimeout(() => {
      setClosingSellerStore(null);
    }, 240);
  };

  // Filter Bottom Sheet State & Sub-screens
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [filterSubscreen, setFilterSubscreen] = useState<"main" | "sortBy" | "price" | "condition" | "dateListed" | "category" | "availability" | "distance">("main");

  // Filter Modal swipe-down-to-dismiss states
  const [filterDragY, setFilterDragY] = useState(0);
  const [isFilterDragging, setIsFilterDragging] = useState(false);
  const filterDragStartY = useRef(0);
  const filterScrollRef = useRef<HTMLDivElement>(null);

  const handleFilterTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "BUTTON" || target.closest("button") || target.tagName === "INPUT" || target.closest("input")) {
      setIsFilterDragging(false);
      return;
    }
    if (filterScrollRef.current && filterScrollRef.current.scrollTop > 5) {
      return;
    }
    filterDragStartY.current = e.touches[0].clientY;
    setIsFilterDragging(true);
  };

  const handleFilterTouchMove = (e: React.TouchEvent) => {
    if (!isFilterDragging) return;
    const deltaY = e.touches[0].clientY - filterDragStartY.current;
    if (deltaY > 0) {
      setFilterDragY(deltaY);
      if (e.cancelable) e.preventDefault();
    } else {
      setFilterDragY(0);
    }
  };

  const [isFilterClosing, setIsFilterClosing] = useState(false);

  const startDismissFilters = () => {
    if (isFilterClosing) return;
    setIsFilterClosing(true);
    setTimeout(() => {
      setShowFiltersModal(false);
      setIsFilterClosing(false);
      setFilterSubscreen("main");
    }, 220);
  };

  const handleFilterTouchEnd = () => {
    setIsFilterDragging(false);
    if (filterDragY > 80) {
      startDismissFilters();
    }
    setFilterDragY(0);
  };

  // Prevent browser bounce / pull-to-refresh when dragging filter modal
  useEffect(() => {
    if (isFilterDragging) {
      const handleWindowTouchMove = (e: TouchEvent) => {
        if (e.cancelable) e.preventDefault();
      };
      window.addEventListener("touchmove", handleWindowTouchMove, { passive: false });
      return () => {
        window.removeEventListener("touchmove", handleWindowTouchMove);
      };
    }
  }, [isFilterDragging]);

  const [hasFilterAnimatedIn, setHasFilterAnimatedIn] = useState(false);
  useEffect(() => {
    if (showFiltersModal) {
      const timer = requestAnimationFrame(() => setHasFilterAnimatedIn(true));
      return () => cancelAnimationFrame(timer);
    } else {
      setHasFilterAnimatedIn(false);
    }
  }, [showFiltersModal]);

  // Filter Values
  const [filterSortBy, setFilterSortBy] = useState<"suggested" | "distance_asc" | "newest" | "price_asc" | "price_desc">("suggested");
  const [filterMinPrice, setFilterMinPrice] = useState<number | null>(null);
  const [filterMaxPrice, setFilterMaxPrice] = useState<number | null>(null);
  const [minPriceInput, setMinPriceInput] = useState<string>("");
  const [maxPriceInput, setMaxPriceInput] = useState<string>("");
  const [filterCondition, setFilterCondition] = useState<string>("any");
  const [filterDateListed, setFilterDateListed] = useState<"any" | "24h" | "7d" | "30d">("any");
  const [filterAvailability, setFilterAvailability] = useState<"available" | "all">("available");
  const [filterDistanceOption, setFilterDistanceOption] = useState<"suggested" | "32" | "64" | "96" | "160" | "custom">("suggested");
  const [filterCustomDistanceKm, setFilterCustomDistanceKm] = useState<number>(100);

  // Sync with browser history for native edge swipe / back button
  useModalHistory(
    "marketplaceFilters",
    showFiltersModal,
    () => {
      if (filterSubscreen !== "main") {
        setFilterSubscreen("main");
      } else {
        startDismissFilters();
      }
    }
  );

  useModalHistory(
    "marketplaceCreateListing",
    showCreateModal,
    () => {
      handleCloseCreateModal();
    }
  );

  useModalHistory(
    "marketplaceEditProfile",
    showEditMarketplaceProfileModal,
    () => {
      setShowEditMarketplaceProfileModal(false);
    }
  );

  useModalHistory(
    "marketplaceShareItem",
    !!sharingItem,
    () => {
      setSharingItem(null);
    }
  );

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterSortBy !== "suggested") count++;
    if (filterMinPrice !== null || filterMaxPrice !== null) count++;
    if (filterCondition !== "any") count++;
    if (filterDateListed !== "any") count++;
    if (selectedCategories.length > 0) count += selectedCategories.length;
    if (filterAvailability !== "available") count++;
    if (filterDistanceOption !== "suggested") count++;
    return count;
  }, [filterSortBy, filterMinPrice, filterMaxPrice, filterCondition, filterDateListed, selectedCategories, filterAvailability, filterDistanceOption]);

  const handleResetAllFilters = () => {
    setFilterSortBy("suggested");
    setFilterMinPrice(null);
    setFilterMaxPrice(null);
    setMinPriceInput("");
    setMaxPriceInput("");
    setFilterCondition("any");
    setFilterDateListed("any");
    setSelectedCategories([]);
    setFilterAvailability("available");
    setFilterDistanceOption("suggested");
    setFilterCustomDistanceKm(100);
  };

  // Filtered & Sorted items for Browse subpage
  const filteredItems = useMemo(() => {
    return marketplaceItems
      .filter((item) => {
        // Category filtering (multi-select)
        if (selectedCategories.length > 0) {
          const itemCat = (item.category || "").toLowerCase();
          const matchCat = selectedCategories.some((selCat) => {
            const c = selCat.toLowerCase();
            return itemCat.includes(c) || c.includes(itemCat);
          });
          if (!matchCat) return false;
        }

        // Search query filtering
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchDesc = item.description?.toLowerCase().includes(q);
          const matchLoc = item.location?.toLowerCase().includes(q);
          const matchCategory = item.category?.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchLoc && !matchCategory) return false;
        }

        // Availability filtering
        if (filterAvailability === "available" && item.status === "sold") {
          return false;
        }

        // Condition filtering
        if (filterCondition !== "any" && item.condition.toLowerCase() !== filterCondition.toLowerCase()) {
          return false;
        }

        // Price filtering
        if (filterMinPrice !== null && item.price < filterMinPrice) {
          return false;
        }
        if (filterMaxPrice !== null && item.price > filterMaxPrice) {
          return false;
        }

        // Date listed filtering
        if (filterDateListed !== "any") {
          const itemTime = new Date(item.createdAt).getTime();
          const now = Date.now();
          if (filterDateListed === "24h" && now - itemTime > 24 * 3600 * 1000) return false;
          if (filterDateListed === "7d" && now - itemTime > 7 * 24 * 3600 * 1000) return false;
          if (filterDateListed === "30d" && now - itemTime > 30 * 24 * 3600 * 1000) return false;
        }

        // Distance / Location filtering
        if (filterDistanceOption !== "suggested") {
          const maxKm = filterDistanceOption === "custom" ? filterCustomDistanceKm : parseFloat(filterDistanceOption);
          const itemDistance = calculateItemDistanceKm(item, currentUser?.location);
          if (itemDistance > maxKm) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filterSortBy === "price_asc") return a.price - b.price;
        if (filterSortBy === "price_desc") return b.price - a.price;
        if (filterSortBy === "distance_asc") {
          return calculateItemDistanceKm(a, currentUser?.location) - calculateItemDistanceKm(b, currentUser?.location);
        }
        if (filterSortBy === "newest") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [
    marketplaceItems, 
    browseTab, 
    selectedCategories, 
    searchQuery, 
    filterSortBy, 
    filterMinPrice, 
    filterMaxPrice, 
    filterCondition, 
    filterDateListed, 
    filterAvailability, 
    filterDistanceOption, 
    filterCustomDistanceKm, 
    currentUser
  ]);

  const myItemsCount = useMemo(() => {
    return marketplaceItems.filter(
      (item) => item.sellerId === currentUser?.id || item.sellerId === "me"
    ).length;
  }, [marketplaceItems, currentUser]);

  const savedItemsCount = useMemo(() => {
    if (!currentUser) return 0;
    return marketplaceItems.filter((item) => item.savedBy?.includes(currentUser.id)).length;
  }, [marketplaceItems, currentUser]);

  return (
    <div className="h-full flex flex-col bg-[var(--background)] dark:bg-zinc-950 overflow-hidden relative antialiased subpixel-antialiased text-gray-900 dark:text-zinc-100">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-zinc-900 px-4 pt-3 pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl text-white flex items-center justify-center shadow-xs bg-[var(--primary)]">
              <ShoppingBag size={16} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-none">
                Marketplace
              </h1>
              <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">
                Buy, sell, and trade locally
              </p>
            </div>
          </div>

          {/* Action Button: List Item */}
          <button
            onClick={() => setShowCreateModal(true)}
            style={{ backgroundColor: '#2563eb', color: '#ffffff', WebkitAppearance: 'none' }}
            className="py-1.5 px-3 bg-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer select-none"
          >
            <Plus size={14} strokeWidth={2.5} className="text-white shrink-0" />
            <span className="text-white font-bold">List Item</span>
          </button>
        </div>
      </header>

      {/* ────────────────── BROWSE MARKET ────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search & Main Filter Line */}
          <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-gray-150 dark:border-zinc-800 px-4 py-2 shrink-0">
            {/* Single clean line: All button, inline expandable search input, and Filters button */}
            <div className="flex items-center justify-between gap-2 h-9">
              {/* Left Edge: All Button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedCategories([]);
                }}
                className={clsx(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 shadow-xs",
                  selectedCategories.length === 0
                    ? "bg-white dark:bg-zinc-800 text-[var(--primary)] border border-gray-200 dark:border-zinc-700"
                    : "bg-gray-100 dark:bg-zinc-800/80 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <Layers size={14} />
                <span>All</span>
              </button>

              {/* Center: Inline Extended Search Input when active */}
              {showSearchBar ? (
                <div className="flex-1 relative flex items-center min-w-0 transition-all duration-200 animate-fade-in">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 shrink-0 pointer-events-none" />
                  <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search marketplace items..."
                    className="w-full bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white pl-8 pr-7 py-1.5 rounded-xl border-0 text-xs sm:text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setShowSearchBar(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-0.5"
                    title="Close search"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex-1" />
              )}

              {/* Right Edge: Search Toggle Icon (when not expanded) & Filters Button */}
              <div className="flex items-center gap-1.5 shrink-0">
                {!showSearchBar && (
                  <button
                    type="button"
                    onClick={() => setShowSearchBar(true)}
                    className={clsx(
                      "p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center shadow-xs",
                      searchQuery
                        ? "bg-[var(--primary)] text-white shadow-emerald-500/20"
                        : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                    )}
                    title="Search items"
                  >
                    <Search size={15} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setFilterSubscreen("main");
                    setMinPriceInput(filterMinPrice !== null ? String(filterMinPrice) : "");
                    setMaxPriceInput(filterMaxPrice !== null ? String(filterMaxPrice) : "");
                    setShowFiltersModal(true);
                  }}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0",
                    activeFilterCount > 0
                      ? "bg-blue-600 text-white shadow-blue-500/20"
                      : "bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 hover:bg-gray-200 dark:hover:bg-zinc-700"
                  )}
                >
                  <SlidersHorizontal size={14} />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-white text-blue-600 text-[10px] flex items-center justify-center font-extrabold ml-0.5">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Listings Cards Grid */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-28 lg:pb-6">

              {filteredItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {filteredItems.map((item) => {
                    const isSaved = currentUser ? item.savedBy?.includes(currentUser.id) : false;
                    const itemDist = calculateItemDistanceKm(item, currentUser?.location);
                    const coverImg =
                      item.images && item.images.length > 0
                        ? item.images[0]
                        : "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80";

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="group bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-150 dark:border-zinc-800 shadow-xs hover:shadow-md transition-all flex flex-col cursor-pointer hover:-translate-y-0.5 relative"
                      >
                        {/* Item Image & Action Buttons */}
                        <div className="relative w-full aspect-square bg-zinc-100 dark:bg-zinc-800 overflow-hidden select-none">
                          <img
                            src={coverImg}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />

                          {/* Sold or Pending badge */}
                          {item.status === "sold" ? (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <span className="bg-red-600 text-white font-black text-xs px-2.5 py-1 rounded-lg uppercase tracking-wider">
                                SOLD
                              </span>
                            </div>
                          ) : (item.status === "pending" || item.status === "reserved") ? (
                            <div className="absolute top-2 right-2 z-10">
                              <span className="bg-amber-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-md shadow-xs uppercase tracking-wider">
                                PENDING
                              </span>
                            </div>
                          ) : null}

                          {/* Price Badge */}
                          <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-md text-white font-black text-xs sm:text-sm px-2.5 py-1 rounded-xl shadow-xs">
                            {item.price === 0 ? "FREE" : `$${item.price.toLocaleString()}`}
                          </div>

                          {/* Condition badge */}
                          <div className="absolute top-2 left-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md text-gray-800 dark:text-zinc-200 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                            {item.condition}
                          </div>
                        </div>

                        {/* Text details */}
                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-[var(--primary)] transition-colors">
                              {item.title}
                            </h3>
                            <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-zinc-400 mt-1">
                              <MapPin size={12} className="text-rose-500 shrink-0" />
                              <span className="font-bold text-gray-700 dark:text-zinc-300">{itemDist} km</span>
                              <span className="text-gray-300 dark:text-zinc-600">•</span>
                              <span className="truncate">{item.location}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-100 dark:border-zinc-800/80 text-[11px]">
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveSellerStore({
                                  id: item.sellerId,
                                  name: item.sellerName,
                                  avatar: item.sellerAvatar,
                                  location: item.sellerLocation || item.location,
                                });
                              }}
                              className="flex items-center gap-1.5 min-w-0 hover:text-[var(--primary)] group/seller transition-colors cursor-pointer py-0.5"
                              title={`View ${item.sellerName}'s Storefront`}
                            >
                              <div className="w-4 h-4 rounded-full overflow-hidden shrink-0 bg-gray-200 dark:bg-zinc-700 flex items-center justify-center text-[9px] font-bold group-hover/seller:ring-1 group-hover/seller:ring-[var(--primary)] transition-all">
                                {item.sellerAvatar ? (
                                  <img src={item.sellerAvatar} alt="seller" className="w-full h-full object-cover" />
                                ) : (
                                  item.sellerName.charAt(0)
                                )}
                              </div>
                              <span className="truncate text-gray-600 dark:text-zinc-400 group-hover/seller:text-[var(--primary)] group-hover/seller:underline font-medium">
                                {item.sellerName}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Empty Browse State */
                <div className="h-full flex flex-col items-center justify-center text-center p-8 fade-in">
                  <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-zinc-900 flex items-center justify-center mb-4 text-[var(--primary)]">
                    <ShoppingBag size={28} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {filterDistanceOption !== "suggested"
                      ? `No items found within ${filterDistanceOption === "custom" ? filterCustomDistanceKm : filterDistanceOption} km`
                      : "No items found"}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-xs mb-6">
                    {activeFilterCount > 0
                      ? "Try resetting some filters or adjusting your search keywords to see more items."
                      : "Try adjusting your search keywords or switching category filters."}
                  </p>

                  <button
                    onClick={() => {
                      handleResetAllFilters();
                      setSearchQuery("");
                      setSelectedCategories([]);
                    }}
                    className="py-2.5 px-5 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
        </div>


      {/* Item Detail Modal / Sliding Page */}
      {(selectedItem || closingItem) && (
        <ItemDetailModal
          item={selectedItem || closingItem!}
          isClosing={!!closingItem}
          feedItems={[selectedItem || closingItem!]}
          onClose={handleCloseSelectedItem}
          onEdit={(item) => {
            setSelectedItem(null);
            setClosingItem(null);
            setEditingItem(item);
            setShowCreateModal(true);
          }}
          onOpenStore={(sellerId, sellerName, sellerAvatar, sellerLocation) => {
            setClosingSellerStore(null);
            setActiveSellerStore({
              id: sellerId,
              name: sellerName,
              avatar: sellerAvatar,
              location: sellerLocation,
            });
          }}
        />
      )}

      {/* Create / Edit Listing Full Page */}
      {(showCreateModal || closingCreateModal) && (
        <CreateListingModal
          initialItem={editingItem}
          isClosing={closingCreateModal}
          onClose={handleCloseCreateModal}
        />
      )}

      {/* Share to Chat Modal */}
      {sharingItem && (
        <ShareToChatModal
          item={sharingItem}
          onClose={() => setSharingItem(null)}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          FACEBOOK MARKETPLACE-STYLE FILTERS BOTTOM SHEET MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showFiltersModal && (
        <div 
          className="modal-overlay fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
          onClick={startDismissFilters}
          style={{
            backgroundColor: isFilterClosing
              ? "rgba(0, 0, 0, 0)"
              : `rgba(0, 0, 0, ${Math.max(0, Math.min(0.35, 0.35 - (filterDragY / 600)))})`,
            transition: isFilterDragging ? "none" : "background-color 0.22s ease-out"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg sm:w-[480px] bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[82vh] sm:h-[590px] max-h-[82vh] sm:max-h-[590px] overflow-hidden border-t sm:border border-gray-150 dark:border-zinc-800"
            style={{
              transform: isFilterClosing || !hasFilterAnimatedIn
                ? "translateY(100%)"
                : `translateY(${filterDragY > 0 ? filterDragY : 0}px)`,
              transition: isFilterDragging
                ? "none"
                : "transform 0.26s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
            {/* Grab Handle & Top Header Area for Dragging */}
            <div
              className="w-full shrink-0 select-none cursor-row-resize bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800"
              style={{ touchAction: "none" }}
              onTouchStart={handleFilterTouchStart}
              onTouchMove={handleFilterTouchMove}
              onTouchEnd={handleFilterTouchEnd}
              onTouchCancel={handleFilterTouchEnd}
            >
              {/* Grab Handle */}
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-1 shrink-0 sm:hidden cursor-row-resize" />

              {/* Header */}
              <div className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (filterSubscreen !== "main") {
                        setFilterSubscreen("main");
                      } else {
                        startDismissFilters();
                      }
                    }}
                    className="p-1 -ml-1 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
                    title={filterSubscreen === "main" ? "Close" : "Back"}
                  >
                    {filterSubscreen === "main" ? <X size={20} /> : <ArrowLeft size={20} />}
                  </button>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-none">
                    {filterSubscreen === "main" && "Filters"}
                    {filterSubscreen === "sortBy" && "Sort by"}
                    {filterSubscreen === "price" && "Price"}
                    {filterSubscreen === "condition" && "Condition"}
                    {filterSubscreen === "dateListed" && "Date listed"}
                    {filterSubscreen === "category" && "Category"}
                    {filterSubscreen === "availability" && "Availability"}
                    {filterSubscreen === "distance" && "Distance"}
                  </h2>
                </div>

                <div>
                  {filterSubscreen === "main" ? (
                    <button
                      onClick={handleResetAllFilters}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Reset all
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (filterSubscreen === "sortBy") setFilterSortBy("suggested");
                        if (filterSubscreen === "price") { setFilterMinPrice(null); setFilterMaxPrice(null); setMinPriceInput(""); setMaxPriceInput(""); }
                        if (filterSubscreen === "condition") setFilterCondition("any");
                        if (filterSubscreen === "dateListed") setFilterDateListed("any");
                        if (filterSubscreen === "category") setSelectedCategories([]);
                        if (filterSubscreen === "availability") setFilterAvailability("available");
                        if (filterSubscreen === "distance") { setFilterDistanceOption("suggested"); setFilterCustomDistanceKm(100); }
                      }}
                      className="text-xs font-bold text-gray-500 dark:text-zinc-400 hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div
              ref={filterScrollRef}
              className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 overscroll-contain"
            >
              {/* ── 1. MAIN SCREEN (MATCHING SCREENSHOT 2) ── */}
              {filterSubscreen === "main" && (
                <div className="divide-y divide-gray-100 dark:divide-zinc-800/80">
                  {/* Sort By Row */}
                  <div 
                    onClick={() => setFilterSubscreen("sortBy")}
                    className="flex items-center justify-between py-3.5 hover:bg-gray-50 dark:hover:bg-zinc-800/40 px-2 -mx-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">Sort by</h3>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                        {filterSortBy === "suggested" ? "Suggested" : filterSortBy === "distance_asc" ? "Distance: Nearest first" : filterSortBy === "newest" ? "Date listed: Newest first" : filterSortBy === "price_asc" ? "Price: Lowest first" : "Price: Highest first"}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-gray-400 dark:text-zinc-500" />
                  </div>

                  {/* Price Row */}
                  <div 
                    onClick={() => setFilterSubscreen("price")}
                    className="flex items-center justify-between py-3.5 hover:bg-gray-50 dark:hover:bg-zinc-800/40 px-2 -mx-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">Price</h3>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                        {filterMinPrice !== null && filterMaxPrice !== null
                          ? `$${filterMinPrice} - $${filterMaxPrice}`
                          : filterMinPrice !== null
                          ? `From $${filterMinPrice}`
                          : filterMaxPrice !== null
                          ? `Up to $${filterMaxPrice}`
                          : "Any"}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-gray-400 dark:text-zinc-500" />
                  </div>

                  {/* Condition Row */}
                  <div 
                    onClick={() => setFilterSubscreen("condition")}
                    className="flex items-center justify-between py-3.5 hover:bg-gray-50 dark:hover:bg-zinc-800/40 px-2 -mx-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">Condition</h3>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                        {filterCondition === "any" ? "Any" : filterCondition}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-gray-400 dark:text-zinc-500" />
                  </div>

                  {/* Date Listed Row */}
                  <div 
                    onClick={() => setFilterSubscreen("dateListed")}
                    className="flex items-center justify-between py-3.5 hover:bg-gray-50 dark:hover:bg-zinc-800/40 px-2 -mx-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">Date listed</h3>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                        {filterDateListed === "24h" ? "Last 24 hours" : filterDateListed === "7d" ? "Last 7 days" : filterDateListed === "30d" ? "Last 30 days" : "Any"}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-gray-400 dark:text-zinc-500" />
                  </div>

                  {/* Category Row */}
                  <div 
                    onClick={() => setFilterSubscreen("category")}
                    className="flex items-center justify-between py-3.5 hover:bg-gray-50 dark:hover:bg-zinc-800/40 px-2 -mx-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">Category</h3>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                        {selectedCategories.length === 0 ? "Any" : selectedCategories.join(", ")}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-gray-400 dark:text-zinc-500" />
                  </div>

                  {/* Availability Row */}
                  <div 
                    onClick={() => setFilterSubscreen("availability")}
                    className="flex items-center justify-between py-3.5 hover:bg-gray-50 dark:hover:bg-zinc-800/40 px-2 -mx-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">Availability</h3>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                        {filterAvailability === "available" ? "Available" : "All (including sold)"}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-gray-400 dark:text-zinc-500" />
                  </div>

                  {/* Distance Row */}
                  <div 
                    onClick={() => setFilterSubscreen("distance")}
                    className="flex items-center justify-between py-3.5 hover:bg-gray-50 dark:hover:bg-zinc-800/40 px-2 -mx-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">Distance</h3>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                        {filterDistanceOption === "suggested" ? "Suggested" : filterDistanceOption === "custom" ? `${filterCustomDistanceKm} km` : `${filterDistanceOption} km`}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-gray-400 dark:text-zinc-500" />
                  </div>
                </div>
              )}

              {/* ── 2. SORT BY SUB-SCREEN (MATCHING SCREENSHOT 3) ── */}
              {filterSubscreen === "sortBy" && (
                <div className="space-y-1">
                  {[
                    { id: "suggested", label: "Suggested" },
                    { id: "distance_asc", label: "Distance: Nearest first" },
                    { id: "newest", label: "Date listed: Newest first" },
                    { id: "price_asc", label: "Price: Lowest first" },
                    { id: "price_desc", label: "Price: Highest first" },
                  ].map((option) => {
                    const isSelected = filterSortBy === option.id;
                    return (
                      <div
                        key={option.id}
                        onClick={() => setFilterSortBy(option.id as any)}
                        className="flex items-center justify-between py-3 px-2 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{option.label}</span>
                        <div className={clsx(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                          isSelected ? "border-blue-600 dark:border-blue-500" : "border-gray-300 dark:border-zinc-600"
                        )}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-500" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── 3. PRICE SUB-SCREEN (MATCHING SCREENSHOT 4) ── */}
              {filterSubscreen === "price" && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 mb-1.5">Minimum</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">$</span>
                        <input
                          type="number"
                          value={minPriceInput}
                          onChange={(e) => {
                            setMinPriceInput(e.target.value);
                            const val = e.target.value.trim() !== "" ? parseFloat(e.target.value) : null;
                            setFilterMinPrice(!isNaN(val as number) ? val : null);
                          }}
                          placeholder="0"
                          className="w-full bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white pl-8 pr-3 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 mb-1.5">Maximum</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">$</span>
                        <input
                          type="number"
                          value={maxPriceInput}
                          onChange={(e) => {
                            setMaxPriceInput(e.target.value);
                            const val = e.target.value.trim() !== "" ? parseFloat(e.target.value) : null;
                            setFilterMaxPrice(!isNaN(val as number) ? val : null);
                          }}
                          placeholder="Any"
                          className="w-full bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white pl-8 pr-3 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick Presets */}
                  <div className="pt-2">
                    <span className="text-xs font-bold text-gray-500 dark:text-zinc-400">Quick ranges:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[
                        { label: "Free ($0)", min: 0, max: 0 },
                        { label: "Under $25", min: null, max: 25 },
                        { label: "Under $50", min: null, max: 50 },
                        { label: "$50 - $200", min: 50, max: 200 },
                        { label: "$200+", min: 200, max: null },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setFilterMinPrice(preset.min);
                            setFilterMaxPrice(preset.max);
                            setMinPriceInput(preset.min !== null ? String(preset.min) : "");
                            setMaxPriceInput(preset.max !== null ? String(preset.max) : "");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── 4. CONDITION SUB-SCREEN ── */}
              {filterSubscreen === "condition" && (
                <div className="space-y-1">
                  {[
                    { id: "any", label: "Any" },
                    { id: "Brand New", label: "Brand New" },
                    { id: "Like New", label: "Like New" },
                    { id: "Good", label: "Good" },
                    { id: "Fair", label: "Fair" },
                  ].map((option) => {
                    const isSelected = filterCondition.toLowerCase() === option.id.toLowerCase();
                    return (
                      <div
                        key={option.id}
                        onClick={() => setFilterCondition(option.id)}
                        className="flex items-center justify-between py-3 px-2 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{option.label}</span>
                        <div className={clsx(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                          isSelected ? "border-blue-600 dark:border-blue-500" : "border-gray-300 dark:border-zinc-600"
                        )}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-500" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── 5. DATE LISTED SUB-SCREEN ── */}
              {filterSubscreen === "dateListed" && (
                <div className="space-y-1">
                  {[
                    { id: "any", label: "Any" },
                    { id: "24h", label: "Last 24 hours" },
                    { id: "7d", label: "Last 7 days" },
                    { id: "30d", label: "Last 30 days" },
                  ].map((option) => {
                    const isSelected = filterDateListed === option.id;
                    return (
                      <div
                        key={option.id}
                        onClick={() => setFilterDateListed(option.id as any)}
                        className="flex items-center justify-between py-3 px-2 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{option.label}</span>
                        <div className={clsx(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                          isSelected ? "border-blue-600 dark:border-blue-500" : "border-gray-300 dark:border-zinc-600"
                        )}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-500" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── 6. CATEGORY SUB-SCREEN (MATCHING SCREENSHOTS 5 & 6) ── */}
              {filterSubscreen === "category" && (
                <div className="space-y-0.5 divide-y divide-gray-100 dark:divide-zinc-800/60">
                  {ALL_FILTER_CATEGORIES.map((cat) => {
                    const isAny = cat === "Any" || cat === "All";
                    const isSelected = isAny
                      ? selectedCategories.length === 0
                      : selectedCategories.includes(cat);
                    return (
                      <div
                        key={cat}
                        onClick={() => {
                          if (isAny) {
                            setSelectedCategories([]);
                          } else {
                            setSelectedCategories((prev) => {
                              if (prev.includes(cat)) {
                                return prev.filter((c) => c !== cat);
                              } else {
                                return [...prev, cat];
                              }
                            });
                          }
                        }}
                        className="flex items-center justify-between py-3 px-2 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{cat}</span>
                        <div className={clsx(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                          isSelected ? "border-blue-600 dark:border-blue-500" : "border-gray-300 dark:border-zinc-600"
                        )}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-500" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── 7. AVAILABILITY SUB-SCREEN ── */}
              {filterSubscreen === "availability" && (
                <div className="space-y-1">
                  {[
                    { id: "available", label: "Available only" },
                    { id: "all", label: "All items (including sold)" },
                  ].map((option) => {
                    const isSelected = filterAvailability === option.id;
                    return (
                      <div
                        key={option.id}
                        onClick={() => setFilterAvailability(option.id as any)}
                        className="flex items-center justify-between py-3 px-2 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{option.label}</span>
                        <div className={clsx(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                          isSelected ? "border-blue-600 dark:border-blue-500" : "border-gray-300 dark:border-zinc-600"
                        )}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-500" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── 8. DISTANCE SUB-SCREEN (MATCHING SCREENSHOT 1) ── */}
              {filterSubscreen === "distance" && (
                <div className="space-y-3">
                  {[
                    { id: "suggested", label: "Suggested" },
                    { id: "32", label: "32 km" },
                    { id: "64", label: "64 km" },
                    { id: "96", label: "96 km" },
                    { id: "160", label: "160 km" },
                    { id: "custom", label: "Custom distance", sub: "Only show me listings within this specific distance." },
                  ].map((option) => {
                    const isSelected = filterDistanceOption === option.id;
                    return (
                      <div key={option.id} className="space-y-2">
                        <div
                          onClick={() => setFilterDistanceOption(option.id as any)}
                          className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                        >
                          <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{option.label}</span>
                            {option.sub && (
                              <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{option.sub}</p>
                            )}
                          </div>
                          <div className={clsx(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                            isSelected ? "border-blue-600 dark:border-blue-500" : "border-gray-300 dark:border-zinc-600"
                          )}>
                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-500" />}
                          </div>
                        </div>

                        {/* Custom Distance Slider when Custom is active */}
                        {option.id === "custom" && isSelected && (
                          <div className="pt-2 px-3 pb-3 space-y-2 bg-gray-50 dark:bg-zinc-800/40 rounded-2xl">
                            <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-zinc-300">
                              <span>5 km</span>
                              <span className="text-blue-600 dark:text-blue-400 font-extrabold text-sm">{filterCustomDistanceKm} km</span>
                              <span>400 km</span>
                            </div>
                            <input
                              type="range"
                              min="5"
                              max="400"
                              step="5"
                              value={filterCustomDistanceKm}
                              onChange={(e) => setFilterCustomDistanceKm(parseInt(e.target.value))}
                              className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Fixed Bottom Action Button: "See items" */}
            <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
              <button
                onClick={() => setShowFiltersModal(false)}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm rounded-2xl transition-all shadow-md shadow-blue-500/25 flex items-center justify-center cursor-pointer"
              >
                See items
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Seller Dedicated Marketplace Storefront Modal */}
      {(activeSellerStore || closingSellerStore) && (
        <SellerStorefrontModal
          sellerId={(activeSellerStore || closingSellerStore)!.id}
          sellerName={(activeSellerStore || closingSellerStore)!.name}
          sellerAvatar={(activeSellerStore || closingSellerStore)!.avatar}
          sellerLocation={(activeSellerStore || closingSellerStore)!.location}
          isClosing={!!closingSellerStore}
          onClose={handleCloseActiveSellerStore}
        />
      )}

      {/* Edit Marketplace Store Profile Modal */}
      {showEditMarketplaceProfileModal && (
        <EditMarketplaceProfileModal
          onClose={() => setShowEditMarketplaceProfileModal(false)}
        />
      )}
    </div>
  );
}
