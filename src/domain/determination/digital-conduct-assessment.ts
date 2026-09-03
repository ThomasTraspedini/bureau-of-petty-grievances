import type {
  DigitalConductFiling,
  DigitalConductImpactCode,
  DigitalConductMitigationCode,
} from "@/domain/filing/digital-conduct";
import type { RelationshipCode } from "@/domain/filing/chronology";
import type {
  ProhibitedRemedyCode,
  RemedyAudienceCode,
  SeverityCode,
} from "./chronology-assessment";

export const DIGITAL_CONDUCT_ASSESSMENT_VERSION = 1 as const;

export const DIGITAL_CONDUCT_PROHIBITED_REMEDY_CODES = [
  "coercion",
  "exclusion",
  "health_or_safety_restriction",
  "material_deprivation",
  "monitoring",
  "public_humiliation",
  "compelled_availability",
  "response_surveillance",
  "urgency_assumption",
] as const;

export type DigitalConductProhibitedRemedyCode =
  | ProhibitedRemedyCode
  | "compelled_availability"
  | "response_surveillance"
  | "urgency_assumption";

export type DigitalConductRemedyFamilyCode =
  | "message_batching_protocol"
  | "voice_note_summary_protocol"
  | "coordination_acknowledgement_protocol";

export type DigitalConductEvidence =
  | {
      kind: "message_density";
      messageCount: number;
      ideaCount: number;
      burstMinutes: number;
      messagesPerIdeaBasisPoints: number;
    }
  | {
      kind: "voice_note_duration";
      durationMinutes: number;
      ideaCount: number;
      minutesPerIdeaBasisPoints: number;
    }
  | {
      kind: "response_interval";
      responseHours: number;
      followUpCount: number;
    };

export interface DigitalConductAssessment {
  assessmentVersion: typeof DIGITAL_CONDUCT_ASSESSMENT_VERSION;
  locale: DigitalConductFiling["locale"];
  department: DigitalConductFiling["department"];
  offence: DigitalConductFiling["offence"];
  evidence: DigitalConductEvidence;
  severity: {
    base: SeverityCode;
    assessed: SeverityCode;
    consequenceAdjustment: 0 | 1;
  };
  acceptedFactors: {
    impact: {
      code: DigitalConductImpactCode;
      role: "aggravating" | "contextual";
      severityAdjustment: 0 | 1;
    };
    mitigation: {
      code: DigitalConductMitigationCode;
      role: "mitigating";
      remedyEffect: "caps_at_three_occasions";
    };
  };
  remedyConstraints: {
    family: DigitalConductRemedyFamilyCode;
    binding: "non_binding";
    audience: RemedyAudienceCode;
    maximumOccasions: 1 | 3;
    findingTreatment: "circumstances_noted";
    prohibited: readonly DigitalConductProhibitedRemedyCode[];
  };
  presentation: {
    visualSeed: string;
    visualVariant: 0 | 1 | 2 | 3;
    itemCount: number;
    densityBasisPoints: number;
    intervalScale: 10 | 30 | 60 | 240 | 720 | 1440 | 2880 | 10080;
    markerPositionBasisPoints: number;
  };
}

export function assessDigitalConductFiling(
  filing: DigitalConductFiling,
): DigitalConductAssessment {
  const evidence = evidenceFor(filing);
  const base = severityFor(filing, evidence);
  const consequenceAdjustment = filing.impact === "irritation_only" ? 0 : 1;
  const assessed = increaseSeverity(base, consequenceAdjustment);
  const family = remedyFamilyFor(filing.offence);
  const presentation = presentationFor(evidence);
  const seed = stableHash([
    String(DIGITAL_CONDUCT_ASSESSMENT_VERSION),
    filing.offence,
    base,
    filing.impact,
    filing.mitigation,
    family,
  ]);

  return {
    assessmentVersion: DIGITAL_CONDUCT_ASSESSMENT_VERSION,
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
      prohibited: DIGITAL_CONDUCT_PROHIBITED_REMEDY_CODES,
    },
    presentation: {
      visualSeed: seed.toString(16).padStart(8, "0"),
      visualVariant: visualVariantFor(seed),
      ...presentation,
    },
  };
}

