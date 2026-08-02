import { z } from "zod";

export const followingNewPostsMessageSchema = z.object({
  type: z.literal("following:new_posts"),
  postId: z.string().min(1),
  authorId: z.string().min(1),
});

export const connectedMessageSchema = z.object({
  type: z.literal("connected"),
  userId: z.string().min(1),
});

export const notificationMessageSchema = z.object({
  type: z.enum([
    "notification:like",
    "notification:reply",
    "notification:quote",
    "notification:repost",
    "notification:follow",
  ]),
  notificationId: z.string().min(1),
  actorId: z.string().min(1),
  postId: z.string().min(1).optional(),
  actorPostId: z.string().min(1).optional(),
});

export type FollowingNewPostsMessage = z.infer<
  typeof followingNewPostsMessageSchema
>;
export type NotificationMessage = z.infer<typeof notificationMessageSchema>;

export type RealtimeOutboundMessage =
  | FollowingNewPostsMessage
  | NotificationMessage
  | { type: "connected"; userId: string };
