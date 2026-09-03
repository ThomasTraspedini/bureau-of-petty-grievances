import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  createRepresentativeDetermination,
  ExampleDetermination,
} from "@/features/determination/example-determination";
import { validateChronologyDeterminationSnapshot } from "@/domain/determination/determination-experience";
import messages from "../messages/en.json";

describe("representative determination", () => {
  it("is a valid deterministic example of the real determination contract", () => {
    const snapshot = createRepresentativeDetermination(messages.Example);

    expect(
      validateChronologyDeterminationSnapshot(
        snapshot,
        new Date("2026-09-03T12:05:00.000Z"),
      ),
    ).toMatchObject({ status: "valid" });
    expect(snapshot.assessment.discrepancy).toEqual({
      kind: "delay",
      minutes: 24,
    });
  });

  it("renders the complete example without real-record controls", () => {
    render(
      <ExampleDetermination
        locale="en"
        copy={messages.Example}
        determination={messages.Determination}
        navigation={messages.Navigation}
      />,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Review concerning Marco",
      }),
    ).toBeVisible();
    expect(screen.getByText("24 minutes later")).toBeVisible();
    expect(screen.getByText(messages.Example.boundaryTitle)).toBeVisible();
    expect(
      screen.getByRole("link", { name: messages.Example.homeAction }),
    ).toHaveAttribute("href", "/en");
    expect(
      screen.getByRole("link", { name: messages.Example.filingAction }),
    ).toHaveAttribute("href", "/en/file/respondent");
    expect(
      screen.queryByRole("button", {
        name: messages.PublicRecord.publishAction,
      }),
    ).not.toBeInTheDocument();
  });
});
