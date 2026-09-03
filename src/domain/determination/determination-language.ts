import {
  assessChronologyFiling,
  type ChronologyAssessment,
  type ProhibitedRemedyCode,
  type RemedyAudienceCode,
  type RemedyFamilyCode,
  type SeverityCode,
} from "@/domain/determination/chronology-assessment";
import {
  type ChronologyFiling,
  type ImpactCode,
  type MitigationCode,
} from "@/domain/filing/chronology";
import {
  assessDigitalConductFiling,
  type DigitalConductAssessment,
  type DigitalConductProhibitedRemedyCode,
  type DigitalConductRemedyFamilyCode,
} from "@/domain/determination/digital-conduct-assessment";
import type {
  DigitalConductFiling,
  DigitalConductImpactCode,
  DigitalConductMitigationCode,
} from "@/domain/filing/digital-conduct";
import type { DeterminationAssessment } from "./assessment";
import type { Filing } from "@/domain/filing/filing";

export const DETERMINATION_LANGUAGE_SCHEMA_VERSION = 1 as const;

export const DETERMINATION_DISPOSITION_CODES = [
  "upheld_with_circumstances_noted",
] as const;

export const GROUNDING_REFERENCE_CODES = [
  "offence",
  "discrepancy",
  "severity",
  "impact",
  "mitigation",
  "witness_statement",
  "remedy_family",
  "remedy_limit",
  "relationship_context",
  "evidence",
] as const;

export const DETERMINATION_LANGUAGE_LIMITS = {
  allegation: 220,
  finding: 280,
  consequence: 180,
  mitigation: 180,
  remedyTitle: 72,
  remedyInstruction: 280,
  closing: 120,
} as const;

export type DeterminationDispositionCode =
  (typeof DETERMINATION_DISPOSITION_CODES)[number];
export type GroundingReferenceCode = (typeof GROUNDING_REFERENCE_CODES)[number];

export interface GroundedDeterminationText {
  text: string;
  grounding: readonly GroundingReferenceCode[];
}

export interface DeterminationLanguage {
  schemaVersion: typeof DETERMINATION_LANGUAGE_SCHEMA_VERSION;
  locale: ChronologyFiling["locale"];
  disposition: DeterminationDispositionCode;
  allegation: GroundedDeterminationText;
  finding: GroundedDeterminationText;
  consequence: GroundedDeterminationText;
  mitigation: GroundedDeterminationText;
  remedy: {
    title: string;
    instruction: GroundedDeterminationText;
  };
  closing: string;
}

export interface ChronologyDeterminationLanguageCommand {
  schemaVersion: typeof DETERMINATION_LANGUAGE_SCHEMA_VERSION;
  assessmentVersion: ChronologyAssessment["assessmentVersion"];
  locale: ChronologyFiling["locale"];
  department: ChronologyFiling["department"];
  disposition: DeterminationDispositionCode;
  offence: ChronologyFiling["offence"];
  discrepancy: ChronologyAssessment["discrepancy"];
  severity: SeverityCode;
  impact: ImpactCode;
  mitigation: MitigationCode;
  witnessStatement: string;
  remedy: {
    family: RemedyFamilyCode;
    audience: RemedyAudienceCode;
    maximumOccasions: 1 | 3;
    binding: "non_binding";
    prohibited: readonly ProhibitedRemedyCode[];
  };
}

export interface DigitalConductDeterminationLanguageCommand {
  schemaVersion: typeof DETERMINATION_LANGUAGE_SCHEMA_VERSION;
  assessmentVersion: DigitalConductAssessment["assessmentVersion"];
  locale: DigitalConductFiling["locale"];
  department: DigitalConductFiling["department"];
  disposition: DeterminationDispositionCode;
  offence: DigitalConductFiling["offence"];
  evidence: DigitalConductAssessment["evidence"];
  severity: SeverityCode;
  impact: DigitalConductImpactCode;
  mitigation: DigitalConductMitigationCode;
  witnessStatement: string;
  remedy: {
    family: DigitalConductRemedyFamilyCode;
    audience: RemedyAudienceCode;
    maximumOccasions: 1 | 3;
    binding: "non_binding";
    prohibited: readonly DigitalConductProhibitedRemedyCode[];
  };
}

export type DeterminationLanguageCommand =
  | ChronologyDeterminationLanguageCommand
  | DigitalConductDeterminationLanguageCommand;

export type ChronologyLanguageCommandResult =
  | {
      status: "valid";
      command: ChronologyDeterminationLanguageCommand;
    }
  | {
      status: "invalid";
      reason: "assessment_mismatch";
    };

