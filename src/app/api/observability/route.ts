import { NextResponse } from "next/server";

import { isBrowserProductAnalyticsEvent } from "@/domain/observability/product-analytics";
import { deliverBrowserProductEvent } from "@/server/observability/runtime-product-analytics";

const MAX_EVENT_BYTES = 4_096;

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ status: "invalid" }, { status: 415 });
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ status: "invalid" }, { status: 403 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_EVENT_BYTES) {
    return NextResponse.json({ status: "invalid" }, { status: 413 });
  }
  let value: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_EVENT_BYTES) {
      return NextResponse.json({ status: "invalid" }, { status: 413 });
    }
    value = JSON.parse(text) as unknown;
  } catch {
    return NextResponse.json({ status: "invalid" }, { status: 400 });
  }
  const now = new Date();
  if (!isBrowserProductAnalyticsEvent(value, now)) {
    return NextResponse.json({ status: "invalid" }, { status: 400 });
  }
  await deliverBrowserProductEvent(value);
  return new NextResponse(null, { status: 204 });
}
