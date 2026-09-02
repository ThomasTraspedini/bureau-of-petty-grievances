import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { FilingJourney } from "@/features/filing/filing-journey";
import { isFilingStep } from "@/features/filing/filing-steps";
import { getMessageCatalog } from "@/i18n/catalogs";
import { routing } from "@/i18n/routing";

import { completeFilingReview } from "./actions";

interface FilingPageProps {
  params: Promise<{ locale: string; step: string }>;
  searchParams: Promise<{ return?: string | string[] }>;
}

export default async function FilingPage({
  params,
  searchParams,
}: FilingPageProps) {
  const { locale, step } = await params;
  const query = await searchParams;

  if (!hasLocale(routing.locales, locale) || !isFilingStep(step)) {
    notFound();
  }

  const messages = getMessageCatalog(locale);
  return (
    <FilingJourney
      locale={locale}
      step={step}
      returnToReview={query.return === "review"}
      copy={messages.Filing}
      navigation={messages.Navigation}
      completeFiling={completeFilingReview}
    />
  );
}
