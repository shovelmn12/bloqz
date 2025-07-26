export function generateShortID(): string {
  // performance.now() gives high-res time, toString(36) converts to a compact alphanumeric string
  const time = performance.now().toString(36);

  // Math.random() is not secure, but good enough for this.
  const random = Math.random().toString(36).substring(2);

  return `${time}${random}`.substring(0, 10); // Take the first 10 chars
}
