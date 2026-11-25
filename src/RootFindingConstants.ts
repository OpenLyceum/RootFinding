/**
 * RootFindingConstants.ts
 *
 * Central repository for every named numeric constant used across the
 * simulation. Bare numbers that carry semantic meaning (sizes, margins,
 * physics defaults, ranges) belong here rather than inline in model or view
 * code, so they are named, documented, and changed in one place.
 *
 * Conventions
 * ───────────
 *  - Model / math values note their unit in a comment on each value.
 *  - Layout / chrome values are in screen pixels.
 *  - Colour strings live in RootFindingColors.ts, not here.
 *  - Computed expressions (e.g. `2 * Math.PI`) may stay inline.
 */

import RootFindingNamespace from "./RootFindingNamespace.js";

// ── Layout / chrome (screen pixels) ───────────────────────────────────────────

/** Margin between the screen edge and edge-anchored controls (e.g. Reset All). */
export const SCREEN_VIEW_MARGIN = 20;

/**
 * Corner radius shared by control panels and dialogs.
 * @public
 */
export const PANEL_CORNER_RADIUS = 6;

export const GRAPH_WIDTH = 626;
export const GRAPH_HEIGHT = 292;
export const GRAPH_INSET_LEFT = 58;
export const GRAPH_INSET_BOTTOM = 35;
export const GRAPH_PAD = 16;
export const GRAPH_SAMPLES = 320;
export const SETUP_WIDTH = 306;
export const HISTORY_ROWS = 5;
export const FIELD_HEIGHT = 32;

/** Keep graph projection arithmetic bounded, independently of solver values. */
export const GRAPH_LIMIT = 1e12;
export const MIN_AUTO_X_SPAN = 1e-5;
export const MIN_MANUAL_SPAN = 1e-12;
export const AXIS_FIELD_WIDTH = 90;
export const AXIS_FIELD_HEIGHT = 28;

// ── Solver / playback ─────────────────────────────────────────────────────────

/** Convergence tolerance on estimate residual and bracket size. */
export const TOLERANCE = 1e-6;

/** Maximum automatic iterations before the solver reports a limit. */
export const ITERATION_LIMIT = 100;

/** Autoplay delay between solver steps (s). */
export const SECONDS_PER_STEP = 0.9;

RootFindingNamespace.register("RootFindingConstants", {
  SCREEN_VIEW_MARGIN,
  PANEL_CORNER_RADIUS,
  GRAPH_WIDTH,
  GRAPH_HEIGHT,
  GRAPH_INSET_LEFT,
  GRAPH_INSET_BOTTOM,
  GRAPH_PAD,
  GRAPH_SAMPLES,
  SETUP_WIDTH,
  HISTORY_ROWS,
  FIELD_HEIGHT,
  GRAPH_LIMIT,
  MIN_AUTO_X_SPAN,
  MIN_MANUAL_SPAN,
  AXIS_FIELD_WIDTH,
  AXIS_FIELD_HEIGHT,
  TOLERANCE,
  ITERATION_LIMIT,
  SECONDS_PER_STEP,
});
