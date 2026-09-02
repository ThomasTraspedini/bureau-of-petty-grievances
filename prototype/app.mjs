import { formatMessage, locale, messages } from "./en/messages.mjs";
import {
  STEP_ORDER,
  buildDetermination,
  createFiling,
  getNextStep,
  getPreviousStep,
  parseStoredFiling,
  updateConsultation,
  validateStep,
} from "./prototype-state.mjs";

const app = document.querySelector("#app");
const announcer = document.querySelector("#announcer");
const draftKey = `bpg:prototype:draft:${locale}`;
const consultationKey = `bpg:prototype:consultation:${locale}`;
const allowedViews = new Set([
  "landing",
  "access",
  "filing",
  "review",
  "processing",
  "determination",
  "share",
  "successor",
  "failure",
  "rejected",
]);

const initialView = new URLSearchParams(window.location.search).get("state") ?? "landing";

const state = {
  view: allowedViews.has(initialView) ? initialView : "landing",
  step: "respondent",
  filing: loadDraft(),
  validation: null,
  consultation: {
    counts: { upheld: 18, circumstances: 9, dismissed: 3 },
    position: window.localStorage.getItem(consultationKey),
  },
  successorIssued: false,
  feedback: null,
};

document.documentElement.lang = locale;
document.documentElement.dataset.locale = locale;
document.title = messages.metaTitle;
setMetaDescription(messages.metaDescription);

function t(key, variables) {
  return formatMessage(key, variables);
}

function setMetaDescription(content) {
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "description";
    document.head.append(meta);
  }
  meta.content = content;
}

function loadDraft() {
  try {
    const stored = window.localStorage.getItem(draftKey);
    return stored ? parseStoredFiling(JSON.parse(stored)) : createFiling();
  } catch {
    return createFiling();
  }
}

function saveDraft() {
  window.localStorage.setItem(draftKey, JSON.stringify(state.filing));
  announce(t("liveDraftSaved"));
}

