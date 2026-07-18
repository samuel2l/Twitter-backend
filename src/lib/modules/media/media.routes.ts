import { Router, type Request, type Response } from "express";
import multer from "multer";
import { z } from "zod";
import { uploadBuffer, type MediaResourceType } from "../../../config/cloudinary.js";
import { requireAuth } from "../auth/auth.middleware.js";

export const mediaRoutes = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

const resourceTypeSchema = z.enum(["image", "video"]);

function detectResourceType(
  mimetype: string,
  explicit?: string,
): MediaResourceType {
  if (explicit) {
    return resourceTypeSchema.parse(explicit);
  }
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype.startsWith("image/")) return "image";
  throw new Error("Unsupported file type. Use image/* or video/*");
}

mediaRoutes.post(
  "/upload",
  requireAuth,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "file is required (multipart field: file)" });
        return;
      }

      const resourceType = detectResourceType(
        req.file.mimetype,
        typeof req.body?.resourceType === "string"
          ? req.body.resourceType
          : undefined,
      );

      const result = await uploadBuffer(req.file.buffer, resourceType);

      res.status(201).json({
        url: result.secure_url,
        type: resourceType,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        format: result.format,
      });
    } catch (error) {
      console.error(error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "Upload failed",
      });
    }
  },
);
