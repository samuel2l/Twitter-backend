import { socialRepository } from "./social.repository.js";

export class SocialServiceError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "SocialServiceError";
  }
}

export const socialService = {
  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new SocialServiceError("cannot follow yourself", 400);
    }

    const target = await socialRepository.findUserById(followingId);
    if (!target) {
      throw new SocialServiceError("user not found", 404);
    }

    const existing = await socialRepository.findFollow(
      followerId,
      followingId,
    );
    if (existing) {
      throw new SocialServiceError("already following", 409);
    }

    const [created] = await socialRepository.createFollow(
      followerId,
      followingId,
    );
    return created;
  },

  async unfollow(followerId: string, followingId: string) {
    const deleted = await socialRepository.deleteFollow(
      followerId,
      followingId,
    );
    if (deleted.length === 0) {
      throw new SocialServiceError("follow relationship not found", 404);
    }
  },

  async isFollowing(followerId: string, followingId: string) {
    const row = await socialRepository.findFollow(followerId, followingId);
    return { following: Boolean(row) };
  },

  async getFollowers(userId: string, limit: number) {
    const target = await socialRepository.findUserById(userId);
    if (!target) {
      throw new SocialServiceError("user not found", 404);
    }

    const rows = await socialRepository.listFollowers(userId, limit);
    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map((row) => ({
      ...row.follower,
      followedAt: row.createdAt,
    }));

    return { items };
  },

  async getFollowing(userId: string, limit: number) {
    const target = await socialRepository.findUserById(userId);
    if (!target) {
      throw new SocialServiceError("user not found", 404);
    }

    const rows = await socialRepository.listFollowing(userId, limit);
    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map((row) => ({
      ...row.following,
      followedAt: row.createdAt,
    }));

    return { items };
  },
};