function evidenceFor(filing: DigitalConductFiling): DigitalConductEvidence {
  switch (filing.offence) {
    case "fragmented_messages":
      return {
        kind: "message_density",
        ...filing.facts,
        messagesPerIdeaBasisPoints: Math.round(
          (filing.facts.messageCount / filing.facts.ideaCount) * 10_000,
        ),
      };
    case "excessive_voice_note":
      return {
        kind: "voice_note_duration",
        ...filing.facts,
        minutesPerIdeaBasisPoints: Math.round(
          (filing.facts.durationMinutes / filing.facts.ideaCount) * 10_000,
        ),
      };
    case "unacknowledged_coordination":
      return { kind: "response_interval", ...filing.facts };
  }
}

function severityFor(
  filing: DigitalConductFiling,
  evidence: DigitalConductEvidence,
): SeverityCode {
  if (
    filing.offence === "fragmented_messages" &&
    evidence.kind === "message_density"
  ) {
    const ratio = evidence.messagesPerIdeaBasisPoints / 10_000;
    if (evidence.messageCount >= 12 || ratio >= 6) return "material";
    if (evidence.messageCount >= 7 || ratio >= 3) return "established";
    return "limited";
  }
  if (
    filing.offence === "excessive_voice_note" &&
    evidence.kind === "voice_note_duration"
  ) {
    if (evidence.durationMinutes >= 10) return "material";
    if (evidence.durationMinutes >= 5) return "established";
    return "limited";
  }
  if (evidence.kind === "response_interval") {
    if (evidence.responseHours >= 48) return "material";
    if (evidence.responseHours >= 12) return "established";
  }
  return "limited";
}

function presentationFor(evidence: DigitalConductEvidence) {
  if (evidence.kind === "message_density") {
    return {
      itemCount: evidence.messageCount,
      densityBasisPoints: Math.min(
        10_000,
        Math.round((evidence.messageCount / 12) * 10_000),
      ),
      intervalScale: 60 as const,
      markerPositionBasisPoints: Math.min(
        10_000,
        Math.round((evidence.burstMinutes / 60) * 10_000),
      ),
    };
  }
  if (evidence.kind === "voice_note_duration") {
    const scale: 10 | 30 | 60 =
      evidence.durationMinutes <= 10
        ? 10
        : evidence.durationMinutes <= 30
          ? 30
          : 60;
    return {
      itemCount: evidence.ideaCount,
      densityBasisPoints: Math.min(
        10_000,
        Math.round(
          (evidence.durationMinutes / evidence.ideaCount / 10) * 10_000,
        ),
      ),
      intervalScale: scale,
      markerPositionBasisPoints: Math.round(
        (evidence.durationMinutes / scale) * 10_000,
      ),
    };
  }
  const scale = intervalScaleForHours(evidence.responseHours);
  return {
    itemCount: evidence.followUpCount,
    densityBasisPoints: Math.min(
      10_000,
      Math.round((evidence.followUpCount / 6) * 10_000),
    ),
    intervalScale: scale,
    markerPositionBasisPoints: Math.round(
      ((evidence.responseHours * 60) / scale) * 10_000,
    ),
  };
}

function intervalScaleForHours(hours: number): 240 | 720 | 1440 | 2880 | 10080 {
  if (hours <= 4) return 240;
  if (hours <= 12) return 720;
  if (hours <= 24) return 1440;
  if (hours <= 48) return 2880;
  return 10080;
}

function remedyFamilyFor(
  offence: DigitalConductFiling["offence"],
): DigitalConductRemedyFamilyCode {
  switch (offence) {
    case "fragmented_messages":
      return "message_batching_protocol";
    case "excessive_voice_note":
      return "voice_note_summary_protocol";
    case "unacknowledged_coordination":
      return "coordination_acknowledgement_protocol";
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
