import { StrictMode } from "react";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SurfaceObserver } from "@/features/observability/surface-observer";

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.dataset.analytics = "disabled";
  document.body.replaceChildren();
  window.sessionStorage.clear();
});

describe("analytics surface observer", () => {
  it("records each filing route once when a preserved component receives a new step", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null)));
    vi.stubGlobal("fetch", fetchMock);
    document.documentElement.dataset.analytics = "enabled";

    const view = render(
      <SurfaceObserver
        locale="en"
        surface={{ name: "filing", step: "respondent" }}
      />,
    );
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    view.rerender(
      <SurfaceObserver
        locale="en"
        surface={{ name: "filing", step: "relationship" }}
      />,
    );
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
    view.rerender(
      <SurfaceObserver
        locale="en"
        surface={{ name: "filing", step: "relationship" }}
      />,
    );
    expect(eventNames(fetchMock)).toEqual([
      "filing_step_viewed",
      "filing_started",
      "filing_step_viewed",
    ]);
  });

  it("keeps the example listener active through strict effect replay without duplicating the view", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null)));
    vi.stubGlobal("fetch", fetchMock);
    document.documentElement.dataset.analytics = "enabled";
    const example = document.createElement("button");
    example.dataset.analyticsExample = "true";
    document.body.append(example);

    render(
      <StrictMode>
        <SurfaceObserver locale="en" surface={{ name: "landing" }} />
      </StrictMode>,
    );
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    fireEvent.click(example);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    expect(eventNames(fetchMock)).toEqual(["landing_viewed", "example_opened"]);
  });
});

function eventNames(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls.map((call) => {
    const init = call[1] as RequestInit | undefined;
    if (typeof init?.body !== "string") throw new Error("Missing event body");
    const event = JSON.parse(init.body) as { name?: unknown };
    if (typeof event.name !== "string") throw new Error("Missing event name");
    return event.name;
  });
}
