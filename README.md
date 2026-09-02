# Bureau of Petty Grievances

> **Harmony, administered.**

Bureau of Petty Grievances is a mobile-first consumer web experience for filing an official grievance about a harmless recurring habit. The Bureau reviews the submitted facts, produces a fair and disproportionately polished determination, and lets other people contribute through a public consultation.

The product explores a simple tension: what if a genuinely competent and benevolent institution applied flawless procedure to parts of human life that may not need administration?

## Current state

Version `0.1.0` establishes the repository's product and engineering operating system. Product implementation has not started yet. Each later release must leave the repository coherent, tested, and deployable rather than exposing partially completed work.

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
- [Architecture constraints](docs/architecture.md)
- [Testing strategy](docs/testing.md)
- [Operations and release expectations](docs/operations.md)
- [Decision records](docs/decisions/README.md)
- [Agent operating contract](AGENTS.md)

## Repository validation

Until the application stack is selected, the repository-level quality gate is:

```sh
./scripts/validate-repository.sh
```

The command verifies version metadata, required operating documents, repository hygiene, and the boundary that keeps private working material out of this repository. Runtime-specific checks will be added to the same documented verification workflow when implementation begins.

## Versioning

Every agent task that produces a committable product-repository change creates one release:

- planned work increments the minor version;
- unplanned debugging, corrections, or bounded follow-up work increments the patch version;
- a major version requires explicit human approval;
- tasks without product-repository changes do not create a product version or tag.

Each release is represented by an immutable `vX.Y.Z` Git tag.

## License

No open-source license is granted at this time. All rights are reserved.
