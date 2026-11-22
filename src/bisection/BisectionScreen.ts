import type { ScreenOptions } from "scenerystack/sim";
import { RootFindingScreen } from "../common/RootFindingScreen.js";

export class BisectionScreen extends RootFindingScreen {
  public constructor(options: ScreenOptions) {
    super("bisection", options);
  }
}
