import { useState, useRef, useEffect } from "react";
import { MarketplaceItem, MarketplaceCondition, useMockData } from "@/context/MockContext";
import {
  ArrowLeft,
  X,
  Camera,
  Upload,
  Plus,
  Trash2,
  DollarSign,
  Tag,
  MapPin,
  Sparkles,
  Info,
  Check,
  Loader2,
  Film,
  Play
} from "lucide-react";
import { clsx } from "clsx";
import { useModalHistory } from "@/hooks/useModalHistory";
import { processImageFile } from "@/utils/imageProcessor";

const CATEGORIES = [
  "Flowers",
  "Rentals",
  "Foods",
  "Electronics",
  "Vehicles",
  "Home & Living",
  "Fashion & Apparel",
  "Sports & Hobbies",
  "Beauty & Health",
  "Free / Giveaways",
  "Other"
];

const CONDITIONS: { label: MarketplaceCondition; desc: string }[] = [
  { label: "Brand New", desc: "Unopened original packaging, never used" },
  { label: "Like New", desc: "Practically new, no scratches or defects" },
  { label: "Good", desc: "Gently used, minor wear, fully functional" },
  { label: "Fair", desc: "Noticeable wear or cosmetic flaws, works well" },
];

interface CreateListingModalProps {
  onClose: () => void;
  initialItem?: MarketplaceItem | null;
  isClosing?: boolean;
}

