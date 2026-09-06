import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";

import { assessChronologyFiling } from "@/domain/determination/chronology-assessment";
import { assessDigitalConductFiling } from "@/domain/determination/digital-conduct-assessment";
import { assessDomesticAffairsFiling } from "@/domain/determination/domestic-affairs-assessment";
import { assessSocialPlanningFiling } from "@/domain/determination/social-planning-assessment";
import { DETERMINATION_EXPERIENCE_VERSION } from "@/domain/determination/determination-experience";
import {
  createChronologyDeterminationLanguageCommand,
  createDigitalConductDeterminationLanguageCommand,
  createDomesticAffairsDeterminationLanguageCommand,
  createSocialPlanningDeterminationLanguageCommand,
} from "@/domain/determination/determination-language";
import { createEnglishChronologyFallback } from "@/domain/determination/locales/en";
import { createEnglishDigitalConductFallback } from "@/domain/determination/locales/en-digital-conduct";
import { createEnglishDomesticAffairsFallback } from "@/domain/determination/locales/en-domestic-affairs";
import { createEnglishSocialPlanningFallback } from "@/domain/determination/locales/en-social-planning";
import {
  type ChronologyDraft,
  validateChronologyDraft,
} from "@/domain/filing/chronology";
import {
  createEmptyDigitalConductDraft,
  type DigitalConductDraft,
  validateDigitalConductDraft,
} from "@/domain/filing/digital-conduct";
import {
  createEmptyDomesticAffairsDraft,
  type DomesticAffairsDraft,
  validateDomesticAffairsDraft,
} from "@/domain/filing/domestic-affairs";
import {
  createEmptySocialPlanningDraft,
  type SocialPlanningDraft,
  validateSocialPlanningDraft,
} from "@/domain/filing/social-planning";
import {
  DETERMINATION_SESSION_KEY,
  serializeDeterminationSession,
} from "@/features/determination/determination-session";
import {
  FILING_COMPLETION_STORAGE_KEY,
  FILING_DRAFT_STORAGE_KEY,
  parseFilingCompletion,
  serializeFilingCompletion,
  serializeDraft,
} from "@/features/filing/draft-storage";

declare global {
  interface Window {
    __bureauSharePayload?: ShareData;
  }
}

const storageKey = FILING_DRAFT_STORAGE_KEY;
const standardSession = `sts_${"T".repeat(43)}`;

test.describe.configure({ mode: "serial" });

const completeDraft = {
  department: "chronology",
  respondent: "Marco",
  relationship: "friend",
  offence: "premature_departure",
  facts: {
    prematureDeparture: { declaredTime: "19:30", delayMinutes: "24" },
    chronicLateness: { agreedTime: "", delayMinutes: "" },
    optimisticEstimate: { estimatedMinutes: "", actualMinutes: "" },
  },
  impact: "table_held",
  mitigation: "brings_dessert",
  statement: "He said he was leaving while still looking for his shoes.",
} satisfies ChronologyDraft;

const completeDigitalDraft = {
  ...createEmptyDigitalConductDraft(),
  respondent: "Alex",
  relationship: "friend",
  offence: "fragmented_messages",
  facts: {
    ...createEmptyDigitalConductDraft().facts,
    fragmentedMessages: {
      messageCount: "8",
      ideaCount: "2",
      burstMinutes: "6",
    },
  },
  impact: "notification_burden",
  mitigation: "provides_summary",
  statement: "The dinner plan arrived through eight separate notifications.",
} satisfies DigitalConductDraft;

const completeDomesticDraft = {
  ...createEmptyDomesticAffairsDraft(),
  respondent: "Riley",
  relationship: "roommate",
  offence: "misplaced_object",
  facts: {
    ...createEmptyDomesticAffairsDraft().facts,
    misplacedObject: {
      itemCount: "4",
      distanceSteps: "8",
      correctionSeconds: "45",
    },
  },
  impact: "shared_space_obstructed",
  mitigation: "handles_other_chores",
  statement: "Four items waited beside their ordinary location.",
} satisfies DomesticAffairsDraft;

const tokenRemainderDomesticDraft = {
  ...createEmptyDomesticAffairsDraft(),
  respondent: "Jordan",
  relationship: "roommate",
  offence: "token_remainder",
  facts: {
    ...createEmptyDomesticAffairsDraft().facts,
    tokenRemainder: {
      remainingServings: "1",
      capacityServings: "8",
    },
  },
  impact: "needed_item_unavailable",
  mitigation: "usually_restocks",
  statement: "One serving remained in a container that ordinarily holds eight.",
} satisfies DomesticAffairsDraft;

const emptyPackagingDomesticDraft = {
  ...createEmptyDomesticAffairsDraft(),
  respondent: "Casey",
  relationship: "roommate",
  offence: "empty_packaging",
  facts: {
    ...createEmptyDomesticAffairsDraft().facts,
    emptyPackaging: {
      emptyPackageCount: "4",
      recurrencesInThirtyDays: "6",
    },
  },
  impact: "false_stock_signal",
  mitigation: "corrects_when_asked",
  statement:
    "Four empty packages remained among the available household stock.",
} satisfies DomesticAffairsDraft;

