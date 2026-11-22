/**
 * RootFindingColors.ts
 *
 * Defines all dynamic colors for the simulation using ProfileColorProperty.
 *
 * Each color has two profiles:
 *   - "default"   — used in standard (dark) mode
 *   - "projector" — used when the user enables Projector Mode in Preferences
 *
 * SceneryStack switches profiles automatically; no manual toggling is needed.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 * Import RootFindingColors and pass properties directly to Node's fillProperty or
 * strokeProperty options:
 *
 *   import RootFindingColors from "../../RootFindingColors.js";
 *
 *   new Rectangle( 0, 0, 100, 50, {
 *     fillProperty: RootFindingColors.backgroundColorProperty,
 *   });
 *
 * ── How to add a color ────────────────────────────────────────────────────────
 * Add a new ProfileColorProperty entry to the RootFindingColors object below.
 * Always provide both "default" and "projector" values.
 */
import { ProfileColorProperty } from "scenerystack/scenery";
import RootFindingNamespace from "./RootFindingNamespace.js";

const RootFindingColors = {
  actionColorProperty: new ProfileColorProperty(RootFindingNamespace, "action", {
    default: "#61ebcf",
    projector: "#c8f4e7",
  }),
  graphBackgroundColorProperty: new ProfileColorProperty(RootFindingNamespace, "graphBackground", {
    default: "#101f2b",
    projector: "#f9fbfc",
  }),
  graphGridColorProperty: new ProfileColorProperty(RootFindingNamespace, "graphGrid", {
    default: "#294456",
    projector: "#dbe2e8",
  }),
  graphAxisColorProperty: new ProfileColorProperty(RootFindingNamespace, "graphAxis", {
    default: "#8aabbc",
    projector: "#4d6470",
  }),
  functionCurveColorProperty: new ProfileColorProperty(RootFindingNamespace, "functionCurve", {
    default: "#61ebcf",
    projector: "#007c68",
  }),
  constructionColorProperty: new ProfileColorProperty(RootFindingNamespace, "construction", {
    default: "#ffb759",
    projector: "#8a4700",
  }),
  bracketColorProperty: new ProfileColorProperty(RootFindingNamespace, "bracket", {
    default: "#2a514f",
    projector: "#d8eee6",
  }),
  discardedBracketColorProperty: new ProfileColorProperty(RootFindingNamespace, "discardedBracket", {
    default: "#473330",
    projector: "#f3e2dd",
  }),
  mutedColorProperty: new ProfileColorProperty(RootFindingNamespace, "muted", {
    default: "#a9c4ce",
    projector: "#405866",
  }),
  errorColorProperty: new ProfileColorProperty(RootFindingNamespace, "error", {
    default: "#ffab9e",
    projector: "#9c2522",
  }),

  /**
   * Background color for the simulation screen.
   * Deep navy in default mode; white in projector mode.
   */
  backgroundColorProperty: new ProfileColorProperty(RootFindingNamespace, "background", {
    default: "#0c1722",
    projector: "#ffffff",
  }),

  /**
   * Primary accent color for highlights, selected items, and key UI elements.
   * Sky blue in default mode; dark navy in projector mode.
   */
  accentColorProperty: new ProfileColorProperty(RootFindingNamespace, "accent", {
    default: "#4fc3f7",
    projector: "#1a1a2e",
  }),

  /**
   * Background fill for control panels and dialogs.
   * Deep blue in default mode; light gray in projector mode.
   */
  panelBackgroundColorProperty: new ProfileColorProperty(RootFindingNamespace, "panelBackground", {
    default: "#142635",
    projector: "#f5f5f5",
  }),

  /**
   * Border/stroke color for control panels and dialogs.
   * Teal-navy in default mode; medium gray in projector mode.
   */
  panelBorderColorProperty: new ProfileColorProperty(RootFindingNamespace, "panelBorder", {
    default: "#365060",
    projector: "#999999",
  }),

  /**
   * Text color for labels, readouts, and general UI text.
   * Near-white in default mode; near-black in projector mode.
   */
  textColorProperty: new ProfileColorProperty(RootFindingNamespace, "text", {
    default: "#e0e0e0",
    projector: "#1a1a1a",
  }),

  // ── Light control surfaces ───────────────────────────────────────────────────
  // White chrome (combo boxes, flat push buttons, editable input fields) stays light
  // in both profiles; its text stays dark. Same values in default and projector mode,
  // but defined here so every color lives in one themeable place.

  /** Fill of light control surfaces: combo-box button/list, editable input fields. */
  controlSurfaceColorProperty: new ProfileColorProperty(RootFindingNamespace, "controlSurface", {
    default: "#ffffff",
    projector: "#ffffff",
  }),

  /** Fill of a disabled control surface (grayed-out editable input field). */
  controlSurfaceDisabledColorProperty: new ProfileColorProperty(RootFindingNamespace, "controlSurfaceDisabled", {
    default: "#cccccc",
    projector: "#cccccc",
  }),

  /** Text on light control surfaces: combo items, flat-button labels, field values, preferences. */
  controlSurfaceTextColorProperty: new ProfileColorProperty(RootFindingNamespace, "controlSurfaceText", {
    default: "#1a1a1a",
    projector: "#1a1a1a",
  }),
};

export default RootFindingColors;