function announce(message) {
  announcer.textContent = "";
  window.requestAnimationFrame(() => {
    announcer.textContent = message;
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function brandMark(tone = "dark") {
  const stroke = tone === "light" ? "#fffdf8" : "#132d56";
  const accent = "#ef9c72";
  return `
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="22.5" fill="none" stroke="${stroke}" stroke-width="1"/>
      <path d="M14 16.5h20M14 24h20M14 31.5h20" fill="none" stroke="${stroke}" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="20" cy="16.5" r="3.2" fill="${accent}"/>
      <circle cx="29" cy="24" r="3.2" fill="${accent}"/>
      <circle cx="23" cy="31.5" r="3.2" fill="${accent}"/>
    </svg>`;
}

function icon(name) {
  const icons = {
    arrow: `<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    back: `<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M16 10H5m4-5-5 5 5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    check: `<svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="m5 10 3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    shield: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m9 12 2 2 4-5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`,
    copy: `<svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true"><rect x="7" y="7" width="9" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M13 7V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`,
  };
  return icons[name] ?? "";
}

function header() {
  return `
    <a class="skip-link" href="#main-content">${t("skipToContent")}</a>
    <header class="site-header">
      <div class="header-inner">
        <button class="brand" type="button" data-action="go" data-view="landing">
          <span class="brand-mark">${brandMark()}</span>
          <span>
            <span class="brand-name">${t("brandName")}</span>
            <span class="brand-office">${t("brandDescriptor")}</span>
          </span>
        </button>
        <nav class="site-nav" aria-label="${t("brandName")}">
          <button class="nav-link" type="button" data-action="go" data-view="determination">${t("navExample")}</button>
          <button class="nav-link" type="button" data-action="go" data-view="access">${t("navAccess")}</button>
          <button class="nav-link primary" type="button" data-action="go" data-view="access">${t("navNewFiling")}</button>
        </nav>
      </div>
    </header>`;
}

function footer() {
  return `
    <footer class="site-footer">
      <div class="footer-inner">
        <p class="footer-mission">${t("footerMission")}</p>
        <div class="footer-meta">
          <span>${t("footerService")}</span>
          <span>${t("footerLocale")}</span>
          <span>${t("footerPrivacy")}</span>
        </div>
      </div>
    </footer>`;
}

function renderLanding() {
  const departments = [
    ["01", "departmentChronology", "departmentChronologyDescription"],
    ["02", "departmentDigital", "departmentDigitalDescription"],
    ["03", "departmentDomestic", "departmentDomesticDescription"],
    ["04", "departmentPlanning", "departmentPlanningDescription"],
  ];
  const principles = [
    ["landingPrincipleOneTitle", "landingPrincipleOneBody"],
    ["landingPrincipleTwoTitle", "landingPrincipleTwoBody"],
    ["landingPrincipleThreeTitle", "landingPrincipleThreeBody"],
  ];

  return `
    ${header()}
    <main id="main-content" class="main landing-main" tabindex="-1">
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">${t("landingEyebrow")}</p>
          <h1>${t("landingTitle")}</h1>
          <p class="hero-intro">${t("landingIntro")}</p>
          <div class="button-row">
            <button class="button button-primary" type="button" data-action="go" data-view="access">${t("landingPrimary")} ${icon("arrow")}</button>
            <button class="button button-secondary" type="button" data-action="go" data-view="determination">${t("landingSecondary")}</button>
          </div>
          <div class="assurance">
            <span class="assurance-mark">${icon("check")}</span>
            <div><strong>${t("landingAssuranceTitle")}</strong>${t("landingAssuranceBody")}</div>
          </div>
        </div>
        <div class="hero-visual" aria-label="${t("landingSampleKicker")}">
          <article class="sample-record">
            <div class="sample-seal">${brandMark()}</div>
            <p class="sample-kicker">${t("landingSampleKicker")}</p>
            <h2>${t("landingSampleTitle")}</h2>
            <p>${t("landingSampleBody")}</p>
            <span class="status-pill">${t("landingSampleStatus")}</span>
            <p class="sample-remedy">${t("landingSampleRemedy")}</p>
            <p class="sample-meta">${t("landingSampleMeta")}</p>
            <button class="text-button" type="button" data-action="go" data-view="determination">${t("landingSampleOpen")}</button>
          </article>
        </div>
      </section>
      <section class="metrics-band" aria-label="${t("landingAssuranceTitle")}">
        <div class="metrics-inner">
          ${metric("landingMetricOneValue", "landingMetricOneLabel")}
          ${metric("landingMetricTwoValue", "landingMetricTwoLabel")}
          ${metric("landingMetricThreeValue", "landingMetricThreeLabel")}
        </div>
      </section>
      <section class="landing-section">
        <div class="section-header">
          <div>
            <p class="eyebrow">${t("departmentsKicker")}</p>
            <h2 class="section-title">${t("departmentsTitle")}</h2>
          </div>
          <p class="section-body">${t("departmentsBody")}</p>
        </div>
        <div class="department-grid">
          ${departments.map(([number, title, body]) => `
            <article class="department-card">
              <span class="department-number">${number}</span>
              <h3>${t(title)}</h3>
              <p>${t(body)}</p>
              <span class="department-status">${t("departmentAvailable")}</span>
            </article>`).join("")}
        </div>
      </section>
      <section class="landing-section principles-section">
        <div class="principle-grid">
          ${principles.map(([title, body]) => `
            <article class="principle-card">
              <span class="principle-icon">${icon("check")}</span>
              <h3>${t(title)}</h3>
              <p>${t(body)}</p>
            </article>`).join("")}
        </div>
      </section>
    </main>
    ${footer()}`;
}

function metric(valueKey, labelKey) {
  return `<div class="metric"><span class="metric-value">${t(valueKey)}</span><span class="metric-label">${t(labelKey)}</span></div>`;
}

function journeyShell(content, options = {}) {
  const title = options.title ?? t("landingTitle");
  const body = options.body ?? t("landingAssuranceBody");
  return `
    ${header()}
    <main id="main-content" class="main journey" tabindex="-1">
      <div class="journey-grid">
        <aside class="journey-rail">
          <div class="rail-content">
            <div class="rail-seal">${brandMark("light")}</div>
            <h2 class="rail-title">${title}</h2>
            <p class="rail-copy">${body}</p>
            <ul class="rail-meta">
              <li>${t("footerLocale")}</li>
              <li>${t("filingRecordStatus")}</li>
              <li>${t("footerPrivacy")}</li>
            </ul>
          </div>
          <div class="rail-footer">${t("brandDescriptor")}</div>
        </aside>
        <div class="journey-content">${content}</div>
      </div>
    </main>`;
}

function renderAccess() {
  return journeyShell(`
    <section class="screen">
      <p class="eyebrow">${t("accessEyebrow")}</p>
      <h1 class="screen-title">${t("accessTitle")}</h1>
      <p class="screen-body">${t("accessBody")}</p>
      <dl class="credential-card">
        <div class="credential-row"><dt>${t("accessCredentialLabel")}</dt><dd>${t("accessCredentialValue")}</dd></div>
        <div class="credential-row"><dt>${t("accessCreditLabel")}</dt><dd>${t("accessCreditValue")}</dd></div>
      </dl>
      <div class="button-row">
        <button class="button button-primary" type="button" data-action="start-filing">${t("accessPrimary")} ${icon("arrow")}</button>
        <button class="button button-quiet" type="button" data-action="go" data-view="landing">${t("accessBack")}</button>
      </div>
    </section>`, { title: t("accessEyebrow"), body: t("accessBody") });
}

const stepCopy = {
  respondent: ["stepRespondentKicker", "stepRespondentTitle", "stepRespondentBody", "respondentWhy"],
  relationship: ["stepRelationshipKicker", "stepRelationshipTitle", "stepRelationshipBody", "relationshipWhy"],
  department: ["stepDepartmentKicker", "stepDepartmentTitle", "stepDepartmentBody", "departmentWhy"],
  offence: ["stepOffenceKicker", "stepOffenceTitle", "stepOffenceBody", "offenceWhy"],
  timing: ["stepTimingKicker", "stepTimingTitle", "stepTimingBody", "timingWhy"],
  impact: ["stepImpactKicker", "stepImpactTitle", "stepImpactBody", "impactWhy"],
  mitigation: ["stepMitigationKicker", "stepMitigationTitle", "stepMitigationBody", "mitigationWhy"],
  statement: ["stepStatementKicker", "stepStatementTitle", "stepStatementBody", "statementWhy"],
};

function renderFiling() {
  const index = STEP_ORDER.indexOf(state.step);
  const [kickerKey, titleKey, bodyKey, whyKey] = stepCopy[state.step];
  const variables = { respondent: escapeHtml(state.filing.respondent) };
  const content = `
    <section class="screen">
      <div class="progress-wrap">
        <div class="progress-meta">
          <span>${t("progressStep", { current: index + 1, total: STEP_ORDER.length })}</span>
          <span>${t("filingRecordStatus")}</span>
        </div>
        <div class="progress-track" role="progressbar" aria-label="${t("progressLabel")}" aria-valuemin="1" aria-valuemax="${STEP_ORDER.length}" aria-valuenow="${index + 1}">
          <div class="progress-value" style="width:${((index + 1) / STEP_ORDER.length) * 100}%"></div>
        </div>
      </div>
      <p class="eyebrow">${t(kickerKey)}</p>
      <h1 class="screen-title">${t(titleKey, variables)}</h1>
      <p class="screen-body">${t(bodyKey, variables)}</p>
      ${renderStepControl(state.step)}
      ${renderValidation()}
      <div class="why-panel"><strong>${t("filingWhy")}</strong>${t(whyKey)}</div>
      <div class="screen-actions">
        <button class="button button-quiet" type="button" data-action="previous-step">${icon("back")} ${t("back")}</button>
        <button class="button button-primary" type="button" data-action="next-step">${index === STEP_ORDER.length - 1 ? t("reviewRecord") : t("continue")} ${icon("arrow")}</button>
      </div>
    </section>`;

  return journeyShell(content, { title: t("filingDepartment"), body: t("filingRecordStatus") });
}

function renderStepControl(step) {
  if (step === "respondent") {
    return `<div class="field">
      <label class="field-label" for="respondent">${t("respondentLabel")}</label>
      <input class="text-input" id="respondent" name="respondent" maxlength="32" autocomplete="off" value="${escapeHtml(state.filing.respondent)}" data-input="respondent" aria-describedby="respondent-hint" />
      <span class="field-hint" id="respondent-hint">${t("respondentHint")}</span>
    </div>`;
  }

  if (step === "relationship") {
    return choiceList("relationship", [
      ["friend", "relationshipFriend"],
      ["partner", "relationshipPartner"],
      ["roommate", "relationshipRoommate"],
      ["colleague", "relationshipColleague"],
      ["sibling", "relationshipSibling"],
    ]);
  }

  if (step === "department") {
    return choiceList("department", [
      ["chronology", "departmentChronology", "departmentChronologyShort"],
      ["digital", "departmentDigital", "departmentDigitalShort"],
      ["domestic", "departmentDomestic", "departmentDomesticShort"],
      ["planning", "departmentPlanning", "departmentPlanningShort"],
    ], true);
  }

  if (step === "offence") {
    return choiceList("offence", [
      ["prematureDeparture", "offencePrematureDeparture"],
      ["chronicLateness", "offenceChronicLateness"],
      ["optimisticEstimate", "offenceOptimisticEstimate"],
    ]);
  }

  if (step === "timing") {
    return `<div class="field-pair">
      <div>
        <label class="field-label" for="promised-time">${t("promisedTimeLabel")}</label>
        <input class="time-input" id="promised-time" type="time" value="${escapeHtml(state.filing.promisedTime)}" data-input="promisedTime" />
      </div>
      <div class="input-suffix">
        <label class="field-label" for="actual-delay">${t("actualDelayLabel")}</label>
        <input class="number-input" id="actual-delay" type="number" min="1" max="180" inputmode="numeric" value="${escapeHtml(state.filing.actualDelay)}" data-input="actualDelay" />
        <span class="suffix">${t("actualDelaySuffix")}</span>
      </div>
    </div>`;
  }

  if (step === "impact") {
    return choiceList("impact", [
      ["tableHeld", "impactTableHeld"],
      ["repeatedUpdates", "impactRepeatedUpdates"],
      ["plansCompressed", "impactPlansCompressed"],
      ["noMaterial", "impactNoMaterial"],
    ]);
  }

  if (step === "mitigation") {
    return choiceList("mitigation", [
      ["bringsDessert", "mitigationDessert"],
      ["apologizes", "mitigationApologizes"],
      ["helpsOthers", "mitigationHelpsOthers"],
      ["warns", "mitigationWarns"],
    ]);
  }

  return `<div class="field">
    <label class="field-label" for="statement">${t("statementLabel")}</label>
    <textarea class="text-area" id="statement" maxlength="160" data-input="statement" aria-describedby="statement-hint statement-boundary">${escapeHtml(state.filing.statement)}</textarea>
    <span class="field-hint" id="statement-hint">${t("statementCounter", { count: [...state.filing.statement].length })}</span>
    <span class="field-hint" id="statement-boundary">${t("statementBoundary")}</span>
  </div>`;
}

function choiceList(field, choices, departmentList = false) {
  return `<div class="choice-list ${choices.length === 4 ? "choice-grid" : ""}" role="group" aria-label="${t(stepCopy[state.step][1], { respondent: state.filing.respondent })}">
    ${choices.map(([value, labelKey, descriptionKey]) => {
      const selected = state.filing[field] === value;
      const limited = departmentList && value !== "chronology";
      return `<button class="choice" type="button" aria-pressed="${selected}" ${limited ? 'aria-disabled="true"' : ""} data-action="choice" data-field="${field}" data-value="${value}">
        <span class="choice-indicator">${selected ? icon("check") : ""}</span>
        <span>
          <span class="choice-title">${t(labelKey)}</span>
          ${descriptionKey ? `<span class="choice-description">${t(descriptionKey)}</span>` : ""}
          ${limited ? `<span class="choice-description">${t("representativePathNotice")}</span>` : ""}
        </span>
      </button>`;
    }).join("")}
  </div>`;
}

function renderValidation() {
  if (!state.validation) return "";
  const keyByCode = {
    required: "validationRequired",
    tooLong: "validationTooLong",
    invalidDelay: "validationInvalidDelay",
    mitigationRequired: "validationMitigationRequired",
    statementTooLong: "validationStatementTooLong",
    restrictedContent: "validationRestrictedContent",
  };
  return `<div class="validation" role="alert"><span aria-hidden="true">●</span><span>${t(keyByCode[state.validation])}</span></div>`;
}

const valueMessageKeys = {
  friend: "relationshipFriend",
  partner: "relationshipPartner",
  roommate: "relationshipRoommate",
  colleague: "relationshipColleague",
  sibling: "relationshipSibling",
  chronology: "departmentChronology",
  prematureDeparture: "offencePrematureDeparture",
  chronicLateness: "offenceChronicLateness",
  optimisticEstimate: "offenceOptimisticEstimate",
  tableHeld: "impactTableHeld",
  repeatedUpdates: "impactRepeatedUpdates",
  plansCompressed: "impactPlansCompressed",
  noMaterial: "impactNoMaterial",
  bringsDessert: "mitigationDessert",
  apologizes: "mitigationApologizes",
  helpsOthers: "mitigationHelpsOthers",
  warns: "mitigationWarns",
};

function labelFor(value) {
  return valueMessageKeys[value] ? t(valueMessageKeys[value]) : escapeHtml(value);
}

function renderReview() {
  const reviewItems = [
    ["reviewRespondent", escapeHtml(state.filing.respondent), "respondent"],
    ["reviewRelationship", labelFor(state.filing.relationship), "relationship"],
    ["reviewDepartment", labelFor(state.filing.department), "department"],
    ["reviewGrievance", labelFor(state.filing.offence), "offence"],
    ["reviewChronology", t("reviewTimeValue", { time: state.filing.promisedTime, delay: formatNumber(state.filing.actualDelay) }), "timing"],
    ["reviewImpact", labelFor(state.filing.impact), "impact"],
    ["reviewMitigation", labelFor(state.filing.mitigation), "mitigation"],
    ["reviewStatement", `“${escapeHtml(state.filing.statement)}”`, "statement"],
  ];

  return journeyShell(`
    <section class="screen">
      <p class="eyebrow">${t("reviewEyebrow")}</p>
      <h1 class="screen-title">${t("reviewTitle")}</h1>
      <p class="screen-body">${t("reviewBody")}</p>
      <div class="review-list">
        ${reviewItems.map(([label, value, step]) => `<div class="review-item">
          <span class="review-label">${t(label)}</span>
          <span class="review-value">${value}</span>
          <button class="review-edit" type="button" data-action="edit-step" data-step="${step}">${t("reviewEdit")}</button>
        </div>`).join("")}
      </div>
      <div class="boundary-card">
        <span class="boundary-icon">${icon("shield")}</span>
        <div><strong>${t("reviewConsentTitle")}</strong><p>${t("reviewConsentBody")}</p></div>
      </div>
      <div class="screen-actions">
        <button class="button button-quiet" type="button" data-action="edit-step" data-step="statement">${icon("back")} ${t("back")}</button>
        <button class="button button-primary" type="button" data-action="go" data-view="processing">${t("reviewPrimary")} ${icon("arrow")}</button>
      </div>
    </section>`, { title: t("reviewEyebrow"), body: t("reviewBody") });
}

function renderProcessing() {
  const items = ["processingStepOne", "processingStepTwo", "processingStepThree", "processingStepFour"];
  return journeyShell(`
    <section class="screen">
      <p class="eyebrow">${t("processingEyebrow")}</p>
      <h1 class="screen-title">${t("processingTitle")}</h1>
      <p class="screen-body">${t("processingBody")}</p>
      <ol class="processing-list">
        ${items.map((item) => `<li class="processing-item"><span class="processing-check">${icon("check")}</span><span>${t(item)}</span><span class="processing-status">${t("processingComplete")}</span></li>`).join("")}
      </ol>
      <div class="button-row">
        <button class="button button-primary" type="button" data-action="go" data-view="determination">${t("processingPrimary")} ${icon("arrow")}</button>
      </div>
    </section>`, { title: t("processingEyebrow"), body: t("processingBody") });
}

function renderDetermination() {
  const determination = buildDetermination(state.filing);
  const determinationCopy = copyForDetermination();
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 8, 2)));
  const consultation = state.consultation;
  return `
    ${header()}
    <main id="main-content" class="main determination-page" tabindex="-1">
      <article class="determination-record">
        <header class="document-masthead">
          <div class="official-seal">${brandMark()}</div>
          <div><span class="document-office">${t("brandName")}</span><span class="document-suboffice">${t("brandDescriptor")}</span></div>
          <span class="document-unlisted">${t("determinationUnlisted")}</span>
        </header>
        <section class="document-hero">
          <span class="document-kicker">${t("determinationOfficial")}</span>
          <h1 class="determination-title">${t("determinationTitle", { respondent: escapeHtml(state.filing.respondent) })}</h1>
          <span class="determination-status">${t("determinationStatus")}</span>
          <p class="determination-summary">${t(determinationCopy.summary)}</p>
        </section>
        <section class="document-metadata">
          ${metadata("determinationRecordLabel", determination.recordId)}
          ${metadata("determinationFiledLabel", date)}
          ${metadata("determinationDepartmentLabel", t("determinationDepartmentValue"))}
        </section>
        <section class="document-section">
          <h2>${t("determinationFactTitle")}</h2>
          <div class="timeline">
            <div class="timeline-point"><span class="timeline-label">${t("determinationPromised")}</span><span class="timeline-value">${escapeHtml(state.filing.promisedTime)}</span></div>
            <div class="timeline-point"><span class="timeline-label">${t("determinationDeclared")}</span><span class="timeline-value">${t("determinationDeclared")}</span></div>
            <div class="timeline-point"><span class="timeline-label">${t("determinationObserved")}</span><span class="timeline-value">${t("determinationDelayValue", { delay: formatNumber(determination.delayMinutes) })}</span></div>
          </div>
        </section>
        <section class="document-section">
          <div class="finding-grid">
            <div class="finding-card"><h3>${t("determinationFindingTitle")}</h3><p>${t(determinationCopy.finding)}</p></div>
            <div class="finding-card impact"><h3>${t("determinationImpactTitle")}</h3><p>${t(determinationCopy.impact)}</p></div>
            <div class="finding-card mitigating"><h3>${t("determinationFactorTitle")}</h3><p>${t(determinationCopy.mitigation)}</p></div>
          </div>
        </section>
        <section class="document-section">
          <div class="remedy-card">
            <span class="remedy-label">${t("determinationRemedyLabel")}</span>
            <h2>${t(determinationCopy.remedyTitle)}</h2>
            <p>${t(determinationCopy.remedyBody)}</p>
          </div>
        </section>
        <footer class="document-closing"><p>${t("determinationClosing")}</p></footer>
      </article>
      <section class="consultation" aria-labelledby="consultation-title">
        <p class="eyebrow">${t("consultationEyebrow")}</p>
        <h2 id="consultation-title">${t("consultationTitle")}</h2>
        <p class="consultation-intro">${t("consultationBody")}</p>
        <div class="consultation-options">
          ${consultationOption("upheld", "consultationUpheld", consultation)}
          ${consultationOption("circumstances", "consultationCircumstances", consultation)}
          ${consultationOption("dismissed", "consultationDismissed", consultation)}
        </div>
        ${consultation.position ? `<p class="consultation-confirmation" role="status">${t("consultationSubmitted")}</p>` : ""}
      </section>
      <div class="record-actions">
        <button class="button button-primary" type="button" data-action="go" data-view="share">${t("determinationShare")}</button>
        <button class="button button-secondary" type="button" data-action="go" data-view="successor">${t("determinationSuccessor")}</button>
        <button class="button button-quiet" type="button">${t("determinationReport")}</button>
      </div>
    </main>
    ${footer()}`;
}

