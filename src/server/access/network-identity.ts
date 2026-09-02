import { createHmac } from "node:crypto";

export function createNetworkDigest(
  requestHeaders: Pick<Headers, "get">,
  now: Date,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string | null {
  const configuredSecret = environment.BUREAU_NETWORK_HMAC_SECRET?.trim();
  const secret =
    configuredSecret ??
    (environment.NODE_ENV === "production"
      ? null
      : "bureau-local-network-boundary-development-only");
  if (secret === null || secret.length < 32) return null;

  const trustedHopsText = environment.BUREAU_TRUSTED_PROXY_HOPS?.trim();
  const trustedHops = Number(trustedHopsText ?? "0");
  if (!Number.isSafeInteger(trustedHops) || trustedHops < 0) return null;

  const forwarded = requestHeaders.get("x-forwarded-for");
  const addresses = forwarded
    ?.split(",")
    .map((address) => address.trim())
    .filter(Boolean);
  const index = (addresses?.length ?? 0) - 1 - trustedHops;
  const address = index >= 0 ? addresses?.[index] : null;
  if (!address) return null;

  const day = now.toISOString().slice(0, 10);
  return createHmac("sha256", secret)
    .update(`${day}|${normalizeAddress(address)}`)
    .digest("hex");
}

function normalizeAddress(address: string): string {
  const value = address.normalize("NFKC").trim().toLowerCase();
  return value.startsWith("::ffff:") ? value.slice(7) : value;
}
