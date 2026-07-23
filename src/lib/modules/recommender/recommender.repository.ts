import { eq } from "drizzle-orm";
import { db, pool } from "../../../db/index.js";
import { userEmbedding } from "../../../db/schema/index.js";
import { decodeForYouCursor } from "../timeline/timeline.cursor.js";

export const recommenderRepository = {
  async hasUserEmbedding(userId: string) {
    const row = await db.query.userEmbedding.findFirst({
      where: eq(userEmbedding.userId, userId),
      columns: { userId: true },
    });
    return Boolean(row);
  },

  async listForYouPostIds(userId: string, limit: number, cursor?: string) {
    const params: unknown[] = [userId, limit + 1];
    let cursorClause = "";

    if (cursor) {
      const decoded = decodeForYouCursor(cursor);
      if (decoded) {
        params.push(decoded.distance, decoded.id);
        cursorClause = `
          AND (
            (pe.embedding <=> ue.embedding) > $3
            OR (
              (pe.embedding <=> ue.embedding) = $3
              AND p.id > $4
            )
          )
        `;
      }
    }

    const result = await pool.query<{
      id: string;
      distance: number;
    }>(
      `
        SELECT
          p.id,
          (pe.embedding <=> ue.embedding) AS distance
        FROM post p
        INNER JOIN post_embedding pe ON pe.post_id = p.id
        INNER JOIN user_embedding ue ON ue.user_id = $1
        WHERE p.deleted_at IS NULL
          AND p.reply_to_id IS NULL
          AND p.user_id <> $1
          ${cursorClause}
        ORDER BY distance ASC, p.id ASC
        LIMIT $2
      `,
      params,
    );

    return result.rows.map((row) => ({
      id: row.id,
      distance: Number(row.distance),
    }));
  },
};
