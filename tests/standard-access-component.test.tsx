import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StandardAccess } from "@/features/access/standard-access";
import { SuccessorTransfer } from "@/features/access/successor-transfer";
import { pseudoLocalizeCatalog } from "@/i18n/pseudo";
import messages from "../messages/en.json";

const ACTIVE = {
  status: "active" as const,
  creditsRemaining: 5,
  transferEligible: false,
  expiresAt: "2027-03-01T12:00:00.000Z",
};

describe("standard access experience", () => {
  it("removes a private fragment and presents the fixed allowance", async () => {
    window.history.replaceState(null, "", `/en/access#std_${"x".repeat(43)}`);
    const exchangeToken = vi.fn(() =>
      Promise.resolve({ status: "accepted" as const, summary: ACTIVE }),
    );
    const { container } = render(
      <StandardAccess
        locale="en"
        copy={messages.StandardAccess}
        navigation={messages.Navigation}
        exchangeToken={exchangeToken}
        getStatus={() => Promise.resolve({ status: "invalid" })}
        issueInvitation={() => Promise.resolve({ status: "not_eligible" })}
        cancelInvitation={() => Promise.resolve({ status: "not_pending" })}
      />,
    );

    expect(window.location.hash).toBe("");
    expect(
      await screen.findByRole("heading", {
        name: messages.StandardAccess.activeTitle,
      }),
    ).toBeVisible();
    expect(screen.getAllByText("5 of 5")).toHaveLength(2);
    expect(
      container.querySelector(".access-mark-seal .civic-seal text"),
    ).toHaveTextContent("BPG");
    expect(exchangeToken).toHaveBeenCalledWith(`std_${"x".repeat(43)}`);
    expect(
      screen.getByRole("link", { name: messages.StandardAccess.beginAction }),
    ).toHaveAttribute("href", "/en/file/respondent");
  });

  it("shows a claimed invitation without exposing another filing session", async () => {
    window.history.replaceState(null, "", `/en/access#sti_${"x".repeat(43)}`);
    render(
      <StandardAccess
        locale="en"
        copy={messages.StandardAccess}
        navigation={messages.Navigation}
        exchangeToken={() => Promise.resolve({ status: "claimed" })}
        getStatus={() => Promise.resolve({ status: "invalid" })}
        issueInvitation={() => Promise.resolve({ status: "not_eligible" })}
        cancelInvitation={() => Promise.resolve({ status: "not_pending" })}
      />,
    );
    expect(
      await screen.findByText(messages.StandardAccess.claimedBody),
    ).toBeVisible();
  });

  it("renders expanded localized recovery copy", async () => {
    const pseudo = pseudoLocalizeCatalog(messages);
    window.history.replaceState(null, "", "/en/access");
    render(
      <StandardAccess
        locale="en"
        copy={pseudo.StandardAccess}
        navigation={pseudo.Navigation}
        exchangeToken={() => Promise.resolve({ status: "invalid" })}
        getStatus={() => Promise.resolve({ status: "unavailable" })}
        issueInvitation={() => Promise.resolve({ status: "not_eligible" })}
        cancelInvitation={() => Promise.resolve({ status: "not_pending" })}
      />,
    );
    expect(
      await screen.findByRole("heading", {
        name: pseudo.StandardAccess.unavailableTitle,
      }),
    ).toBeVisible();
  });
});

describe("successor transfer experience", () => {
  it("freezes the displayed balance and exposes only the private invitation", async () => {
    const issueInvitation = vi.fn(() =>
      Promise.resolve({
        status: "issued" as const,
        invitationUrl: `https://bureau.example/en/access#sti_${"s".repeat(43)}`,
        summary: {
          status: "transfer_pending" as const,
          creditsRemaining: 4,
          transferEligible: false,
          expiresAt: "2027-03-01T12:00:00.000Z",
          invitationExpiresAt: "2026-10-02T12:00:00.000Z",
        },
      }),
    );
    render(
      <SuccessorTransfer
        locale="en"
        copy={messages.StandardAccess}
        summary={{ ...ACTIVE, creditsRemaining: 4, transferEligible: true }}
        issueInvitation={issueInvitation}
        cancelInvitation={() => Promise.resolve({ status: "not_pending" })}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: messages.StandardAccess.successorIssueAction,
      }),
    );
    expect(
      await screen.findByText(messages.StandardAccess.successorPendingTitle),
    ).toBeVisible();
    expect(
      screen.getByDisplayValue(/https:\/\/bureau\.example\/en\/access#sti_/u),
    ).toBeVisible();
    expect(issueInvitation).toHaveBeenCalledWith("en", false);
  });
});
