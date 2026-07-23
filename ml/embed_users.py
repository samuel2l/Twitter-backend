#!/usr/bin/env python3
"""Build or refresh a user embedding from liked/bookmarked posts."""

from __future__ import annotations

import os
import sys

import numpy as np
import psycopg
from pgvector.psycopg import register_vector

EMBEDDING_DIM = 384


def average_embeddings(embeddings: list[list[float]]) -> list[float]:
    if not embeddings:
        return []
    matrix = np.array(embeddings, dtype=np.float32)
    mean = matrix.mean(axis=0)
    norm = np.linalg.norm(mean)
    if norm == 0:
        return mean.tolist()
    return (mean / norm).tolist()


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: embed_users.py <user_id>", file=sys.stderr)
        return 1

    user_id = sys.argv[1]
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is required", file=sys.stderr)
        return 1

    with psycopg.connect(database_url) as conn:
        register_vector(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT pe.embedding
                FROM interaction i
                INNER JOIN post_embedding pe ON pe.post_id = i.post_id
                INNER JOIN post p ON p.id = i.post_id
                WHERE i.user_id = %s
                  AND i.type IN ('like', 'bookmark')
                  AND p.deleted_at IS NULL
                """,
                (user_id,),
            )
            rows = cur.fetchall()
            embeddings = [row[0] for row in rows]

            if not embeddings:
                print(f"no liked/bookmarked embeddings for user {user_id}")
                return 0

            user_embedding = average_embeddings(embeddings)
            if len(user_embedding) != EMBEDDING_DIM:
                print("unexpected embedding dimension", file=sys.stderr)
                return 1

            cur.execute(
                """
                INSERT INTO user_embedding (user_id, embedding)
                VALUES (%s, %s)
                ON CONFLICT (user_id) DO UPDATE
                SET embedding = EXCLUDED.embedding,
                    updated_at = now()
                """,
                (user_id, user_embedding),
            )
        conn.commit()

    print(f"embedded user {user_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
