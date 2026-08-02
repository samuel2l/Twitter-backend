CREATE TYPE "public"."notification_type" AS ENUM('like', 'reply', 'quote', 'repost', 'follow');--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"recipient_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"post_id" text,
	"actor_post_id" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_actor_post_id_post_id_fk" FOREIGN KEY ("actor_post_id") REFERENCES "public"."post"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_recipient_id_created_at_idx" ON "notification" USING btree ("recipient_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_recipient_id_read_at_idx" ON "notification" USING btree ("recipient_id","read_at");
