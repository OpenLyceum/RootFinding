import type { ScreenOptions } from "scenerystack/sim";
import { RootFindingScreen } from "../common/RootFindingScreen.js";

export class FalsePositionScreen extends RootFindingScreen {
  public constructor(options: ScreenOptions) {
    super("falsePosition", options);
  }
}
