import { Router, type Request, type Response } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../auth/auth.middleware.js";
import { registerDeviceSchema } from "./devices.schemas.js";
import { DevicesServiceError, devicesService } from "./devices.service.js";

export const devicesRoutes = Router();

function handleError(error: unknown, res: Response) {
  if (error instanceof DevicesServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
}

devicesRoutes.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = registerDeviceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { session } = req as AuthenticatedRequest;
    const row = await devicesService.register(
      session.user.id,
      parsed.data.token,
      parsed.data.platform,
    );
    res.status(201).json(row);
  } catch (error) {
    handleError(error, res);
  }
});

/** Body token — FCM tokens contain characters unsafe in URL paths */
devicesRoutes.post(
  "/unregister",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const parsed = registerDeviceSchema
        .pick({ token: true })
        .safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
      }

      const { session } = req as AuthenticatedRequest;
      await devicesService.unregister(session.user.id, parsed.data.token);
      res.status(204).send();
    } catch (error) {
      handleError(error, res);
    }
  },
);