function copyForDetermination() {
  const offence = {
    prematureDeparture: {
      summary: "determinationSummary",
      finding: "determinationFindingBody",
      remedyTitle: "determinationRemedyTitle",
      remedyBody: "determinationRemedyBody",
    },
    chronicLateness: {
      summary: "determinationSummaryChronic",
      finding: "determinationFindingBodyChronic",
      remedyTitle: "determinationRemedyTitleChronic",
      remedyBody: "determinationRemedyBodyChronic",
    },
    optimisticEstimate: {
      summary: "determinationSummaryEstimate",
      finding: "determinationFindingBodyEstimate",
      remedyTitle: "determinationRemedyTitleEstimate",
      remedyBody: "determinationRemedyBodyEstimate",
    },
  }[state.filing.offence];

  const mitigation = {
    bringsDessert: "determinationFactorDessert",
    apologizes: "determinationFactorApology",
    helpsOthers: "determinationFactorHelp",
    warns: "determinationFactorWarning",
  }[state.filing.mitigation];

  const impact = {
    tableHeld: "determinationImpactTable",
    repeatedUpdates: "determinationImpactUpdates",
    plansCompressed: "determinationImpactCompressed",
    noMaterial: "determinationImpactNone",
  }[state.filing.impact];

  return { ...offence, mitigation, impact };
}

