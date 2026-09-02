import { describe, expect, it } from "vitest";

import {
  assessChronologyFiling,
  CHRONOLOGY_ASSESSMENT_VERSION,
  PROHIBITED_REMEDY_CODES,
} from "@/domain/determination/chronology-assessment";
import {
  type ChronologyFiling,
  MITIGATION_CODES,
} from "@/domain/filing/chronology";

type DepartureFiling = Extract<
  ChronologyFiling,
  { offence: "premature_departure" }
>;
type LatenessFiling = Extract<
  ChronologyFiling,
  { offence: "chronic_lateness" }
>;
type EstimateFiling = Extract<
  ChronologyFiling,
  { offence: "optimistic_estimate" }
>;

function departureFiling(
  delayMinutes: number,
  impact: ChronologyFiling["impact"] = "irritation_only",
  mitigation: ChronologyFiling["mitigation"] = "brings_dessert",
): DepartureFiling {
  return {
    locale: "en",
    department: "chronology",
    respondent: "Marco",
    relationship: "friend",
    offence: "premature_departure",
    facts: { declaredTime: "19:30", delayMinutes },
    impact,
    mitigation,
    statement: "Shoes were still being located.",
  };
}

function latenessFiling(delayMinutes: number): LatenessFiling {
  return {
    ...departureFiling(delayMinutes),
    offence: "chronic_lateness",
    facts: { agreedTime: "20:00", delayMinutes },
  };
}

function estimateFiling(
  estimatedMinutes: number,
  actualMinutes: number,
): EstimateFiling {
  return {
    ...departureFiling(actualMinutes - estimatedMinutes),
    offence: "optimistic_estimate",
    facts: { estimatedMinutes, actualMinutes },
  };
}

