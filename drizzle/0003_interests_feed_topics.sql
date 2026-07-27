CREATE TYPE "public"."interest_source" AS ENUM('onboarding', 'inferred');--> statement-breakpoint
CREATE TYPE "public"."feed_type" AS ENUM('for_you', 'following');--> statement-breakpoint
ALTER TYPE "public"."interaction_type" ADD VALUE 'not_interested';--> statement-breakpoint
CREATE TABLE "topic" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topic_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "topic_embedding" (
	"topic_id" text PRIMARY KEY NOT NULL,
	"embedding" vector(384) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_interest" (
	"user_id" text NOT NULL,
	"label" text NOT NULL,
	"source" "interest_source" NOT NULL,
	"embedding" vector(384) NOT NULL,
	"weight" real NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_interest_user_id_source_label_pk" PRIMARY KEY("user_id","source","label")
);
--> statement-breakpoint
CREATE TABLE "feed_session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"feed_type" "feed_type" NOT NULL,
	"watermark_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feed_impression" (
	"user_id" text NOT NULL,
	"post_id" text NOT NULL,
	"feed_type" "feed_type" NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feed_impression_user_id_post_id_feed_type_pk" PRIMARY KEY("user_id","post_id","feed_type")
);
--> statement-breakpoint
CREATE TABLE "feed_served_post" (
	"session_id" text NOT NULL,
	"post_id" text NOT NULL,
	"served_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feed_served_post_session_id_post_id_pk" PRIMARY KEY("session_id","post_id")
);
--> statement-breakpoint
ALTER TABLE "topic_embedding" ADD CONSTRAINT "topic_embedding_topic_id_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interest" ADD CONSTRAINT "user_interest_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_session" ADD CONSTRAINT "feed_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_impression" ADD CONSTRAINT "feed_impression_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_impression" ADD CONSTRAINT "feed_impression_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_served_post" ADD CONSTRAINT "feed_served_post_session_id_feed_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."feed_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_served_post" ADD CONSTRAINT "feed_served_post_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feed_session_user_id_feed_type_idx" ON "feed_session" USING btree ("user_id","feed_type");--> statement-breakpoint
CREATE INDEX "feed_impression_user_id_feed_type_idx" ON "feed_impression" USING btree ("user_id","feed_type");--> statement-breakpoint
CREATE INDEX "feed_served_post_session_id_idx" ON "feed_served_post" USING btree ("session_id");--> statement-breakpoint
INSERT INTO "topic" ("id", "name", "slug", "description") VALUES
  ('topic-tech', 'Technology', 'technology', 'Software, programming, startups, gadgets, and tech news'),
  ('topic-politics', 'Politics', 'politics', 'Elections, government, policy, and political news'),
  ('topic-football', 'Football', 'football', 'Soccer, premier league, matches, and football culture'),
  ('topic-fashion', 'Fashion', 'fashion', 'Style, clothing, trends, and fashion industry'),
  ('topic-music', 'Music', 'music', 'Artists, albums, concerts, and music culture'),
  ('topic-gaming', 'Gaming', 'gaming', 'Video games, esports, and gaming culture'),
  ('topic-fitness', 'Fitness', 'fitness', 'Workouts, health, running, and wellness'),
  ('topic-finance', 'Finance', 'finance', 'Markets, investing, crypto, and personal finance'),
  ('topic-science', 'Science', 'science', 'Research, space, biology, and scientific discovery'),
  ('topic-movies', 'Movies & TV', 'movies-tv', 'Films, series, streaming, and entertainment'),
  ('topic-food', 'Food', 'food', 'Cooking, restaurants, recipes, and food culture'),
  ('topic-travel', 'Travel', 'travel', 'Destinations, trips, and travel tips'),
  ('topic-art', 'Art & Design', 'art-design', 'Visual art, design, photography, and creativity'),
  ('topic-business', 'Business', 'business', 'Entrepreneurship, leadership, and industry'),
  ('topic-sports', 'Sports', 'sports', 'Basketball, tennis, athletics, and sports news');
