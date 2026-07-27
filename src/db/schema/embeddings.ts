import { customType } from "drizzle-orm/pg-core";

export const EMBEDDING_DIM = 384;

export const embeddingVector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return `vector(${EMBEDDING_DIM})`;
  },
  toDriver(value: number[]) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string) {
    return value
      .slice(1, -1)
      .split(",")
      .map((part) => Number(part));
  },
});
