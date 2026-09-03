import type {
  DomesticAffairsFiling,
  DomesticAffairsImpactCode,
  DomesticAffairsMitigationCode,
} from "@/domain/filing/domestic-affairs";
import type { RelationshipCode } from "@/domain/filing/chronology";
import type {
  ProhibitedRemedyCode,
  RemedyAudienceCode,
  SeverityCode,
} from "./chronology-assessment";

export const DOMESTIC_AFFAIRS_ASSESSMENT_VERSION = 1 as const;

export const DOMESTIC_AFFAIRS_PROHIBITED_REMEDY_CODES = [
  "coercion",
  "exclusion",
  "health_or_safety_restriction",
  "material_deprivation",
  "monitoring",
  "public_humiliation",
  "household_surveillance",
  "hygiene_enforcement",
  "food_restriction",
  "property_disposal",
  "financial_penalty",
] as const;

export type DomesticAffairsProhibitedRemedyCode =
  | ProhibitedRemedyCode
  | "household_surveillance"
  | "hygiene_enforcement"
  | "food_restriction"
  | "property_disposal"
  | "financial_penalty";

export type DomesticAffairsRemedyFamilyCode =
  | "container_completion_protocol"
  | "correct_location_protocol"
  | "empty_packaging_protocol";

export type DomesticAffairsEvidence =
  | {
      kind: "container_remainder";
      remainingServings: number;
      capacityServings: number;
      remainingBasisPoints: number;
    }
  | {
      kind: "correction_path";
      itemCount: number;
      distanceSteps: number;
      correctionSeconds: number;
    }
  | {
      kind: "empty_inventory";
      emptyPackageCount: number;
      recurrencesInThirtyDays: number;
    };

export interface DomesticAffairsAssessment {
  assessmentVersion: typeof DOMESTIC_AFFAIRS_ASSESSMENT_VERSION;
  locale: DomesticAffairsFiling["locale"];
  department: DomesticAffairsFiling["department"];
  offence: DomesticAffairsFiling["offence"];
  evidence: DomesticAffairsEvidence;
  severity: {
    base: SeverityCode;
    assessed: SeverityCode;
    consequenceAdjustment: 0 | 1;
  };
  acceptedFactors: {
    impact: {
      code: DomesticAffairsImpactCode;
      role: "aggravating" | "contextual";
      severityAdjustment: 0 | 1;
    };
    mitigation: {
      code: DomesticAffairsMitigationCode;
      role: "mitigating";
      remedyEffect: "caps_at_three_occasions";
    };
  };
  remedyConstraints: {
    family: DomesticAffairsRemedyFamilyCode;
    binding: "non_binding";
    audience: RemedyAudienceCode;
    maximumOccasions: 1 | 3;
    findingTreatment: "circumstances_noted";
    prohibited: readonly DomesticAffairsProhibitedRemedyCode[];
  };
  presentation: {
    visualSeed: string;
    visualVariant: 0 | 1 | 2 | 3;
    itemCount: number;
    primaryBasisPoints: number;
    secondaryBasisPoints: number;
  };
}

export function assessDomesticAffairsFiling(
  filing: DomesticAffairsFiling,
): DomesticAffairsAssessment {
  const evidence = evidenceFor(filing);
  const base = severityFor(evidence);
  const consequenceAdjustment = filing.impact === "irritation_only" ? 0 : 1;
  const assessed = increaseSeverity(base, consequenceAdjustment);
  const family = remedyFamilyFor(filing.offence);
  const seed = stableHash([
    String(DOMESTIC_AFFAIRS_ASSESSMENT_VERSION),
    filing.offence,
    base,
    filing.impact,
    filing.mitigation,
    family,
  ]);
  return {
    assessmentVersion: DOMESTIC_AFFAIRS_ASSESSMENT_VERSION,
    locale: filing.locale,
    department: filing.department,
    offence: filing.offence,
    evidence,
    severity: { base, assessed, consequenceAdjustment },
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
      family,
      binding: "non_binding",
      audience: audienceFor(filing.relationship),
      maximumOccasions: assessed === "limited" ? 1 : 3,
      findingTreatment: "circumstances_noted",
      prohibited: DOMESTIC_AFFAIRS_PROHIBITED_REMEDY_CODES,
    },
    presentation: {
      visualSeed: seed.toString(16).padStart(8, "0"),
      visualVariant: visualVariantFor(seed),
      ...presentationFor(evidence),
    },
  };
}

