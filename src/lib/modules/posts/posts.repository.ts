import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { post, postMedia } from "../../../db/schema/index.js";
import type { CreatePostInput } from "./posts.schemas.js";

export const postsRepository = {
  findById(id: string) {
    return db.query.post.findFirst({
      where: and(eq(post.id, id), isNull(post.deletedAt)),
      with: {
        author: {
          columns: { id: true, name: true, image: true },
        },
        media: {
          orderBy: (m, { asc }) => [asc(m.sortOrder)],
        },
        quotedPost: {
          with: {
            author: {
              columns: { id: true, name: true, image: true },
            },
            media: true,
          },
        },
      },
    });
  },

  async create(userId: string, input: CreatePostInput, rootId: string | null) {
    const postId = crypto.randomUUID();

    return db.transaction(async (tx) => {
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

      return postsRepository.findById(postId);
    });
  },

  async listFeed(limit: number, cursor?: string) {
    const rows = await db.query.post.findMany({
      where: and(isNull(post.deletedAt), isNull(post.replyToId)),
      with: {
        author: {
          columns: { id: true, name: true, image: true },
        },
        media: true,
        quotedPost: {
          with: {
            author: {
              columns: { id: true, name: true, image: true },
            },
            media: true,
          },
        },
      },
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

  softDelete(id: string, userId: string) {
    return db
      .update(post)
      .set({ deletedAt: new Date() })
      .where(and(eq(post.id, id), eq(post.userId, userId), isNull(post.deletedAt)))
      .returning({ id: post.id });
  },
};