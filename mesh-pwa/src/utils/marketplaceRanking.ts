import { MarketplaceItem } from "@/context/MockContext";
import {
  calculateHaversineKm,
  resolveCoordinates,
  geohashQueryBounds,
  encodeGeohash,
} from "./geoHashUtils";

// ─────────────────────────────────────────────────────────────
// 1. RECENT CATEGORIES / USER RELEVANCE TRACKER
// ─────────────────────────────────────────────────────────────
const RECENT_CATEGORIES_KEY = "yogheart_recent_categories";

export function trackUserViewedCategory(category?: string) {
  if (!category || typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(RECENT_CATEGORIES_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    // Keep most recent first, limit to 15 entries
    const updated = [category, ...list.filter((c) => c !== category)].slice(0, 15);
    localStorage.setItem(RECENT_CATEGORIES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Error saving recent category:", err);
  }
}

export function getUserRecentCategories(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_CATEGORIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// 2. CANDIDATE GENERATION HELPER (FIRESTORE GEO-QUERIES)
// ─────────────────────────────────────────────────────────────
/**
 * Helper demonstrating how Firestore geohash range queries are structured
 * to fetch candidate documents within a radius bounding box (e.g., 25km).
 *
 * Usage in Firestore Cloud Function / API:
 *   const bounds = getFirestoreGeoQueryBounds([userLat, userLng], 25);
 *   const queries = bounds.map(b =>
 *     query(collection(db, 'items'),
 *       where('geohash', '>=', b[0]),
 *       where('geohash', '<=', b[1]),
 *       limit(100)
 *     )
 *   );
 *   const snapshots = await Promise.all(queries.map(q => getDocs(q)));
 */
export function getFirestoreGeoQueryBounds(
  centerCoords: [number, number],
  radiusKm: number = 25
): [string, string][] {
  return geohashQueryBounds(centerCoords, radiusKm);
}

/**
 * Filter items in-memory or from cached Firestore batch by radius bounding box
 */
export function filterCandidatesByGeoRadius(
  items: MarketplaceItem[],
  userLocation?: string,
  userCoords?: { lat?: number; lng?: number },
  radiusKm: number = 50
): MarketplaceItem[] {
  const center = resolveCoordinates(userLocation, userCoords);

  return items.filter((item) => {
    const itemCoords = resolveCoordinates(
      item.location,
      (item as any).coords || (item as any).coordinates
    );
    const dist = calculateHaversineKm(
      center.lat,
      center.lng,
      itemCoords.lat,
      itemCoords.lng
    );
    return dist <= radiusKm;
  });
}

// ─────────────────────────────────────────────────────────────
// 3. MULTI-FACTOR SCORING FUNCTION
// ─────────────────────────────────────────────────────────────
export interface ItemScoreBreakdown {
  proximityScore: number;
  freshnessScore: number;
  relevanceScore: number;
  finalScore: number;
  distanceKm: number;
}

/**
 * Lightweight scoring function ranking candidates across:
 * 1. Proximity (Inverse distance decay)
 * 2. Freshness (Exponential decay based on timestamp)
 * 3. Relevance (Category affinity from recent views)
 */
export function scoreMarketplaceItem(
  item: MarketplaceItem,
  userCenter: { lat: number; lng: number },
  recentCategories: string[] = []
): ItemScoreBreakdown {
  // A. Proximity Score (0.0 to 1.0)
  const itemCoords = resolveCoordinates(
    item.location,
    (item as any).coords || (item as any).coordinates
  );
  const distanceKm = calculateHaversineKm(
    userCenter.lat,
    userCenter.lng,
    itemCoords.lat,
    itemCoords.lng
  );
  // Half-score distance at 15km
  const proximityScore = 1 / (1 + distanceKm / 15);

  // B. Freshness Score (0.0 to 1.0)
  const createdAtMs = new Date(item.createdAt || Date.now()).getTime();
  const ageHours = Math.max(0, (Date.now() - createdAtMs) / (1000 * 60 * 60));
  // 72 hour exponential half-life
  const freshnessScore = Math.exp(-ageHours / 72);

  // C. Relevance Score (0.0 to 1.0)
  let relevanceScore = 0.0;
  if (item.category && recentCategories.length > 0) {
    const matchIndex = recentCategories.findIndex(
      (c) => c.toLowerCase() === item.category?.toLowerCase()
    );
    if (matchIndex === 0) {
      relevanceScore = 1.0; // Most recently viewed category
    } else if (matchIndex > 0) {
      // Decays with position in recent category history
      relevanceScore = Math.max(0.3, 0.9 - matchIndex * 0.15);
    }
  }

  // Final Weighted Composite Score:
  // 45% Proximity + 35% Freshness + 20% Relevance
  const finalScore =
    0.45 * proximityScore + 0.35 * freshnessScore + 0.2 * relevanceScore;

  return {
    proximityScore,
    freshnessScore,
    relevanceScore,
    finalScore,
    distanceKm,
  };
}

// ─────────────────────────────────────────────────────────────
// 4. RE-RANKING & FEED DIVERSITY PASS
// ─────────────────────────────────────────────────────────────
export interface RankingOptions {
  userLocation?: string;
  userCoords?: { lat?: number; lng?: number };
  maxConsecutiveSameCategory?: number; // default: 3
  includeSold?: boolean; // default: false
  selectedCategories?: string[];
  maxRadiusKm?: number;
}

/**
 * Complete Recommendation Pipeline:
 * 1. Filter out invalid items (sold / flagged unless explicitly requested)
 * 2. Calculate multi-factor scores
 * 3. Sort candidates descending by score
 * 4. Apply Feed Diversity re-ranking (preventing >3 consecutive items from the same category)
 */
export function rankAndDiversifyFeed(
  items: MarketplaceItem[],
  options: RankingOptions = {}
): MarketplaceItem[] {
  const {
    userLocation,
    userCoords,
    maxConsecutiveSameCategory = 3,
    includeSold = false,
    selectedCategories = [],
    maxRadiusKm,
  } = options;

  const userCenter = resolveCoordinates(userLocation, userCoords);
  const recentCategories = getUserRecentCategories();

  // Step 1: Filter invalid items
  let candidates = items.filter((item) => {
    // Hide sold items in discovery feed unless requested
    if (!includeSold && item.status === "sold") return false;

    // Filter by category if user explicitly selected category filters
    if (selectedCategories.length > 0) {
      const match = selectedCategories.some(
        (cat) => cat.toLowerCase() === item.category?.toLowerCase()
      );
      if (!match) return false;
    }

    // Radius filter if specified
    if (typeof maxRadiusKm === "number" && maxRadiusKm > 0) {
      const itemCoords = resolveCoordinates(
        item.location,
        (item as any).coords || (item as any).coordinates
      );
      const dist = calculateHaversineKm(
        userCenter.lat,
        userCenter.lng,
        itemCoords.lat,
        itemCoords.lng
      );
      if (dist > maxRadiusKm) return false;
    }

    return true;
  });

  // Step 2: Score candidates
  const scoredCandidates = candidates.map((item) => {
    const scoreInfo = scoreMarketplaceItem(item, userCenter, recentCategories);
    return { item, scoreInfo };
  });

  // Step 3: Sort by finalScore descending
  scoredCandidates.sort(
    (a, b) => b.scoreInfo.finalScore - a.scoreInfo.finalScore
  );

  // Step 4: Re-ranking & Diversity Pass
  // Prevent more than `maxConsecutiveSameCategory` (e.g. 3) items from the exact same category
  const diversified: MarketplaceItem[] = [];
  const pool = [...scoredCandidates];

  while (pool.length > 0) {
    let foundIndex = -1;

    // Check if the last N items have the same category
    if (diversified.length >= maxConsecutiveSameCategory) {
      const lastN = diversified.slice(-maxConsecutiveSameCategory);
      const lastCategory = lastN[0].category?.toLowerCase();
      const allSame =
        lastCategory &&
        lastN.every(
          (it) => it.category?.toLowerCase() === lastCategory
        );

      if (allSame) {
        // Need an item with a different category to break repetition
        foundIndex = pool.findIndex(
          (candidate) =>
            candidate.item.category?.toLowerCase() !== lastCategory
        );
      }
    }

    // Default to the highest ranked item in the pool
    if (foundIndex === -1) {
      foundIndex = 0;
    }

    const [chosen] = pool.splice(foundIndex, 1);
    diversified.push(chosen.item);
  }

  return diversified;
}
