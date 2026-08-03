import {
  devicesRepository,
  type DevicePlatform,
} from "./devices.repository.js";

export class DevicesServiceError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "DevicesServiceError";
  }
}

export const devicesService = {
  async register(userId: string, token: string, platform: DevicePlatform) {
    const [row] = await devicesRepository.upsert(userId, token, platform);
    if (!row) throw new DevicesServiceError("failed to register device", 500);
    return row;
  },

  async unregister(userId: string, token: string) {
    const deleted = await devicesRepository.deleteByToken(userId, token);
    if (deleted.length === 0) {
      throw new DevicesServiceError("device token not found", 404);
    }
  },

  listTokens(userId: string) {
    return devicesRepository.listTokensByUserId(userId);
  },
};
