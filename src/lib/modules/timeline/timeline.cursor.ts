export function encodeTimelineCursor(createdAt: Date, id: string) {
  return `${createdAt.toISOString()}|${id}`;
}

export function decodeTimelineCursor(cursor: string) {
  const separator = cursor.indexOf("|");
  if (separator === -1) return null;

  const createdAt = new Date(cursor.slice(0, separator));
  const id = cursor.slice(separator + 1);

  if (Number.isNaN(createdAt.getTime()) || !id) return null;
  return { createdAt, id };
}
