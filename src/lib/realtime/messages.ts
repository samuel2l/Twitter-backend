import { z } from "zod";

export const followingNewPostsMessageSchema = z.object({
  type: z.literal("following:new_posts"),
  postId: z.string().min(1),
  authorId: z.string().min(1),
});

export const connectedMessageSchema = z.object({
  type: z.literal("connected"),
});

export const realtimeMessageSchema = z.discriminatedUnion("type", [
  followingNewPostsMessageSchema,
  connectedMessageSchema,
]);

export type FollowingNewPostsMessage = z.infer<
  typeof followingNewPostsMessageSchema
>;
export type RealtimeMessage = z.infer<typeof realtimeMessageSchema>;

export type RealtimeOutboundMessage =
  | FollowingNewPostsMessage
  | { type: "connected"; userId: string };
