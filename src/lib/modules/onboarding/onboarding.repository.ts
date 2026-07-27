import { and, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { userInterest } from "../../../db/schema/index.js";

export const onboardingRepository = {
  async replaceOnboardingInterests(
    userId: string,
    interests: {
      label: string;
      embedding: number[];
      weight: number;
    }[],
  ) {
    await db.transaction(async (tx) => {
      await tx
        .delete(userInterest)
        .where(
          and(
            eq(userInterest.userId, userId),
            eq(userInterest.source, "onboarding"),
          ),
        );

      if (interests.length === 0) return;

      await tx.insert(userInterest).values(
        interests.map((interest) => ({
          userId,
          label: interest.label,
          source: "onboarding" as const,
          embedding: interest.embedding,
          weight: interest.weight,
        })),
      );
    });
  },

  hasOnboardingInterests(userId: string) {
    return db.query.userInterest.findFirst({
      where: and(
        eq(userInterest.userId, userId),
        eq(userInterest.source, "onboarding"),
      ),
      columns: { userId: true },
    });
  },
};
