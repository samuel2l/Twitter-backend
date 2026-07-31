import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { env } from "../../../config/env.js";
import { db } from "../../../db/index.js";
import { post, postMedia } from "../../../db/schema/index.js";
import { postsCache, type CachedPost } from "./posts.cache.js";
import { postFeedWith } from "./posts.includes.js";
import type { CreatePostInput } from "./posts.schemas.js";

export const postsRepository = {
  findById(id: string) {
    return db.query.post.findFirst({
      where: and(eq(post.id, id), isNull(post.deletedAt)),
      with: {
        ...postFeedWith,
        media: {
          orderBy: (m, { asc }) => [asc(m.sortOrder)],
        },
      },
    });
  },

  async create(userId: string, input: CreatePostInput, rootId: string | null) {
    const postId = crypto.randomUUID();

    await db.transaction(async (tx) => {
      await tx.insert(post).values({
        id: postId,
        userId,
        text: input.text ?? null,
        type: input.type,
        replyToId: input.replyToId ?? null,
        quotedPostId: input.quotedPostId ?? null,
        rootId,
      });

      if (input.media?.length) {
        await tx.insert(postMedia).values(
          input.media.map((item, index) => ({
            id: crypto.randomUUID(),
            postId,
            url: item.url,
            type: item.type,
            sortOrder: item.sortOrder ?? index,
          })),
        );
      }
    });

    return postsRepository.findById(postId);
  },

  async listFeed(limit: number, cursor?: string) {
    const rows = await db.query.post.findMany({
      where: and(isNull(post.deletedAt), isNull(post.replyToId)),
      with: postFeedWith,
      orderBy: [desc(post.createdAt), desc(post.id)],
      limit: limit + 1,
      ...(cursor
        ? {
            // simple cursor = last id; fine to start
            // for production use (createdAt, id) compound cursor
          }
        : {}),
    });

    // basic cursor filter if provided
    if (cursor) {
      const idx = rows.findIndex((r) => r.id === cursor);
      const sliced = idx >= 0 ? rows.slice(idx + 1) : rows;
      return sliced.slice(0, limit + 1);
    }

    return rows;
  },

  listReplies(postId: string, limit: number) {
    return db.query.post.findMany({
      where: and(isNull(post.deletedAt), eq(post.replyToId, postId)),
      with: {
        author: {
          columns: { id: true, name: true, image: true },
        },
        media: {
          orderBy: (m, { asc }) => [asc(m.sortOrder)],
        },
      },
      orderBy: [asc(post.createdAt), asc(post.id)],
      limit: limit + 1,
    });
  },

  async findManyByIds(ids: string[]) {
    if (ids.length === 0) return [];

    const cachedById = await postsCache.getMany(ids);
    const missingIds = ids.filter((id) => !cachedById.has(id));

    if (env.nodeEnv === "development") {
      console.log(
        `[cache:posts] ${ids.length - missingIds.length}/${ids.length} hits, ${missingIds.length} miss`,
      );
    }

    if (missingIds.length > 0) {
      const rows = await db.query.post.findMany({
        where: and(inArray(post.id, missingIds), isNull(post.deletedAt)),
        with: postFeedWith,
      });

      await postsCache.setMany(rows as CachedPost[]);

      for (const row of rows) {
        cachedById.set(row.id, row as CachedPost);
      }
    }

    return ids
      .map((id) => cachedById.get(id))
      .filter((row): row is NonNullable<typeof row> => row !== undefined);
  },

  async softDelete(id: string, userId: string) {
    const deleted = await db
      .update(post)
      .set({ deletedAt: new Date() })
      .where(and(eq(post.id, id), eq(post.userId, userId), isNull(post.deletedAt)))
      .returning({
        id: post.id,
        type: post.type,
        replyToId: post.replyToId,
        quotedPostId: post.quotedPostId,
      });

    if (deleted.length > 0) {
      await postsCache.invalidate(id);
    }

    return deleted;
  },
};