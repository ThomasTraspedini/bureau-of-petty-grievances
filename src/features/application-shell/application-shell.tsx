import type { InterfaceLocale } from "@/i18n/routing";

export interface ApplicationShellCopy {
  navigation: {
    skipToContent: string;
    brandName: string;
    brandInitial: string;
    brandDescriptor: string;
    locale: string;
  };
  home: {
    eyebrow: string;
    title: string;
    intro: string;
    primaryAction: string;
    secondaryAction: string;
    assuranceTitle: string;
    assuranceBody: string;
    statusLabel: string;
    statusTitle: string;
    statusBody: string;
    statusMeta: string;
    sampleKicker: string;
    sampleTitle: string;
    sampleBody: string;
    sampleStatus: string;
    sampleRemedyLabel: string;
    sampleRemedy: string;
    sampleMeta: string;
    standardsKicker: string;
    standardsTitle: string;
    standardOneIndex: string;
    standardOneTitle: string;
    standardOneBody: string;
    standardTwoIndex: string;
    standardTwoTitle: string;
    standardTwoBody: string;
    standardThreeIndex: string;
    standardThreeTitle: string;
    standardThreeBody: string;
    departmentsLabel: string;
    departmentChronology: string;
    departmentDigital: string;
    departmentDomestic: string;
    departmentPlanning: string;
    footerMission: string;
    footerStatus: string;
  };
}

interface ApplicationShellProps {
  locale: InterfaceLocale;
  copy: ApplicationShellCopy;
}

function CivicSeal({ initial }: { initial: string }) {
  return (
    <svg
      aria-hidden="true"
      className="civic-seal"
      viewBox="0 0 48 48"
      focusable="false"
    >
      <circle
        cx="24"
        cy="24"
        r="22.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.15"
      />
      <circle
        cx="24"
        cy="24"
        r="18.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.75"
        opacity="0.72"
      />
      <path
        d="M24 1.5v4M24 42.5v4M1.5 24h4M42.5 24h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.15"
      />
      <path
        d="m11.5 24 2.3-2.3 2.3 2.3-2.3 2.3Zm20.4 0 2.3-2.3 2.3 2.3-2.3 2.3Z"
        fill="var(--apricot)"
      />
      <text
        x="24"
        y="32"
        fill="currentColor"
        fontFamily="var(--serif)"
        fontSize="25"
        fontWeight="700"
        textAnchor="middle"
      >
        {initial}
      </text>
    </svg>
  );
}

export function ApplicationShell({ locale, copy }: ApplicationShellProps) {
  const { navigation, home } = copy;

  return (
    <div className="app-shell" data-locale={locale}>
      <a className="skip-link" href="#main-content">
        {navigation.skipToContent}
      </a>

      <header className="site-header">
        <div className="header-inner">
          <a
            className="brand"
            href={`/${locale}`}
            aria-label={navigation.brandName}
          >
            <CivicSeal initial={navigation.brandInitial} />
            <span>
              <strong>{navigation.brandName}</strong>
              <small>{navigation.brandDescriptor}</small>
            </span>
          </a>
          <span className="locale-chip" lang={locale}>
            {navigation.locale}
          </span>
        </div>
      </header>

      <main id="main-content">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">{home.eyebrow}</p>
            <h1 id="hero-title">{home.title}</h1>
            <p className="hero-intro">{home.intro}</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#service-standard">
                {home.primaryAction}
                <span aria-hidden="true">→</span>
              </a>
              <a className="button button-secondary" href="#example">
                {home.secondaryAction}
              </a>
            </div>
            <div className="assurance">
              <span aria-hidden="true" className="assurance-mark">
                ✓
              </span>
              <p>
                <strong>{home.assuranceTitle}</strong>
                {home.assuranceBody}
              </p>
            </div>
          </div>

          <article className="sample-card" id="example">
            <div className="sample-card-header">
              <div className="sample-seal">
                <CivicSeal initial={navigation.brandInitial} />
              </div>
              <span>{home.sampleMeta}</span>
            </div>
            <p className="sample-kicker">{home.sampleKicker}</p>
            <h2>{home.sampleTitle}</h2>
            <p className="sample-body">{home.sampleBody}</p>
            <span className="status-pill">{home.sampleStatus}</span>
            <div className="sample-remedy">
              <span>{home.sampleRemedyLabel}</span>
              <p>{home.sampleRemedy}</p>
            </div>
          </article>
        </section>

        <section className="foundation-band" aria-labelledby="foundation-title">
          <div className="foundation-status">
            <span className="status-dot" aria-hidden="true" />
            <div>
              <p className="eyebrow">{home.statusLabel}</p>
              <h2 id="foundation-title">{home.statusTitle}</h2>
              <p>{home.statusBody}</p>
              <span className="procedural-meta">{home.statusMeta}</span>
            </div>
          </div>
        </section>

        <section
          className="standards-section"
          id="service-standard"
          aria-labelledby="standards-title"
        >
          <div className="section-heading">
            <p className="eyebrow">{home.standardsKicker}</p>
            <h2 id="standards-title">{home.standardsTitle}</h2>
          </div>
          <div className="standards-grid">
            <article>
              <span>{home.standardOneIndex}</span>
              <h3>{home.standardOneTitle}</h3>
              <p>{home.standardOneBody}</p>
            </article>
            <article>
              <span>{home.standardTwoIndex}</span>
              <h3>{home.standardTwoTitle}</h3>
              <p>{home.standardTwoBody}</p>
            </article>
            <article>
              <span>{home.standardThreeIndex}</span>
              <h3>{home.standardThreeTitle}</h3>
              <p>{home.standardThreeBody}</p>
            </article>
          </div>
          <div className="departments" aria-label={home.departmentsLabel}>
            <span>{home.departmentChronology}</span>
            <span>{home.departmentDigital}</span>
            <span>{home.departmentDomestic}</span>
            <span>{home.departmentPlanning}</span>
          </div>
        </section>
      </main>

      <footer>
        <div>
          <CivicSeal initial={navigation.brandInitial} />
          <p>{home.footerMission}</p>
        </div>
        <p>{home.footerStatus}</p>
      </footer>
    </div>
  );
}
