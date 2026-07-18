import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
  secure: true,
});

export function createUploadSignature(resourceType: "image" | "video") {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = env.cloudinaryFolder;

  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder,
    },
    env.cloudinaryApiSecret,
  );

  return {
    cloudName: env.cloudinaryCloudName,
    apiKey: env.cloudinaryApiKey,
    timestamp,
    folder,
    signature,
    resourceType,
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/${resourceType}/upload`,
  };
}

export { cloudinary };