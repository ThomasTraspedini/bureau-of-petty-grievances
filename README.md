# Bureau of Petty Grievances

> **Harmony, administered.**

Bureau of Petty Grievances is a mobile-first consumer web experience for filing an official grievance about a harmless recurring habit. The Bureau reviews the submitted facts, produces a fair and disproportionately polished determination, and lets other people contribute through a public consultation.

The product explores a simple tension: what if a genuinely competent and benevolent institution applied flawless procedure to parts of human life that may not need administration?

## Current state

Version `0.8.0` adds the persistent public-record capability to the complete production Chronology journey. After receiving a determination, a filer may explicitly publish the validated localized snapshot at an unlisted, unguessable address for 180 days.

The public record has separate private owner authority for unpublishing, restoration, and permanent deletion. Visitors can submit categorical reports without adding personal text, and Bureau operators can review and act on those reports. Public pages remain dynamic, `noindex`, and uncached; sharing controls, social previews, and consultation remain later capabilities.

[Run the application](#run-locally), or [review the complete interaction prototype](prototype/README.md).

## Run locally

Use Node.js 24, then install dependencies and start the application:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000/en`. The root route redirects to the explicit English locale; the production filing begins at `/en/file/respondent`.

The example environment enables an ignored embedded PostgreSQL-compatible store for local development. A deployed full Node.js server should instead set `DATABASE_URL` to a PostgreSQL connection string; the initial managed target is Supabase. The application applies its idempotent schema migration when the record repository starts.

Provider configuration is optional because the complete deterministic fallback supports the production journey. Copy `.env.example` to an ignored local environment file and set `OPENAI_API_KEY` to use the adapter; `BUREAU_OPENAI_MODEL` defaults to `gpt-5.6-luna`. The one-fixture paid smoke test is deliberate and separate from ordinary verification:

```sh
npm run test:provider:live
```

Operators can inspect categorical reports or immediately unpublish a reported record without printing its content:

```sh
npm run records:operate -- list-reports
npm run records:operate -- unpublish rec_0123456789abcdefghijkl
```

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
