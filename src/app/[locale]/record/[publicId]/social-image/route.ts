import { unstable_noStore } from "next/cache";
import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { hasLocale } from "next-intl";

import { createPublicRecordShareDescriptor } from "@/domain/public-record/public-record-sharing";
import { renderPublicRecordSocialImage } from "@/features/public-record/public-record-social-image";
import { localizePublicRecordShare } from "@/features/public-record/public-record-sharing-copy";
import { getMessageCatalog } from "@/i18n/catalogs";
import { routing } from "@/i18n/routing";
import { getPublicRecordWith } from "@/server/public-record/public-record-service";
import { getRuntimePublicRecordRepository } from "@/server/public-record/runtime-public-records";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const IMAGE_SIZE = { width: 1200, height: 630 } as const;
const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noimageindex",
} as const;

interface SocialImageRouteContext {
  params: Promise<{ locale: string; publicId: string }>;
}

export async function GET(
  request: Request,
  { params }: SocialImageRouteContext,
): Promise<Response> {
  unstable_noStore();
  await connection();
  const { locale, publicId } = await params;
  if (!hasLocale(routing.locales, locale)) return unavailableImage();
  const repository = await getRuntimePublicRecordRepository();
  if (repository === null) return unavailableImage();
  const result = await getPublicRecordWith(publicId, repository, new Date());
  if (result.status !== "available") return unavailableImage();
  const requestedRevision = new URL(request.url).searchParams.get("v");
  if (requestedRevision !== result.record.updatedAt) return unavailableImage();

  const descriptor = createPublicRecordShareDescriptor(result.record);
  const localized = localizePublicRecordShare(
    descriptor,
    locale,
    getMessageCatalog(locale).Sharing,
  );
  return new ImageResponse(
    renderPublicRecordSocialImage(descriptor, localized),
    {
      ...IMAGE_SIZE,
      headers: NO_STORE_HEADERS,
    },
  );
}

function unavailableImage(): Response {
  return new Response(null, { status: 404, headers: NO_STORE_HEADERS });
}
