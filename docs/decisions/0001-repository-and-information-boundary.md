# 0001 — Repository and information boundary

## Status

Accepted.

## Context

The repository will be evaluated as a standalone product artifact. Product implementation and useful engineering rationale should be easy to inspect, including through coding agents. Private brainstorming, application strategy, raw task management, and unresolved research should not be published with it.

## Decision

This repository is self-contained and contains only externally useful product material. Private working material lives outside the repository in a separately versioned workspace.

The product repository must never depend on, link to, name, or require a private workspace path or private canonical filename. Relevant conclusions are rewritten here as public product or decision documentation.

An automated repository check rejects machine-specific paths, private-workspace references, private canonical filenames, local environment files, and operating-system metadata.

## Consequences

- External evaluators and agents can understand and run the project from one clone.
- Private context cannot accidentally become a runtime or documentation dependency.
- Some decisions have both a private reasoning trail and a concise public record.
- Cross-workspace changes require separate commits; only product-repository changes affect product SemVer.

## Open considerations

Repository visibility and licensing are release decisions. Development begins privately; public evaluation must not rely on a supposedly reversible temporary-public state.
