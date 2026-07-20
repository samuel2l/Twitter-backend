import {
  engagementRepository,
  type InteractionType,
} from "./engagement.repository.js";

export class EngagementServiceError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "EngagementServiceError";
  }
}

export const engagementService = {
  async add(userId: string, postId: string, type: InteractionType) {
    const target = await engagementRepository.findPostById(postId);
    if (!target) {
      throw new EngagementServiceError("post not found", 404);
    }

    const existing = await engagementRepository.findInteraction(
      userId,
      postId,
      type,
    );
    if (existing) {
      // idempotent for views; conflict for others
      if (type === "view") return existing;
      throw new EngagementServiceError(`already ${type}d`, 409);
    }

    const [created] = await engagementRepository.createInteraction(
      userId,
      postId,
      type,
    );
    return created;
  },

  async remove(userId: string, postId: string, type: InteractionType) {
    if (type === "view") {
      throw new EngagementServiceError("cannot remove views", 400);
    }

    const deleted = await engagementRepository.deleteInteraction(
      userId,
      postId,
      type,
    );
    if (deleted.length === 0) {
      throw new EngagementServiceError(`${type} not found`, 404);
    }
  },

  async mine(userId: string, postId: string) {
    const target = await engagementRepository.findPostById(postId);
    if (!target) {
      throw new EngagementServiceError("post not found", 404);
    }

    const rows = await engagementRepository.listForUserOnPost(userId, postId);
    return {
      liked: rows.some((r) => r.type === "like"),
      bookmarked: rows.some((r) => r.type === "bookmark"),
      shared: rows.some((r) => r.type === "share"),
      viewed: rows.some((r) => r.type === "view"),
    };
  },

  async counts(postId: string) {
    const target = await engagementRepository.findPostById(postId);
    if (!target) {
      throw new EngagementServiceError("post not found", 404);
    }

    const [likes, bookmarks, shares, views] = await Promise.all([
      engagementRepository.countByPost(postId, "like"),
      engagementRepository.countByPost(postId, "bookmark"),
      engagementRepository.countByPost(postId, "share"),
      engagementRepository.countByPost(postId, "view"),
    ]);

    return {
      likes: likes[0]?.count ?? 0,
      bookmarks: bookmarks[0]?.count ?? 0,
      shares: shares[0]?.count ?? 0,
      views: views[0]?.count ?? 0,
    };
  },
};
