import { z } from "zod";

export const setInterestsSchema = z.object({
  topicIds: z.array(z.string().min(1)).min(1).max(5),
});

export type SetInterestsInput = z.infer<typeof setInterestsSchema>;
