import { asc, eq, inArray } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { topic, topicEmbedding } from "../../../db/schema/index.js";

export const topicsRepository = {
  listAll() {
    return db.query.topic.findMany({
      orderBy: [asc(topic.name)],
      columns: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
    });
  },

  findByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return db.query.topic.findMany({
      where: inArray(topic.id, ids),
      columns: { id: true, name: true, slug: true },
    });
  },

  findEmbeddingsByTopicIds(ids: string[]) {
    if (ids.length === 0) return [];
    return db
      .select({
        topicId: topicEmbedding.topicId,
        slug: topic.slug,
        embedding: topicEmbedding.embedding,
      })
      .from(topicEmbedding)
      .innerJoin(topic, eq(topic.id, topicEmbedding.topicId))
      .where(inArray(topic.id, ids));
  },
};
