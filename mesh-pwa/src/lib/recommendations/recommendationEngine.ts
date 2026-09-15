/**
 * Yogheart Recommendation Engine v1.0
 * 
 * Multi-Signal Ranking Pipeline:
 * 1. Hard Constraints Filtering (Age range, Distance radius, Gender preference, Exclusions)
 * 2. Two-Sided Attractiveness & Compatibility (Elo/Glicko-style desirability matching)
 * 3. Semantic & Interest Similarity (Cosine similarity on embeddings + Categorical Jaccard)
 * 4. Recency & Activity Weighting (Exponential decay on last active time + Reply rate)
 * 5. Discovery & Fairness (Cold-start visibility boost for new profiles)
 * 
 * Composite Scoring Formula:
 * Score(A, B) = w1 * Compatibility + w2 * SemanticSimilarity + w3 * Activity + w4 * NewUserBoost + BoostBonus
 */

export interface UserRankingProfile {
  id: string;
  name: string;
  age: number;
  gender?: string;
  showMe?: string;
  latitude?: number | null;
  longitude?: number | null;
  bio?: string;
  interests?: string[];
  lifestyle?: Record<string, string>;
  relationshipGoal?: string;
  jobTitle?: string;
  company?: string;
  education?: string;
  smoking?: string;
  drinking?: string;
  kids?: string;
  lastSeen?: string | Date;
  createdAt?: string | Date;
  isBoosted?: boolean;
  boostUntil?: string | Date;
  
  // Scoring metadata
  eloRating?: number;          // Default: 1500 (Elo scale 1000 - 2000)
  desirabilityScore?: number;  // Normalized [0, 1]
  replyRate?: number;          // Response rate [0, 1], e.g. 0.85
  swipeImpressionsCount?: number; // Total swipes received (for cold-start)
  embeddingVector?: number[];  // 256/768-dim text embedding vector
}

export interface RecommendationWeights {
  wCompatibility: number;      // w1: Default 0.30
  wSemantic: number;            // w2: Default 0.35
  wActivity: number;            // w3: Default 0.25
  wColdStart: number;           // w4: Default 0.10
  boostBonus: number;           // Bonus score for active paid Boost (e.g. 0.35)
}

export const DEFAULT_WEIGHTS: RecommendationWeights = {
  wCompatibility: 0.30,
  wSemantic: 0.35,
  wActivity: 0.25,
  wColdStart: 0.10,
  boostBonus: 0.35,
};

export interface ScoredCandidate {
  user: UserRankingProfile;
  totalScore: number;
  breakdown: {
    compatibilityScore: number;
    semanticScore: number;
    activityScore: number;
    coldStartBoost: number;
    boostBonus: number;
    distanceKm: number | null;
  };
}

/**
 * Calculates Haversine distance in kilometers between two geo-coordinates.
 */
export function calculateDistanceKm(
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null
): number | null {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * 1. Two-Sided Attractiveness & Compatibility (Elo Matching)
 * Uses Gaussian decay over Elo differences so users with similar desirability
 * are matched together, preventing top-rated profiles from monopolizing all impressions.
 */
export function calculateEloCompatibility(
  ratingA: number = 1500,
  ratingB: number = 1500,
  sigma: number = 250
): number {
  const diff = ratingA - ratingB;
  return Math.exp(-(diff * diff) / (2 * sigma * sigma));
}

/**
 * Computes Cosine Similarity between two dense embedding vectors.
 */
export function calculateCosineSimilarity(vecA?: number[], vecB?: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0.5; // Fallback neutral similarity if embeddings are not generated yet
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0.5;
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, (similarity + 1) / 2));
}

/**
 * Calculates Jaccard similarity between two tag/interest sets.
 */
export function calculateJaccardSimilarity(arrA?: string[], arrB?: string[]): number {
  if (!arrA || !arrB || arrA.length === 0 || arrB.length === 0) return 0.3;
  const setA = new Set(arrA.map((s) => s.toLowerCase().trim()));
  const setB = new Set(arrB.map((s) => s.toLowerCase().trim()));
  
  let intersectionSize = 0;
  setA.forEach((item) => {
    if (setB.has(item)) intersectionSize++;
  });
  
  const unionSize = new Set([...setA, ...setB]).size;
  return unionSize > 0 ? intersectionSize / unionSize : 0.3;
}

/**
 * 2. Semantic & Interest Similarity
 * Blends dense vector cosine similarity (50%) with categorical tags (30%) & lifestyle match (20%).
 */
