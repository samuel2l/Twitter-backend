import { interestRepository } from "../recommender/interest.repository.js";
import { mergeInterestPools } from "../recommender/merger.js";
import { forYouRetrievalRepository } from "./for-you-recommendations.repository.js";

export const FOR_YOU_WINDOW_HOURS = 72;
export const POOL_SIZE_PER_INTEREST = 50;
export const CANDIDATE_LIMIT = 200;

export type ScoredCandidate = { id: string; score: number };

export async function buildForYouPersonalizedCandidates(
  userId: string,
  sessionId: string,
): Promise<ScoredCandidate[]> {
  const interests = await interestRepository.listActive(userId);

  if (interests.length > 0) {
    const pools = await Promise.all(
      interests.map(async (interest) => ({
        label: interest.label,
        weight: interest.weight,
        posts: await forYouRetrievalRepository.listPersonalizedForInterest(
          userId,
          sessionId,
          interest.label,
          interest.source,
          POOL_SIZE_PER_INTEREST,
        ),
      })),
    );

    return mergeInterestPools(pools, CANDIDATE_LIMIT);
  }

  return [];
}
