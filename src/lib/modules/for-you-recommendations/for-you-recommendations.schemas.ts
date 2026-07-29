import { z } from "zod";

export const recordImpressionsSchema = z.object({
  postIds: z.array(z.string().min(1)).min(1).max(50),
  feedType: z.enum(["for_you", "following"]).default("for_you"),
});

export const forYouQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sessionId: z.string().optional(),
  refresh: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((value) => value === "true"),
});

export type ForYouQuery = z.infer<typeof forYouQuerySchema>;
