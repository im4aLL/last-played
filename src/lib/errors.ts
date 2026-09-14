/**
 * Tauri commands reject with the serialized error value, which for `AppError`
 * is a plain string rather than an `Error`. Calling `.message` on it silently
 * yields `undefined`, hiding the real reason. Normalize before showing it.
 */
export function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    return new Error(value);
  }
  if (value != null && typeof value === "object") {
    try {
      return new Error(JSON.stringify(value));
    } catch {
      // Circular or otherwise unserializable; fall through to String().
    }
  }
  if (value != null && String(value).trim().length > 0) {
    return new Error(String(value));
  }
  return new Error("Unknown error");
}

export function errorMessage(
  value: unknown,
  fallback = "Something went wrong.",
): string {
  const message = toError(value).message.trim();
  return message.length > 0 ? message : fallback;
}
