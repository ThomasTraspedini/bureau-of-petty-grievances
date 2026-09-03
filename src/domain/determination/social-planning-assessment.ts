import type {
  SocialPlanningFiling,
  SocialPlanningImpactCode,
  SocialPlanningMitigationCode,
} from "@/domain/filing/social-planning";
import type { RelationshipCode } from "@/domain/filing/chronology";
import type {
  ProhibitedRemedyCode,
  RemedyAudienceCode,
  SeverityCode,
} from "./chronology-assessment";

export const SOCIAL_PLANNING_ASSESSMENT_VERSION = 1 as const;

export const SOCIAL_PLANNING_PROHIBITED_REMEDY_CODES = [
  "coercion",
  "exclusion",
  "health_or_safety_restriction",
  "material_deprivation",
  "monitoring",
  "public_humiliation",
  "social_surveillance",
  "compelled_attendance",
  "compelled_contact",
  "social_exclusion",
  "serious_matter_adjudication",
] as const;

export type SocialPlanningProhibitedRemedyCode =
  | ProhibitedRemedyCode
  | "social_surveillance"
  | "compelled_attendance"
  | "compelled_contact"
  | "social_exclusion"
  | "serious_matter_adjudication";

export type SocialPlanningRemedyFamilyCode =
  | "bounded_shortlist_protocol"
  | "decision_point_protocol"
  | "revision_notice_protocol";

export type SocialPlanningEvidence =
  | {
      kind: "option_tree";
      proposedOptionCount: number;
      rejectedOptionCount: number;
      alternativeOptionCount: number;
      rejectionBasisPoints: number;
    }
  | {
      kind: "decision_history";
      decisionRoundCount: number;
      elapsedHours: number;
      participantCount: number;
    }
  | {
      kind: "revision_impact";
      revisionCount: number;
      participantCount: number;
      noticeHours: number;
    };

export interface SocialPlanningAssessment {
  assessmentVersion: typeof SOCIAL_PLANNING_ASSESSMENT_VERSION;
  locale: SocialPlanningFiling["locale"];
  department: SocialPlanningFiling["department"];
  offence: SocialPlanningFiling["offence"];
  evidence: SocialPlanningEvidence;
  severity: {
    base: SeverityCode;
    assessed: SeverityCode;
    consequenceAdjustment: 0 | 1;
  };
  acceptedFactors: {
    impact: {
      code: SocialPlanningImpactCode;
      role: "aggravating" | "contextual";
      severityAdjustment: 0 | 1;
    };
    mitigation: {
      code: SocialPlanningMitigationCode;
      role: "mitigating";
      remedyEffect: "caps_at_three_occasions";
    };
  };
  remedyConstraints: {
    family: SocialPlanningRemedyFamilyCode;
    binding: "non_binding";
    audience: RemedyAudienceCode;
    maximumOccasions: 1 | 3;
    findingTreatment: "circumstances_noted";
    prohibited: readonly SocialPlanningProhibitedRemedyCode[];
  };
  presentation: {
    visualSeed: string;
    visualVariant: 0 | 1 | 2 | 3;
    itemCount: number;
    primaryBasisPoints: number;
    secondaryBasisPoints: number;
  };
}

export function assessSocialPlanningFiling(
  filing: SocialPlanningFiling,
): SocialPlanningAssessment {
  const evidence = evidenceFor(filing);
  const base = severityFor(evidence);
  const consequenceAdjustment = filing.impact === "irritation_only" ? 0 : 1;
  const assessed = increaseSeverity(base, consequenceAdjustment);
  const family = remedyFamilyFor(filing.offence);
  const seed = stableHash([
    String(SOCIAL_PLANNING_ASSESSMENT_VERSION),
    filing.offence,
    base,
    filing.impact,
    filing.mitigation,
    family,
  ]);
  return {
    assessmentVersion: SOCIAL_PLANNING_ASSESSMENT_VERSION,
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
      prohibited: SOCIAL_PLANNING_PROHIBITED_REMEDY_CODES,
    },
    presentation: {
      visualSeed: seed.toString(16).padStart(8, "0"),
      visualVariant: visualVariantFor(seed),
      ...presentationFor(evidence),
    },
  };
}

function evidenceFor(filing: SocialPlanningFiling): SocialPlanningEvidence {
  switch (filing.offence) {
    case "option_veto_cycle":
      return {
        kind: "option_tree",
        ...filing.facts,
        rejectionBasisPoints: Math.round(
          (filing.facts.rejectedOptionCount /
            filing.facts.proposedOptionCount) *
            10_000,
        ),
      };
    case "decision_drift":
      return { kind: "decision_history", ...filing.facts };
    case "confirmed_plan_revision":
      return { kind: "revision_impact", ...filing.facts };
  }
}

function severityFor(evidence: SocialPlanningEvidence): SeverityCode {
  if (evidence.kind === "option_tree") {
    if (
      evidence.rejectedOptionCount >= 8 ||
      (evidence.rejectionBasisPoints === 10_000 &&
        evidence.alternativeOptionCount === 0)
    )
      return "material";
    if (
      evidence.rejectedOptionCount >= 4 ||
      evidence.rejectionBasisPoints >= 7_500
    )
      return "established";
    return "limited";
  }
  if (evidence.kind === "decision_history") {
    if (
      evidence.decisionRoundCount >= 8 ||
      evidence.elapsedHours >= 168 ||
      evidence.participantCount >= 10
    )
      return "material";
    if (
      evidence.decisionRoundCount >= 4 ||
      evidence.elapsedHours >= 48 ||
      evidence.participantCount >= 5
    )
      return "established";
    return "limited";
  }
  if (
    evidence.revisionCount >= 4 ||
    evidence.participantCount >= 10 ||
    evidence.noticeHours <= 1
  )
    return "material";
  if (
    evidence.revisionCount >= 2 ||
    evidence.participantCount >= 5 ||
    evidence.noticeHours < 24
  )
    return "established";
  return "limited";
}

function presentationFor(evidence: SocialPlanningEvidence) {
  if (evidence.kind === "option_tree") {
    return {
      itemCount: evidence.proposedOptionCount,
      primaryBasisPoints: evidence.rejectionBasisPoints,
      secondaryBasisPoints: Math.min(
        10_000,
        Math.round((evidence.alternativeOptionCount / 10) * 10_000),
      ),
    };
  }
  if (evidence.kind === "decision_history") {
    return {
      itemCount: evidence.decisionRoundCount,
      primaryBasisPoints: Math.min(
        10_000,
        Math.round((evidence.elapsedHours / 336) * 10_000),
      ),
      secondaryBasisPoints: Math.min(
        10_000,
        Math.round((evidence.participantCount / 20) * 10_000),
      ),
    };
  }
  return {
    itemCount: evidence.revisionCount,
    primaryBasisPoints: Math.min(
      10_000,
      Math.round((evidence.participantCount / 20) * 10_000),
    ),
    secondaryBasisPoints: Math.max(
      0,
      10_000 - Math.round((evidence.noticeHours / 168) * 10_000),
    ),
  };
}

function remedyFamilyFor(
  offence: SocialPlanningFiling["offence"],
): SocialPlanningRemedyFamilyCode {
  switch (offence) {
    case "option_veto_cycle":
      return "bounded_shortlist_protocol";
    case "decision_drift":
      return "decision_point_protocol";
    case "confirmed_plan_revision":
      return "revision_notice_protocol";
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
