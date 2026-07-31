CREATE TABLE "post_engagement_count" (
	"post_id" text PRIMARY KEY NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"bookmark_count" integer DEFAULT 0 NOT NULL,
	"share_count" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "post_engagement_count" ADD CONSTRAINT "post_engagement_count_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "post_engagement_count" ("post_id", "like_count", "bookmark_count", "share_count", "view_count")
SELECT
  p."id",
  COALESCE((
    SELECT count(*)::int FROM "interaction" AS i
    WHERE i."post_id" = p."id" AND i."type" = 'like'
  ), 0),
  COALESCE((
    SELECT count(*)::int FROM "interaction" AS i
    WHERE i."post_id" = p."id" AND i."type" = 'bookmark'
  ), 0),
  COALESCE((
    SELECT count(*)::int FROM "interaction" AS i
    WHERE i."post_id" = p."id" AND i."type" = 'share'
  ), 0),
  COALESCE((
    SELECT count(*)::int FROM "interaction" AS i
    WHERE i."post_id" = p."id" AND i."type" = 'view'
  ), 0)
FROM "post" AS p;
