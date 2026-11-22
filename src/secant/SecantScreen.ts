import type { ScreenOptions } from "scenerystack/sim";
import { RootFindingScreen } from "../common/RootFindingScreen.js";

export class SecantScreen extends RootFindingScreen {
  public constructor(options: ScreenOptions) {
    super("secant", options);
  }
}