const completeSocialDraft = {
  ...createEmptySocialPlanningDraft(),
  respondent: "Morgan",
  relationship: "friend",
  offence: "option_veto_cycle",
  facts: {
    ...createEmptySocialPlanningDraft().facts,
    optionVetoCycle: {
      proposedOptionCount: "6",
      rejectedOptionCount: "5",
      alternativeOptionCount: "1",
    },
  },
  impact: "planning_stalled",
  mitigation: "offers_alternatives_sometimes",
  statement:
    "Five practical dinner options were declined before one alternative appeared.",
} satisfies SocialPlanningDraft;

const confirmedPlanRevisionDraft = {
  ...createEmptySocialPlanningDraft(),
  respondent: "Thomas",
  relationship: "friend",
  offence: "confirmed_plan_revision",
  facts: {
    ...createEmptySocialPlanningDraft().facts,
    confirmedPlanRevision: {
      revisionCount: "2",
      participantCount: "10",
      noticeHours: "1",
    },
  },
  impact: "arrangements_disrupted",
  mitigation: "gave_some_notice",
  statement: "The confirmed plan changed after the arrangements were made.",
} satisfies SocialPlanningDraft;

async function choose(page: Page, name: string) {
  await page.getByRole("radio", { name }).check();
  await page.getByRole("button", { name: "Continue" }).click();
}

function fixedDeterminationSession(): string {
  const validation = validateChronologyDraft(completeDraft, "en");
  if (validation.status === "invalid") {
    throw new Error("The end-to-end filing fixture must remain valid.");
  }
  const assessment = assessChronologyFiling(validation.filing);
  const command = createChronologyDeterminationLanguageCommand(
    validation.filing,
    assessment,
  );
  if (command.status === "invalid") {
    throw new Error("The end-to-end assessment must match its filing.");
  }
  const issuedAt = new Date();
  issuedAt.setMilliseconds(0);
  return serializeDeterminationSession(
    completeDraft,
    {
      experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
      locale: "en",
      reference: "CHR · 2026 · A1B2C3",
      issuedAt: issuedAt.toISOString(),
      assessment,
      language: createEnglishChronologyFallback(command.command),
    },
    Date.now(),
  );
}

function fixedDigitalDeterminationSession(): string {
  const validation = validateDigitalConductDraft(completeDigitalDraft, "en");
  if (validation.status === "invalid") {
    throw new Error(
      "The Digital Conduct end-to-end fixture must remain valid.",
    );
  }
  const assessment = assessDigitalConductFiling(validation.filing);
  const command = createDigitalConductDeterminationLanguageCommand(
    validation.filing,
    assessment,
  );
  if (command.status === "invalid") {
    throw new Error("The Digital Conduct assessment must match its filing.");
  }
  const issuedAt = new Date();
  issuedAt.setMilliseconds(0);
  return serializeDeterminationSession(
    completeDigitalDraft,
    {
      experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
      locale: "en",
      reference: "DIG · 2026 · D4E5F6",
      issuedAt: issuedAt.toISOString(),
      assessment,
      language: createEnglishDigitalConductFallback(command.command),
    },
    Date.now(),
  );
}

function fixedDomesticDeterminationSession(
  draft: DomesticAffairsDraft = completeDomesticDraft,
): string {
  const validation = validateDomesticAffairsDraft(draft, "en");
  if (validation.status === "invalid") {
    throw new Error(
      "The Domestic Affairs end-to-end fixture must remain valid.",
    );
  }
  const assessment = assessDomesticAffairsFiling(validation.filing);
  const command = createDomesticAffairsDeterminationLanguageCommand(
    validation.filing,
    assessment,
  );
  if (command.status === "invalid") {
    throw new Error("The Domestic Affairs assessment must match its filing.");
  }
  const issuedAt = new Date();
  issuedAt.setMilliseconds(0);
  return serializeDeterminationSession(
    draft,
    {
      experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
      locale: "en",
      reference: "DOM · 2026 · H0M3A1",
      issuedAt: issuedAt.toISOString(),
      assessment,
      language: createEnglishDomesticAffairsFallback(command.command),
    },
    Date.now(),
  );
}

function fixedSocialDeterminationSession(
  draft: SocialPlanningDraft = completeSocialDraft,
): string {
  const validation = validateSocialPlanningDraft(draft, "en");
  if (validation.status === "invalid") {
    throw new Error(
      "The Social Planning end-to-end fixture must remain valid.",
    );
  }
  const assessment = assessSocialPlanningFiling(validation.filing);
  const command = createSocialPlanningDeterminationLanguageCommand(
    validation.filing,
    assessment,
  );
  if (command.status === "invalid") {
    throw new Error("The Social Planning assessment must match its filing.");
  }
  const issuedAt = new Date();
  issuedAt.setMilliseconds(0);
  return serializeDeterminationSession(
    draft,
    {
      experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
      locale: "en",
      reference: "SOC · 2026 · P1A2N3",
      issuedAt: issuedAt.toISOString(),
      assessment,
      language: createEnglishSocialPlanningFallback(command.command),
    },
    Date.now(),
  );
}

