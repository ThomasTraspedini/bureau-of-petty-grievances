import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  assessChronologyFiling,
  type ChronologyAssessment,
} from "@/domain/determination/chronology-assessment";
import {
  DETERMINATION_EXPERIENCE_VERSION,
  type IssuedChronologyDetermination,
} from "@/domain/determination/determination-experience";
import {
  type FilingError,
  createEmptyChronologyDraft,
  validateChronologyDraft,
} from "@/domain/filing/chronology";
import { createEmptyDomesticAffairsDraft } from "@/domain/filing/domestic-affairs";
import { createEmptySocialPlanningDraft } from "@/domain/filing/social-planning";
import {
  FILING_DRAFT_STORAGE_KEY,
  serializeDraft,
} from "@/features/filing/draft-storage";
import { FilingJourney } from "@/features/filing/filing-journey";
import { pseudoLocalizeCatalog } from "@/i18n/pseudo";
import messages from "../messages/en.json";
import { CHRONOLOGY_DETERMINATION_LANGUAGE_FIXTURES } from "./fixtures/chronology-determination-language";

type TestCompleteResult =
  | { status: "accepted"; determination: IssuedChronologyDetermination }
  | { status: "rejected"; errors: FilingError[] }
  | { status: "limited"; retryAfterSeconds: number }
  | { status: "failed" };

const completeFiling = vi.fn<
  (
    locale: string,
    draft: unknown,
    idempotencyKey: unknown,
  ) => Promise<TestCompleteResult>
>(() =>
  Promise.resolve({
    status: "accepted",
    determination: completeDetermination(),
  }),
);

function completeDraft() {
  return {
    ...createEmptyChronologyDraft(),
    respondent: "Marco",
    relationship: "friend" as const,
    offence: "premature_departure" as const,
    facts: {
      ...createEmptyChronologyDraft().facts,
      prematureDeparture: { declaredTime: "19:30", delayMinutes: "24" },
    },
    impact: "table_held" as const,
    mitigation: "brings_dessert" as const,
    statement: "He said he was leaving while still looking for his shoes.",
  };
}

function completeAssessment(): ChronologyAssessment {
  const result = validateChronologyDraft(completeDraft(), "en");
  if (result.status === "invalid") {
    throw new Error("The test fixture must remain a valid Chronology filing.");
  }
  return assessChronologyFiling(result.filing);
}

function completeDetermination(): IssuedChronologyDetermination {
  const fixture = CHRONOLOGY_DETERMINATION_LANGUAGE_FIXTURES[0];
  if (!fixture) throw new Error("A determination fixture is required.");
  return {
    experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
    locale: "en",
    reference: "CHR · 2026 · A1B2C3",
    issuedAt: "2026-09-02T12:00:00.000Z",
    assessment: completeAssessment(),
    language: fixture.language,
  };
}