export const DETERMINATION_LANGUAGE_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "locale",
    "disposition",
    "allegation",
    "finding",
    "consequence",
    "mitigation",
    "remedy",
    "closing",
  ],
  properties: {
    schemaVersion: { type: "integer", const: 1 },
    locale: { type: "string", const: "en" },
    disposition: {
      type: "string",
      enum: DETERMINATION_DISPOSITION_CODES,
    },
    allegation: groundedTextSchema(DETERMINATION_LANGUAGE_LIMITS.allegation),
    finding: groundedTextSchema(DETERMINATION_LANGUAGE_LIMITS.finding),
    consequence: groundedTextSchema(DETERMINATION_LANGUAGE_LIMITS.consequence),
    mitigation: groundedTextSchema(DETERMINATION_LANGUAGE_LIMITS.mitigation),
    remedy: {
      type: "object",
      additionalProperties: false,
      required: ["title", "instruction"],
      properties: {
        title: {
          type: "string",
          minLength: 1,
          maxLength: DETERMINATION_LANGUAGE_LIMITS.remedyTitle,
        },
        instruction: groundedTextSchema(
          DETERMINATION_LANGUAGE_LIMITS.remedyInstruction,
        ),
      },
    },
    closing: {
      type: "string",
      minLength: 1,
      maxLength: DETERMINATION_LANGUAGE_LIMITS.closing,
    },
  },
};

export function createChronologyDeterminationLanguageCommand(
  filing: ChronologyFiling,
  assessment: ChronologyAssessment,
): ChronologyLanguageCommandResult {
  const expectedAssessment = assessChronologyFiling(filing);
  if (JSON.stringify(expectedAssessment) !== JSON.stringify(assessment)) {
    return { status: "invalid", reason: "assessment_mismatch" };
  }

  return {
    status: "valid",
    command: {
      schemaVersion: DETERMINATION_LANGUAGE_SCHEMA_VERSION,
      assessmentVersion: assessment.assessmentVersion,
      locale: assessment.locale,
      department: assessment.department,
      disposition: "upheld_with_circumstances_noted",
      offence: assessment.offence,
      discrepancy: assessment.discrepancy,
      severity: assessment.severity.assessed,
      impact: assessment.acceptedFactors.impact.code,
      mitigation: assessment.acceptedFactors.mitigation.code,
      witnessStatement: redactProviderWitnessStatement(
        filing.statement,
        filing.respondent,
      ),
      remedy: {
        family: assessment.remedyConstraints.family,
        audience: assessment.remedyConstraints.audience,
        maximumOccasions: assessment.remedyConstraints.maximumOccasions,
        binding: assessment.remedyConstraints.binding,
        prohibited: assessment.remedyConstraints.prohibited,
      },
    },
  };
}

export function createDigitalConductDeterminationLanguageCommand(
  filing: DigitalConductFiling,
  assessment: DigitalConductAssessment,
):
  | { status: "valid"; command: DigitalConductDeterminationLanguageCommand }
  | { status: "invalid"; reason: "assessment_mismatch" } {
  const expectedAssessment = assessDigitalConductFiling(filing);
  if (JSON.stringify(expectedAssessment) !== JSON.stringify(assessment)) {
    return { status: "invalid", reason: "assessment_mismatch" };
  }
  return {
    status: "valid",
    command: {
      schemaVersion: DETERMINATION_LANGUAGE_SCHEMA_VERSION,
      assessmentVersion: assessment.assessmentVersion,
      locale: assessment.locale,
      department: assessment.department,
      disposition: "upheld_with_circumstances_noted",
      offence: assessment.offence,
      evidence: assessment.evidence,
      severity: assessment.severity.assessed,
      impact: assessment.acceptedFactors.impact.code,
      mitigation: assessment.acceptedFactors.mitigation.code,
      witnessStatement: redactProviderWitnessStatement(
        filing.statement,
        filing.respondent,
      ),
      remedy: {
        family: assessment.remedyConstraints.family,
        audience: assessment.remedyConstraints.audience,
        maximumOccasions: assessment.remedyConstraints.maximumOccasions,
        binding: assessment.remedyConstraints.binding,
        prohibited: assessment.remedyConstraints.prohibited,
      },
    },
  };
}

export function createDeterminationLanguageCommand(
  filing: Filing,
  assessment: DeterminationAssessment,
):
  | { status: "valid"; command: DeterminationLanguageCommand }
  | { status: "invalid"; reason: "assessment_mismatch" } {
  if (
    filing.department === "chronology" &&
    assessment.department === "chronology"
  ) {
    return createChronologyDeterminationLanguageCommand(filing, assessment);
  }
  if (
    filing.department === "digital_conduct" &&
    assessment.department === "digital_conduct"
  ) {
    return createDigitalConductDeterminationLanguageCommand(filing, assessment);
  }
  return { status: "invalid", reason: "assessment_mismatch" };
}

function redactProviderWitnessStatement(
  statement: string,
  respondent: string,
): string {
  const escapedRespondent = respondent.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const respondentPattern = new RegExp(
    `(?<![\\p{L}\\p{N}])${escapedRespondent}(?![\\p{L}\\p{N}])`,
    "giu",
  );
  return statement
    .replace(respondentPattern, "[respondent]")
    .replace(/\b(?:[01]\d|2[0-3]):[0-5]\d\b/gu, "[submitted_time]");
}

function groundedTextSchema(maxLength: number): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["text", "grounding"],
    properties: {
      text: { type: "string", minLength: 1, maxLength },
      grounding: {
        type: "array",
        minItems: 1,
        maxItems: 4,
        uniqueItems: true,
        items: { type: "string", enum: GROUNDING_REFERENCE_CODES },
      },
    },
  };
}
