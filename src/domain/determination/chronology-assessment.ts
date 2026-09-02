import {
  type ChronologyFiling,
  type ImpactCode,
  type MitigationCode,
  type RelationshipCode,
} from "@/domain/filing/chronology";

export const CHRONOLOGY_ASSESSMENT_VERSION = 1 as const;

export const PROHIBITED_REMEDY_CODES = [
  "coercion",
  "exclusion",
  "health_or_safety_restriction",
  "material_deprivation",
  "monitoring",
  "public_humiliation",
] as const;

export type SeverityCode = "limited" | "established" | "material";
export type RemedyFamilyCode =
  | "arrival_notice_protocol"
  | "departure_language_protocol"
  | "estimate_calibration_protocol";
export type RemedyAudienceCode = "personal_private" | "professional_private";
export type ProhibitedRemedyCode = (typeof PROHIBITED_REMEDY_CODES)[number];

export type ChronologyDiscrepancy =
  | {
      kind: "delay";
      minutes: number;
    }
  | {
      kind: "estimate_overrun";
      minutes: number;
      estimatedMinutes: number;
      actualMinutes: number;
    };

export interface ChronologyAssessment {
  assessmentVersion: typeof CHRONOLOGY_ASSESSMENT_VERSION;
  locale: ChronologyFiling["locale"];
  department: ChronologyFiling["department"];
  offence: ChronologyFiling["offence"];
  discrepancy: ChronologyDiscrepancy;
  severity: {
    base: SeverityCode;
    assessed: SeverityCode;
    consequenceAdjustment: 0 | 1;
  };
  acceptedFactors: {
    impact: {
      code: ImpactCode;
      role: "aggravating" | "contextual";
      severityAdjustment: 0 | 1;
    };
    mitigation: {
      code: MitigationCode;
      role: "mitigating";
      remedyEffect: "caps_at_three_occasions";
    };
  };
  remedyConstraints: {
    family: RemedyFamilyCode;
    binding: "non_binding";
    audience: RemedyAudienceCode;
    maximumOccasions: 1 | 3;
    findingTreatment: "circumstances_noted";
    prohibited: readonly ProhibitedRemedyCode[];
  };
  presentation: {
    visualSeed: string;
    visualVariant: 0 | 1 | 2 | 3;
    timelineScaleMinutes: 15 | 30 | 60 | 120 | 180 | 360;
    markerPositionBasisPoints: number;
  };
}

export function assessChronologyFiling(
  filing: ChronologyFiling,
): ChronologyAssessment {
  const discrepancy = deriveDiscrepancy(filing);
  const baseSeverity = severityForMinutes(discrepancy.minutes);
  const consequenceAdjustment = filing.impact === "irritation_only" ? 0 : 1;
  const assessedSeverity = increaseSeverity(
    baseSeverity,
    consequenceAdjustment,
  );
  const remedyFamily = remedyFamilyFor(filing.offence);
  const timelineScaleMinutes = timelineScaleFor(discrepancy.minutes);
  const seedNumber = stableHash([
    String(CHRONOLOGY_ASSESSMENT_VERSION),
    filing.offence,
    baseSeverity,
    filing.impact,
    filing.mitigation,
    remedyFamily,
  ]);

  return {
    assessmentVersion: CHRONOLOGY_ASSESSMENT_VERSION,
    locale: filing.locale,
    department: filing.department,
    offence: filing.offence,
    discrepancy,
    severity: {
      base: baseSeverity,
      assessed: assessedSeverity,
      consequenceAdjustment,
    },
    acceptedFactors: {
      impact: {
        code: filing.impact,
        role: consequenceAdjustment === 1 ? "aggravating" : "contextual",
        severityAdjustment: consequenceAdjustment,
      },
      mitigation: {
        code: filing.mitigation,
        role: "mitigating",
        remedyEffect: "caps_at_three_occasions",
      },
    },
    remedyConstraints: {
      family: remedyFamily,
      binding: "non_binding",
      audience: remedyAudienceFor(filing.relationship),
      maximumOccasions: assessedSeverity === "limited" ? 1 : 3,
      findingTreatment: "circumstances_noted",
      prohibited: PROHIBITED_REMEDY_CODES,
    },
    presentation: {
      visualSeed: seedNumber.toString(16).padStart(8, "0"),
      visualVariant: visualVariantFor(seedNumber),
      timelineScaleMinutes,
      markerPositionBasisPoints: Math.round(
        (discrepancy.minutes / timelineScaleMinutes) * 10_000,
      ),
    },
  };
}

function deriveDiscrepancy(filing: ChronologyFiling): ChronologyDiscrepancy {
  if (filing.offence === "optimistic_estimate") {
    return {
      kind: "estimate_overrun",
      minutes: filing.facts.actualMinutes - filing.facts.estimatedMinutes,
      estimatedMinutes: filing.facts.estimatedMinutes,
      actualMinutes: filing.facts.actualMinutes,
    };
  }

  return {
    kind: "delay",
    minutes: filing.facts.delayMinutes,
  };
}

function severityForMinutes(minutes: number): SeverityCode {
  if (minutes >= 30) return "material";
  if (minutes >= 15) return "established";
  return "limited";
}

function increaseSeverity(
  severity: SeverityCode,
  adjustment: 0 | 1,
): SeverityCode {
  if (adjustment === 0 || severity === "material") return severity;
  return severity === "limited" ? "established" : "material";
}

function remedyFamilyFor(
  offence: ChronologyFiling["offence"],
): RemedyFamilyCode {
  switch (offence) {
    case "premature_departure":
      return "departure_language_protocol";
    case "chronic_lateness":
      return "arrival_notice_protocol";
    case "optimistic_estimate":
      return "estimate_calibration_protocol";
  }
}

function remedyAudienceFor(relationship: RelationshipCode): RemedyAudienceCode {
  return relationship === "colleague"
    ? "professional_private"
    : "personal_private";
}

function timelineScaleFor(minutes: number): 15 | 30 | 60 | 120 | 180 | 360 {
  if (minutes <= 15) return 15;
  if (minutes <= 30) return 30;
  if (minutes <= 60) return 60;
  if (minutes <= 120) return 120;
  if (minutes <= 180) return 180;
  return 360;
}

function stableHash(parts: readonly string[]): number {
  let hash = 0x811c9dc5;
  for (const character of parts.join("|")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

function visualVariantFor(hash: number): 0 | 1 | 2 | 3 {
  switch (hash % 4) {
    case 0:
      return 0;
    case 1:
      return 1;
    case 2:
      return 2;
    default:
      return 3;
  }
}