function metadata(labelKey, value) {
  return `<div class="metadata-cell"><span class="meta-label">${t(labelKey)}</span><span class="meta-value">${value}</span></div>`;
}

function consultationOption(position, labelKey, consultation) {
  const selected = consultation.position === position;
  const count = consultation.counts[position];
  return `<button class="consultation-option ${selected ? "selected" : ""}" type="button" data-action="consult" data-position="${position}" ${consultation.position ? "disabled" : ""}>
    <span class="consultation-choice">${t(labelKey)}</span>
    <span class="consultation-count">${t("consultationCount", { count: formatNumber(count) })}</span>
  </button>`;
}

function renderShare() {
  return journeyShell(`
    <section class="screen">
      <p class="eyebrow">${t("shareEyebrow")}</p>
      <h1 class="screen-title">${t("shareTitle")}</h1>
      <p class="screen-body">${t("shareBody")}</p>
      <article class="share-card">
        <span class="share-watermark" aria-hidden="true">${t("brandShort")}</span>
        <span class="sample-meta">${t("sharePreviewLabel")}</span>
        <h2>${t("sharePreviewTitle")}</h2>
        <p>${t("sharePreviewBodyDynamic", { delay: formatNumber(state.filing.actualDelay), mitigation: labelFor(state.filing.mitigation) })}</p>
      </article>
      <div class="button-row">
        <button class="button button-primary" type="button" data-action="copy-public">${icon("copy")} ${state.feedback === "public" ? t("shareCopied") : t("shareCopy")}</button>
        <button class="button button-quiet" type="button" data-action="go" data-view="determination">${t("shareBack")}</button>
      </div>
    </section>`, { title: t("shareEyebrow"), body: t("shareBody") });
}

