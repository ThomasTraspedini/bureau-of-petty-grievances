import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { FilingJourney } from "@/features/filing/filing-journey";
import { isFilingStep } from "@/features/filing/filing-steps";
import { getRequestMessageCatalog } from "@/i18n/request-catalog";
import { routing } from "@/i18n/routing";

import { completeFilingReview } from "./actions";

interface FilingPageProps {
  params: Promise<{ locale: string; step: string }>;
  searchParams: Promise<{
    return?: string | string[];
    notice?: string | string[];
  }>;
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

  const messages = await getRequestMessageCatalog(locale);
  return (
    <FilingJourney
      locale={locale}
      step={step}
      returnToReview={query.return === "review"}
      determinationUnavailable={query.notice === "determination-unavailable"}
      evaluationAccess={query.notice === "evaluation-access"}
      copy={messages.Filing}
      navigation={messages.Navigation}
      completeFiling={completeFilingReview}
    />
  );
}
