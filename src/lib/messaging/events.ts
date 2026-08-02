import { z } from "zod";

export const postCreatedEventSchema = z.object({
  postId: z.string().min(1),
  authorId: z.string().min(1),
  createdAt: z.string().datetime(),
  type: z.enum(["original", "reply", "quote", "repost"]),
  isTopLevel: z.boolean(),
  quotedPostId: z.string().min(1).optional(),
  replyToId: z.string().min(1).optional(),
});

export const postDeletedEventSchema = z.object({
  postId: z.string().min(1),
  authorId: z.string().min(1),
  type: z.enum(["original", "reply", "quote", "repost"]),
  isTopLevel: z.boolean(),
  quotedPostId: z.string().min(1).optional(),
});

export const engagementRecordedEventSchema = z.object({
  userId: z.string().min(1),
  postId: z.string().min(1),
  type: z.enum(["like", "bookmark", "share", "view", "not_interested"]),
  action: z.enum(["add", "remove"]),
});

export type PostCreatedEvent = z.infer<typeof postCreatedEventSchema>;
export type PostDeletedEvent = z.infer<typeof postDeletedEventSchema>;
export type EngagementRecordedEvent = z.infer<
  typeof engagementRecordedEventSchema
>;
