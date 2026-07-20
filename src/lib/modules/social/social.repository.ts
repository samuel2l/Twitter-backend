import { and, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { follow, user } from "../../../db/schema/index.js";

const userPreview = {
  id: true,
  name: true,
  image: true,
} as const;

export const socialRepository = {
  findUserById(id: string) {
    return db.query.user.findFirst({
      where: eq(user.id, id),
      columns: userPreview,
    });
  },

  findFollow(followerId: string, followingId: string) {
    return db.query.follow.findFirst({
      where: and(
        eq(follow.followerId, followerId),
        eq(follow.followingId, followingId),
      ),
    });
  },

  createFollow(followerId: string, followingId: string) {
    return db
      .insert(follow)
      .values({ followerId, followingId })
      .returning();
  },

  deleteFollow(followerId: string, followingId: string) {
    return db
      .delete(follow)
      .where(
        and(
          eq(follow.followerId, followerId),
          eq(follow.followingId, followingId),
        ),
      )
      .returning();
  },

  listFollowers(userId: string, limit: number) {
    return db.query.follow.findMany({
      where: eq(follow.followingId, userId),
      with: {
        follower: { columns: userPreview },
      },
      orderBy: (f, { desc }) => [desc(f.createdAt)],
      limit: limit + 1,
    });
  },

  listFollowing(userId: string, limit: number) {
    return db.query.follow.findMany({
      where: eq(follow.followerId, userId),
      with: {
        following: { columns: userPreview },
      },
      orderBy: (f, { desc }) => [desc(f.createdAt)],
      limit: limit + 1,
    });
  },
};
