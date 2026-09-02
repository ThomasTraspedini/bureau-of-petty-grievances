# Bureau of Petty Grievances

> **Harmony, administered.**

Bureau of Petty Grievances is a mobile-first consumer web experience for filing an official grievance about a harmless recurring habit. The Bureau reviews the submitted facts, produces a fair and disproportionately polished determination, and lets other people contribute through a public consultation.

The product explores a simple tension: what if a genuinely competent and benevolent institution applied flawless procedure to parts of human life that may not need administration?

## Current state

Version `0.12.0` adds one-use standard filing authorizations with a fixed five-credit allowance and a deliberately finite successor chain. After using one provider-generation credit, the current holder may either keep the residual balance or transfer that exact balance to one successor; transfer never creates credits or simultaneous paid holders.

Private fragments are removed before exchange, raw credentials are never retained, and successor links remain separate from public records and case sharing. Standard access reuses the evaluation release's atomic reservations, filing idempotency, rate limits, hard global budget, refunds, alerts, and kill switches. Anonymous, exhausted, transferred, disabled, and unavailable paths remain complete through official deterministic language. Observability and learning are next.

[Run the application](#run-locally), or [review the complete interaction prototype](prototype/README.md).

## Run locally

Use Node.js 24, then install dependencies and start the application:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000/en`. The root route redirects to the explicit English locale; the production filing begins at `/en/file/respondent`.

The example environment enables an ignored embedded PostgreSQL-compatible store for local development. A deployed full Node.js server should instead set `DATABASE_URL` to a PostgreSQL connection string; the initial managed target is Supabase. It must also set `BUREAU_PUBLIC_ORIGIN` to the bare public HTTPS origin used by canonical metadata and sharing, a strong `BUREAU_NETWORK_HMAC_SECRET`, and the trusted proxy-hop count. The application applies its idempotent schema migration when the shared database runtime starts.

Provider configuration is optional because the complete deterministic fallback supports the production journey. Copy `.env.example` to an ignored local environment file and set `OPENAI_API_KEY` to use the adapter; `BUREAU_OPENAI_MODEL` defaults to `gpt-5.6-luna`. The one-fixture paid smoke test is deliberate and separate from ordinary verification:

```sh
npm run test:provider:live
```

Operators can inspect categorical reports or immediately unpublish a reported record without printing its content:

```sh
npm run records:operate -- list-reports
npm run records:operate -- unpublish rec_0123456789abcdefghijkl
```

Evaluation links and generation controls are also operator-owned. The creation command prints the bearer link once; later status output contains identifiers and categorical counts only:

```sh
npm run access:operate -- create
npm run access:operate -- status
npm run access:operate -- generation disable
npm run access:operate -- alerts
```

Initial standard authorizations and successor issuance are controlled separately. A standard creation command prints its one-use private link once:

```sh
npm run access:operate -- standard-create
npm run access:operate -- invitations disable
```

See [operations](docs/operations.md) for top-up, extension, budget, revocation, and optional alert-delivery commands.

## Product principles

- **Taste before technology.** Technology serves the experience and is never the product's message.
- **One complete loop.** Each increment strengthens a usable journey rather than accumulating disconnected features.
- **Structure creates specificity.** Deterministic product logic prepares bounded facts for generative language.
- **Benevolence must be real.** Safety, fairness, privacy, recovery, and proportionate remedies are product behavior.
- **Internal complexity is not user burden.** The Bureau may dramatize procedure, but it must remain effortless to use.
- **Cost is bounded by design.** Generative actions must have server-side budgets, limits, and graceful fallbacks.
- **Internationalization starts at the boundary.** English is the first enabled locale, not a hardcoded assumption.

## Documentation

- [Product direction](docs/product.md)
- [Capability roadmap](docs/roadmap.md)
- [Architecture constraints](docs/architecture.md)
- [Testing strategy](docs/testing.md)
- [Operations and release expectations](docs/operations.md)
- [Decision records](docs/decisions/README.md)
- [Agent operating contract](AGENTS.md)

## Repository validation

After installing the Playwright Chromium browser with `npx playwright install chromium`, run the canonical quality gate:

```sh
./scripts/validate-repository.sh
```

The command verifies version metadata, repository hygiene, the public/private boundary, prototype behavior, formatting, linting, strict types, focused application tests, the production build, accessibility, reduced motion, localized routing, and mobile and desktop visual references. CI invokes the same command.

## Versioning

Every agent task that produces a committable product-repository change creates one release:

- planned work increments the minor version;
- unplanned debugging, corrections, or bounded follow-up work increments the patch version;
- a major version requires explicit human approval;
- tasks without product-repository changes do not create a product version or tag.

Each release is represented by an immutable `vX.Y.Z` Git tag.

## License

No open-source license is granted at this time. All rights are reserved.
