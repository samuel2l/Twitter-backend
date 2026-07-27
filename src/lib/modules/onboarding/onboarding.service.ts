import { topicsRepository } from "../topics/topics.repository.js";
import { onboardingRepository } from "./onboarding.repository.js";
import type { SetInterestsInput } from "./onboarding.schemas.js";

export class OnboardingServiceError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "OnboardingServiceError";
  }
}

export const onboardingService = {
  async setInterests(userId: string, input: SetInterestsInput) {
    const topics = await topicsRepository.findByIds(input.topicIds);

    if (topics.length !== input.topicIds.length) {
      throw new OnboardingServiceError("one or more topics not found", 400);
    }

    const embeddings = await topicsRepository.findEmbeddingsByTopicIds(
      input.topicIds,
    );

    if (embeddings.length !== input.topicIds.length) {
      throw new OnboardingServiceError(
        "topic embeddings not ready — run ml/embed_topics.py",
        503,
      );
    }

    const weight = 1 / embeddings.length;

    await onboardingRepository.replaceOnboardingInterests(
      userId,
      embeddings.map((row) => ({
        label: row.slug,
        embedding: row.embedding,
        weight,
      })),
    );

    return {
      topics: topics.map((topic) => ({
        id: topic.id,
        name: topic.name,
        slug: topic.slug,
      })),
      weightPerTopic: weight,
    };
  },

  async getStatus(userId: string) {
    const row = await onboardingRepository.hasOnboardingInterests(userId);
    return { completed: Boolean(row) };
  },
};
