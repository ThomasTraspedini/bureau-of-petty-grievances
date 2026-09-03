const HOSTNAME = /^(?!\.)(?!.*\.\.)(?!.*\.$)[A-Za-z0-9.-]+$/u;

export function parseAllowedDevOrigins(
  value: string | undefined,
): string[] | undefined {
  const configured = value
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!configured?.length) return undefined;

  const allowed: string[] = [];
  for (const origin of configured) {
    if (!HOSTNAME.test(origin)) {
      throw new Error(
        "BUREAU_ALLOWED_DEV_ORIGINS must contain comma-separated hostnames without protocols, ports, paths, or wildcards.",
      );
    }
    if (!allowed.includes(origin)) allowed.push(origin);
  }
  return allowed;
}
