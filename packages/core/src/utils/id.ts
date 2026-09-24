/** @internal Monotonic counter that keeps fallback IDs unique within a process. */
let fallbackCounter = 0;

/**
 * Generates a collision-resistant ID for a Bloc instance.
 *
 * Uses `crypto.randomUUID()` (a full 36-character UUID v4) when the runtime
 * provides it (modern browsers, Node >= 19, Deno, Bun). Otherwise falls back to
 * a non-cryptographic ID built from the current time, a per-process counter
 * and random characters (at least 16 characters long).
 *
 * @internal
 */
export function generateShortID(): string {
  const uuid = (
    globalThis as { crypto?: { randomUUID?: () => string } }
  ).crypto?.randomUUID?.();
  if (uuid) return uuid;

  // Date.now() is universally available (unlike performance.now(), which is
  // undefined in some SSR/older-Node environments). toString(36) converts it
  // to a compact alphanumeric string.
  const time = Date.now().toString(36);
  const counter = (fallbackCounter++).toString(36);

  // Math.random() is not secure, but good enough for an identifier.
  const random = () => Math.random().toString(36).substring(2).padEnd(8, "0");

  return `${time}${counter}${random()}${random()}`;
}
