# AGENTS.md — Root Finding

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenLyceum/.github/AGENTS.md](https://github.com/OpenLyceum/.github/blob/main/AGENTS.md).

## Project

Root Finding (`root-finding`) has one screen per method: Bisection, Newton, False Position, Secant, Fixed-Point and Brent. Each screen shares the model and view and keeps its own state.

- **Examples:** two well-behaved roots (cubic, cos x − x), plus examples showing where a method fails or slows:
  - eˣ − 10 for the bracketing methods and Secant
  - the nearly fixed endpoint, for False Position only
  - for Newton: a repeated root, a 2-cycle, atan x overshooting, and a start where f′ ≈ 0
  - for Fixed-Point: a neutral map with |g′| = 1, and a repelling one with |g′| > 1
- **Newton's f′:** the student may type f′ or leave it blank for a numerical derivative. A typed f′ that disagrees with f's slope near x₀ is flagged in the setup note but still used, so a wrong derivative can be studied.
- **Status:** a 2-cycle reports `cycle`. A repeated estimate reports `stagnation`. Fixed-Point shows |g′(xₙ)| in the status line.
- **History:** the table's Order column estimates p from three successive step sizes. "Error plot" swaps the table for log₁₀|f(xₖ)| against k, with the tolerance drawn as a dashed line.

## Key files

- `src/common/model/solver.ts` implements one update per method and owns algorithm state.
- `src/common/model/RootFindingModel.ts` owns applied and draft inputs, playback, and run history.
- `src/common/model/expressions.ts` parses the bounded single-variable arithmetic language.
- `src/common/view/RootFindingScreenView.ts` and `IterationGraph.ts` provide the shared interface.
- `src/i18n/StringManager.ts` exposes localized Properties. Add labels to all three locales.
- The six top-level screen folders wrap the shared model and view with independent state.
- `src/main.ts` opens Bisection by default and defers to Joist when a link supplies `screens` or `initialScreen`.

## Compliance carve-outs

- `memory-leak:StartHandle` — plot start-point handle; list via carve-out (inventory gap under happy-dom).

## Testing

See the shared Vitest setup (`vitest.config.ts`, `tests/setup.ts`) and `tests/memory-leak.test.ts` for disposal coverage. Add sim-specific unit tests under `tests/` as physics and UI logic land.

## Accessibility

Follow [Baton/ACCESSIBILITY.md](https://github.com/OpenLyceum/Baton/blob/main/ACCESSIBILITY.md): PDOM names, per-screen `*ScreenSummaryContent`, and keyboard-help content. Document any intentional deviations under Compliance carve-outs.
