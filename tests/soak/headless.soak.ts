/**
 * By-hand headless soak: npm run test:soak:headless (never in CI).
 *
 * List the screens exactly as main.ts builds them. The harness in
 * tests/helpers/headlessSoak.ts (template-owned) presses every control, sets every slider,
 * steps, switches screens, flips the color profile and locale, presses Reset All, and
 * fails when listener counts, node counts or retained heap rise after every round.
 *
 * Add `actions` for what only this sim can do (record/clear, add/remove objects) and
 * `exclude` for controls that must not be pressed headless.
 */

import { StringProperty } from "scenerystack/axon";
import { Tandem } from "scenerystack/tandem";
import { BisectionScreen } from "../../src/bisection/BisectionScreen.js";
import { BrentsMethodScreen } from "../../src/brent/BrentsMethodScreen.js";
import { FalsePositionScreen } from "../../src/false-position/FalsePositionScreen.js";
import { FixedPointIterationScreen } from "../../src/fixed-point/FixedPointIterationScreen.js";
import { NewtonsMethodScreen } from "../../src/newton/NewtonsMethodScreen.js";
import RootFindingColors from "../../src/RootFindingColors.js";
import { SecantScreen } from "../../src/secant/SecantScreen.js";
import { describeHeadlessSoak } from "../helpers/headlessSoak.js";

describeHeadlessSoak({
  screens: () => [
    new BisectionScreen({ name: new StringProperty("Bisection"), tandem: Tandem.OPT_OUT }),
    new NewtonsMethodScreen({ name: new StringProperty("Newton’s Method"), tandem: Tandem.OPT_OUT }),
    new FalsePositionScreen({ name: new StringProperty("False Position"), tandem: Tandem.OPT_OUT }),
    new SecantScreen({ name: new StringProperty("Secant"), tandem: Tandem.OPT_OUT }),
    new FixedPointIterationScreen({ name: new StringProperty("Fixed-Point Iteration"), tandem: Tandem.OPT_OUT }),
    new BrentsMethodScreen({ name: new StringProperty("Brent’s Method"), tandem: Tandem.OPT_OUT }),
  ],
  tracked: () => ({ RootFindingColors }),
});
