#!/usr/bin/env python3
"""Embed a single post and upsert into post_embedding."""

from __future__ import annotations

import os
import sys

import psycopg
from pgvector.psycopg import register_vector
from sentence_transformers import SentenceTransformer

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIM = 384


def build_post_text(row: dict) -> str:
    parts: list[str] = []
    if row.get("text"):
        parts.append(row["text"])
    return " ".join(parts).strip()


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: embed_post.py <post_id>", file=sys.stderr)
        return 1

    post_id = sys.argv[1]
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is required", file=sys.stderr)
        return 1

    model = SentenceTransformer(MODEL_NAME)

    with psycopg.connect(database_url) as conn:
        register_vector(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, text
                FROM post
                WHERE id = %s AND deleted_at IS NULL
                """,
                (post_id,),
            )
            row = cur.fetchone()
            if not row:
                print(f"post not found: {post_id}", file=sys.stderr)
                return 1

            columns = [desc.name for desc in cur.description]
            post = dict(zip(columns, row))
            content = build_post_text(post)
            if not content:
                print(f"post has no embeddable text: {post_id}", file=sys.stderr)
                return 0

            embedding = model.encode(content, normalize_embeddings=True)

            if len(embedding) != EMBEDDING_DIM:
                print("unexpected embedding dimension", file=sys.stderr)
                return 1

            cur.execute(
                """
                INSERT INTO post_embedding (post_id, embedding)
                VALUES (%s, %s)
                ON CONFLICT (post_id) DO UPDATE
                SET embedding = EXCLUDED.embedding,
                    updated_at = now()
                """,
                (post_id, embedding.tolist()),
            )
        conn.commit()

    print(f"embedded post {post_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