function renderSuccessor() {
  return journeyShell(`
    <section class="screen">
      <p class="eyebrow">${t("successorEyebrow")}</p>
      <h1 class="screen-title">${t("successorTitle")}</h1>
      <p class="screen-body">${t("successorBody")}</p>
      <article class="permit-card">
        <span class="permit-label">${t("successorPermitLabel")}</span>
        <h2>${state.successorIssued ? t("successorIssuedTitle") : t("successorPermitValue")}</h2>
        <p>${state.successorIssued ? t("successorIssuedBody") : t("successorBody")}</p>
        <div class="permit-status"><span>${t("successorPermitLabel")}</span><span>${t("successorPermitValue")}</span></div>
      </article>
      <div class="button-row">
        ${state.successorIssued
          ? `<button class="button button-primary" type="button" data-action="copy-private">${icon("copy")} ${state.feedback === "private" ? t("successorCopied") : t("successorCopy")}</button>`
          : `<button class="button button-primary" type="button" data-action="issue-successor">${t("successorIssue")} ${icon("arrow")}</button>`}
        <button class="button button-quiet" type="button" data-action="go" data-view="determination">${t("successorBack")}</button>
      </div>
    </section>`, { title: t("successorEyebrow"), body: t("successorBody") });
}

function renderFailure() {
  return journeyShell(`
    <section class="screen">
      <div class="recovery-mark" aria-hidden="true">!</div>
      <p class="eyebrow">${t("failureEyebrow")}</p>
      <h1 class="screen-title">${t("failureTitle")}</h1>
      <p class="screen-body">${t("failureBody")}</p>
      <dl class="status-card">
        <div class="status-row"><dt>${t("failurePreservedLabel")}</dt><dd>${t("failurePreservedValue")}</dd></div>
        <div class="status-row"><dt>${t("failureCreditLabel")}</dt><dd>${t("failureCreditValue")}</dd></div>
      </dl>
      <div class="button-row">
        <button class="button button-primary" type="button" data-action="go" data-view="review">${t("failurePrimary")}</button>
        <button class="button button-quiet" type="button" data-action="go" data-view="landing">${t("failureSecondary")}</button>
      </div>
    </section>`, { title: t("failureEyebrow"), body: t("failureBody") });
}