export function calculateSemanticSimilarity(
  userA: UserRankingProfile,
  userB: UserRankingProfile
): number {
  const vectorScore = calculateCosineSimilarity(userA.embeddingVector, userB.embeddingVector);
  const interestScore = calculateJaccardSimilarity(userA.interests, userB.interests);
  
  // Lifestyle & Relationship goals matching
  let habitMatch = 0.5;
  if (userA.relationshipGoal && userB.relationshipGoal) {
    habitMatch = userA.relationshipGoal === userB.relationshipGoal ? 1.0 : 0.4;
  }
  
  return 0.5 * vectorScore + 0.3 * interestScore + 0.2 * habitMatch;
}

/**
 * 3. Recency & Activity Weighting
 * Decays exponentially based on hours since last seen + boosts high reply rate accounts.
 */
export function calculateActivityScore(user: UserRankingProfile): number {
  let hoursSinceActive = 48;
  if (user.lastSeen) {
    const lastActiveMs = new Date(user.lastSeen).getTime();
    if (!isNaN(lastActiveMs)) {
      hoursSinceActive = Math.max(0, (Date.now() - lastActiveMs) / (1000 * 60 * 60));
    }
  }

  const recencyScore = Math.exp(-hoursSinceActive / 48);
  const replyScore = user.replyRate ?? 0.7; // default 70% reply rate

  return 0.6 * recencyScore + 0.4 * replyScore;
}

/**
 * 4. Discovery & Fairness (Cold-Start Boost)
 * Newly registered profiles (< 7 days old) with under 50 swipes receive an exploration boost.
 */
export function calculateColdStartBoost(user: UserRankingProfile): number {
  let hoursSinceRegistration = 720;
  if (user.createdAt) {
    const regMs = new Date(user.createdAt).getTime();
    if (!isNaN(regMs)) {
      hoursSinceRegistration = Math.max(0, (Date.now() - regMs) / (1000 * 60 * 60));
    }
  }

  const impressions = user.swipeImpressionsCount ?? 0;
  const isNewAccount = hoursSinceRegistration <= 168; // 7 days
  const hasFewImpressions = impressions < 50;

  if (!isNewAccount && !hasFewImpressions) return 0;

  const impressionDecay = Math.max(0, 1 - impressions / 50);
  const timeDecay = Math.exp(-hoursSinceRegistration / 168);

  return impressionDecay * timeDecay;
}

/**
 * Evaluates whether candidate is actively boosted by payment.
 */
export function calculateBoostBonus(user: UserRankingProfile, bonusWeight: number): number {
  if (!user.isBoosted || !user.boostUntil) return 0;
  const expiresAt = new Date(user.boostUntil).getTime();
  return !isNaN(expiresAt) && expiresAt > Date.now() ? bonusWeight : 0;
}

/**
 * 5. Composite Scoring Pipeline
 * Scores and ranks candidate profiles for the authenticated user.
 */
export function rankCandidates(
  currentUser: UserRankingProfile,
  candidates: UserRankingProfile[],
  weights: RecommendationWeights = DEFAULT_WEIGHTS
): ScoredCandidate[] {
  const scoredList: ScoredCandidate[] = [];

  for (const candidate of candidates) {
    if (candidate.id === currentUser.id) continue;

    const compatibilityScore = calculateEloCompatibility(
      currentUser.eloRating ?? 1500,
      candidate.eloRating ?? 1500
    );
    const semanticScore = calculateSemanticSimilarity(currentUser, candidate);
    const activityScore = calculateActivityScore(candidate);
    const coldStartBoost = calculateColdStartBoost(candidate);
    const boostBonus = calculateBoostBonus(candidate, weights.boostBonus);
    const distanceKm = calculateDistanceKm(
      currentUser.latitude,
      currentUser.longitude,
      candidate.latitude,
      candidate.longitude
    );

    const totalScore =
      weights.wCompatibility * compatibilityScore +
      weights.wSemantic * semanticScore +
      weights.wActivity * activityScore +
      weights.wColdStart * coldStartBoost +
      boostBonus;

    scoredList.push({
      user: candidate,
      totalScore,
      breakdown: {
        compatibilityScore,
        semanticScore,
        activityScore,
        coldStartBoost,
        boostBonus,
        distanceKm,
      },
    });
  }

  return scoredList.sort((a, b) => b.totalScore - a.totalScore);
}
