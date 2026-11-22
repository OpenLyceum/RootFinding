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
 *  - Physics / model values use SI units (metres, seconds, kilograms, …);
 *    note the unit in a comment on each value.
 *  - Layout / chrome values are in screen pixels.
 *  - Colour strings live in RootFindingColors.ts, not here.
 *  - Computed expressions (e.g. `2 * Math.PI`) may stay inline.
 *
 * Remove the example constants below and replace them with the sim's own.
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

// ── Physics / model defaults (SI units) ───────────────────────────────────────

// Example: export const GRAVITY_MPS2 = 9.81; // m/s²

RootFindingNamespace.register("RootFindingConstants", {
  SCREEN_VIEW_MARGIN,
  PANEL_CORNER_RADIUS,
});

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
