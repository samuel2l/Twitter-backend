import { postsRepository } from "./posts.repository.js";
import type { CreatePostInput } from "./posts.schemas.js";
import { eventPublisher } from "../../messaging/publisher.js";

export class PostsServiceError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "PostsServiceError";
  }
}

export const postsService = {
  async create(userId: string, input: CreatePostInput) {
    let rootId: string | null = null;

    if (input.replyToId) {
      const parent = await postsRepository.findById(input.replyToId);
      if (!parent) throw new PostsServiceError("replyTo post not found", 404);
      rootId = parent.rootId ?? parent.id;
    }

    if (input.quotedPostId) {
      const quoted = await postsRepository.findById(input.quotedPostId);
      if (!quoted) throw new PostsServiceError("quoted post not found", 404);
    }

    const created = await postsRepository.create(userId, input, rootId);
    if (!created) throw new PostsServiceError("failed to create post", 500);

    await eventPublisher.publishPostCreated({
      postId: created.id,
      authorId: userId,
      createdAt: created.createdAt.toISOString(),
      type: created.type,
      isTopLevel: !input.replyToId,
      quotedPostId: input.quotedPostId,
      replyToId: input.replyToId,
    });

    return created;
  },

  async getById(id: string) {
    const found = await postsRepository.findById(id);
    if (!found) throw new PostsServiceError("post not found", 404);
    return found;
  },

  async getFeed(limit: number, cursor?: string) {
    const rows = await postsRepository.listFeed(limit, cursor);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
    };
  },

  async getReplies(postId: string, limit: number) {
    await this.getById(postId);
    const rows = await postsRepository.listReplies(postId, limit);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
    };
  },

  async getByUser(userId: string, limit: number) {
    const rows = await postsRepository.listByUserId(userId, limit);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
    };
  },

  async delete(id: string, userId: string) {
    const deleted = await postsRepository.softDelete(id, userId);
    if (deleted.length === 0) {
      throw new PostsServiceError("post not found or not owned by user", 404);
    }

    const removed = deleted[0];
    if (!removed) {
      throw new PostsServiceError("post not found or not owned by user", 404);
    }

    await eventPublisher.publishPostDeleted({
      postId: removed.id,
      authorId: userId,
      type: removed.type,
      isTopLevel: removed.replyToId === null,
      quotedPostId: removed.quotedPostId ?? undefined,
    });
  },
};