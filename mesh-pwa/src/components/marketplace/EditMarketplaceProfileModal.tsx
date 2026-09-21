"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  useMockData,
  MarketplaceSellerType,
  MarketplaceStoreProfile
} from "@/context/MockContext";
import {
  X,
  Store,
  Sparkles,
  Camera,
  MapPin,
  Clock,
  Car,
  Package,
  Check,
  UtensilsCrossed,
  Flower2,
  Building2,
  Shirt,
  Tv,
  Image as ImageIcon,
  ChevronLeft
} from "lucide-react";
import { clsx } from "clsx";

interface EditMarketplaceProfileModalProps {
  onClose: () => void;
  isClosing?: boolean;
}

const SELLER_TYPES: { id: MarketplaceSellerType; label: string; icon: any; example: string }[] = [
  { id: "chef", label: "Private Chef & Home Culinary", icon: UtensilsCrossed, example: "Cook fresh meals at home & deliver to clients" },
  { id: "florist", label: "Artisanal Florist & Flower Gifts", icon: Flower2, example: "Fresh bouquets for gifts, events & special occasions" },
  { id: "real_estate", label: "Real Estate & Rentals Host", icon: Building2, example: "Apartments, lofts, room rentals & housing" },
  { id: "fashion", label: "Fashion Brand & Boutique", icon: Shirt, example: "Clothing, shoes, jewelry, luxury accessories" },
  { id: "restaurant", label: "Restaurant & Catering", icon: UtensilsCrossed, example: "Local dining, takeout, party catering" },
  { id: "auto", label: "Automotive & Car Dealer", icon: Car, example: "Cars, motorbikes, parts, auto services" },
  { id: "electronics", label: "Electronics & Tech Specialist", icon: Tv, example: "Phones, computers, audio, gaming gear" },
  { id: "artisan", label: "Handcrafted Artisan & Crafts", icon: Sparkles, example: "Custom woodwork, artwork, handmade pottery" },
  { id: "individual", label: "Independent Marketplace Seller", icon: Store, example: "General seller, pre-loved items, personal goods" }
];

