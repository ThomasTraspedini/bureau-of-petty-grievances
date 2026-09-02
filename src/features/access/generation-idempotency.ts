export const GENERATION_IDEMPOTENCY_STORAGE_KEY =
  "bpg:generation:idempotency:chronology:en:v1";

export function getOrCreateGenerationIdempotencyKey(
  storage: Pick<Storage, "getItem" | "setItem">,
  randomValues: (bytes: Uint8Array) => Uint8Array = (bytes) =>
    crypto.getRandomValues(bytes),
): string {
  const existing = storage.getItem(GENERATION_IDEMPOTENCY_STORAGE_KEY);
  if (/^fil_[A-Za-z0-9_-]{22}$/u.test(existing ?? "")) {
    return existing ?? "";
  }
  const bytes = randomValues(new Uint8Array(16));
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join(
    "",
  );
  const key = `fil_${btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "")}`;
  storage.setItem(GENERATION_IDEMPOTENCY_STORAGE_KEY, key);
  return key;
}
