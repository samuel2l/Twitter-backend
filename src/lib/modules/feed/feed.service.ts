import type { ForYouTier } from "../recommender/for-you.cursor.js";
import { feedCache } from "./feed.cache.js";
import {
  buildForYouPersonalizedCandidates,
  type ScoredCandidate,
} from "./for-you.candidates.js";
import { feedRepository, retrievalRepository } from "./feed.repository.js";

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
    return retrievalRepository.listExploration(
      userId,
      sessionId,
      CANDIDATE_LIMIT,
    );
  }

  return retrievalRepository.listSeen(userId, CANDIDATE_LIMIT);
}

export const feedService = {
  async resolveForYouSession(userId: string, sessionId?: string, refresh?: boolean) {
    if (refresh || !sessionId) {
      const [session] = await feedRepository.createSession(userId);
      if (!session) throw new Error("failed to create feed session");
      return session;
    }

    const existing = await feedRepository.findSession(sessionId, userId);
    if (existing) return existing;

    const [session] = await feedRepository.createSession(userId);
    if (!session) throw new Error("failed to create feed session");
    return session;
  },

  async getTierCandidates(
    tier: ForYouTier,
    userId: string,
    sessionId: string,
  ): Promise<ScoredCandidate[]> {
    const cached = await feedCache.getTierCandidates(sessionId, tier);
    if (cached) return cached;

    const candidates = await buildTierCandidatesFromDb(tier, userId, sessionId);
    await feedCache.setTierCandidates(sessionId, tier, candidates);
    return candidates;
  },

  async recordImpressions(userId: string, postIds: string[]) {
    return feedRepository.recordImpressions(userId, postIds);
  },

  async recordServed(sessionId: string, postIds: string[]) {
    await feedRepository.recordServed(sessionId, postIds);
    await feedCache.addServedPosts(sessionId, postIds);
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

    let servedPostIds = await feedCache.getServedPostIds(sessionId);
    if (!servedPostIds) {
      servedPostIds = await feedRepository.listServedPostIds(sessionId);
      await feedCache.hydrateServedPosts(sessionId, servedPostIds);
    }

    return feedCache.countUnserved(sessionId, candidates, servedPostIds);
  },
};
