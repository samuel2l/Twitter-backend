import {
  buildForYouPersonalizedCandidates,
} from "./for-you.candidates.js";
import { feedRepository } from "./feed.repository.js";

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

  recordImpressions(userId: string, postIds: string[]) {
    return feedRepository.recordImpressions(userId, postIds);
  },

  recordServed(sessionId: string, postIds: string[]) {
    return feedRepository.recordServed(sessionId, postIds);
  },

  /**
   * Re-runs retrieval and counts relevant posts the user has not been served
   * in this session yet. Used for the blue-dot refresh affordance.
   */
  async countRefreshableForYou(userId: string, sessionId: string) {
    const candidates = await buildForYouPersonalizedCandidates(userId, sessionId);
    return candidates.length;
  },
};
