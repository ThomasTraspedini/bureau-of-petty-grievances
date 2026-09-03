import type { DepartmentCode } from "@/domain/filing/filing";
import type { ProductLocale } from "@/domain/locale";

export function generationIdempotencyStorageKey(
  locale: ProductLocale,
  department: DepartmentCode,
): string {
  return `bpg:generation:idempotency:${department}:${locale}:v2`;
}

export const GENERATION_IDEMPOTENCY_STORAGE_KEY =
  generationIdempotencyStorageKey("en", "chronology");

export function getOrCreateGenerationIdempotencyKey(
  storage: Pick<Storage, "getItem" | "setItem">,
  storageKey = GENERATION_IDEMPOTENCY_STORAGE_KEY,
  randomValues: (bytes: Uint8Array) => Uint8Array = (bytes) =>
    crypto.getRandomValues(bytes),
): string {
  const existing = storage.getItem(storageKey);
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
  storage.setItem(storageKey, key);
  return key;
}
