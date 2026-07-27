import { and, eq, gt } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { userInterest } from "../../../db/schema/index.js";

const MIN_INTEREST_WEIGHT = 0.05;

export const interestRepository = {
  async listActive(userId: string) {
    return db.query.userInterest.findMany({
      where: and(
        eq(userInterest.userId, userId),
        gt(userInterest.weight, MIN_INTEREST_WEIGHT),
      ),
      columns: {
        label: true,
        source: true,
        embedding: true,
        weight: true,
      },
    });
  },

  async hasInterests(userId: string) {
    const row = await db.query.userInterest.findFirst({
      where: and(
        eq(userInterest.userId, userId),
        gt(userInterest.weight, MIN_INTEREST_WEIGHT),
      ),
      columns: { userId: true },
    });
    return Boolean(row);
  },
};
