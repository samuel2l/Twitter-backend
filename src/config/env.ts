import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function toWebSocketUrl(httpUrl: string): string {
  const url = new URL(httpUrl);
  const protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${url.host}/ws`;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT) || 3000,
  databaseUrl: required("DATABASE_URL"),
  betterAuthSecret: required("BETTER_AUTH_SECRET"),
  betterAuthUrl: required("BETTER_AUTH_URL"),
  websocketUrl: toWebSocketUrl(required("BETTER_AUTH_URL")),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  googleClientId: required("GOOGLE_CLIENT_ID"),
  googleClientSecret: required("GOOGLE_CLIENT_SECRET"),
  cloudinaryCloudName: required("CLOUDINARY_CLOUD_NAME"),
  cloudinaryApiKey: required("CLOUDINARY_API_KEY"),
  cloudinaryApiSecret: required("CLOUDINARY_API_SECRET"),
  cloudinaryFolder: process.env.CLOUDINARY_FOLDER ?? "twitter",
  mlEmbedEnabled: process.env.ML_EMBED_ENABLED === "true",
  mlPythonBin: process.env.ML_PYTHON_BIN ?? "python3",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  redisEnabled: process.env.REDIS_ENABLED !== "false",
  kafkaBrokers: (process.env.KAFKA_BROKERS ?? "localhost:9092").split(","),
  kafkaEnabled: process.env.KAFKA_ENABLED === "true",
  kafkaClientId: process.env.KAFKA_CLIENT_ID ?? "twitter-backend",
  fcmEnabled: process.env.FCM_ENABLED === "true",
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  /** Raw JSON string or path-friendly; prefer FIREBASE_PRIVATE_KEY with \n escapes */
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};
