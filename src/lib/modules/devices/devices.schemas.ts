import { z } from "zod";

export const registerDeviceSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(["ios", "android"]),
});
