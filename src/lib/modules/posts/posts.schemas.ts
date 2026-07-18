import { z } from "zod";

export const mediaInputSchema = z.object({
  url: z.string().min(1),
  type: z.enum(["image", "video"]),
  sortOrder: z.number().int().min(0).optional(),
});

export const createPostSchema = z
  .object({
    text: z.string().trim().max(500).optional(),
    type: z.enum(["original", "reply", "quote", "repost"]),
    replyToId: z.string().min(1).optional(),
    quotedPostId: z.string().min(1).optional(),
    media: z.array(mediaInputSchema).max(4).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "original") {
      if (data.replyToId || data.quotedPostId) {
        ctx.addIssue({
          code: "custom",
          message: "original cannot have replyToId or quotedPostId",
        });
      }
    }

    if (data.type === "reply" && !data.replyToId) {
      ctx.addIssue({
        code: "custom",
        path: ["replyToId"],
        message: "reply requires replyToId",
      });
    }

    if ((data.type === "quote" || data.type === "repost") && !data.quotedPostId) {
      ctx.addIssue({
        code: "custom",
        path: ["quotedPostId"],
        message: `${data.type} requires quotedPostId`,
      });
    }

    if (data.type === "quote" && data.replyToId) {
      ctx.addIssue({
        code: "custom",
        message: "for reply+quote use type=reply with both ids",
      });
    }

    if (data.type === "repost" && data.replyToId) {
      ctx.addIssue({
        code: "custom",
        message: "repost cannot have replyToId",
      });
    }

    const hasContent =
      Boolean(data.text?.length) || Boolean(data.media?.length);

    if (data.type !== "repost" && !hasContent) {
      ctx.addIssue({
        code: "custom",
        message: "text or media required",
      });
    }
  });

export const feedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;