function renderRejected() {
  return journeyShell(`
    <section class="screen rejected">
      <div class="recovery-mark" aria-hidden="true">i</div>
      <p class="eyebrow">${t("rejectedEyebrow")}</p>
      <h1 class="screen-title">${t("rejectedTitle")}</h1>
      <p class="screen-body">${t("rejectedBody")}</p>
      <div class="boundary-card"><span class="boundary-icon">${icon("shield")}</span><div><strong>${t("rejectedPreserved")}</strong><p>${t("validationRestrictedContent")}</p></div></div>
      <div class="button-row">
        <button class="button button-primary" type="button" data-action="edit-step" data-step="statement">${t("rejectedPrimary")}</button>
        <button class="button button-quiet" type="button" data-action="go" data-view="landing">${t("rejectedSecondary")}</button>
      </div>
    </section>`, { title: t("rejectedEyebrow"), body: t("rejectedBody") });
}

function formatNumber(value) {
  return new Intl.NumberFormat(locale).format(Number(value));
}

function render() {
  const renderers = {
    landing: renderLanding,
    access: renderAccess,
    filing: renderFiling,
    review: renderReview,
    processing: renderProcessing,
    determination: renderDetermination,
    share: renderShare,
    successor: renderSuccessor,
    failure: renderFailure,
    rejected: renderRejected,
  };
  app.innerHTML = renderers[state.view]();
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.querySelector("#main-content")?.focus({ preventScroll: true });
}

