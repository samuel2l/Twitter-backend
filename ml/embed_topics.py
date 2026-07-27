#!/usr/bin/env python3
"""Embed all topics and upsert into topic_embedding."""

from __future__ import annotations

import os
import sys

import psycopg
from pgvector.psycopg import register_vector
from sentence_transformers import SentenceTransformer

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIM = 384


def main() -> int:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is required", file=sys.stderr)
        return 1

    model = SentenceTransformer(MODEL_NAME)

    with psycopg.connect(database_url) as conn:
        register_vector(conn)
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, description FROM topic ORDER BY id")
            topics = cur.fetchall()

            if not topics:
                print("no topics found")
                return 0

            for topic_id, name, description in topics:
                text = f"{name} — {description}"
                embedding = model.encode(text, normalize_embeddings=True)

                if len(embedding) != EMBEDDING_DIM:
                    print("unexpected embedding dimension", file=sys.stderr)
                    return 1

                cur.execute(
                    """
                    INSERT INTO topic_embedding (topic_id, embedding)
                    VALUES (%s, %s)
                    ON CONFLICT (topic_id) DO UPDATE
                    SET embedding = EXCLUDED.embedding,
                        updated_at = now()
                    """,
                    (topic_id, embedding.tolist()),
                )
                print(f"embedded topic {topic_id}")

        conn.commit()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