describe("Chronology deterministic assessment", () => {
  it("produces a versioned inspectable assessment for every fact grammar", () => {
    expect(
      assessChronologyFiling(departureFiling(24, "table_held")),
    ).toMatchObject({
      assessmentVersion: CHRONOLOGY_ASSESSMENT_VERSION,
      locale: "en",
      department: "chronology",
      offence: "premature_departure",
      discrepancy: { kind: "delay", minutes: 24 },
      severity: {
        base: "established",
        assessed: "material",
        consequenceAdjustment: 1,
      },
      remedyConstraints: { family: "departure_language_protocol" },
      presentation: {
        visualSeed: "e0f3e8ce",
        visualVariant: 2,
        timelineScaleMinutes: 30,
        markerPositionBasisPoints: 8000,
      },
    });

    expect(assessChronologyFiling(latenessFiling(8))).toMatchObject({
      offence: "chronic_lateness",
      discrepancy: { kind: "delay", minutes: 8 },
      remedyConstraints: { family: "arrival_notice_protocol" },
    });

    expect(assessChronologyFiling(estimateFiling(5, 28))).toMatchObject({
      offence: "optimistic_estimate",
      discrepancy: {
        kind: "estimate_overrun",
        minutes: 23,
        estimatedMinutes: 5,
        actualMinutes: 28,
      },
      remedyConstraints: { family: "estimate_calibration_protocol" },
    });
  });

  it.each([
    [1, "limited"],
    [14, "limited"],
    [15, "established"],
    [29, "established"],
    [30, "material"],
    [180, "material"],
  ] as const)(
    "classifies a %i-minute discrepancy as %s",
    (minutes, expected) => {
      const assessment = assessChronologyFiling(departureFiling(minutes));
      expect(assessment.severity).toEqual({
        base: expected,
        assessed: expected,
        consequenceAdjustment: 0,
      });
    },
  );

  it.each(["table_held", "repeated_updates", "plans_compressed"] as const)(
    "raises severity exactly one level for the concrete impact %s",
    (impact) => {
      const limited = assessChronologyFiling(departureFiling(14, impact));
      const established = assessChronologyFiling(departureFiling(15, impact));
      const material = assessChronologyFiling(departureFiling(30, impact));

      expect(limited.severity.assessed).toBe("established");
      expect(established.severity.assessed).toBe("material");
      expect(material.severity.assessed).toBe("material");
      expect(limited.acceptedFactors.impact).toEqual({
        code: impact,
        role: "aggravating",
        severityAdjustment: 1,
      });
    },
  );

  it("records irritation as context without treating it as aggravating", () => {
    const assessment = assessChronologyFiling(departureFiling(14));
    expect(assessment.acceptedFactors.impact).toEqual({
      code: "irritation_only",
      role: "contextual",
      severityAdjustment: 0,
    });
  });

  it("accepts mitigation without erasing facts or severity", () => {
    const filings = MITIGATION_CODES.map((mitigation) =>
      departureFiling(30, "plans_compressed", mitigation),
    );

    const assessments = filings.map(assessChronologyFiling);
    expect(assessments.map(({ severity }) => severity.assessed)).toEqual([
      "material",
      "material",
      "material",
      "material",
    ]);
    expect(
      assessments.map(({ acceptedFactors }) => acceptedFactors.mitigation),
    ).toEqual(
      filings.map(({ mitigation }) => ({
        code: mitigation,
        role: "mitigating",
        remedyEffect: "caps_at_three_occasions",
      })),
    );
  });

  it("keeps remedies private, non-binding, bounded, and non-punitive", () => {
    const limited = assessChronologyFiling(departureFiling(8));
    const materialColleague = assessChronologyFiling({
      ...departureFiling(30, "table_held"),
      relationship: "colleague",
    });

    expect(limited.remedyConstraints).toMatchObject({
      binding: "non_binding",
      audience: "personal_private",
      maximumOccasions: 1,
      findingTreatment: "circumstances_noted",
    });
    expect(materialColleague.remedyConstraints).toEqual({
      family: "departure_language_protocol",
      binding: "non_binding",
      audience: "professional_private",
      maximumOccasions: 3,
      findingTreatment: "circumstances_noted",
      prohibited: PROHIBITED_REMEDY_CODES,
    });
  });

  it.each([
    [15, 15, 10_000],
    [16, 30, 5_333],
    [31, 60, 5_167],
    [61, 120, 5_083],
    [121, 180, 6_722],
  ] as const)(
    "bounds a %i-minute presentation on the %i-minute scale",
    (minutes, scale, position) => {
      expect(
        assessChronologyFiling(departureFiling(minutes)).presentation,
      ).toMatchObject({
        timelineScaleMinutes: scale,
        markerPositionBasisPoints: position,
      });
    },
  );

  it("supports the maximum estimate overrun without exceeding presentation bounds", () => {
    const presentation = assessChronologyFiling(
      estimateFiling(1, 360),
    ).presentation;
    expect(presentation.timelineScaleMinutes).toBe(360);
    expect(presentation.markerPositionBasisPoints).toBeLessThanOrEqual(10_000);
  });

  it("derives presentation variation without aliases, prose, relationships, or clock times", () => {
    const baseline = departureFiling(24, "table_held");
    const changedExcludedInputs: ChronologyFiling = {
      ...baseline,
      respondent: "A different alias",
      relationship: "colleague",
      facts: { declaredTime: "06:45", delayMinutes: 24 },
      statement: "Different bounded testimony.",
    };

    expect(assessChronologyFiling(changedExcludedInputs).presentation).toEqual(
      assessChronologyFiling(baseline).presentation,
    );
  });

  it("changes the visual seed when an approved seed input changes", () => {
    const baseline = assessChronologyFiling(departureFiling(24, "table_held"));
    const changed = assessChronologyFiling({
      ...departureFiling(24, "table_held"),
      mitigation: "apologizes",
    });
    expect(changed.presentation.visualSeed).not.toBe(
      baseline.presentation.visualSeed,
    );
  });

  it("returns an identical assessment for an identical validated filing", () => {
    const filing = estimateFiling(5, 28);
    expect(assessChronologyFiling(filing)).toEqual(
      assessChronologyFiling(filing),
    );
  });
});