function setView(view) {
  if (!allowedViews.has(view)) return;
  state.view = view;
  state.validation = null;
  state.feedback = null;
  const url = new URL(window.location.href);
  if (view === "landing") url.searchParams.delete("state");
  else url.searchParams.set("state", view);
  window.history.replaceState({}, "", url);
  render();
}

async function copyValue(value, feedback, messageKey) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
  state.feedback = feedback;
  announce(t(messageKey));
  render();
}

app.addEventListener("click", (event) => {
  const control = event.target.closest("[data-action]");
  if (!control) return;
  const action = control.dataset.action;

  if (action === "go") setView(control.dataset.view);

  if (action === "start-filing") {
    state.step = "respondent";
    setView("filing");
  }

  if (action === "choice") {
    const field = control.dataset.field;
    const value = control.dataset.value;
    if (field === "department" && value !== "chronology") {
      announce(t("representativePathNotice"));
      return;
    }
    state.filing[field] = value;
    state.validation = null;
    saveDraft();
    announce(t("liveChoiceSelected", { choice: labelFor(value) }));
    render();
  }

  if (action === "previous-step") {
    const previous = getPreviousStep(state.step);
    if (previous === "access") setView("access");
    else {
      state.step = previous;
      render();
    }
  }

  if (action === "next-step") {
    const validation = validateStep(state.step, state.filing);
    if (validation === "restrictedContent") {
      state.validation = validation;
      saveDraft();
      setView("rejected");
      return;
    }
    if (validation) {
      state.validation = validation;
      render();
      document.querySelector(".validation")?.focus();
      return;
    }
    saveDraft();
    const next = getNextStep(state.step);
    if (next === "review") setView("review");
    else {
      state.step = next;
      state.validation = null;
      render();
    }
  }

  if (action === "edit-step") {
    state.step = control.dataset.step;
    setView("filing");
  }

  if (action === "consult" && !state.consultation.position) {
    const position = control.dataset.position;
    state.consultation.counts = updateConsultation(state.consultation.counts, position);
    state.consultation.position = position;
    window.localStorage.setItem(consultationKey, position);
    const consultationLabels = {
      upheld: "consultationUpheld",
      circumstances: "consultationCircumstances",
      dismissed: "consultationDismissed",
    };
    announce(t("liveConsultation", { choice: t(consultationLabels[position]) }));
    render();
  }

  if (action === "issue-successor") {
    state.successorIssued = true;
    render();
  }

  if (action === "copy-public") {
    const publicUrl = new URL(window.location.href);
    publicUrl.searchParams.set("state", "determination");
    copyValue(publicUrl.href, "public", "shareCopied");
  }

  if (action === "copy-private") {
    const inviteUrl = new URL(window.location.href);
    inviteUrl.searchParams.set("state", "access");
    copyValue(inviteUrl.href, "private", "successorCopied");
  }
});

app.addEventListener("input", (event) => {
  const input = event.target.closest("[data-input]");
  if (!input) return;
  state.filing[input.dataset.input] = input.value;
  state.validation = null;
  window.localStorage.setItem(draftKey, JSON.stringify(state.filing));

  if (input.dataset.input === "statement") {
    const counter = document.querySelector("#statement-hint");
    if (counter) counter.textContent = t("statementCounter", { count: [...input.value].length });
  }
});

window.addEventListener("popstate", () => {
  const view = new URLSearchParams(window.location.search).get("state") ?? "landing";
  state.view = allowedViews.has(view) ? view : "landing";
  render();
});

render();