async function openFixedDetermination(page: Page) {
  await page.addInitScript(
    ({ key, value }) => {
      window.sessionStorage.setItem(key, value);
    },
    { key: DETERMINATION_SESSION_KEY, value: fixedDeterminationSession() },
  );
  await page.goto("/en/determination");
  await expect(
    page.getByRole("heading", { name: "Review concerning Marco" }),
  ).toBeVisible();
}

async function openFixedDigitalDetermination(page: Page) {
  await page.addInitScript(
    ({ key, value }) => {
      window.sessionStorage.setItem(key, value);
    },
    {
      key: DETERMINATION_SESSION_KEY,
      value: fixedDigitalDeterminationSession(),
    },
  );
  await page.goto("/en/determination");
  await expect(
    page.getByRole("heading", { name: "Review concerning Alex" }),
  ).toBeVisible();
}

async function openFixedDomesticDetermination(
  page: Page,
  draft: DomesticAffairsDraft = completeDomesticDraft,
) {
  await page.addInitScript(
    ({ key, value }) => {
      window.sessionStorage.setItem(key, value);
    },
    {
      key: DETERMINATION_SESSION_KEY,
      value: fixedDomesticDeterminationSession(draft),
    },
  );
  await page.goto("/en/determination");
  await expect(
    page.getByRole("heading", {
      name: `Review concerning ${draft.respondent}`,
    }),
  ).toBeVisible();
}

async function openFixedSocialDetermination(
  page: Page,
  draft: SocialPlanningDraft = completeSocialDraft,
) {
  await page.addInitScript(
    ({ key, value }) => {
      window.sessionStorage.setItem(key, value);
    },
    {
      key: DETERMINATION_SESSION_KEY,
      value: fixedSocialDeterminationSession(draft),
    },
  );
  await page.goto("/en/determination");
  await expect(
    page.getByRole("heading", {
      name: `Review concerning ${draft.respondent}`,
    }),
  ).toBeVisible();
}

async function publishFixedRecord(page: Page) {
  await openFixedDetermination(page);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create the public record" }).click();
  await expect(
    page.getByRole("heading", { name: "The public record is available." }),
  ).toBeVisible();
  const publicAddress = await page
    .getByRole("link", { name: "Open the public record" })
    .getAttribute("href");
  const ownerAddress = await page
    .getByRole("link", { name: "Open owner controls" })
    .getAttribute("href");
  if (publicAddress === null || ownerAddress === null) {
    throw new Error(
      "Publication must return separate public and owner addresses.",
    );
  }
  return { publicAddress, ownerAddress };
}

async function publishFixedDomesticRecord(page: Page) {
  await openFixedDomesticDetermination(page);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create the public record" }).click();
  await expect(
    page.getByRole("heading", { name: "The public record is available." }),
  ).toBeVisible();
  const publicAddress = await page
    .getByRole("link", { name: "Open the public record" })
    .getAttribute("href");
  if (!publicAddress)
    throw new Error("Domestic publication must return a public address.");
  return publicAddress;
}

async function publishFixedSocialRecord(page: Page) {
  await openFixedSocialDetermination(page);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create the public record" }).click();
  await expect(
    page.getByRole("heading", { name: "The public record is available." }),
  ).toBeVisible();
  const publicAddress = await page
    .getByRole("link", { name: "Open the public record" })
    .getAttribute("href");
  if (!publicAddress)
    throw new Error(
      "Social Planning publication must return a public address.",
    );
  return publicAddress;
}

test("completes, corrects, and receives a Chronology determination", async ({
  page,
}) => {
  await page.goto("/en/file/respondent");
  await page.getByRole("textbox", { name: "Respondent alias" }).fill("Marco");
  await page.getByRole("button", { name: "Continue" }).click();

  await choose(page, "Friend");
  await choose(
    page,
    "Chronology Promises, estimates, arrivals, and measurable delays.",
  );
  await choose(
    page,
    "Declared “leaving now” before being ready Measure the time between the declaration and actual readiness.",
  );

  await page.getByLabel("Time “leaving now” was declared").fill("19:30");
  await page.getByLabel("Recorded delay").fill("24");
  await page.getByRole("button", { name: "Continue" }).click();
  await choose(page, "A table or reservation was held");
  await choose(page, "Usually brings dessert");

  await page
    .getByRole("textbox", { name: "Submitted statement" })
    .fill("He said he was leaving while still looking for his shoes.");
  await page.getByRole("button", { name: "Review the record" }).click();

  await expect(page).toHaveURL(/\/en\/file\/review$/u);
  await expect(
    page.getByRole("heading", { name: "Confirm the submitted facts." }),
  ).toBeVisible();
  await expect(
    page.getByText("Declared at 19:30; readiness followed 24 minutes later"),
  ).toBeVisible();

  const relationshipRow = page
    .locator(".review-list > div")
    .filter({ hasText: "Relationship" });
  await relationshipRow.getByRole("link", { name: "Correct" }).click();
  await expect(page).toHaveURL(/relationship\?return=review$/u);
  await page.getByRole("radio", { name: "Sibling" }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/en\/file\/review$/u);
  await expect(relationshipRow.getByText("Sibling")).toBeVisible();

  await page.getByRole("button", { name: "Submit for determination" }).click();
  await expect(page).toHaveURL(/\/en\/determination$/u);
  await expect(
    page.getByRole("heading", {
      name: "Review concerning Marco",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Upheld, with circumstances noted"),
  ).toBeVisible();
  await expect(page.getByText("24 minutes later")).toBeVisible();
  await expect(page.getByText("Departure language protocol")).toBeVisible();
  await expect(page.getByText("not a public record")).toBeVisible();
  const completionMarker = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    FILING_COMPLETION_STORAGE_KEY,
  );
  expect(parseFilingCompletion(completionMarker, Date.now())).toBe("completed");

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Review concerning Marco" }),
  ).toBeVisible();
});