describe("filing journey", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    completeFiling.mockClear();
  });

  it("shows localized validation without discarding the current question", async () => {
    render(
      <FilingJourney
        locale="en"
        step="respondent"
        returnToReview={false}
        copy={messages.Filing}
        navigation={messages.Navigation}
        completeFiling={completeFiling}
      />,
    );

    const continueButton = await screen.findByRole("button", {
      name: messages.Filing.continue,
    });
    await waitFor(() => expect(continueButton).toBeEnabled());
    fireEvent.click(continueButton);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      messages.Filing.errorRequired,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      messages.Filing.respondentTitle,
    );
  });

  it("restores safe device-local work and refuses serious witness text", async () => {
    const draft = {
      ...createEmptyChronologyDraft(),
      respondent: "Marco",
      statement: "A harmless delay before dinner.",
    };
    window.localStorage.setItem(
      FILING_DRAFT_STORAGE_KEY,
      serializeDraft(draft, Date.now()),
    );

    render(
      <FilingJourney
        locale="en"
        step="statement"
        returnToReview={false}
        copy={messages.Filing}
        navigation={messages.Navigation}
        completeFiling={completeFiling}
      />,
    );

    expect(
      await screen.findByText(messages.Filing.restoredTitle),
    ).toBeVisible();
    const statement = screen.getByRole("textbox", {
      name: messages.Filing.statementLabel,
    });
    expect(statement).toHaveValue(draft.statement);
    fireEvent.change(statement, { target: { value: "This describes abuse." } });
    fireEvent.click(
      screen.getByRole("button", { name: messages.Filing.reviewRecord }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      messages.Filing.errorRestricted,
    );

    await waitFor(() => {
      expect(
        window.localStorage.getItem(FILING_DRAFT_STORAGE_KEY),
      ).not.toContain("This describes abuse.");
    });
  });

  it("opens a clean filing when stored data is invalid", async () => {
    window.localStorage.setItem(FILING_DRAFT_STORAGE_KEY, '{"version":2}');
    render(
      <FilingJourney
        locale="en"
        step="respondent"
        returnToReview={false}
        copy={messages.Filing}
        navigation={messages.Navigation}
        completeFiling={completeFiling}
      />,
    );

    expect(
      await screen.findByText(messages.Filing.invalidDraftTitle),
    ).toBeVisible();
    expect(
      screen.getByRole("textbox", { name: messages.Filing.respondentLabel }),
    ).toHaveValue("");
  });

  it("renders expanded pseudo-localized filing copy", async () => {
    const pseudo = pseudoLocalizeCatalog(messages);
    render(
      <FilingJourney
        locale="en"
        step="respondent"
        returnToReview={false}
        copy={pseudo.Filing}
        navigation={pseudo.Navigation}
        completeFiling={completeFiling}
      />,
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: pseudo.Filing.respondentTitle,
      }),
    ).toBeVisible();
    expect(screen.getByText(pseudo.Filing.respondentWhy)).toBeInTheDocument();
  });

  it("renders the adaptive Domestic Affairs evidence register", async () => {
    const draft = {
      ...createEmptyDomesticAffairsDraft(),
      respondent: "Riley",
      relationship: "roommate" as const,
      offence: "misplaced_object" as const,
    };
    window.localStorage.setItem(
      FILING_DRAFT_STORAGE_KEY,
      serializeDraft(draft, Date.now()),
    );
    render(
      <FilingJourney
        locale="en"
        step="domestic_evidence"
        returnToReview={false}
        copy={messages.Filing}
        navigation={messages.Navigation}
        completeFiling={completeFiling}
      />,
    );
    expect(
      await screen.findByRole("heading", {
        name: messages.Filing.misplacedObjectTitle,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("spinbutton", { name: /Objects awaiting placement/u }),
    ).toBeVisible();
    expect(screen.getByText(messages.Filing.domesticBoundary)).toBeVisible();
    expect(screen.getByText(messages.Filing.domesticDepartment)).toBeVisible();
  });

  it("renders the adaptive Social Planning decision register", async () => {
    const draft = {
      ...createEmptySocialPlanningDraft(),
      respondent: "Taylor",
      relationship: "friend" as const,
      offence: "decision_drift" as const,
    };
    window.localStorage.setItem(
      FILING_DRAFT_STORAGE_KEY,
      serializeDraft(draft, Date.now()),
    );
    render(
      <FilingJourney
        locale="en"
        step="social_evidence"
        returnToReview={false}
        copy={messages.Filing}
        navigation={messages.Navigation}
        completeFiling={completeFiling}
      />,
    );
    expect(
      await screen.findByRole("heading", {
        name: messages.Filing.decisionDriftTitle,
      }),
    ).toBeVisible();
    expect(screen.getByText(messages.Filing.socialBoundary)).toBeVisible();
    expect(screen.getByText(messages.Filing.socialDepartment)).toBeVisible();
  });

  it("keeps a server-rejected review visible with safe work preserved", async () => {
    window.localStorage.setItem(
      FILING_DRAFT_STORAGE_KEY,
      serializeDraft(completeDraft(), Date.now()),
    );
    completeFiling.mockResolvedValueOnce({
      status: "rejected",
      errors: [{ field: "statement", code: "restricted_content" }],
    });

    render(
      <FilingJourney
        locale="en"
        step="review"
        returnToReview={false}
        copy={messages.Filing}
        navigation={messages.Navigation}
        completeFiling={completeFiling}
      />,
    );

    await screen.findByText(messages.Filing.restoredTitle);
    const completeButton = screen.getByRole("button", {
      name: messages.Filing.completeReview,
    });
    await waitFor(() => expect(completeButton).toBeEnabled());
    fireEvent.click(completeButton);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      messages.Filing.errorServer,
    );
    expect(screen.getByText(completeDraft().statement)).toBeVisible();
  });

  it("shows real processing and a recoverable terminal failure", async () => {
    window.localStorage.setItem(
      FILING_DRAFT_STORAGE_KEY,
      serializeDraft(completeDraft(), Date.now()),
    );
    let resolveCompletion: ((result: { status: "failed" }) => void) | undefined;
    completeFiling.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCompletion = resolve;
        }),
    );

    render(
      <FilingJourney
        locale="en"
        step="review"
        returnToReview={false}
        copy={messages.Filing}
        navigation={messages.Navigation}
        completeFiling={completeFiling}
      />,
    );

    const completeButton = await screen.findByRole("button", {
      name: messages.Filing.completeReview,
    });
    await waitFor(() => expect(completeButton).toBeEnabled());
    fireEvent.click(completeButton);

    expect(
      await screen.findByRole("heading", {
        name: messages.Filing.processingTitle,
      }),
    ).toBeVisible();
    if (!resolveCompletion) throw new Error("Completion was not requested");
    act(() => {
      resolveCompletion?.({ status: "failed" });
    });
    expect(
      await screen.findByRole("heading", {
        name: messages.Filing.failureTitle,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: messages.Filing.failureRetry }),
    ).toBeEnabled();
    fireEvent.click(
      screen.getByRole("button", { name: messages.Filing.failureReview }),
    );
    expect(
      screen.getByRole("heading", { name: messages.Filing.reviewTitle }),
    ).toBeVisible();
  });

  it("preserves one idempotency key and filing while rate limited", async () => {
    window.localStorage.setItem(
      FILING_DRAFT_STORAGE_KEY,
      serializeDraft(completeDraft(), Date.now()),
    );
    completeFiling.mockResolvedValue({
      status: "limited",
      retryAfterSeconds: 41,
    });

    render(
      <FilingJourney
        locale="en"
        step="review"
        returnToReview={false}
        copy={messages.Filing}
        navigation={messages.Navigation}
        completeFiling={completeFiling}
      />,
    );

    await screen.findByText(messages.Filing.restoredTitle);
    const submit = screen.getByRole("button", {
      name: messages.Filing.completeReview,
    });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    expect(
      await screen.findByRole("heading", {
        name: messages.Filing.limitedTitle,
      }),
    ).toBeVisible();
    expect(screen.getByText(/41/u)).toBeVisible();
    const firstKey = completeFiling.mock.calls[0]?.[2];
    expect(firstKey).toMatch(/^fil_[A-Za-z0-9_-]{22}$/u);

    fireEvent.click(
      screen.getByRole("button", { name: messages.Filing.failureRetry }),
    );
    await waitFor(() => {
      expect(completeFiling).toHaveBeenCalledTimes(2);
    });
    expect(completeFiling.mock.calls[1]?.[2]).toBe(firstKey);
    expect(window.localStorage.getItem(FILING_DRAFT_STORAGE_KEY)).toContain(
      completeDraft().statement,
    );
  });
});
