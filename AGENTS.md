# AGENTS.md — Root Finding

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenLyceum/.github/AGENTS.md](https://github.com/OpenLyceum/.github/blob/main/AGENTS.md).

## Project

Root Finding (`root-finding`) is a SceneryStack simulation scaffolded from SceneryStackTemplate.

## Key files

- `src/common/model/solver.ts` implements one update per method and owns algorithm state.
- `src/common/model/RootFindingModel.ts` owns applied and draft inputs, playback, and run history.
- `src/common/model/expressions.ts` parses the bounded single-variable arithmetic language.
- `src/common/view/RootFindingScreenView.ts` and `IterationGraph.ts` provide the shared interface.
- `src/i18n/StringManager.ts` exposes localized Properties. Add labels to all three locales.
- The six top-level screen folders wrap the shared model and view with independent state.
- `src/main.ts` opens Bisection by default and defers to Joist when a link supplies `screens` or `initialScreen`.

## Compliance carve-outs

None.