test("completes and publishes a Digital Conduct communications docket", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/file/respondent");
  await page.getByRole("textbox", { name: "Respondent alias" }).fill("Alex");
  await page.getByRole("button", { name: "Continue" }).click();
  await choose(page, "Friend");
  await choose(
    page,
    "Digital Conduct Message density, voice memoranda, and ordinary coordination intervals.",
  );
  await choose(
    page,
    "Divided one thought across many messages Compare the number of notifications with the ideas communicated.",
  );
  await page.getByLabel("Separate messages").fill("8");
  await page.getByLabel("Principal ideas").fill("2");
  await page.getByLabel("Sequence interval").fill("6");
  await page.getByRole("button", { name: "Continue" }).click();
  await choose(page, "A concentrated notification burden was created");
  await choose(page, "Usually provides a useful summary");
  await page
    .getByRole("textbox", { name: "Submitted statement" })
    .fill("The dinner plan arrived through eight separate notifications.");
  await page.getByRole("button", { name: "Review the record" }).click();

  await expect(
    page.getByText("Digital Conduct", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("8 messages conveyed 2 ideas across 6 minutes"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Submit for determination" }).click();

  await expect(page).toHaveURL(/\/en\/determination$/u);
  await expect(
    page.getByText("Department of Digital Conduct").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "The communications docket is established.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Message batching protocol")).toBeVisible();
  await expect(page.getByText("Filer-submitted counts")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create the public record" }).click();
  const publicAddress = await page
    .getByRole("link", { name: "Open the public record" })
    .getAttribute("href");
  if (!publicAddress)
    throw new Error(
      "Digital Conduct publication must return a public address.",
    );
  await page.goto(publicAddress);
  await expect(
    page.getByText("Department of Digital Conduct").first(),
  ).toBeVisible();
  await expect(page.locator(".share-object")).toContainText(
    "8 messages for 2 principal ideas",
  );
  const head = await page.locator("head").innerHTML();
  expect(head).toContain("Fragmented message sequence");
  expect(head).not.toContain("Alex");
});

test("completes and publishes a Domestic Affairs property register", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/file/respondent");
  await page.getByRole("textbox", { name: "Respondent alias" }).fill("Riley");
  await page.getByRole("button", { name: "Continue" }).click();
  await choose(page, "Roommate");
  await choose(
    page,
    "Domestic Affairs Shared containers, object placement, and household stock signals.",
  );
  await choose(
    page,
    "Stopped just short of the correct location Record the objects, correction path, and plausible final effort.",
  );
  await page.getByLabel("Objects awaiting placement").fill("4");
  await page.getByLabel("Distance to correct location").fill("8");
  await page.getByLabel("Plausible correction effort").fill("45");
  await page.getByRole("button", { name: "Continue" }).click();
  await choose(page, "Ordinary use of shared space was obstructed");
  await choose(page, "Reliably handles other shared tasks");
  await page
    .getByRole("textbox", { name: "Submitted statement" })
    .fill("Four items waited beside their ordinary location.");
  await page.getByRole("button", { name: "Review the record" }).click();

  await expect(
    page.getByText("Domestic Affairs", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "4 objects, 8 steps from the correct location, requiring 45 seconds",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Submit for determination" }).click();

  await expect(page).toHaveURL(/\/en\/determination$/u);
  await expect(
    page.getByText("Department of Domestic Affairs").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "The domestic property register is established.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Correct-location protocol")).toBeVisible();
  await expect(page.getByText("Filer-submitted measures")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create the public record" }).click();
  const publicAddress = await page
    .getByRole("link", { name: "Open the public record" })
    .getAttribute("href");
  if (!publicAddress)
    throw new Error(
      "Domestic Affairs publication must return a public address.",
    );
  await page.goto(publicAddress);
  await expect(
    page.getByText("Department of Domestic Affairs").first(),
  ).toBeVisible();
  await expect(page.locator(".share-object")).toContainText(
    "4 objects; 8-step correction path",
  );
  const head = await page.locator("head").innerHTML();
  expect(head).toContain("Incomplete object placement");
  expect(head).not.toContain("Riley");
  expect(head).not.toContain("45 seconds");
});

test("completes and publishes a Social Planning decision register", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/file/respondent");
  await page.getByRole("textbox", { name: "Respondent alias" }).fill("Morgan");
  await page.getByRole("button", { name: "Continue" }).click();
  await choose(page, "Friend");
  await choose(
    page,
    "Social Planning Option cycles, decision drift, and confirmed-plan revisions.",
  );
  await choose(
    page,
    "Rejected the available options without resolving the choice Compare proposed and rejected options with practical alternatives offered.",
  );
  await page.getByLabel("Practical options proposed").fill("6");
  await page.getByLabel("Options rejected").fill("5");
  await page.getByLabel("Alternatives offered").fill("1");
  await page.getByRole("button", { name: "Continue" }).click();
  await choose(page, "An ordinary planning decision stalled");
  await choose(page, "Sometimes offers practical alternatives");
  await page
    .getByRole("textbox", { name: "Submitted statement" })
    .fill(
      "Five practical dinner options were declined before one alternative appeared.",
    );
  await page.getByRole("button", { name: "Review the record" }).click();

  await expect(
    page.getByText("Social Planning", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("5 of 6 options rejected; 1 alternative offered"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Submit for determination" }).click();

  await expect(page).toHaveURL(/\/en\/determination$/u);
  await expect(
    page.getByText("Department of Social Planning").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "The social decision register is established.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Bounded shortlist protocol")).toBeVisible();
  await expect(page.getByText("Filer-submitted counts")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create the public record" }).click();
  const publicAddress = await page
    .getByRole("link", { name: "Open the public record" })
    .getAttribute("href");
  if (!publicAddress)
    throw new Error(
      "Social Planning publication must return a public address.",
    );
  await page.goto(publicAddress);
  await expect(
    page.getByText("Department of Social Planning").first(),
  ).toBeVisible();
  await expect(page.locator(".share-object")).toContainText(
    "5 of 6 submitted options rejected",
  );
  const head = await page.locator("head").innerHTML();
  expect(head).toContain("Option-veto cycle");
  expect(head).not.toContain("Morgan");
  expect(head).not.toContain("one alternative appeared");
});

test("keeps Social Planning units intact and explains numeric bounds", async ({
  page,
}) => {
  const draft = {
    ...createEmptySocialPlanningDraft(),
    respondent: "Morgan",
    relationship: "friend",
    offence: "confirmed_plan_revision",
  } satisfies SocialPlanningDraft;
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: storageKey, value: serializeDraft(draft, Date.now()) },
  );
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/en/file/social_evidence");

  await expect(page.getByText("Whole numbers from 0 to 168")).toBeVisible();
  const wrappedUnits = await page.locator(".field-unit").evaluateAll(
    (units) =>
      units.filter((unit) => {
        const style = getComputedStyle(unit);
        return (
          unit.getBoundingClientRect().height >
          Number.parseFloat(style.lineHeight) * 1.5
        );
      }).length,
  );
  expect(wrappedUnits).toBe(0);

  await page.getByRole("spinbutton", { name: /Advance notice/u }).fill("0.5");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator("#social_evidence-error")).toContainText(
    "Enter a whole number within the range shown.",
  );
});

test("preserves a safe draft across refresh and excludes rejected text", async ({
  page,
}) => {
  await page.goto("/en/file/respondent");
  await page.getByRole("textbox", { name: "Respondent alias" }).fill("Marco");
  await page.reload();
  await expect(page.getByText("Draft restored")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Respondent alias" }),
  ).toHaveValue("Marco");

  await page.goto("/en/file/statement");
  const statement = page.getByRole("textbox", { name: "Submitted statement" });
  await statement.fill("This describes abuse.");
  await page.getByRole("button", { name: "Review the record" }).click();
  await expect(page.locator(".form-error")).toContainText(
    "serious or sensitive matter",
  );
  const stored = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    storageKey,
  );
  expect(stored).not.toContain("This describes abuse.");
  expect(stored).toContain("Marco");
});

test("reviews a completed filing but starts a new one from the Bureau home", async ({
  page,
}) => {
  await page.addInitScript(
    ({
      draftKey,
      completionKey,
      determinationKey,
      seededKey,
      draft,
      completion,
      session,
    }) => {
      if (window.sessionStorage.getItem(seededKey) !== null) return;
      window.localStorage.setItem(draftKey, draft);
      window.localStorage.setItem(completionKey, completion);
      window.sessionStorage.setItem(determinationKey, session);
      window.sessionStorage.setItem(seededKey, "true");
    },
    {
      draftKey: storageKey,
      completionKey: FILING_COMPLETION_STORAGE_KEY,
      determinationKey: DETERMINATION_SESSION_KEY,
      seededKey: "bpg:test:completed-filing-seeded",
      draft: serializeDraft(completeDraft, Date.now()),
      completion: serializeFilingCompletion(Date.now()),
      session: fixedDeterminationSession(),
    },
  );

  await page.goto("/en/file/review");
  await expect(page.getByText(completeDraft.statement)).toBeVisible();

  await page.goto("/en");
  await page.getByRole("link", { name: "File a grievance" }).click();
  await expect(page).toHaveURL(/\/en\/file\/respondent$/u);
  await expect(
    page.getByRole("textbox", { name: "Respondent alias" }),
  ).toHaveValue("");
  await expect(page.getByText("Draft restored")).toHaveCount(0);
  expect(
    await page.evaluate(
      ({ completionKey, determinationKey }) => ({
        completion: window.localStorage.getItem(completionKey),
        determination: window.sessionStorage.getItem(determinationKey),
      }),
      {
        completionKey: FILING_COMPLETION_STORAGE_KEY,
        determinationKey: DETERMINATION_SESSION_KEY,
      },
    ),
  ).toEqual({ completion: null, determination: null });
});

test("supports keyboard choices, reduced motion, and an accessible question", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/file/relationship");
  const firstChoice = page.getByRole("radio", { name: "Friend" });
  await firstChoice.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: "Partner" })).toBeChecked();

  const duration = await page
    .locator(".progress-track i")
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).transitionDuration),
    );
  expect(duration).toBeLessThan(0.001);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("expires old drafts and lets the filer explicitly reset current work", async ({
  page,
}) => {
  await page.addInitScript(
    ({ key, seededKey, draft }) => {
      if (window.sessionStorage.getItem(seededKey) !== null) return;
      window.localStorage.setItem(
        key,
        JSON.stringify({
          version: 2,
          locale: "en",
          updatedAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
          draft,
        }),
      );
      window.sessionStorage.setItem(seededKey, "true");
    },
    {
      key: storageKey,
      seededKey: "bpg:test:expired-draft-seeded",
      draft: completeDraft,
    },
  );
  await page.goto("/en/file/respondent");
  await expect(page.getByText("Saved draft expired")).toBeVisible();
  const alias = page.getByRole("textbox", { name: "Respondent alias" });
  await expect(alias).toHaveValue("");

  await alias.fill("Marco");
  await page.getByRole("button", { name: "Start over" }).click();
  await expect(
    page.getByText("This removes the saved filing from this device."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm start over" }).click();
  await expect(alias).toHaveValue("");
  const stored = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    storageKey,
  );
  expect(stored).not.toContain("Marco");
});

test("rejects unsupported filing steps through the localized unavailable state", async ({
  page,
}) => {
  const response = await page.goto("/en/file/unknown");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "The Bureau cannot locate this route." }),
  ).toBeVisible();
});

