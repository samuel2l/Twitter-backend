export type ForYouTier = "personalized" | "exploration" | "seen";

export function encodeForYouCursor(tier: ForYouTier, offset: number) {
  return `${tier}:${offset}`;
}

export function decodeForYouCursor(cursor: string) {
  const separator = cursor.indexOf(":");
  if (separator === -1) return null;

  const tier = cursor.slice(0, separator) as ForYouTier;
  const offset = Number(cursor.slice(separator + 1));

  if (!["personalized", "exploration", "seen"].includes(tier)) return null;
  if (!Number.isInteger(offset) || offset < 0) return null;

  return { tier, offset };
}

export function nextTier(tier: ForYouTier): ForYouTier | null {
  if (tier === "personalized") return "exploration";
  if (tier === "exploration") return "seen";
  return null;
}
