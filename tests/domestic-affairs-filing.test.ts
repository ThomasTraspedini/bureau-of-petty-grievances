import { describe, expect, it } from "vitest";

import {
  createEmptyDomesticAffairsDraft,
  type DomesticAffairsDraft,
  validateDomesticAffairsDraft,
  validateDomesticAffairsFiling,
} from "@/domain/filing/domestic-affairs";

function completeDraft(
  offence: DomesticAffairsDraft["offence"] = "token_remainder",
): DomesticAffairsDraft {
  return {
    ...createEmptyDomesticAffairsDraft(),
    respondent: "Sam",
    relationship: "roommate",
    offence,
    facts: {
      tokenRemainder: { remainingServings: "1", capacityServings: "12" },
      misplacedObject: {
        itemCount: "4",
        distanceSteps: "8",
        correctionSeconds: "45",
      },
      emptyPackaging: {
        emptyPackageCount: "2",
        recurrencesInThirtyDays: "6",
      },
    },
    impact: "false_stock_signal",
    mitigation: "handles_other_chores",
    statement: "The empty carton returned to the shared shelf twice this week.",
  };
}

describe("Domestic Affairs filing domain", () => {
  it.each(["token_remainder", "misplaced_object", "empty_packaging"] as const)(
    "normalizes the %s facts and validates its server boundary",
    (offence) => {
      const result = validateDomesticAffairsDraft(completeDraft(offence), "en");
      expect(result).toMatchObject({
        status: "valid",
        filing: { locale: "en", department: "domestic_affairs", offence },
      });
      if (result.status === "valid")
        expect(validateDomesticAffairsFiling(result.filing, "en")).toEqual(
          result,
        );
    },
  );

  it("requires the remainder to be smaller than the container capacity", () => {
    const draft = completeDraft();
    draft.facts.tokenRemainder = {
      remainingServings: "4",
      capacityServings: "4",
    };
    expect(validateDomesticAffairsDraft(draft, "en")).toMatchObject({
      status: "invalid",
      errors: [{ field: "domestic_evidence", code: "remainder_not_smaller" }],
    });
  });

  it("rejects out-of-range aggregate household evidence", () => {
    const draft = completeDraft("misplaced_object");
    draft.facts.misplacedObject.correctionSeconds = "301";
    expect(validateDomesticAffairsDraft(draft, "en")).toMatchObject({
      status: "invalid",
      errors: [{ field: "domestic_evidence", code: "invalid_duration" }],
    });
  });

  it("retains the shared serious-content and locale boundaries", () => {
    const draft = completeDraft();
    draft.statement = "They made a threat over the shared groceries.";
    expect(validateDomesticAffairsDraft(draft, "en").status).toBe("invalid");
    expect(validateDomesticAffairsDraft(completeDraft(), "ja").status).toBe(
      "invalid",
    );
  });
});
