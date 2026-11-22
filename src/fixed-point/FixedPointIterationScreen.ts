import type { ScreenOptions } from "scenerystack/sim";
import { RootFindingScreen } from "../common/RootFindingScreen.js";

export class FixedPointIterationScreen extends RootFindingScreen {
  public constructor(options: ScreenOptions) {
    super("fixedPoint", options);
  }
}
