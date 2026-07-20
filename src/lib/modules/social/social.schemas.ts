import { z } from "zod";

export const userIdParamSchema = z.object({
  userId: z.string().min(1),
});

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
