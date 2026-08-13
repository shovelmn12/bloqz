export function generateShortID(): string {
  // Date.now() is universally available (unlike performance.now(), which is
  // undefined in some SSR/older-Node environments). toString(36) converts it
  // to a compact alphanumeric string.
  const time = Date.now().toString(36);

  // Math.random() is not secure, but good enough for this.
  const random = Math.random().toString(36).substring(2);

  return `${time}${random}`.substring(0, 10); // Take the first 10 chars
}
