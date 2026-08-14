/**
 * Convert a backend timestamp to a Date.
 * Backend may return epoch seconds (number) or ISO 8601 string.
 */
export function toDate(v: number | string): Date {
  if (typeof v === "number") {
    return new Date(v * 1000);
  }
  return new Date(v);
}
