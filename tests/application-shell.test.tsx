import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  ApplicationShell,
  type ApplicationShellCopy,
} from "@/features/application-shell/application-shell";
import { pseudoLocalize } from "@/i18n/pseudo";
import messages from "../messages/en.json";

const copy: ApplicationShellCopy = {
  navigation: messages.Navigation,
  home: messages.Home,
};

function pseudoSection<T extends object>(section: T): T {
  return new Proxy(section, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      return typeof value === "string" ? pseudoLocalize(value) : value;
    },
  });
}

describe("application shell", () => {
  it("renders one honest localized service surface", () => {
    render(<ApplicationShell locale="en" copy={copy} />);

    expect(
      screen.getByRole("heading", { level: 1, name: messages.Home.title }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: messages.Home.statusTitle,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: messages.Home.primaryAction }),
    ).toHaveAttribute("href", "/en/file/respondent");
    expect(
      screen.getByRole("link", { name: messages.Home.secondaryAction }),
    ).toHaveAttribute("href", "/en/example");
  });

  it("keeps the locale explicit in the shell and home navigation", () => {
    const { container } = render(<ApplicationShell locale="en" copy={copy} />);

    expect(container.firstElementChild).toHaveAttribute("data-locale", "en");
    expect(container.querySelector(".civic-seal text")).toHaveTextContent(
      "BPG",
    );
    const seal = container.querySelector(".civic-seal");
    const sealDots = Array.from(
      seal?.querySelectorAll<SVGCircleElement>(".civic-seal-dot") ?? [],
    );
    expect(sealDots).toHaveLength(2);
    expect(sealDots.map((dot) => dot.getAttribute("cx"))).toEqual(["24", "24"]);
    expect(sealDots.map((dot) => dot.getAttribute("cy"))).toEqual([
      "13.75",
      "34.25",
    ]);
    expect(
      screen.getByRole("link", { name: messages.Navigation.brandName }),
    ).toHaveAttribute("href", "/en");
  });

  it("renders the complete shell with expanded pseudo-localized copy", () => {
    const pseudoCopy: ApplicationShellCopy = {
      navigation: pseudoSection(copy.navigation),
      home: pseudoSection(copy.home),
    };

    render(<ApplicationShell locale="en" copy={pseudoCopy} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: pseudoLocalize(messages.Home.title),
      }),
    ).toBeVisible();
    expect(
      screen.getByText(pseudoLocalize(messages.Home.standardThreeBody)),
    ).toBeVisible();
  });
});
