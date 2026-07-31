#!/usr/bin/env python3
"""Update user_interest prototypes from engagement signals via EMA."""

from __future__ import annotations

import os
import sys

import numpy as np
import psycopg
from pgvector.psycopg import register_vector

EMBEDDING_DIM = 384

ACTION_WEIGHT = {
    "like": 1.0,
    "bookmark": 0.8,
    "share": 0.6,
    "repost": 1.0,
    "not_interested": 1.0,
    "unlike": 1.0,
    "unbookmark": 0.8,
}
#Exponential Moving Average (EMA) is a type of moving average that gives more weight to recent data points.
#used here to weight the recent engagement signals and determine how much to update the interest vector hence changing the user's interests.
#0.25 means 25% of the new signal is added to the interest vector, 0.1 means 10% of the new signal is added to the interest vector.
EMA_ALPHA = {
    "like": 0.2,
    "bookmark": 0.2,
    "share": 0.1,
    "repost": 0.4,
    "not_interested": 0.4,
    "unlike": 0.2,
    "unbookmark": 0.2,
}


def to_float_list(embedding) -> list[float]:
    if hasattr(embedding, "to_list"):
        return embedding.to_list()
    return np.asarray(embedding, dtype=np.float32).tolist()

#Divides a vector by its length so it has magnitude 1. 
#Cosine similarity/distance only cares about direction, so vectors are kept normalized after updates.
def normalize(vector: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(vector)
    if norm == 0:
        return vector
    return vector / norm


def main() -> int:
    if len(sys.argv) != 4:
        print(
            "usage: interest_updater.py <user_id> <post_id> <action>",
            file=sys.stderr,
        )
        return 1

    user_id, post_id, action = sys.argv[1], sys.argv[2], sys.argv[3]
    if action not in ACTION_WEIGHT:
        print(f"unsupported action: {action}", file=sys.stderr)
        return 1

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is required", file=sys.stderr)
        return 1

    with psycopg.connect(database_url) as conn:
        register_vector(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT embedding
                FROM post_embedding
                WHERE post_id = %s
                """,
                (post_id,),
            )
            post_row = cur.fetchone()
            if not post_row:
                print(f"post embedding not found: {post_id}")
                return 0

            post_embedding = np.array(
                to_float_list(post_row[0]),
                dtype=np.float32,
            )

            cur.execute(
                """
                SELECT label, source, embedding, weight
                FROM user_interest
                WHERE user_id = %s
                ORDER BY weight DESC
                """,
                (user_id,),
            )
            interests = cur.fetchall()

            if not interests:
                print(f"no user_interest rows for user {user_id}")
                return 0

            labels = []
            sources = []
            vectors = []
            weights = []

            for label, source, embedding, weight in interests:
                labels.append(label)
                sources.append(source)
                vectors.append(
                    np.array(to_float_list(embedding), dtype=np.float32),
                )
                weights.append(float(weight))

            # Stacks all interest vectors, computes Euclidean distance from the post to each, picks the closest one.

            # Assumption: the post is "about" whichever interest it's nearest to.
            # Like a tech post → nudge the technology interest, not sports.
            matrix = np.stack(vectors)
            distances = np.linalg.norm(matrix - post_embedding, axis=1)
            nearest_index = int(np.argmin(distances))

            alpha = EMA_ALPHA[action]
            signal_weight = ACTION_WEIGHT[action]
            current = vectors[nearest_index]
            # If the user doesn't like the post, the interest vector is updated to move away from the post's interest vector.
            if action == "not_interested":
                updated = normalize(current - alpha * post_embedding)
                weights[nearest_index] = max(
                    0.05,
                    weights[nearest_index] * (1 - alpha),
                )
            elif action in ("unlike", "unbookmark"):
                updated = normalize(
                    (1 - alpha) * current - alpha * post_embedding,
                )
                weights[nearest_index] = max(
                    0.05,
                    weights[nearest_index] - alpha * signal_weight,
                )
                for index in range(len(weights)):
                    if index == nearest_index:
                        continue
                    weights[index] = min(
                        1.0,
                        weights[index] * (1 + alpha * 0.25),
                    )
            else:
                # move toward the post (classic EMA) so the user's interests are updated to be more similar to the post's interests.
                updated = normalize((1 - alpha) * current + alpha * post_embedding)
                weights[nearest_index] = min(
                    1.0,
                    weights[nearest_index] + alpha * signal_weight,
                )
                #  slightly shrink all other interests
                for index in range(len(weights)):
                    if index == nearest_index:
                        continue
                    weights[index] = max(0.05, weights[index] * (1 - alpha * 0.25))
            #After boosting/shrinking, weights might not sum to 1.0. 
            # Divide each by the total so they always represent proportions (e.g. 0.7 tech + 0.3 sports).
            total_weight = sum(weights)
            if total_weight > 0:
                weights = [weight / total_weight for weight in weights]

            for index, (label, source) in enumerate(zip(labels, sources)):
                cur.execute(
                    """
                    UPDATE user_interest
                    SET embedding = %s,
                        weight = %s,
                        updated_at = now()
                    WHERE user_id = %s
                      AND source = %s
                      AND label = %s
                    """,
                    (
                        updated.tolist()
                        if index == nearest_index
                        else vectors[index].tolist(),
                        weights[index],
                        user_id,
                        source,
                        label,
                    ),
                )

        conn.commit()

    print(f"updated interests for user {user_id} via {action}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
