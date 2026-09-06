# 0025 — Production deployment stack

Status: accepted (2026-09-06)

## Decision

Use Netlify Free for application hosting, Neon Free PostgreSQL for persistence, and the production Netlify HTTPS domain. No custom domain is required. This supersedes the initial managed database target in decision 0011 and the deferred hosting choice.

## Compatibility evidence

`src/server/public-record/runtime-database.ts` selects the production database through `DATABASE_URL`. `sql-adapters.ts` uses the `postgres` driver, parameterized SQL and transactions, with prepared statements disabled. The shared schema and migration use PostgreSQL SQL; access and record operator scripts use the same connectivity. Package dependencies and the relevant persistence/runtime code contain no Supabase authentication, storage, realtime, SDK or service API dependency. No architecture change is required.

## Operational consequences

An evaluator demo must resume after weeks without a visit without requiring an owner to restore the database. Neon documents automatic compute activation on a new connection after scale to zero; a cold-start delay remains possible. Validate this behavior on the actual deployment. The application retains its deterministic fallback and database recovery outcomes.

Use TLS-enabled pooled PostgreSQL connectivity and Netlify’s automatic Next.js adapter on Node.js 24. Keep production credentials isolated from previews. Free-plan quotas, provider recovery settings, trusted proxy behavior and hosted operation still require verification; this decision records an approved target, not a completed deployment.

See the [deployment runbook](../operations.md#netlify-and-neon-deployment-runbook), [Neon scale to zero](https://neon.com/docs/introduction/scale-to-zero), and [Netlify Next.js support](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).