test("returns direct determination navigation to the preserved review", async ({
  page,
}) => {
  await page.goto("/en/determination");
  await expect(page).toHaveURL(
    /\/en\/file\/review\?notice=determination-unavailable$/u,
  );
  await expect(
    page.getByText("No current determination in this tab"),
  ).toBeVisible();
});

test("renders an accessible immediate determination under reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openFixedDetermination(page);

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/u,
  );
  const publicAccessibility = await new AxeBuilder({ page }).analyze();
  expect(publicAccessibility.violations).toEqual([]);
  const duration = await page
    .locator(".determination-record")
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).animationDuration),
    );
  expect(duration).toBeLessThan(0.001);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("transfers one fixed residual allowance to exactly one successor", async ({
  page,
  context,
  browser,
}: {
  page: Page;
  context: BrowserContext;
  browser: Browser;
}) => {
  await context.addCookies([
    {
      name: "bpg_standard_session_v1",
      value: standardSession,
      url: "http://127.0.0.1:4173",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await openFixedDetermination(page);
  await expect(
    page.getByRole("heading", {
      name: "Give the remaining filings to one person.",
    }),
  ).toBeVisible();
  await expect(page.getByText("4 of 5")).toBeVisible();
  await page.getByRole("button", { name: "Issue private invitation" }).click();
  const invitation = await page
    .getByLabel("Private successor address")
    .inputValue();
  expect(invitation).toContain("/en/access#sti_");

  const successorContext = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": "198.51.100.27" },
  });
  const successorPage = await successorContext.newPage();
  await successorPage.goto(invitation);
  await expect(
    successorPage.getByRole("heading", {
      name: "Your filing authority is ready.",
    }),
  ).toBeVisible();
  await expect(successorPage.getByText("4 of 5").first()).toBeVisible();
  expect(successorPage.url()).not.toContain("sti_");

  await page.goto("/en/access");
  await expect(
    page.getByRole("heading", {
      name: "The remaining allowance now belongs to the successor.",
    }),
  ).toBeVisible();
  await successorContext.close();
});

test("publishes, reports, unpublishes, restores, and deletes a public record", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { publicAddress, ownerAddress } = await publishFixedRecord(page);
  expect(publicAddress).not.toContain("owner=");
  expect(ownerAddress).toContain("#owner=own_");

  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      value: (payload: ShareData) => {
        window.__bureauSharePayload = payload;
        return Promise.resolve();
      },
    });
  });

  const publicResponse = await page.goto(publicAddress);
  expect(publicResponse?.headers()["cache-control"]).toContain("no-store");
  await expect(
    page.getByRole("heading", { name: "Review concerning Marco" }),
  ).toBeVisible();
  await expect(
    page.getByText("Unlisted public record · noindex"),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/u,
  );
  expect(page.url()).not.toContain("owner=");
  const publicSource = await page.content();
  expect(publicSource).not.toContain('"relationship":"friend"');
  expect(publicSource).not.toContain("ownerCredential");
  const head = await page.locator("head").innerHTML();
  expect(head).toContain("Premature departure — Bureau of Petty Grievances");
  expect(head).toContain("summary_large_image");
  expect(head).not.toContain("Marco");
  expect(head).not.toContain("19:30");
  expect(head).not.toContain("looking for his shoes");
  expect(head).not.toContain("owner=");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    publicAddress,
  );
  const socialImageUrl = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  if (socialImageUrl === null) {
    throw new Error("Available records must emit a social image.");
  }
  expect(socialImageUrl).toContain("/social-image?v=");
  const socialImage = await page.request.get(socialImageUrl);
  expect(socialImage.status()).toBe(200);
  expect(socialImage.headers()["content-type"]).toContain("image/png");
  expect(socialImage.headers()["cache-control"]).toContain("no-store");
  expect(socialImage.headers()["x-robots-tag"]).toContain("noimageindex");
  expect((await socialImage.body()).byteLength).toBeGreaterThan(10_000);

  await expect(page.locator(".consultation-summary")).toContainText(
    "0 responses",
  );
  await expect(
    page.getByText(
      "No positions have been entered. The first response will establish the public result.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: /Grievance upheld/u }).click();
  await expect(
    page.getByText("Your position has been entered into the public record."),
  ).toBeVisible();
  await expect(page.locator(".consultation-summary")).toContainText(
    "1 response",
  );
  await expect(
    page.getByRole("button", { name: /Grievance upheld/u }),
  ).toHaveAttribute("aria-pressed", "true");
  const consultationMotion = await page
    .locator(".consultation-meter > span")
    .first()
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).transitionDuration),
    );
  expect(consultationMotion).toBeLessThan(0.001);
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Grievance upheld/u }),
  ).toHaveAttribute("aria-pressed", "true");
  const consultationAccessibility = await new AxeBuilder({ page }).analyze();
  expect(consultationAccessibility.violations).toEqual([]);

  await page.getByRole("button", { name: "Share determination" }).click();
  await expect(
    page.getByText("The device sharing options are open."),
  ).toBeVisible();
  const sharePayload: unknown = await page.evaluate(
    () => window.__bureauSharePayload,
  );
  expect(sharePayload).toEqual({
    title: "Bureau determination · CHR · 2026 · A1B2C3",
    text: "Premature departure. A 24-minute discrepancy. Mitigation entered: dessert is usually brought.",
    url: publicAddress,
  });
  expect(JSON.stringify(sharePayload)).not.toContain("owner=");
  await page
    .getByRole("radio", { name: "It exposes private information" })
    .check();
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(
    page.getByText("Report received for Bureau review."),
  ).toBeVisible();

  const ownerResponse = await page.goto(ownerAddress);
  expect(ownerResponse?.headers()["cache-control"]).toContain("no-store");
  await expect(page).not.toHaveURL(/owner=/u);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/u,
  );
  await expect(
    page.getByText("Published", { exact: true }).last(),
  ).toBeVisible();
  const managementAccessibility = await new AxeBuilder({ page }).analyze();
  expect(managementAccessibility.violations).toEqual([]);
  await page.getByRole("button", { name: "Unpublish the record" }).click();
  await expect(page.getByText("Unpublished by owner")).toBeVisible();
  expect(
    (
      await page.request.get(socialImageUrl, {
        headers: { "cache-control": "no-cache", pragma: "no-cache" },
      })
    ).status(),
  ).toBe(404);

  const publicPage = await page.context().newPage();
  await publicPage.goto(publicAddress);
  await expect(
    publicPage.getByRole("heading", {
      name: "This determination is not publicly available.",
    }),
  ).toBeVisible();
  const unavailableHead = await publicPage.locator("head").innerHTML();
  expect(unavailableHead).toContain(
    "Public record — Bureau of Petty Grievances",
  );
  expect(unavailableHead).not.toContain("Premature departure");
  expect(unavailableHead).not.toContain("24-minute discrepancy");
  await expect(publicPage.locator('meta[property="og:image"]')).toHaveCount(0);
  await publicPage.close();

  await page.getByRole("button", { name: "Restore public access" }).click();
  await expect(
    page.getByText("Published", { exact: true }).last(),
  ).toBeVisible();
  const restoredPublicPage = await page.context().newPage();
  await restoredPublicPage.goto(publicAddress);
  await expect(
    restoredPublicPage.locator(".consultation-summary"),
  ).toContainText("1 response");
  await restoredPublicPage.close();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(page.getByText("This cannot be undone.")).toBeVisible();
  await page
    .getByRole("button", { name: "Confirm permanent deletion" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "The public record was permanently deleted.",
    }),
  ).toBeVisible();
  await page.goto(publicAddress);
  await expect(
    page.getByRole("heading", {
      name: "This determination is not publicly available.",
    }),
  ).toBeVisible();
});

