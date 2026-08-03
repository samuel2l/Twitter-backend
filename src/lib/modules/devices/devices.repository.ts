import { and, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { deviceToken } from "../../../db/schema/index.js";

export type DevicePlatform = "ios" | "android";

export const devicesRepository = {
  upsert(userId: string, token: string, platform: DevicePlatform) {
    return db
      .insert(deviceToken)
      .values({
        id: crypto.randomUUID(),
        userId,
        token,
        platform,
      })
      .onConflictDoUpdate({
        target: deviceToken.token,
        set: {
          userId,
          platform,
          updatedAt: new Date(),
        },
      })
      .returning();
  },

  listTokensByUserId(userId: string) {
    return db.query.deviceToken.findMany({
      where: eq(deviceToken.userId, userId),
      columns: { id: true, token: true, platform: true },
    });
  },

  deleteByToken(userId: string, token: string) {
    return db
      .delete(deviceToken)
      .where(and(eq(deviceToken.userId, userId), eq(deviceToken.token, token)))
      .returning({ id: deviceToken.id });
  },

  deleteByTokenValue(token: string) {
    return db
      .delete(deviceToken)
      .where(eq(deviceToken.token, token))
      .returning({ id: deviceToken.id });
  },
};
