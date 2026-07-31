import { and, eq } from "drizzle-orm";
import { db, pool } from "../../../db/index.js";
import {
  feedImpression,
  feedServedPost,
  feedSession,
} from "../../../db/schema/index.js";

const FOR_YOU = "for_you" as const;
const FOR_YOU_WINDOW = "72 hours";

function recencySql() {
  return `AND p.created_at > NOW() - INTERVAL '${FOR_YOU_WINDOW}'`;
}

function exclusionSql(userIdParam: string, sessionIdParam: string) {
  return `
    ${recencySql()}
    AND NOT EXISTS (
      SELECT 1 FROM feed_impression fi
      WHERE fi.user_id = ${userIdParam}
        AND fi.post_id = p.id
        AND fi.feed_type = 'for_you'
    )
    AND NOT EXISTS (
      SELECT 1 FROM interaction i
      WHERE i.user_id = ${userIdParam}
        AND i.post_id = p.id
        AND i.type = 'not_interested'
    )
    AND NOT EXISTS (
      SELECT 1 FROM feed_served_post fsp
      WHERE fsp.session_id = ${sessionIdParam}
        AND fsp.post_id = p.id
    )
  `;
}

export const forYouRetrievalRepository = {
  async listPersonalizedForInterest(
    userId: string,
    sessionId: string,
    label: string,
    source: "onboarding" | "inferred",
    limit: number,
  ) {
    const result = await pool.query<{ id: string; distance: number }>(
      `
        SELECT
          p.id,
          (pe.embedding <=> ui.embedding) AS distance
        FROM post p
        INNER JOIN post_embedding pe ON pe.post_id = p.id
        INNER JOIN user_interest ui
          ON ui.user_id = $1
         AND ui.source = $2
         AND ui.label = $3
        WHERE p.deleted_at IS NULL
          AND p.reply_to_id IS NULL
          AND p.user_id <> $1
          ${exclusionSql("$1", "$4")}
        ORDER BY distance ASC, p.id ASC
        LIMIT $5
      `,
      [userId, source, label, sessionId, limit],
    );

    return result.rows.map((row) => ({
      id: row.id,
      score: Number(row.distance),
    }));
  },

  async listExploration(userId: string, sessionId: string, limit: number) {
    const result = await pool.query<{ id: string; score: number }>(
      `
        SELECT
          p.id,
          (
            COALESCE((
              SELECT count(*)::float
              FROM interaction i
              WHERE i.post_id = p.id AND i.type = 'like'
            ), 0) * 0.5
            + COALESCE((
              SELECT count(*)::float
              FROM interaction i
              WHERE i.post_id = p.id AND i.type = 'bookmark'
            ), 0) * 0.8
            + COALESCE((
              SELECT count(*)::float
              FROM interaction i
              WHERE i.post_id = p.id AND i.type = 'share'
            ), 0) * 1.0
          ) AS score
        FROM post p
        INNER JOIN post_embedding pe ON pe.post_id = p.id
        WHERE p.deleted_at IS NULL
          AND p.reply_to_id IS NULL
          AND p.user_id <> $1
          ${exclusionSql("$1", "$2")}
        ORDER BY score DESC, p.created_at DESC, p.id DESC
        LIMIT $3
      `,
      [userId, sessionId, limit],
    );

    return result.rows.map((row) => ({
      id: row.id,
      score: Number(row.score),
    }));
  },

  async listSeen(userId: string, limit: number) {
    const result = await pool.query<{ id: string; score: number }>(
      `
        SELECT
          p.id,
          EXTRACT(EPOCH FROM fi.seen_at) AS score
        FROM post p
        INNER JOIN feed_impression fi
          ON fi.post_id = p.id
         AND fi.user_id = $1
         AND fi.feed_type = 'for_you'
        WHERE p.deleted_at IS NULL
          AND p.reply_to_id IS NULL
        ORDER BY fi.seen_at DESC, p.id DESC
        LIMIT $2
      `,
      [userId, limit],
    );

    return result.rows.map((row) => ({
      id: row.id,
      score: Number(row.score),
    }));
  },
};

export const forYouRecommendationsRepository = {
  createSession(userId: string) {
    const id = crypto.randomUUID();
    return db
      .insert(feedSession)
      .values({
        id,
        userId,
        feedType: FOR_YOU,
      })
      .returning();
  },

  findSession(sessionId: string, userId: string) {
    return db.query.feedSession.findFirst({
      where: and(
        eq(feedSession.id, sessionId),
        eq(feedSession.userId, userId),
        eq(feedSession.feedType, FOR_YOU),
      ),
    });
  },

  async recordServed(sessionId: string, postIds: string[]) {
    if (postIds.length === 0) return;

    await db
      .insert(feedServedPost)
      .values(
        postIds.map((postId) => ({
          sessionId,
          postId,
        })),
      )
      .onConflictDoNothing();

    return postIds;
  },

  listServedPostIds(sessionId: string) {
    return db
      .select({ postId: feedServedPost.postId })
      .from(feedServedPost)
      .where(eq(feedServedPost.sessionId, sessionId))
      .then((rows) => rows.map((row) => row.postId));
  },

  async recordImpressions(userId: string, postIds: string[]) {
    if (postIds.length === 0) return;

    await db
      .insert(feedImpression)
      .values(
        postIds.map((postId) => ({
          userId,
          postId,
          feedType: FOR_YOU,
        })),
      )
      .onConflictDoNothing();
  },

  async listImpressedPostIds(userId: string) {
    const rows = await db
      .select({ postId: feedImpression.postId })
      .from(feedImpression)
      .where(
        and(
          eq(feedImpression.userId, userId),
          eq(feedImpression.feedType, FOR_YOU),
        ),
      );
    return rows.map((row) => row.postId);
  },
};