test.describe("filing visual contract", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("mobile opening question", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/file/respondent");
    await expect(page).toHaveScreenshot("filing-respondent-mobile.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("desktop completed review", async ({ page }) => {
    await page.addInitScript(
      ({ key, draft }) => {
        window.localStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            locale: "en",
            updatedAt: Date.now(),
            draft,
          }),
        );
      },
      { key: storageKey, draft: completeDraft },
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/en/file/review");
    await expect(page.getByText("Draft restored")).toBeVisible();
    await expect(page).toHaveScreenshot("filing-review-desktop.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("mobile determination", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openFixedDetermination(page);
    await expect(page).toHaveScreenshot("determination-mobile.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("desktop determination", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openFixedDetermination(page);
    await expect(page).toHaveScreenshot("determination-desktop.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("desktop Digital Conduct determination", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openFixedDigitalDetermination(page);
    await expect(page).toHaveScreenshot(
      "digital-conduct-determination-desktop.png",
      {
        fullPage: true,
        animations: "disabled",
        maxDiffPixelRatio: 0.01,
      },
    );
  });

  test("mobile Domestic Affairs evidence", async ({ page }) => {
    await page.addInitScript(
      ({ key, value }) => {
        window.localStorage.setItem(key, value);
      },
      {
        key: storageKey,
        value: serializeDraft(completeDomesticDraft, Date.now()),
      },
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/file/domestic_evidence");
    await expect(page.getByText("Draft restored")).toBeVisible();
    await expect(page).toHaveScreenshot(
      "domestic-affairs-evidence-mobile.png",
      {
        fullPage: true,
        animations: "disabled",
        maxDiffPixelRatio: 0.01,
      },
    );
  });

  test("desktop Domestic Affairs determination", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openFixedDomesticDetermination(page);
    await expect(page).toHaveScreenshot(
      "domestic-affairs-determination-desktop.png",
      {
        fullPage: true,
        animations: "disabled",
        maxDiffPixelRatio: 0.01,
      },
    );
  });

  test("desktop Domestic Affairs remainder diagram", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openFixedDomesticDetermination(page, tokenRemainderDomesticDraft);
    await expect(page.locator(".domestic-reconstruction")).toHaveScreenshot(
      "domestic-affairs-remainder-diagram-desktop.png",
      {
        animations: "disabled",
        maxDiffPixelRatio: 0.01,
      },
    );
  });

  test("mobile Domestic Affairs empty-inventory diagram", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openFixedDomesticDetermination(page, emptyPackagingDomesticDraft);
    await expect(page.locator(".domestic-reconstruction")).toHaveScreenshot(
      "domestic-affairs-empty-inventory-diagram-mobile.png",
      {
        animations: "disabled",
        maxDiffPixelRatio: 0.01,
      },
    );
  });

  test("mobile Domestic Affairs public record", async ({ page }) => {
    const publicAddress = await publishFixedDomesticRecord(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(publicAddress);
    await expect(page).toHaveScreenshot(
      "domestic-affairs-public-record-mobile.png",
      {
        fullPage: true,
        animations: "disabled",
        maxDiffPixelRatio: 0.01,
      },
    );
  });

  test("mobile Social Planning evidence", async ({ page }) => {
    await page.addInitScript(
      ({ key, value }) => {
        window.localStorage.setItem(key, value);
      },
      {
        key: storageKey,
        value: serializeDraft(completeSocialDraft, Date.now()),
      },
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/file/social_evidence");
    await expect(page.getByText("Draft restored")).toBeVisible();
    await expect(page).toHaveScreenshot("social-planning-evidence-mobile.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("desktop Social Planning determination", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openFixedSocialDetermination(page);
    await expect(page).toHaveScreenshot(
      "social-planning-determination-desktop.png",
      {
        fullPage: true,
        animations: "disabled",
        maxDiffPixelRatio: 0.01,
      },
    );
  });

  test("mid-width confirmed-plan Social Planning determination", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1045, height: 900 });
    await openFixedSocialDetermination(page, confirmedPlanRevisionDraft);
    await expect(page.getByText("2 confirmed plan revisions")).toBeVisible();
    await expect(
      page.getByText("1 hour’s notice · 10 participants"),
    ).toBeVisible();
    await expect(page).toHaveScreenshot(
      "social-planning-confirmed-revision-mid-width.png",
      {
        fullPage: true,
        animations: "disabled",
        maxDiffPixelRatio: 0.01,
      },
    );
  });

  test("mobile Social Planning public record", async ({ page }) => {
    const publicAddress = await publishFixedSocialRecord(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(publicAddress);
    await expect(page).toHaveScreenshot(
      "social-planning-public-record-mobile.png",
      {
        fullPage: true,
        animations: "disabled",
        maxDiffPixelRatio: 0.01,
      },
    );
  });

  test("mobile public record", async ({ page }) => {
    const { publicAddress } = await publishFixedRecord(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(publicAddress);
    await expect(page).toHaveScreenshot("public-record-mobile.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("desktop public record", async ({ page }) => {
    const { publicAddress } = await publishFixedRecord(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(publicAddress);
    await expect(page).toHaveScreenshot("public-record-desktop.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("social preview image", async ({ page }) => {
    const { publicAddress } = await publishFixedRecord(page);
    await page.goto(publicAddress);
    const socialImageUrl = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    if (socialImageUrl === null) {
      throw new Error("The social preview fixture must expose an image.");
    }
    await page.setContent(
      `<style>*{box-sizing:border-box}html,body{margin:0}img{display:block;width:1200px;height:630px}</style><img src="${socialImageUrl}" alt="">`,
    );
    await expect(page.locator("img")).toHaveScreenshot("social-preview.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("mobile owner controls", async ({ page }) => {
    const { ownerAddress } = await publishFixedRecord(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(ownerAddress);
    await expect(
      page.getByText("Published", { exact: true }).last(),
    ).toBeVisible();
    await expect(page).toHaveScreenshot("owner-controls-mobile.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });
});
