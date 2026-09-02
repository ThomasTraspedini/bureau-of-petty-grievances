# Interaction prototype

This repository-native prototype is the accepted interaction and visual evidence for the first complete Bureau journey. It deliberately uses static HTML, CSS, and browser-native JavaScript modules so it can be reviewed without selecting the production application stack.

## Review locally

From the repository root, run:

```sh
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173/prototype/en/
```

The route makes the enabled interface locale explicit. The complete representative path uses the Chronology department. Other departments appear in classification to demonstrate the institutional system without implying that their adaptive trees are already complete.

## Representative states

The primary journey exposes access, adaptive filing, correction, processing, determination, consultation, public sharing, and distinct successor authorization. Additional states can be reviewed directly:

```text
/prototype/en/?state=processing
/prototype/en/?state=failure
/prototype/en/?state=rejected
/prototype/en/?state=determination
/prototype/en/?state=share
/prototype/en/?state=successor
```

The prototype stores only its fictional draft and one consultation response in browser-local storage. It performs no network requests, generation, persistence, credit accounting, or real invitation issuance.

## Verification

Run the prototype checks directly with:

```sh
./scripts/validate-prototype.sh
```

They are also included in the repository's canonical `./scripts/validate-repository.sh` workflow.

## Prototype boundary

The interaction code is evidence, not production domain logic. Application framework, runtime, persistence, hosting, localization library, model provider, analytics, and deployment remain decisions for later capabilities.
