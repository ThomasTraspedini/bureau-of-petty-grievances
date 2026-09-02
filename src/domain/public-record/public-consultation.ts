export const PUBLIC_CONSULTATION_POSITIONS = [
  "grievance_upheld",
  "grievance_dismissed",
  "upheld_with_circumstances_noted",
] as const;

export type PublicConsultationPosition =
  (typeof PUBLIC_CONSULTATION_POSITIONS)[number];

export interface PublicConsultationCounts {
  grievanceUpheld: number;
  grievanceDismissed: number;
  upheldWithCircumstancesNoted: number;
}

export interface PublicConsultationAggregate {
  total: number;
  counts: PublicConsultationCounts;
}

export function emptyPublicConsultationAggregate(): PublicConsultationAggregate {
  return {
    total: 0,
    counts: {
      grievanceUpheld: 0,
      grievanceDismissed: 0,
      upheldWithCircumstancesNoted: 0,
    },
  };
}

export function isPublicConsultationPosition(
  value: unknown,
): value is PublicConsultationPosition {
  return PUBLIC_CONSULTATION_POSITIONS.some((position) => position === value);
}

export function isPublicConsultationParticipationKey(
  value: unknown,
): value is string {
  return typeof value === "string" && /^cns_[A-Za-z0-9_-]{43}$/u.test(value);
}

export function consultationCount(
  aggregate: PublicConsultationAggregate,
  position: PublicConsultationPosition,
): number {
  switch (position) {
    case "grievance_upheld":
      return aggregate.counts.grievanceUpheld;
    case "grievance_dismissed":
      return aggregate.counts.grievanceDismissed;
    case "upheld_with_circumstances_noted":
      return aggregate.counts.upheldWithCircumstancesNoted;
  }
}

export function consultationPercentage(count: number, total: number): number {
  if (
    !Number.isSafeInteger(count) ||
    !Number.isSafeInteger(total) ||
    count < 0 ||
    total <= 0 ||
    count > total
  ) {
    return 0;
  }
  return Math.round((count / total) * 100);
}
