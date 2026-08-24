# Twitter backend

API for a Twitter-style app: posts, follows, engagement, notifications, and two feeds — **Following** (people you follow) and **For You** (embedding-based recommendations).

Stack: **Express**, **Postgres** (Drizzle + pgvector), **Better Auth**, **Redis**, optional **Kafka**, **WebSockets**, **FCM**, **Cloudinary**, and **Python** embedding jobs.

## What it does

- **Auth** — email/password and Google via Better Auth (cookie sessions).
- **Posts** — originals, replies, quotes, reposts; media upload to Cloudinary.
- **Social** — follow/unfollow, profile, followers/following lists.
- **Engagement** — like, bookmark, share, view, not-interested; denormalized counts.
- **Notifications** — in-app inbox plus optional push (FCM).
- **Onboarding** — pick topics; those become the first interest vectors for For You.
- **Following feed** — chronological posts from accounts you follow, fan-out written to Redis.
- **For You feed** — retrieval + ranking over post embeddings, with session-aware pagination and impression tracking.
- **Realtime** — authenticated WebSocket at `/ws` (new posts, notification counts).

## Architecture

```
Mobile / clients
       │  REST + cookies
       ▼
Express API  ── Better Auth
       │
       ├── Postgres (users, posts, follows, embeddings, feed sessions)
       ├── Redis (following timelines, For You session candidates, post cache)
       ├── Kafka (optional: post.created / post.deleted / engagement.recorded)
       └── Python ML (embed posts/topics, update user interests)
```

When Kafka is off (`KAFKA_ENABLED=false`, the default), side effects run **inline** in the API process: embedding a new post, updating interest vectors, fan-out to follower timelines, notifications.

When Kafka is on, the API publishes events and `npm run consumers` handles them.

## For You recommender

Personalized feed is built from **384-dim embeddings** (`sentence-transformers/all-MiniLM-L6-v2`) stored as pgvector.

### How a user gets a vector

1. **Onboarding** — user picks 1–5 topics. Topic embeddings are copied into `user_interest` (`source = onboarding`).
2. **Inferred** — likes, bookmarks, shares, reposts, and not-interested run `ml/interest_updater.py`. That applies an EMA update toward (or away from) the post embedding so interests drift with behavior.

### How the feed is built

Each For You request is tied to a **feed session**. Candidates are built once per session/tier and reused while you paginate.

Tiers, in order:

| Tier | What it is |
|------|------------|
| **personalized** | Nearest posts to each active interest (cosine distance). Per-interest pools (up to 50 posts, last 72 hours) are **merged by interest weight** so stronger interests show up more often. |
| **exploration** | Popular unseen posts (likes / bookmarks / shares), still excluding impressions and not-interested. |
| **seen** | Posts already impressed in For You, most recently seen first. |
| **recent** | Fallback chronological posts if the user has no usable candidates (e.g. no embeddings yet). |

Exclusions: own posts, replies, already served in this session, already impressed, marked not-interested.

### Impressions and “new posts”

The client records impressions (`POST /api/timeline/impressions`). Those posts drop out of personalized/exploration for later sessions.

`GET /api/timeline/for-you/new-count` counts personalized candidates **not yet served** in the current session (refresh affordance). `POST /api/timeline/for-you/refresh` starts a new session.

### ML scripts

| Script | Role |
|--------|------|
| `ml/embed_post.py` | Embed one post into `post_embedding` (runs on post create when `ML_EMBED_ENABLED=true`). |
| `ml/embed_topics.py` | Embed all topics (required before onboarding works). |
| `ml/interest_updater.py` | EMA-update `user_interest` from engagement. |
| `ml/backfill_posts.py` | Embed existing posts. |

## Caching (Redis)

All Redis usage is best-effort. If Redis is down or `REDIS_ENABLED=false`, feeds still work from Postgres.

**Following timeline** (`following:timeline:{userId}`)

- Sorted set of post IDs, score = created-at millis, capped at 1000.
- On a new top-level post: **fan-out** write into every follower’s set, then WebSocket notify.
- On follow: backfill the author’s recent posts into the follower’s set.
- Cold start: if the key is empty, backfill from Postgres (join follows → posts).

**For You session** (24h TTL)

- `feed:session:{id}:tier:{personalized\|exploration\|seen}` — scored candidate lists so pagination does not re-run vector search.
- `feed:session:{id}:served` — post IDs already returned in this session.

**Post objects** (`post:{id}`, 10 min TTL)

- Hydrated post payloads for feed assembly (`mget` / pipeline set). Invalidated when a post changes.

## Realtime and push

- WebSocket `/ws` authenticates with the same Better Auth session cookie.
- Used for “new posts in Following” and notification unread bumps.
- FCM is optional (`FCM_ENABLED=true` + Firebase service account) for background push.

## API surface

| Area | Prefix |
|------|--------|
| Auth (Better Auth) | `/api/auth/*` |
| Session / me | `/api/session`, `/api/me` |
| Posts + media | `/api/posts`, `/api/media` |
| Engagement | `/api/posts/:postId/{like,bookmark,share,...}` |
| Social | `/api/social` |
| Notifications | `/api/notifications` |
| Devices (FCM) | `/api/devices` |
| Topics / onboarding | `/api/topics`, `/api/onboarding` |
| Feeds | `/api/timeline/following`, `/api/timeline/for-you` |
| Health | `/health` |

Cookie sessions: clients must send credentials. CORS origin is `CORS_ORIGIN`.

## Setup

```bash
cp .env.example .env   # fill DATABASE_URL and required secrets
npm install
npm run db:push        # apply schema (including pgvector tables)
```

Postgres needs the **pgvector** extension.

Python (for embeddings / interest updates):

```bash
pip install -r ml/requirements.txt
python3 ml/embed_topics.py   # before anyone can finish onboarding
```

Run:

```bash
npm run dev
# optional, only if KAFKA_ENABLED=true
npm run consumers
```

Seed demo users + posts from `seed.json` (password `11111111`, emails like `alphacoder@seed.local`):

```bash
npm run db:seed
```

Set `ML_EMBED_ENABLED=true` if you want new posts embedded automatically. Seeded posts from the first seed run were embedded via post-create side effects.

### Env (short)

| Required | Notes |
|----------|--------|
| `DATABASE_URL` | Postgres |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | Auth |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Required at boot even if you only use email login |
| `CLOUDINARY_*` | Media uploads |

| Optional | Default | Notes |
|----------|---------|--------|
| `REDIS_ENABLED` / `REDIS_URL` | on / `localhost:6379` | Following + For You caches |
| `ML_EMBED_ENABLED` | `false` | Spawn Python on post create / engagement |
| `KAFKA_ENABLED` | `false` | Async side effects |
| `FCM_ENABLED` | `false` | Push |

See `.env.example` for the full list.

## Layout

```
src/
  app.ts                 HTTP routes
  db/schema/             Drizzle + pgvector
  lib/modules/           auth, posts, social, engagement, timeline, for-you, …
  lib/messaging/         Kafka publish + inline fallback
  lib/realtime/          WebSocket
  lib/push/              FCM
  consumers/             Kafka workers
ml/                      embedding + interest updater
scripts/seed-from-json.ts
```
