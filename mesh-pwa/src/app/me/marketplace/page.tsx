"use client";

import { useState, useRef } from "react";
import {
  useMockData,
  MarketplaceSellerType,
  MarketplaceStoreProfile
} from "@/context/MockContext";
import {
  ArrowLeft,
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
  ShoppingBag,
  ExternalLink
} from "lucide-react";
import { clsx } from "clsx";
import { useRouter } from "next/navigation";
import { SellerStorefrontModal } from "@/components/marketplace/SellerStorefrontModal";

const SELLER_TYPES: { id: MarketplaceSellerType; label: string; icon: any; example: string }[] = [
  { id: "chef", label: "Private Chef & Home Culinary", icon: UtensilsCrossed, example: "Cook fresh meals at home & deliver to clients" },
  { id: "florist", label: "Artisanal Florist & Flower Gifts", icon: Flower2, example: "Fresh bouquets for dates, matches & occasions" },
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

export default function MarketplaceSettingsPage({
  isOverlay = false,
  onClose
}: {
  isOverlay?: boolean;
  onClose?: () => void;
} = {}) {
  const { currentUser, updateMarketplaceStoreProfile, addNotification } = useMockData();
  const currentStore = currentUser?.marketplaceStore || {};
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [storeName, setStoreName] = useState(currentStore.storeName || currentUser?.name || "");
  const [sellerType, setSellerType] = useState<MarketplaceSellerType>(currentStore.sellerType || "chef");
  const [customSellerType, setCustomSellerType] = useState(currentStore.customSellerType || "");
  const [headline, setHeadline] = useState(
    currentStore.headline || "Specialized in home culinary meals cooked fresh at home with local delivery!"
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
  const [showStorePreview, setShowStorePreview] = useState(false);

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

  const handleBack = () => {
    if (isOverlay && onClose) {
      onClose();
    } else {
      window.dispatchEvent(new CustomEvent("settings-subpage-back"));
      router.push("/me");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
      storeName: storeName.trim(),
      sellerType,
      customSellerType: customSellerType.trim() || undefined,
      headline: headline.trim(),
      bio: bio.trim(),
      bannerImage,
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
      addNotification("Marketplace Store Profile saved successfully! 🏪");
      handleBack();
    } catch (err) {
      console.error(err);
      addNotification("Failed to update store profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto pb-24 lg:pb-6 bg-[var(--card)] dark:bg-zinc-950 flex flex-col">
      {/* Top Header */}
      <header className="bg-white dark:bg-zinc-900 px-3 md:px-4 py-3 flex items-center justify-between border-b border-[var(--border)] dark:border-zinc-800 sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
            title="Back"
          >
            <ArrowLeft size={24} className="text-[var(--primary)]" />
          </button>
          <div>
            <h1 className="text-lg font-bold dark:text-white leading-tight">
              Marketplace Store Profile
            </h1>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400">
              Customize your seller storefront, specialty & catalogue
            </p>
          </div>
        </div>

        {/* View Storefront Preview button */}
        <button
          type="button"
          onClick={() => setShowStorePreview(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[var(--primary)] font-bold text-xs hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
        >
          <ShoppingBag size={14} />
          <span className="hidden sm:inline">Preview</span>
          <span>Store</span>
        </button>
      </header>

      {/* Form Content */}
      <div className="p-4 md:p-6 max-w-2xl mx-auto w-full space-y-6 flex-1">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Banner Photo Selector */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-[var(--border)] dark:border-zinc-800 shadow-xs space-y-3">
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
              Storefront Banner Cover
            </label>
            <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-800 group bg-zinc-100 dark:bg-zinc-900">
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
                <span>Upload Custom Banner</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBannerUpload}
              />
            </div>

            {/* Banner Presets */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {PRESET_BANNERS.map((b) => (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => setBannerImage(b.url)}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer",
                    bannerImage === b.url
                      ? "border-[var(--primary)] bg-blue-50 dark:bg-blue-950/50 text-[var(--primary)] font-bold shadow-xs"
                      : "border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-850"
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Store / Business Name */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-[var(--border)] dark:border-zinc-800 shadow-xs space-y-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
              Store / Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g. Chef Lionel's Gourmet Kitchen, Maya's Flower Boutique"
              className="w-full bg-gray-50 dark:bg-zinc-800/80 text-gray-900 dark:text-white px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[var(--primary)] outline-none text-sm font-semibold"
            />
          </div>

          {/* Seller / Business Category Type */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-[var(--border)] dark:border-zinc-800 shadow-xs space-y-3">
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
              Seller Category & Business Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                        ? "border-[var(--primary)] bg-blue-50/60 dark:bg-blue-950/40 text-[var(--primary)] shadow-xs"
                        : "border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/40 text-gray-700 dark:text-zinc-300 hover:border-gray-300"
                    )}
                  >
                    <div className={clsx(
                      "p-2 rounded-xl shrink-0",
                      isSelected ? "bg-[var(--primary)] text-white" : "bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300"
                    )}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs truncate">{type.label}</span>
                        {isSelected && <Check size={14} className="text-[var(--primary)] shrink-0" />}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                        {type.example}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Specialty Headline */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-[var(--border)] dark:border-zinc-800 shadow-xs space-y-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
              Tagline / Specialty Headline
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Cooking home culinary meals fresh for less than restaurant prices!"
              className="w-full bg-gray-50 dark:bg-zinc-800/80 text-gray-900 dark:text-white px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[var(--primary)] outline-none text-sm"
            />
          </div>

          {/* Store Bio / Description */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-[var(--border)] dark:border-zinc-800 shadow-xs space-y-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
              About Your Store & Catalogue
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Describe what you specialize in, cooking styles, delivery areas, rental terms, or product details..."
              className="w-full bg-gray-50 dark:bg-zinc-800/80 text-gray-900 dark:text-white px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[var(--primary)] outline-none text-sm resize-none"
            />
          </div>

          {/* Location & Business Hours */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-[var(--border)] dark:border-zinc-800 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    className="w-full bg-gray-50 dark:bg-zinc-800/80 text-gray-900 dark:text-white pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-xs font-semibold outline-none focus:ring-2 focus:ring-[var(--primary)]"
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
                    className="w-full bg-gray-50 dark:bg-zinc-800/80 text-gray-900 dark:text-white pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-xs font-semibold outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Fulfillment Options */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-[var(--border)] dark:border-zinc-800 shadow-xs space-y-3">
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
              Fulfillment & Delivery Options
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <label className={clsx(
                "p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer select-none",
                isDelivery ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" : "border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 text-gray-600 dark:text-zinc-400"
              )}>
                <input
                  type="checkbox"
                  checked={isDelivery}
                  onChange={(e) => setIsDelivery(e.target.checked)}
                  className="hidden"
                />
                <Car size={20} />
                <span className="font-bold text-xs">Local Delivery</span>
              </label>

              <label className={clsx(
                "p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer select-none",
                isPickup ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300" : "border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 text-gray-600 dark:text-zinc-400"
              )}>
                <input
                  type="checkbox"
                  checked={isPickup}
                  onChange={(e) => setIsPickup(e.target.checked)}
                  className="hidden"
                />
                <Store size={20} />
                <span className="font-bold text-xs">Doorstep Pickup</span>
              </label>

              <label className={clsx(
                "p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer select-none",
                isShipping ? "border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300" : "border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 text-gray-600 dark:text-zinc-400"
              )}>
                <input
                  type="checkbox"
                  checked={isShipping}
                  onChange={(e) => setIsShipping(e.target.checked)}
                  className="hidden"
                />
                <Package size={20} />
                <span className="font-bold text-xs">Shipping</span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
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

      {/* Store Preview Modal */}
      {showStorePreview && (
        <SellerStorefrontModal
          sellerId="me"
          sellerName={storeName}
          sellerAvatar={currentUser?.avatar}
          sellerLocation={location}
          onClose={() => setShowStorePreview(false)}
        />
      )}
    </div>
  );
}
