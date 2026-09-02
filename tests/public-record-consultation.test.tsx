import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicConsultationAggregate } from "@/domain/public-record/public-consultation";
import {
  consultationStorageKey,
  parseConsultationEnvelope,
  PublicRecordConsultation,
} from "@/features/public-record/public-record-consultation";
import { pseudoLocalizeCatalog } from "@/i18n/pseudo";
import messages from "../messages/en.json";

const { submitPublicConsultation } = vi.hoisted(() => ({
  submitPublicConsultation:
    vi.fn<(locale: string, input: unknown) => Promise<unknown>>(),
}));

vi.mock("@/app/[locale]/record/actions", () => ({
  submitPublicConsultation,
}));

const publicId = `rec_${"A".repeat(22)}`;
const emptyAggregate: PublicConsultationAggregate = {
  total: 0,
  counts: {
    grievanceUpheld: 0,
    grievanceDismissed: 0,
    upheldWithCircumstancesNoted: 0,
  },
};

beforeEach(() => {
  window.localStorage.clear();
  submitPublicConsultation.mockReset();
});

describe("public consultation", () => {
  it("renders honest zero results and records one immutable position", async () => {
    submitPublicConsultation.mockResolvedValue({
      status: "accepted",
      aggregate: {
        total: 1,
        counts: {
          grievanceUpheld: 1,
          grievanceDismissed: 0,
          upheldWithCircumstancesNoted: 0,
        },
      },
      selectedPosition: "grievance_upheld",
      created: true,
    });
    renderConsultation();

    expect(screen.getByText(messages.Consultation.emptyState)).toBeVisible();
    expect(screen.getAllByText("0 responses")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: /Grievance upheld/u }));

    await waitFor(() => {
      expect(submitPublicConsultation).toHaveBeenCalledOnce();
    });
    const submittedCall = submitPublicConsultation.mock.calls[0];
    expect(submittedCall?.[0]).toBe("en");
    expect(JSON.stringify(submittedCall?.[1])).toContain(publicId);
    expect(JSON.stringify(submittedCall?.[1])).toContain("grievance_upheld");
    expect(JSON.stringify(submittedCall?.[1])).toMatch(
      /cns_[A-Za-z0-9_-]{43}/u,
    );
    expect(
      await screen.findByText(messages.Consultation.submitted),
    ).toBeVisible();
    expect(screen.getAllByText("1 response")).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: /Grievance upheld/u }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /Grievance dismissed/u }),
    ).toBeDisabled();
    const stored = window.localStorage.getItem(
      consultationStorageKey(publicId),
    );
    expect(parseConsultationEnvelope(stored)).toMatchObject({
      publicId,
      position: "grievance_upheld",
      submitted: true,
    });
  });

  it("preserves a failed selection for an exact retry", async () => {
    submitPublicConsultation
      .mockResolvedValueOnce({ status: "failed" })
      .mockResolvedValueOnce({
        status: "accepted",
        aggregate: {
          total: 1,
          counts: {
            grievanceUpheld: 0,
            grievanceDismissed: 1,
            upheldWithCircumstancesNoted: 0,
          },
        },
        selectedPosition: "grievance_dismissed",
        created: true,
      });
    renderConsultation();
    const dismissed = screen.getByRole("button", {
      name: /Grievance dismissed/u,
    });
    fireEvent.click(dismissed);
    expect(
      await screen.findByText(messages.Consultation.submitFailure),
    ).toBeVisible();
    expect(dismissed).not.toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Grievance upheld/u }),
    ).toBeDisabled();
    fireEvent.click(dismissed);
    expect(
      await screen.findByText(messages.Consultation.submitted),
    ).toBeVisible();
    const firstInput = submitPublicConsultation.mock.calls[0]?.[1];
    const secondInput = submitPublicConsultation.mock.calls[1]?.[1];
    expect(secondInput).toEqual(firstInput);
  });

  it("restores a submitted selection and rejects malformed storage", async () => {
    const participationKey = `cns_${"B".repeat(43)}`;
    window.localStorage.setItem(
      consultationStorageKey(publicId),
      JSON.stringify({
        version: 1,
        publicId,
        participationKey,
        position: "upheld_with_circumstances_noted",
        submitted: true,
      }),
    );
    renderConsultation();
    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /Upheld, with circumstances noted/u,
        }),
      ).toHaveAttribute("aria-pressed", "true");
    });
    expect(submitPublicConsultation).not.toHaveBeenCalled();
    expect(parseConsultationEnvelope('{"version":1}')).toBeNull();
  });

  it("renders localized unavailable and pseudo-localized expanded states", () => {
    const pseudo = pseudoLocalizeCatalog(messages);
    const { unmount } = render(
      <PublicRecordConsultation
        publicId={publicId}
        locale="en"
        initialAggregate={null}
        copy={messages.Consultation}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      messages.Consultation.loadFailure,
    );
    unmount();
    render(
      <PublicRecordConsultation
        publicId={publicId}
        locale="en"
        initialAggregate={emptyAggregate}
        copy={pseudo.Consultation}
      />,
    );
    expect(
      screen.getByRole("heading", {
        name: pseudo.Consultation.panelTitle,
      }),
    ).toBeVisible();
  });
});

function renderConsultation() {
  render(
    <PublicRecordConsultation
      publicId={publicId}
      locale="en"
      initialAggregate={emptyAggregate}
      copy={messages.Consultation}
    />,
  );
}
