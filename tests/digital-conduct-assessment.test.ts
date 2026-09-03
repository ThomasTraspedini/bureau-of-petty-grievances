import { describe, expect, it } from "vitest";

import { assessDigitalConductFiling } from "@/domain/determination/digital-conduct-assessment";
import type { DigitalConductFiling } from "@/domain/filing/digital-conduct";

function fragmented(messageCount: number): DigitalConductFiling {
  return {
    locale: "en",
    department: "digital_conduct",
    respondent: "Alex",
    relationship: "friend",
    offence: "fragmented_messages",
    facts: { messageCount, ideaCount: 2, burstMinutes: 8 },
    impact: "irritation_only",
    mitigation: "provides_summary",
    statement: "The plan arrived in separate notifications.",
  };
}

describe("Digital Conduct deterministic assessment", () => {
  it("applies inspectable message-density boundaries", () => {
    expect(assessDigitalConductFiling(fragmented(6)).severity.base).toBe(
      "established",
    );
    expect(assessDigitalConductFiling(fragmented(11)).severity.base).toBe(
      "established",
    );
    expect(assessDigitalConductFiling(fragmented(12)).severity.base).toBe(
      "material",
    );
  });

  it.each([
    [4, "limited"],
    [5, "established"],
    [9, "established"],
    [10, "material"],
  ] as const)(
    "classifies a %i-minute voice note as %s",
    (duration, severity) => {
      const filing: DigitalConductFiling = {
        ...fragmented(6),
        offence: "excessive_voice_note",
        facts: { durationMinutes: duration, ideaCount: 2 },
      };
      expect(assessDigitalConductFiling(filing).severity.base).toBe(severity);
    },
  );

  it.each([
    [11, "limited"],
    [12, "established"],
    [47, "established"],
    [48, "material"],
  ] as const)(
    "classifies a %i-hour coordination interval as %s",
    (hours, severity) => {
      const filing: DigitalConductFiling = {
        ...fragmented(6),
        offence: "unacknowledged_coordination",
        facts: { responseHours: hours, followUpCount: 2 },
      };
      expect(assessDigitalConductFiling(filing).severity.base).toBe(severity);
    },
  );

  it("raises one capped level for consequence and prohibits coercive availability remedies", () => {
    const assessment = assessDigitalConductFiling({
      ...fragmented(4),
      impact: "notification_burden",
    });
    expect(assessment.severity).toEqual({
      base: "limited",
      assessed: "established",
      consequenceAdjustment: 1,
    });
    expect(assessment.remedyConstraints.binding).toBe("non_binding");
    expect(assessment.remedyConstraints.maximumOccasions).toBe(3);
    expect(assessment.remedyConstraints.prohibited).toContain("monitoring");
    expect(assessment.remedyConstraints.prohibited).toContain(
      "compelled_availability",
    );
    expect(assessment.remedyConstraints.prohibited).toContain(
      "response_surveillance",
    );
    expect(assessment.remedyConstraints.prohibited).toContain(
      "urgency_assumption",
    );
  });

  it("is repeatable and excludes aliases and witness prose from visual identity", () => {
    const baseline = fragmented(8);
    const changed = {
      ...baseline,
      respondent: "Different",
      statement: "Different harmless submitted wording.",
    };
    expect(assessDigitalConductFiling(changed).presentation).toEqual(
      assessDigitalConductFiling(baseline).presentation,
    );
  });
});
