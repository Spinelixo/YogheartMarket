"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  X, 
  Star, 
  ThumbsUp, 
  CheckCircle2, 
  MessageSquarePlus, 
  ChevronRight, 
  Sparkles,
  Filter,
  UserCheck
} from "lucide-react";
import { clsx } from "clsx";
import { User, MarketplaceItem } from "@/context/MockContext";
import { useModalHistory } from "@/hooks/useModalHistory";

export interface StoreReview {
  id: string;
  sellerId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar?: string | null;
  rating: number; // 1 to 5
  comment: string;
  itemTitle?: string;
  date: string;
  verifiedPurchase?: boolean;
  helpfulCount?: number;
}

const DEFAULT_SELLER_REVIEWS: Record<string, StoreReview[]> = {
  default: [
    {
      id: "rev-1",
      sellerId: "default",
      reviewerId: "rev-user-1",
      reviewerName: "Sophie Martin",
      reviewerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      rating: 5,
      comment: "Super smooth transaction! The item was in pristine condition, exactly as pictured. Fast communication and very polite seller.",
      itemTitle: "Home appliances & kitchen set",
      date: "2 days ago",
      verifiedPurchase: true,
      helpfulCount: 4
    },
    {
      id: "rev-2",
      sellerId: "default",
      reviewerId: "rev-user-2",
      reviewerName: "David Tremblay",
      reviewerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      rating: 5,
      comment: "Great experience buying from Lionel. Punctual for pickup and gave great tips on maintenance. 10/10 recommended seller in Montreal!",
      itemTitle: "Heavy-Duty Moving Boxes",
      date: "1 week ago",
      verifiedPurchase: true,
      helpfulCount: 2
    },
    {
      id: "rev-3",
      sellerId: "default",
      reviewerId: "rev-user-3",
      reviewerName: "Amélie Côté",
      reviewerAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
      rating: 5,
      comment: "Very friendly and prompt replies. The culinary dishes were fresh, delicious and beautifully packed.",
      itemTitle: "Spaghetti Bolognese gourmet dish",
      date: "2 weeks ago",
      verifiedPurchase: true,
      helpfulCount: 6
    },
    {
      id: "rev-4",
      sellerId: "default",
      reviewerId: "rev-user-4",
      reviewerName: "Alexandre Roy",
      reviewerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
      rating: 4,
      comment: "Good seller, item worked well. Took slightly longer for pickup scheduling but otherwise very honest and transparent.",
      itemTitle: "Acoustic Guitar",
      date: "3 weeks ago",
      verifiedPurchase: true,
      helpfulCount: 1
    }
  ]
};

const DEFAULT_DRIVER_REVIEWS: StoreReview[] = [
  {
    id: "drv-rev-1",
    sellerId: "default",
    reviewerId: "rev-user-1",
    reviewerName: "Sophie Martin",
    reviewerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    rating: 5,
    comment: "Super smooth and safe ride! Sarah was very punctual, car was pristine clean and comfortable. Great conversation and driving, 10/10 recommended driver!",
    itemTitle: "Montreal ➔ Boston",
    date: "2 days ago",
    verifiedPurchase: true,
    helpfulCount: 4
  },
  {
    id: "drv-rev-2",
    sellerId: "default",
    reviewerId: "rev-user-2",
    reviewerName: "David Tremblay",
    reviewerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    rating: 5,
    comment: "Excellent carpool experience with Sarah. Smooth driving on highway, plenty of luggage space and punctual departure. Would definitely ride again!",
    itemTitle: "Montreal ➔ Toronto",
    date: "1 week ago",
    verifiedPurchase: true,
    helpfulCount: 2
  },
  {
    id: "drv-rev-3",
    sellerId: "default",
    reviewerId: "rev-user-3",
    reviewerName: "Amélie Côté",
    reviewerAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
    rating: 5,
    comment: "Very friendly driver and comfortable ride. Felt super safe throughout the trip and arrived right on schedule!",
    itemTitle: "Montreal ➔ Boston",
    date: "2 weeks ago",
    verifiedPurchase: true,
    helpfulCount: 6
  },
  {
    id: "drv-rev-4",
    sellerId: "default",
    reviewerId: "rev-user-4",
    reviewerName: "Alexandre Roy",
    reviewerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    rating: 4,
    comment: "Great driver, clean car, good music and pleasant trip. Highly recommend Sarah for intercity rides!",
    itemTitle: "Montreal ➔ Ottawa",
    date: "3 weeks ago",
    verifiedPurchase: true,
    helpfulCount: 1
  }
];

