#!/usr/bin/env python3
"""Backfill embeddings for posts that do not have one yet."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import psycopg

SCRIPT_DIR = Path(__file__).resolve().parent


def main() -> int:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is required", file=sys.stderr)
        return 1

    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT p.id
                FROM post p
                LEFT JOIN post_embedding pe ON pe.post_id = p.id
                WHERE p.deleted_at IS NULL
                  AND pe.post_id IS NULL
                  AND COALESCE(NULLIF(TRIM(p.text), ''), '') <> ''
                ORDER BY p.created_at ASC
                """
            )
            post_ids = [row[0] for row in cur.fetchall()]

    embed_script = SCRIPT_DIR / "embed_post.py"
    failures = 0

    for post_id in post_ids:
        result = subprocess.run(
            [sys.executable, str(embed_script), post_id],
            env=os.environ,
        )
        if result.returncode != 0:
            failures += 1

    print(f"processed {len(post_ids)} posts, failures={failures}")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
