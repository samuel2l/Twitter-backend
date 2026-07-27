import { interestRepository } from "../recommender/interest.repository.js";
import { mergeInterestPools } from "../recommender/merger.js";
import { recommenderRepository } from "../recommender/recommender.repository.js";
import { retrievalRepository } from "./feed.repository.js";

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
        posts: await retrievalRepository.listPersonalizedForInterest(
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

  const hasLegacyEmbedding = await recommenderRepository.hasUserEmbedding(userId);
  if (hasLegacyEmbedding) {
    return retrievalRepository.listLegacyPersonalized(
      userId,
      sessionId,
      CANDIDATE_LIMIT,
    );
  }

  return [];
}
