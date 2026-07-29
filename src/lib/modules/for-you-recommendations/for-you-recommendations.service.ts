import type { ForYouTier } from "../recommender/for-you.cursor.js";
import { forYouRecommendationsCache } from "./for-you-recommendations.cache.js";
import {
  forYouRecommendationsRepository,
  forYouRetrievalRepository,
} from "./for-you-recommendations.repository.js";
import {
  buildForYouPersonalizedCandidates,
  type ScoredCandidate,
} from "./for-you.candidates.js";

const CANDIDATE_LIMIT = 200;

async function buildTierCandidatesFromDb(
  tier: ForYouTier,
  userId: string,
  sessionId: string,
): Promise<ScoredCandidate[]> {
  if (tier === "personalized") {
    return buildForYouPersonalizedCandidates(userId, sessionId);
  }

  if (tier === "exploration") {
    return forYouRetrievalRepository.listExploration(
      userId,
      sessionId,
      CANDIDATE_LIMIT,
    );
  }

  return forYouRetrievalRepository.listSeen(userId, CANDIDATE_LIMIT);
}

export const forYouRecommendationsService = {
  async resolveForYouSession(userId: string, sessionId?: string, refresh?: boolean) {
    if (refresh || !sessionId) {
      const [session] = await forYouRecommendationsRepository.createSession(userId);
      if (!session) throw new Error("failed to create feed session");
      return session;
    }

    const existing = await forYouRecommendationsRepository.findSession(sessionId, userId);
    if (existing) return existing;

    const [session] = await forYouRecommendationsRepository.createSession(userId);
    if (!session) throw new Error("failed to create feed session");
    return session;
  },

  async getTierCandidates(
    tier: ForYouTier,
    userId: string,
    sessionId: string,
  ): Promise<ScoredCandidate[]> {
    const cached = await forYouRecommendationsCache.getTierCandidates(sessionId, tier);
    if (cached) return cached;

    const candidates = await buildTierCandidatesFromDb(tier, userId, sessionId);
    await forYouRecommendationsCache.setTierCandidates(sessionId, tier, candidates);
    return candidates;
  },

  async recordImpressions(userId: string, postIds: string[]) {
    return forYouRecommendationsRepository.recordImpressions(userId, postIds);
  },

  async recordServed(sessionId: string, postIds: string[]) {
    await forYouRecommendationsRepository.recordServed(sessionId, postIds);
    await forYouRecommendationsCache.addServedPosts(sessionId, postIds);
  },

  /**
   * Counts personalized candidates not yet served in this session.
   * Used for the blue-dot refresh affordance.
   */
  async countRefreshableForYou(userId: string, sessionId: string) {
    const candidates = await this.getTierCandidates(
      "personalized",
      userId,
      sessionId,
    );

    let servedPostIds = await forYouRecommendationsCache.getServedPostIds(sessionId);
    if (!servedPostIds) {
      servedPostIds = await forYouRecommendationsRepository.listServedPostIds(sessionId);
      await forYouRecommendationsCache.addServedPosts(sessionId, servedPostIds);
    }

    return forYouRecommendationsCache.countUnserved(sessionId, candidates, servedPostIds);
  },
};
