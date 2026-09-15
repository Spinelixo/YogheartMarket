/**
 * Yogheart Recommendation Engine - Backend Pipeline & Database Schema
 * 
 * 1. Database Schema & Storage (Firestore / PostgreSQL)
 * 2. Elo Rating Update on Swipes (Two-Sided Attractiveness)
 * 3. Text Embedding Generation Pipeline (OpenAI text-embedding-3-small or Vertex AI Gecko)
 * 4. Hard Filter Candidate Retrieval Query
 */

export interface UserMatchProfileDoc {
  userId: string;
  gender: string;
  showMe: string;
  age: number;
  latitude: number;
  longitude: number;
  
  // Scoring Fields
  eloRating: number;            // Initial 1500, K-factor 32
  desirabilityScore: number;    // Normalized [0, 1]
  swipeImpressionsCount: number;// Swipes received
  likesReceivedCount: number;   // Right swipes received
  replyRate: number;            // Message response rate
  lastActive: Date;
  registeredAt: Date;
  
  // Vector Embedding
  embeddingVector: number[];    // 768 or 1536 dimensional embedding
  profileTextSummary: string;   // Concatenated bio + prompts + interests for embedding
}

/**
 * 1. Elo Rating Update Formula
 * When User A swipes Right on User B: B wins, A's expectation depends on rating diff.
 * When User A swipes Left on User B: B loses, A's rating remains largely unaffected or minor adjustment.
 */
export function updateEloScores(
  swipingUserElo: number,
  candidateUserElo: number,
  isLike: boolean,
  kFactor: number = 32
): { newSwipingElo: number; newCandidateElo: number } {
  // Expected probability that candidate receives a like from swiping user
  const expectedCandidateScore = 1 / (1 + Math.pow(10, (swipingUserElo - candidateUserElo) / 400));
  const actualScore = isLike ? 1 : 0;

  // Update candidate's desirability score
  const newCandidateElo = Math.round(candidateUserElo + kFactor * (actualScore - expectedCandidateScore));
  
  // Swiping user's rating is minimally affected by swiping, but can adjust slightly for selectivity
  const expectedSwipingScore = 1 - expectedCandidateScore;
  const newSwipingElo = Math.round(swipingUserElo + (kFactor / 4) * ((1 - actualScore) - expectedSwipingScore));

  return { newSwipingElo, newCandidateElo };
}

/**
 * 2. Concatenates rich profile text for embedding generation
 */
export function buildProfileEmbeddingText(profile: {
  bio?: string;
  interests?: string[];
  jobTitle?: string;
  company?: string;
  education?: string;
  relationshipGoal?: string;
  drinking?: string;
  smoking?: string;
}): string {
  const parts = [
    profile.bio ? `Bio: ${profile.bio}` : "",
    profile.interests?.length ? `Interests: ${profile.interests.join(", ")}` : "",
    profile.relationshipGoal ? `Looking for: ${profile.relationshipGoal}` : "",
    profile.jobTitle ? `Work: ${profile.jobTitle} ${profile.company || ""}` : "",
    profile.education ? `Education: ${profile.education}` : "",
    profile.drinking ? `Drinking: ${profile.drinking}` : "",
    profile.smoking ? `Smoking: ${profile.smoking}` : "",
  ].filter(Boolean);

  return parts.join("\n");
}