const PRESET_BANNERS = [
  { label: "Gourmet Culinary", url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80" },
  { label: "Fresh Flowers", url: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=1200&auto=format&fit=crop&q=80" },
  { label: "Modern Loft", url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&auto=format&fit=crop&q=80" },
  { label: "Fashion Studio", url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&auto=format&fit=crop&q=80" },
  { label: "Tech Minimalist", url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80" },
];

export function EditMarketplaceProfileModal({
  onClose,
  isClosing: externalIsClosing = false
}: EditMarketplaceProfileModalProps) {
  const { currentUser, updateMarketplaceStoreProfile, addNotification } = useMockData();
  const currentStore = currentUser?.marketplaceStore || {};

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [avatarImage, setAvatarImage] = useState<string | null>(
    currentStore.avatar || currentUser?.avatar || null
  );
  const [ownerName, setOwnerName] = useState(currentStore.ownerName || currentUser?.name || "");
  const [storeName, setStoreName] = useState(currentStore.storeName || currentUser?.name || "");
  const [sellerType, setSellerType] = useState<MarketplaceSellerType>(currentStore.sellerType || "chef");
  const [customSellerType, setCustomSellerType] = useState(currentStore.customSellerType || "");
  const [headline, setHeadline] = useState(
    currentStore.headline || (currentUser?.bio && !currentUser.bio.includes("Hey there") ? currentUser.bio : "Active seller on Isoko.")
  );
  const [bio, setBio] = useState(
    currentStore.bio || "We prepare delicious homemade meals using fresh ingredients and deliver right to your doorstep. Browse our menu listings or message for custom orders!"
  );
  const [bannerImage, setBannerImage] = useState(currentStore.bannerImage || PRESET_BANNERS[0].url);
  const [location, setLocation] = useState(() => {
    if (currentStore.location) return currentStore.location;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mesh_marketplace_default_location");
      if (saved) return saved;
    }
    return currentUser?.location || "Montreal";
  });
  const [saveAsDefaultLocation, setSaveAsDefaultLocation] = useState(true);
  const [businessHours, setBusinessHours] = useState(currentStore.businessHours || "Mon - Sat: 10:00 AM - 9:00 PM");
  const [isDelivery, setIsDelivery] = useState(currentStore.fulfillmentOptions?.includes("delivery") ?? true);
  const [isPickup, setIsPickup] = useState(currentStore.fulfillmentOptions?.includes("pickup") ?? true);
  const [isShipping, setIsShipping] = useState(currentStore.fulfillmentOptions?.includes("shipping") ?? false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      if (loadEvt.target?.result) {
        setAvatarImage(loadEvt.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      if (loadEvt.target?.result) {
        setBannerImage(loadEvt.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerName.trim()) {
      addNotification("Please enter an owner name.");
      return;
    }
    if (!storeName.trim()) {
      addNotification("Please enter a store name.");
      return;
    }

    setIsSubmitting(true);
    const fulfillmentOptions: ("delivery" | "pickup" | "shipping")[] = [];
    if (isDelivery) fulfillmentOptions.push("delivery");
    if (isPickup) fulfillmentOptions.push("pickup");
    if (isShipping) fulfillmentOptions.push("shipping");

    if (saveAsDefaultLocation && location.trim()) {
      try {
        localStorage.setItem("mesh_marketplace_default_location", location.trim());
      } catch (_) {}
    }

    const updatedProfile: MarketplaceStoreProfile = {
      ownerName: ownerName.trim(),
      storeName: storeName.trim(),
      sellerType,
      customSellerType: customSellerType.trim() || undefined,
      headline: headline.trim(),
      bio: bio.trim(),
      bannerImage,
      avatar: avatarImage,
      location: location.trim(),
      businessHours: businessHours.trim(),
      fulfillmentOptions,
      rating: currentStore.rating || 5.0,
      reviewCount: currentStore.reviewCount || 1,
      responseRate: currentStore.responseRate || "Fast Replies (~10m)",
      joinedYear: currentStore.joinedYear || "2024"
    };

    try {
      await updateMarketplaceStoreProfile(updatedProfile);
      handleClose();
    } catch (err) {
      console.error(err);
      addNotification("Failed to update store profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [internalIsClosing, setInternalIsClosing] = useState(false);
  const isClosing = externalIsClosing || internalIsClosing;

  const handleClose = () => {
    if (isClosing) return;
    setInternalIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 440);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={clsx(
        "fixed inset-0 z-[180] bg-white dark:bg-zinc-950 flex flex-col h-full overscroll-contain text-gray-900 dark:text-zinc-100",
        isClosing
          ? "animate-slide-out-to-right-edge"
          : "animate-slide-in-from-right-edge"
      )}
    >
      {/* Top Navigation Header */}
      <header className="flex items-center justify-between px-3 md:px-4 py-3 border-b border-gray-150 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            className="p-2 -ml-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-700 dark:text-zinc-200 transition-colors cursor-pointer"
            title="Go back"
          >
            <ChevronLeft size={24} className="text-gray-900 dark:text-white" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[var(--primary)] shrink-0">
              <Store size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight">
                Storefront Profile
              </h2>
              <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-zinc-400">
                Customize your seller brand & storefront
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          title="Close"
        >
          <X size={20} />
        </button>
      </header>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
        <form onSubmit={handleSave} className="max-w-xl mx-auto w-full px-4 py-5 sm:px-6 sm:py-6 space-y-6 pb-28">
          {/* Visual Identity: Banner Cover & Storefront Avatar */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              Storefront Banner & Avatar
            </label>
            <div className="relative w-full rounded-2xl border border-gray-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 mb-12">
              {/* Banner Cover */}
              <div className="relative w-full h-36 rounded-2xl overflow-hidden group">
                <img
                  src={bannerImage}
                  alt="Store Banner Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 text-white font-bold text-xs transition-opacity backdrop-blur-xs cursor-pointer"
                >
                  <Camera size={18} />
                  <span>Change Banner Photo</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerUpload}
                />
              </div>

              {/* Storefront Avatar Profile Image */}
              <div className="absolute -bottom-9 left-4 flex items-end gap-3 z-10">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white dark:border-zinc-900 bg-emerald-100 dark:bg-emerald-950 shadow-xl flex items-center justify-center">
                    {avatarImage ? (
                      <img
                        src={avatarImage}
                        alt="Storefront Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Store size={32} className="text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition-opacity cursor-pointer border-4 border-transparent"
                    title="Change Storefront Avatar"
                  >
                    <Camera size={18} />
                    <span>Change</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-md border-2 border-white dark:border-zinc-900 transition-transform active:scale-90 cursor-pointer"
                    title="Upload Store Avatar"
                  >
                    <Camera size={14} />
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>

                <div className="mb-2">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1.5"
                  >
                    <Camera size={13} />
                    <span>Change Store Avatar</span>
                  </button>
                  <p className="text-[10px] text-gray-500 dark:text-zinc-400">
                    Visible on your storefront, feed & listings
                  </p>
                </div>
              </div>
            </div>

            {/* Banner Presets */}
            <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar py-1">
              {PRESET_BANNERS.map((b) => (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => setBannerImage(b.url)}
                  className={clsx(
                    "px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all border cursor-pointer",
                    bannerImage === b.url
                      ? "border-[var(--primary)] bg-blue-50 dark:bg-blue-950/50 text-[var(--primary)] font-bold"
                      : "border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-900"
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Owner / Personal Name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              Owner Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="e.g. Ishimwe, Lionel"
              className="w-full bg-gray-50 dark:bg-zinc-800/80 text-gray-900 dark:text-white px-4 py-3 rounded-2xl border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[var(--primary)] outline-none text-[16px] sm:text-sm font-semibold"
            />
            <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1">
              Your personal name shown in chats, feed, and on your storefront as &quot;By {ownerName || "Name"}&quot;
            </p>
          </div>

          {/* Store / Business Name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              Store / Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g. Chef Lionel's Gourmet Kitchen, Maya's Flower Boutique"
              className="w-full bg-gray-50 dark:bg-zinc-800/80 text-gray-900 dark:text-white px-4 py-3 rounded-2xl border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[var(--primary)] outline-none text-[16px] sm:text-sm font-semibold"
            />
          </div>

          {/* Seller / Business Category Type */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              Seller Category & Business Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SELLER_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = sellerType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSellerType(type.id)}
                    className={clsx(
                      "p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer",
                      isSelected
                        ? "border-[var(--primary)] bg-blue-50/60 dark:bg-blue-950/40 text-[var(--primary)]"
                        : "border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/40 text-gray-700 dark:text-zinc-300 hover:border-gray-300"
                    )}
                  >
                    <div className={clsx(
                      "p-1.5 rounded-lg shrink-0",
                      isSelected ? "bg-[var(--primary)] text-white" : "bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300"
                    )}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs truncate">{type.label}</span>
                        {isSelected && <Check size={14} className="text-[var(--primary)] shrink-0" />}
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                        {type.example}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Specialty Headline */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              Tagline / Specialty Headline
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Cooking home culinary meals fresh for less than restaurant prices!"
              className="w-full bg-gray-50 dark:bg-zinc-800/80 text-gray-900 dark:text-white px-4 py-3 rounded-2xl border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[var(--primary)] outline-none text-[16px] sm:text-sm"
            />
          </div>

          {/* Location & Business Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                Location / City
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-500" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Austin, TX"
                  className="w-full bg-gray-50 dark:bg-zinc-800/80 text-gray-900 dark:text-white pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-[16px] sm:text-xs font-semibold outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
              <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveAsDefaultLocation}
                  onChange={(e) => setSaveAsDefaultLocation(e.target.checked)}
                  className="w-4 h-4 rounded text-[var(--primary)] focus:ring-[var(--primary)] border-gray-300 dark:border-zinc-700"
                />
                <span className="text-[11px] font-medium text-gray-600 dark:text-zinc-400">
                  Save as default location for future listings
                </span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                Business Hours / Availability
              </label>
              <div className="relative">
                <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                <input
                  type="text"
                  value={businessHours}
                  onChange={(e) => setBusinessHours(e.target.value)}
                  placeholder="e.g., Daily 10 AM - 9 PM"
                  className="w-full bg-gray-50 dark:bg-zinc-800/80 text-gray-900 dark:text-white pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-[16px] sm:text-xs font-semibold outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
            </div>
          </div>

          {/* Fulfillment Options */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              Fulfillment & Delivery Options
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className={clsx(
                "p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer select-none",
                isDelivery ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" : "border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 text-gray-600 dark:text-zinc-400"
              )}>
                <input
                  type="checkbox"
                  checked={isDelivery}
                  onChange={(e) => setIsDelivery(e.target.checked)}
                  className="hidden"
                />
                <Car size={18} />
                <span className="font-bold text-xs">Local Delivery</span>
              </label>

              <label className={clsx(
                "p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer select-none",
                isPickup ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300" : "border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 text-gray-600 dark:text-zinc-400"
              )}>
                <input
                  type="checkbox"
                  checked={isPickup}
                  onChange={(e) => setIsPickup(e.target.checked)}
                  className="hidden"
                />
                <Store size={18} />
                <span className="font-bold text-xs">Doorstep Pickup</span>
              </label>

              <label className={clsx(
                "p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer select-none",
                isShipping ? "border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300" : "border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 text-gray-600 dark:text-zinc-400"
              )}>
                <input
                  type="checkbox"
                  checked={isShipping}
                  onChange={(e) => setIsShipping(e.target.checked)}
                  className="hidden"
                />
                <Package size={18} />
                <span className="font-bold text-xs">Shipping</span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 pb-6 sm:pb-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-[var(--primary)] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
            >
              {isSubmitting ? "Saving Store Profile..." : "Save Marketplace Store Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
