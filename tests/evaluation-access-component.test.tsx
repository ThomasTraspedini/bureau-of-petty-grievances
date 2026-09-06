import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EvaluationAccess } from "@/features/access/evaluation-access";
import { pseudoLocalizeCatalog } from "@/i18n/pseudo";
import messages from "../messages/en.json";

describe("evaluation access experience", () => {
  it("removes the fragment before showing a localized invalid state", async () => {
    window.history.replaceState(null, "", `/en/evaluate#eva_${"x".repeat(43)}`);
    const exchangeToken = vi.fn(() =>
      Promise.resolve({ status: "invalid" as const }),
    );
    render(
      <EvaluationAccess
        locale="en"
        copy={messages.Access}
        navigation={messages.Navigation}
        exchangeToken={exchangeToken}
      />,
    );

    expect(window.location.hash).toBe("");
    expect(
      await screen.findByRole("heading", {
        name: messages.Access.invalidTitle,
      }),
    ).toBeVisible();
    expect(exchangeToken).toHaveBeenCalledWith(`eva_${"x".repeat(43)}`);
    expect(
      screen.getByRole("link", { name: messages.Access.returnAction }),
    ).toHaveAttribute("href", "/en");
  });

  it("renders expanded localized access recovery copy", async () => {
    const pseudo = pseudoLocalizeCatalog(messages);
    window.history.replaceState(null, "", "/en/evaluate#invalid");
    render(
      <EvaluationAccess
        locale="en"
        copy={pseudo.Access}
        navigation={pseudo.Navigation}
        exchangeToken={() => Promise.resolve({ status: "unavailable" })}
      />,
    );
    expect(
      await screen.findByRole("heading", {
        name: pseudo.Access.unavailableTitle,
      }),
    ).toBeVisible();
  });

  it("retries when a complete fragment is added to the current error page", async () => {
    window.history.replaceState(null, "", "/en/evaluate");
    const exchangeToken = vi.fn(() =>
      Promise.resolve({ status: "revoked" as const }),
    );
    render(
      <EvaluationAccess
        locale="en"
        copy={messages.Access}
        navigation={messages.Navigation}
        exchangeToken={exchangeToken}
      />,
    );

    await screen.findByRole("heading", {
      name: messages.Access.invalidTitle,
    });
    window.history.replaceState(null, "", `/en/evaluate#eva_${"y".repeat(43)}`);
    fireEvent(window, new HashChangeEvent("hashchange"));

    await waitFor(() => {
      expect(exchangeToken).toHaveBeenCalledWith(`eva_${"y".repeat(43)}`);
    });
    expect(window.location.hash).toBe("");
  });
});
