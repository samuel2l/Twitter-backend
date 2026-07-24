export function encodeForYouCursor(distance: number, id: string) {
  return `${distance}|${id}`;
}

export function decodeForYouCursor(cursor: string) {
  const separator = cursor.indexOf("|");
  if (separator === -1) return null;

  const distance = Number(cursor.slice(0, separator));
  const id = cursor.slice(separator + 1);

  if (!Number.isFinite(distance) || !id) return null;
  return { distance, id };
}
