/**
 * main.ts
 *
 * Entry point for the simulation. Initializes SceneryStack, creates the
 * screens, and starts the main event loop.
 *
 * !! CRITICAL IMPORT ORDER !!
 * brand.js MUST be the first import. Each module imports the next, so the import nesting is
 *
 *   main → brand → splash → assert → init
 *
 * and therefore the actual EXECUTION order (deepest import runs first) is the reverse:
 *
 *   init → assert → splash → brand → main
 *
 * SceneryStack requires this exact load order. Never reorder these imports.
 */

// brand.js MUST be first; importing it runs the whole chain (init→assert→splash→brand) before main.
import "./brand.js";

import { onReadyToLaunch, Sim } from "scenerystack/sim";
import { Tandem } from "scenerystack/tandem";
import { BisectionScreen } from "./bisection/BisectionScreen.js";
import { BrentsMethodScreen } from "./brent/BrentsMethodScreen.js";
import { FalsePositionScreen } from "./false-position/FalsePositionScreen.js";
import { FixedPointIterationScreen } from "./fixed-point/FixedPointIterationScreen.js";
import { StringManager } from "./i18n/StringManager.js";
import { NewtonsMethodScreen } from "./newton/NewtonsMethodScreen.js";
import { RootFindingPreferencesModel } from "./preferences/RootFindingPreferencesModel.js";
import rootFindingQueryParameters from "./preferences/rootFindingQueryParameters.js";
import RootFindingColors from "./RootFindingColors.js";
import { SecantScreen } from "./secant/SecantScreen.js";

onReadyToLaunch(() => {
  const stringManager = StringManager.getInstance();

  const screens = [
    new BisectionScreen({
      name: stringManager.getScreenNames().bisectionStringProperty,
      tandem: Tandem.ROOT.createTandem("bisectionScreen"),
      backgroundColorProperty: RootFindingColors.backgroundColorProperty,
    }),
    new NewtonsMethodScreen({
      name: stringManager.getScreenNames().newtonStringProperty,
      tandem: Tandem.ROOT.createTandem("newtonScreen"),
      backgroundColorProperty: RootFindingColors.backgroundColorProperty,
    }),
    new FalsePositionScreen({
      name: stringManager.getScreenNames().falsePositionStringProperty,
      tandem: Tandem.ROOT.createTandem("falsePositionScreen"),
      backgroundColorProperty: RootFindingColors.backgroundColorProperty,
    }),
    new SecantScreen({
      name: stringManager.getScreenNames().secantStringProperty,
      tandem: Tandem.ROOT.createTandem("secantScreen"),
      backgroundColorProperty: RootFindingColors.backgroundColorProperty,
    }),
    new FixedPointIterationScreen({
      name: stringManager.getScreenNames().fixedPointStringProperty,
      tandem: Tandem.ROOT.createTandem("fixedPointScreen"),
      backgroundColorProperty: RootFindingColors.backgroundColorProperty,
    }),
    new BrentsMethodScreen({
      name: stringManager.getScreenNames().brentStringProperty,
      tandem: Tandem.ROOT.createTandem("brentScreen"),
      backgroundColorProperty: RootFindingColors.backgroundColorProperty,
    }),
  ] as const;

  const sim = new Sim(stringManager.getTitleStringProperty(), [...screens], {
    preferencesModel: new RootFindingPreferencesModel(),

    // Optional: fill in credits shown in Help → About
    credits: {
      leadDesign: "",
      softwareDevelopment: "",
      team: "",
      qualityAssurance: "",
    },
  });

  if (rootFindingQueryParameters.openBisectionByDefault) {
    sim.isConstructionCompleteProperty.lazyLink((complete) => {
      if (complete) {
        sim.selectedScreenProperty.value = screens[0];
      }
    });
  }
  sim.start();
});
