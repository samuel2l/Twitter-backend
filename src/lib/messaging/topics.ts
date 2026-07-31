export const TOPICS = {
  POST_CREATED: "post.created",
  POST_DELETED: "post.deleted",
  ENGAGEMENT_RECORDED: "engagement.recorded",
} as const;

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];