interface StoreReviewsModalProps {
  sellerUser: User;
  sellerName?: string;
  sellerListings?: MarketplaceItem[];
  currentUser: User | null;
  isDriver?: boolean;
  onClose: () => void;
  isClosing?: boolean;
}

export function StoreReviewsModal({
  sellerUser,
  sellerName,
  sellerListings = [],
  currentUser,
  isDriver = false,
  onClose,
  isClosing: externalIsClosing = false
}: StoreReviewsModalProps) {
  const sellerKey = (isDriver ? "driver_" : "") + (sellerUser?.id || sellerName || "default");
  const displayName = sellerUser?.marketplaceStore?.storeName || sellerUser?.name || sellerName || (isDriver ? "Driver" : "Seller");

  const isClosing = externalIsClosing;

  const handleClose = () => {
    if (isClosing) return;
    onClose();
  };

  const [reviews, setReviews] = useState<StoreReview[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`mesh_store_reviews_${sellerKey}`);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn("Failed to load store reviews from storage:", e);
      }
    }
    if (isDriver) {
      return DEFAULT_DRIVER_REVIEWS;
    }
    return DEFAULT_SELLER_REVIEWS[sellerKey] || DEFAULT_SELLER_REVIEWS.default;
  });

  // Filter state
  const [selectedFilter, setSelectedFilter] = useState<number | "all">("all");
  const [isWritingReview, setIsWritingReview] = useState(false);

  // Form State
  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [selectedItemTitle, setSelectedItemTitle] = useState(
    isDriver ? "Montreal ➔ Boston" : (sellerListings[0]?.title || "")
  );
  const [helpfulVotedIds, setHelpfulVotedIds] = useState<Set<string>>(new Set());

  // Save changes
  const saveReviews = (updated: StoreReview[]) => {
    setReviews(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`mesh_store_reviews_${sellerKey}`, JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to save store reviews:", e);
      }
    }
  };

  // Compute Statistics
  const stats = useMemo(() => {
    if (reviews.length === 0) return { avg: 5.0, count: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avg = Number((total / reviews.length).toFixed(1));
    const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      if (breakdown[r.rating] !== undefined) {
        breakdown[r.rating]++;
      }
    });
    return { avg, count: reviews.length, breakdown };
  }, [reviews]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    if (selectedFilter === "all") return reviews;
    return reviews.filter(r => r.rating === selectedFilter);
  }, [reviews, selectedFilter]);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const newRev: StoreReview = {
      id: `rev-${Date.now()}`,
      sellerId: sellerUser?.id || "unknown",
      reviewerId: currentUser?.id || "me",
      reviewerName: currentUser?.name || "Verified Buyer",
      reviewerAvatar: currentUser?.avatar || null,
      rating: newRating,
      comment: newComment.trim(),
      itemTitle: selectedItemTitle || undefined,
      date: "Just now",
      verifiedPurchase: true,
      helpfulCount: 0
    };

    const updated = [newRev, ...reviews];
    saveReviews(updated);
    setNewComment("");
    setIsWritingReview(false);
  };

  const handleHelpfulVote = (id: string) => {
    if (helpfulVotedIds.has(id)) return;
    setHelpfulVotedIds(prev => new Set(prev).add(id));
    const updated = reviews.map(r => {
      if (r.id === id) {
        return { ...r, helpfulCount: (r.helpfulCount || 0) + 1 };
      }
      return r;
    });
    saveReviews(updated);
  };

  return (
    <div 
      className="absolute inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-transparent select-none pointer-events-auto"
      onClick={handleClose}
    >
      <div 
        className={clsx(
          "w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-xl bg-white dark:bg-zinc-900 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-zinc-800 antialiased subpixel-antialiased text-gray-900 dark:text-zinc-100",
          isClosing ? "animate-slide-out-to-right-edge" : "animate-fade-in"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 shrink-0">
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
              <span>Ratings & Reviews</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/50">
                ★ {stats.avg}
              </span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              {isDriver ? `Verified rider & passenger feedback for ${displayName}` : `Verified buyer feedback for ${displayName}`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
          {/* Summary Breakdown Card */}
          <div className="bg-gray-50 dark:bg-zinc-800/60 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-zinc-800">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Score Left */}
              <div className="flex flex-col items-center justify-center shrink-0 sm:pr-4 sm:border-r border-gray-200 dark:border-zinc-700">
                <span className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                  {stats.avg}
                </span>
                <div className="flex items-center gap-0.5 my-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={16}
                      className={clsx(
                        star <= Math.round(stats.avg)
                          ? "fill-amber-400 text-amber-400"
                          : "fill-gray-200 dark:fill-zinc-700 text-gray-200 dark:text-zinc-700"
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                  {stats.count} verified {stats.count === 1 ? "review" : "reviews"}
                </span>
              </div>

              {/* Progress Bars Right */}
              <div className="flex-1 w-full space-y-1.5">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = stats.breakdown[stars] || 0;
                  const pct = stats.count > 0 ? (count / stats.count) * 100 : 0;
                  return (
                    <div 
                      key={stars} 
                      onClick={() => setSelectedFilter(selectedFilter === stars ? "all" : stars)}
                      className="flex items-center gap-2 text-xs cursor-pointer group"
                    >
                      <span className="w-6 font-bold text-gray-600 dark:text-zinc-400 text-right group-hover:text-amber-500 transition-colors">
                        {stars}★
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-7 text-[11px] font-medium text-gray-400 dark:text-zinc-500 text-right">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Write a Review Button */}
            {!isWritingReview && (
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-zinc-700 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsWritingReview(true)}
                  className={clsx(
                    "w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all cursor-pointer",
                    isDriver
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                      : "bg-[var(--primary)] hover:bg-blue-600 shadow-blue-500/20"
                  )}
                >
                  <MessageSquarePlus size={15} />
                  <span>{isDriver ? "Rate & Review Driver" : "Rate & Review Seller"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Write a Review Form */}
          {isWritingReview && (
            <form onSubmit={handleSubmitReview} className={clsx(
              "rounded-2xl p-4 sm:p-5 border space-y-4 animate-fade-in",
              isDriver
                ? "bg-emerald-50/70 dark:bg-zinc-800/80 border-emerald-100 dark:border-zinc-700"
                : "bg-blue-50/70 dark:bg-zinc-800/80 border-blue-100 dark:border-zinc-700"
            )}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles size={15} className={isDriver ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"} />
                  <span>{isDriver ? "Write Your Driver Review" : "Write Your Review"}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsWritingReview(false)}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300"
                >
                  Cancel
                </button>
              </div>

              {/* Star Rating Picker */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block">
                  Overall Rating
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hoverRating || newRating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 text-gray-300 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          size={24}
                          className={clsx(
                            active ? "fill-amber-400 text-amber-400" : "fill-transparent text-gray-300 dark:text-zinc-600"
                          )}
                        />
                      </button>
                    );
                  })}
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 ml-2">
                    {newRating === 5 ? "Excellent (5.0)" : newRating === 4 ? "Very Good (4.0)" : newRating === 3 ? "Average (3.0)" : newRating === 2 ? "Below Average (2.0)" : "Poor (1.0)"}
                  </span>
                </div>
              </div>

              {/* Trip / Item Selector */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block">
                  {isDriver ? "Trip Route (Optional)" : "Listing Purchased (Optional)"}
                </label>
                {isDriver ? (
                  <input
                    type="text"
                    value={selectedItemTitle}
                    onChange={(e) => setSelectedItemTitle(e.target.value)}
                    placeholder="e.g. Montreal ➔ Boston"
                    className="w-full text-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                ) : sellerListings.length > 0 ? (
                  <select
                    value={selectedItemTitle}
                    onChange={(e) => setSelectedItemTitle(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                  >
                    <option value="">General seller interaction / No specific item</option>
                    {sellerListings.map(item => (
                      <option key={item.id} value={item.title}>
                        {item.title} (${item.price === 0 ? "FREE" : item.price.toLocaleString()})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={selectedItemTitle}
                    onChange={(e) => setSelectedItemTitle(e.target.value)}
                    placeholder="Item or service name..."
                    className="w-full text-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                  />
                )}
              </div>

              {/* Comment Text Area */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block">
                  Your Review & Experience
                </label>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={
                    isDriver
                      ? "Share details about ride punctuality, driving safety, vehicle cleanliness, and overall carpool experience..."
                      : "Share details about the seller's communication, pickup/delivery, and item condition..."
                  }
                  rows={3}
                  className={clsx(
                    "w-full text-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 text-gray-900 dark:text-white outline-none resize-none",
                    isDriver ? "focus:border-emerald-500" : "focus:border-blue-500"
                  )}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className={clsx(
                    "px-5 py-2.5 rounded-xl disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all cursor-pointer",
                    isDriver
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                      : "bg-[var(--primary)] hover:bg-blue-600 shadow-blue-500/20"
                  )}
                >
                  Submit Review
                </button>
              </div>
            </form>
          )}

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedFilter("all")}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer",
                selectedFilter === "all"
                  ? "bg-gray-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-gray-200"
              )}
            >
              All ({reviews.length})
            </button>
            {[5, 4, 3, 2, 1].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setSelectedFilter(selectedFilter === star ? "all" : star)}
                className={clsx(
                  "px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer",
                  selectedFilter === star
                    ? "bg-amber-500 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-gray-200"
                )}
              >
                <Star size={11} className={selectedFilter === star ? "fill-white" : "fill-amber-500 text-amber-500"} />
                <span>{star} Stars ({stats.breakdown[star] || 0})</span>
              </button>
            ))}
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            {filteredReviews.length === 0 ? (
              <div className="text-center py-10 text-gray-400 dark:text-zinc-500 text-xs">
                No reviews found for this rating filter.
              </div>
            ) : (
              filteredReviews.map((rev) => (
                <div 
                  key={rev.id}
                  className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 rounded-2xl p-4 space-y-2.5 shadow-xs"
                >
                  {/* Top: Avatar, Name, Rating, Date */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0">
                        {rev.reviewerAvatar ? (
                          <img src={rev.reviewerAvatar} alt={rev.reviewerName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-xs text-gray-600 dark:text-zinc-300">
                            {rev.reviewerName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-gray-900 dark:text-white truncate">
                            {rev.reviewerName}
                          </span>
                          {rev.verifiedPurchase && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 size={11} />
                              <span>{isDriver ? "Verified Rider" : "Verified Buyer"}</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 dark:text-zinc-500 block">
                          {rev.date}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={13}
                          className={clsx(
                            star <= rev.rating
                              ? "fill-amber-400 text-amber-400"
                              : "fill-gray-200 dark:fill-zinc-700 text-gray-200 dark:text-zinc-700"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Purchased item / Trip tag */}
                  {rev.itemTitle && (
                    <div className="inline-block text-[10px] font-semibold bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 px-2 py-0.5 rounded-md border border-gray-200/50 dark:border-zinc-700/50">
                      {isDriver ? "Trip: " : "Item: "}{rev.itemTitle}
                    </div>
                  )}

                  {/* Comment */}
                  <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed">
                    {rev.comment}
                  </p>

                  {/* Helpful Button */}
                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleHelpfulVote(rev.id)}
                      className={clsx(
                        "flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                        helpfulVotedIds.has(rev.id)
                          ? (isDriver ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400" : "bg-blue-50 dark:bg-blue-950/50 text-[var(--primary)]")
                          : "text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      )}
                    >
                      <ThumbsUp size={12} className={helpfulVotedIds.has(rev.id) ? (isDriver ? "fill-emerald-600 text-emerald-600" : "fill-[var(--primary)] text-[var(--primary)]") : ""} />
                      <span>Helpful ({rev.helpfulCount || 0})</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
