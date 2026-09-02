const LOCAL_PUBLIC_ORIGIN = "http://localhost:3000";

export type PublicRecordOriginResult =
  { status: "valid"; origin: string } | { status: "missing" | "invalid" };

export function resolvePublicRecordOrigin(
  configuredOrigin: string | undefined,
  environment: string | undefined,
): PublicRecordOriginResult {
  const candidate = configuredOrigin?.trim();
  if (!candidate) {
    return environment === "production"
      ? { status: "missing" }
      : { status: "valid", origin: LOCAL_PUBLIC_ORIGIN };
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { status: "invalid" };
  }

  const loopback =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]";
  const supportedProtocol =
    url.protocol === "https:" || (url.protocol === "http:" && loopback);
  if (
    !supportedProtocol ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    return { status: "invalid" };
  }

  return { status: "valid", origin: url.origin };
}

export function getRuntimePublicRecordOrigin(): PublicRecordOriginResult {
  return resolvePublicRecordOrigin(
    process.env.BUREAU_PUBLIC_ORIGIN,
    process.env.NODE_ENV,
  );
}
