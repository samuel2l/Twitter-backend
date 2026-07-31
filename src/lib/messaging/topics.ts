export const TOPICS = {
  POST_CREATED: "post.created",
  ENGAGEMENT_RECORDED: "engagement.recorded",
} as const;

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];