export function CreateListingModal({
  onClose,
  initialItem,
  isClosing: externalIsClosing = false
}: CreateListingModalProps) {
  const {
    currentUser,
    createMarketplaceListing,
    updateMarketplaceListing,
    addNotification
  } = useMockData();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isClosing = externalIsClosing;

  const handleBack = () => {
    onClose();
  };

  const [savedDefaultLocation, setSavedDefaultLocation] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("mesh_marketplace_default_location") || "";
    }
    return "";
  });

  const [title, setTitle] = useState(initialItem?.title || "");
  const [price, setPrice] = useState<string>(
    initialItem ? (initialItem.price === 0 ? "0" : initialItem.price.toString()) : ""
  );
  const [isFree, setIsFree] = useState(initialItem ? initialItem.price === 0 : false);
  const [category, setCategory] = useState(initialItem?.category || "Flowers");
  const [condition, setCondition] = useState<MarketplaceCondition>(initialItem?.condition || "Brand New");
  const [location, setLocation] = useState(
    initialItem?.location || savedDefaultLocation || currentUser?.location || "Austin, TX"
  );
  const [saveAsDefaultLocation, setSaveAsDefaultLocation] = useState(true);
  const [description, setDescription] = useState(initialItem?.description || "");
  const [images, setImages] = useState<string[]>(initialItem?.images || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingPhotos(true);
    try {
      const fileList = Array.from(files).filter(
        (f) =>
          f.type.startsWith("image/") ||
          f.type.startsWith("video/") ||
          /\.(jpe?g|png|webp|heic|heif|mp4|mov|webm|m4v|3gp)$/i.test(f.name)
      );

      for (const file of fileList) {
        if (images.length >= 8) break;

        const isVideo =
          file.type.startsWith("video/") ||
          /\.(mp4|mov|webm|m4v|3gp)$/i.test(file.name);

        if (isVideo) {
          // Read video file as Data URL
          await new Promise<void>((resolve) => {
            const reader = new FileReader();
            reader.onload = (loadEvt) => {
              if (loadEvt.target?.result) {
                setImages((prev) => {
                  if (prev.length >= 8) return prev;
                  return [...prev, loadEvt.target!.result as string];
                });
              }
              resolve();
            };
            reader.onerror = () => resolve();
            reader.readAsDataURL(file);
          });
        } else {
          // Process photo
          try {
            const { dataUrl } = await processImageFile(file);
            setImages((prev) => {
              if (prev.length >= 8) return prev;
              return [...prev, dataUrl];
            });
          } catch (err) {
            console.warn("processImageFile fallback for listing:", err);
            await new Promise<void>((resolve) => {
              const reader = new FileReader();
              reader.onload = (loadEvt) => {
                if (loadEvt.target?.result) {
                  setImages((prev) => {
                    if (prev.length >= 8) return prev;
                    return [...prev, loadEvt.target!.result as string];
                  });
                }
                resolve();
              };
              reader.onerror = () => resolve();
              reader.readAsDataURL(file);
            });
          }
        }
      }
    } finally {
      setIsProcessingPhotos(false);
      if (e.target) e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      addNotification("Please enter a title for your item.");
      return;
    }

    if (!isFree && (!price || isNaN(Number(price)) || Number(price) < 0)) {
      addNotification("Please enter a valid price or mark as Free.");
      return;
    }

    if (images.length === 0) {
      addNotification("Please add at least one photo or video of your item.");
      return;
    }

    setIsSubmitting(true);
    const numericPrice = isFree ? 0 : Number(price);

    try {
      if (saveAsDefaultLocation && location.trim()) {
        localStorage.setItem("mesh_marketplace_default_location", location.trim());
      }

      if (initialItem) {
        await updateMarketplaceListing(initialItem.id, {
          title: title.trim(),
          price: numericPrice,
          category,
          condition,
          location: location.trim(),
          description: description.trim(),
          images,
        });
        addNotification("Listing updated successfully! 🚀");
      } else {
        await createMarketplaceListing({
          title: title.trim(),
          price: numericPrice,
          category,
          condition,
          location: location.trim(),
          description: description.trim(),
          images,
        });
      }
      handleBack();
    } catch (err) {
      console.error("Failed to save listing:", err);
      // Even if background network encountered an issue, close modal as listing is saved in local state
      handleBack();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-create-listing-page="true"
      className={clsx(
        "absolute inset-0 z-40 h-full w-full bg-white dark:bg-zinc-950 flex flex-col overflow-hidden",
        isClosing ? "animate-slide-out-to-right-edge" : "animate-slide-in-from-right-edge"
      )}
    >
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 px-3 md:px-6 py-3.5 flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
          <button
            type="button"
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer shrink-0"
            title="Back"
          >
            <ArrowLeft size={24} className="text-[var(--primary)]" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 truncate leading-tight">
              <Sparkles size={18} className="text-[var(--primary)] shrink-0" />
              <span className="truncate">{initialItem ? "Edit Listing" : "List an Item for Sale"}</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
              Reach local buyers instantly on Isoko
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleBack}
          className="w-9 h-9 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer shrink-0"
          title="Close"
        >
          <X size={18} />
        </button>
      </header>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar overscroll-contain">
        <div className="max-w-2xl mx-auto w-full p-4 sm:p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 pb-12 sm:pb-8">
          {/* Photo & Video Uploader */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
              Photos & Videos ({images.length}/8) <span className="text-red-500">*</span>
            </label>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400 mb-2.5">
              Select photos and video clips in one go. First item serves as your listing cover.
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {images.map((img, idx) => {
                const isVideo = img.startsWith("data:video") || /\.(mp4|mov|webm|m4v|3gp)/i.test(img);
                return (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-700 group bg-zinc-950 select-none"
                  >
                    {isVideo ? (
                      <video
                        src={img}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        autoPlay
                        loop
                      />
                    ) : (
                      <img src={img} alt="preview" className="w-full h-full object-cover" />
                    )}

                    {isVideo && (
                      <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center backdrop-blur-xs">
                        <Play size={10} fill="currentColor" />
                      </div>
                    )}

                    {idx === 0 && (
                      <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold bg-black/75 text-white px-2 py-0.5 rounded-md backdrop-blur-xs">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}

              {isProcessingPhotos && (
                <div className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 dark:border-zinc-700 flex flex-col items-center justify-center gap-1.5 bg-gray-50/50 dark:bg-zinc-850/40">
                  <Loader2 size={22} className="animate-spin text-[var(--primary)]" />
                  <span className="text-[10px] font-bold text-gray-500">Processing...</span>
                </div>
              )}

              {!isProcessingPhotos && images.length < 8 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 dark:border-zinc-700 hover:border-[var(--primary)] text-gray-500 dark:text-zinc-400 hover:text-[var(--primary)] flex flex-col items-center justify-center gap-1 transition-colors bg-gray-50/50 dark:bg-zinc-850/40 cursor-pointer p-2 text-center"
                >
                  <div className="flex items-center gap-1 text-[var(--primary)]">
                    <Camera size={18} />
                    <Film size={18} />
                  </div>
                  <span className="text-[11px] font-bold">Add Media</span>
                  <span className="text-[9px] text-gray-400 dark:text-zinc-500">Photo / Video</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaUpload}
              className="hidden"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              Item Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., iPhone 15 Pro Max 256GB, Velvet Green Armchair"
              className="w-full bg-gray-50 dark:bg-zinc-800/80 text-gray-900 dark:text-white px-4 py-3 rounded-2xl border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[var(--primary)] outline-none text-sm"
            />
          </div>

          {/* Price & Free Toggle */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                Price (USD) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsFree(!isFree);
                  if (!isFree) setPrice("0");
                }}
                className={clsx(
                  "text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                  isFree
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200"
                )}
              >
                {isFree ? "✓ Marked as Free" : "Give away for Free"}
              </button>
            </div>

            {!isFree && (
              <div className="relative">
                <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-gray-50 dark:bg-zinc-800/80 text-gray-900 dark:text-white pl-10 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[var(--primary)] outline-none text-sm font-semibold"
                />
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-gray-50 dark:bg-zinc-800/80 text-gray-900 dark:text-white px-4 py-3 rounded-2xl border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[var(--primary)] outline-none text-sm cursor-pointer"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              Condition <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {CONDITIONS.map((c) => (
                <button
                  type="button"
                  key={c.label}
                  onClick={() => setCondition(c.label)}
                  className={clsx(
                    "p-3 rounded-2xl text-left border transition-all cursor-pointer",
                    condition === c.label
                      ? "border-[var(--primary)] bg-blue-50/60 dark:bg-blue-950/40 text-[var(--primary)]"
                      : "border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/40 text-gray-700 dark:text-zinc-300 hover:border-gray-300"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{c.label}</span>
                    {condition === c.label && <Check size={14} className="text-[var(--primary)]" />}
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                    {c.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                Location / City
              </label>
              {savedDefaultLocation && savedDefaultLocation === location.trim() && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  ✓ Saved Default Location
                </span>
              )}
            </div>
            <div className="relative">
              <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Austin, TX or Brooklyn, NY"
                className="w-full bg-gray-50 dark:bg-zinc-800/80 text-gray-900 dark:text-white pl-10 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[var(--primary)] outline-none text-sm"
              />
            </div>

            {/* Save as default location option */}
            <div className="flex items-center gap-2 mt-2 px-1">
              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveAsDefaultLocation}
                  onChange={(e) => setSaveAsDefaultLocation(e.target.checked)}
                  className="rounded border-gray-300 dark:border-zinc-700 text-[var(--primary)] focus:ring-[var(--primary)] w-4 h-4 cursor-pointer"
                />
                <span>Save as default location for my future listings</span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the condition, specifications, accessories included, pickup options, or why you're selling..."
              className="w-full bg-gray-50 dark:bg-zinc-800/80 text-gray-900 dark:text-white px-4 py-3 rounded-2xl border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[var(--primary)] outline-none text-sm resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2 pb-8 sm:pb-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-[var(--primary)] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <span>Publishing listing...</span>
              ) : (
                <>
                  <Tag size={16} />
                  <span>{initialItem ? "Save Changes" : "Publish to Marketplace"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  );
}