function evidenceFor(filing: DomesticAffairsFiling): DomesticAffairsEvidence {
  switch (filing.offence) {
    case "token_remainder":
      return {
        kind: "container_remainder",
        ...filing.facts,
        remainingBasisPoints: Math.round(
          (filing.facts.remainingServings / filing.facts.capacityServings) *
            10_000,
        ),
      };
    case "misplaced_object":
      return { kind: "correction_path", ...filing.facts };
    case "empty_packaging":
      return { kind: "empty_inventory", ...filing.facts };
  }
}

function severityFor(evidence: DomesticAffairsEvidence): SeverityCode {
  if (evidence.kind === "container_remainder") {
    if (evidence.remainingBasisPoints <= 500) return "material";
    if (evidence.remainingBasisPoints <= 1_500) return "established";
    return "limited";
  }
  if (evidence.kind === "correction_path") {
    if (
      evidence.itemCount >= 6 ||
      evidence.distanceSteps >= 20 ||
      evidence.correctionSeconds >= 120
    )
      return "material";
    if (
      evidence.itemCount >= 3 ||
      evidence.distanceSteps >= 8 ||
      evidence.correctionSeconds >= 30
    )
      return "established";
    return "limited";
  }
  if (evidence.emptyPackageCount >= 5 || evidence.recurrencesInThirtyDays >= 8)
    return "material";
  if (evidence.emptyPackageCount >= 2 || evidence.recurrencesInThirtyDays >= 4)
    return "established";
  return "limited";
}

function presentationFor(evidence: DomesticAffairsEvidence) {
  if (evidence.kind === "container_remainder") {
    return {
      itemCount: evidence.remainingServings,
      primaryBasisPoints: evidence.remainingBasisPoints,
      secondaryBasisPoints: Math.min(
        10_000,
        Math.round((evidence.capacityServings / 24) * 10_000),
      ),
    };
  }
  if (evidence.kind === "correction_path") {
    return {
      itemCount: evidence.itemCount,
      primaryBasisPoints: Math.min(
        10_000,
        Math.round((evidence.distanceSteps / 50) * 10_000),
      ),
      secondaryBasisPoints: Math.min(
        10_000,
        Math.round((evidence.correctionSeconds / 300) * 10_000),
      ),
    };
  }
  return {
    itemCount: evidence.emptyPackageCount,
    primaryBasisPoints: Math.min(
      10_000,
      Math.round((evidence.emptyPackageCount / 10) * 10_000),
    ),
    secondaryBasisPoints: Math.min(
      10_000,
      Math.round((evidence.recurrencesInThirtyDays / 30) * 10_000),
    ),
  };
}

function remedyFamilyFor(
  offence: DomesticAffairsFiling["offence"],
): DomesticAffairsRemedyFamilyCode {
  switch (offence) {
    case "token_remainder":
      return "container_completion_protocol";
    case "misplaced_object":
      return "correct_location_protocol";
    case "empty_packaging":
      return "empty_packaging_protocol";
  }
}

function audienceFor(relationship: RelationshipCode): RemedyAudienceCode {
  return relationship === "colleague"
    ? "professional_private"
    : "personal_private";
}

function increaseSeverity(
  severity: SeverityCode,
  adjustment: 0 | 1,
): SeverityCode {
  if (adjustment === 0 || severity === "material") return severity;
  return severity === "limited" ? "established" : "material";
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
