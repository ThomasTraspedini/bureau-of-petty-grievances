# Bureau of Petty Grievances

> **Harmony, administered.**

**[Try the live demo](https://bureau-of-petty-grievances.netlify.app/)**

Bureau of Petty Grievances is a mobile-first consumer web experience for filing an official grievance about a harmless recurring habit. The Bureau reviews the submitted facts, produces a fair and disproportionately polished determination, and lets other people contribute through a public consultation.

The product explores a simple tension: what if a genuinely competent and benevolent institution applied flawless procedure to parts of human life that may not need administration?

## Current state

The evaluation release is `0.22.0`. The application implements four departments and six complete locales, with deterministic and optional provider language, public records, sharing, consultation, access controls and bounded generation costs.

C00–C15 are complete, including physical-device refinements, production deployment, and evaluator verification. No planned capability remains. See the [roadmap](docs/roadmap.md).

[Run the application](#run-locally), or [review the complete interaction prototype](prototype/README.md).

## Run locally

Use Node.js 24, then install dependencies and create the ignored local
configuration before starting the application:

```sh
npm ci
cp .env.example .env
npm run dev
```

Open `http://localhost:3000/en`, replacing `en` with any supported locale when needed: `en`, `it`, `fr`, `de`, `es`, or `pt-BR`. The root route redirects to English; every explicit locale provides the complete production filing journey (`/{locale}/file/respondent`).

For the ordinary local journey, keep `DATABASE_URL` empty and retain
`BUREAU_EMBEDDED_DATABASE_PATH=.data/public-records`; publication and public
consultation require that local store. `OPENAI_API_KEY` is optional: leaving it
empty selects the complete deterministic determination. Setting it configures
the bounded provider adapter; paid generation additionally requires a valid
evaluator or standard session and available server-side controls. No other provider field is required;
`BUREAU_OPENAI_MODEL=gpt-5.6-terra` is the documented default and may be left
unchanged. Restart the development server after changing `.env`. Keep
`BUREAU_ANALYTICS_ENABLED=false`
unless the complete documented analytics configuration has deliberately been
provided. The remaining empty secret and webhook settings are not required for
ordinary local use.

To review the application from trusted devices on the same local network, add
each device-facing Mac hostname or address to `.env` without protocol or port,
then use the LAN command:

```dotenv
BUREAU_ALLOWED_DEV_ORIGINS=192.168.1.122
```

```sh
npm run dev:lan
```

Open `http://<mac-address>:3000/en` on the device. Local HTTP can exercise the
local layout and input behavior. For cross-device publication and sharing,
use a trusted HTTPS origin reachable by every device and set
`BUREAU_PUBLIC_ORIGIN` to that same origin. LAN HTTP cannot be the canonical
public origin; a localhost address is not a usable shared link on other devices.

Production uses Netlify Free and Neon Free PostgreSQL. Set `DATABASE_URL` to a
pooled Neon connection string with TLS. Follow the
[deployment runbook](docs/operations.md#netlify-and-neon-deployment-runbook).
Also set `BUREAU_PUBLIC_ORIGIN` to the bare public HTTPS origin used by canonical
metadata and sharing, a strong `BUREAU_NETWORK_HMAC_SECRET`, and the trusted
proxy-hop count. The application applies its idempotent schema migration when
the shared database runtime starts.

Provider configuration is optional because the complete deterministic fallback supports the production journey. `BUREAU_OPENAI_MODEL` defaults to `gpt-5.6-terra`. The bounded multilingual paid smoke test is deliberate and separate from ordinary verification:

```sh
npm run test:provider:live
```

Next.js development and production builds load `.env` through their normal
runtime configuration. The live smoke and documented operator commands load it
automatically when it exists. The live smoke requires a non-empty
`OPENAI_API_KEY`; ordinary development and canonical verification do not.

See [operations](docs/operations.md) for evaluator/standard access creation, reports, budget controls, and deployment configuration.

## Product principles

- **Taste before technology.** Technology serves the experience and is never the product's message.
- **One complete loop.** Each increment strengthens a usable journey rather than accumulating disconnected features.
- **Structure creates specificity.** Deterministic product logic prepares bounded facts for generative language.
- **Benevolence must be real.** Safety, fairness, privacy, recovery, and proportionate remedies are product behavior.
- **Internal complexity is not user burden.** The Bureau may dramatize procedure, but it must remain effortless to use.
- **Cost is bounded by design.** Generative actions must have server-side budgets, limits, and graceful fallbacks.
- **Internationalization starts at the boundary.** English, Italian, French, German, Spanish, and Brazilian Portuguese are enabled end to end; English remains the default rather than a hardcoded assumption.

## Documentation

- [Product direction](docs/product.md)
- [Capability roadmap](docs/roadmap.md)
- [Architecture constraints](docs/architecture.md)
- [Testing strategy](docs/testing.md)
- [Operations and release expectations](docs/operations.md)
- [Product analytics and learning loop](docs/analytics.md)
- [Decision records](docs/decisions/README.md)
- [Agent operating contract](AGENTS.md)

## Validation and releases

For planning, documentation and repository consistency:

```sh
./scripts/validate-repository.sh --checks-only
```

Implementation uses targeted checks from [testing](docs/testing.md). For an explicitly selected release, install the supported Playwright engines and run `./scripts/validate-repository.sh --full`; CI uses the same full gate. Documentation edits do not require application tests or a release.

Release qualification includes version/changelog reconciliation and an immutable annotated `vX.Y.Z` tag. Major-version promotion requires explicit human approval. Operating modes and completion rules are in [AGENTS.md](AGENTS.md).

## License

No open-source license is granted at this time. All rights are reserved.
