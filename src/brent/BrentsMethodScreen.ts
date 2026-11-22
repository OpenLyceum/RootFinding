import type { ScreenOptions } from "scenerystack/sim";
import { RootFindingScreen } from "../common/RootFindingScreen.js";

export class BrentsMethodScreen extends RootFindingScreen {
  public constructor(options: ScreenOptions) {
    super("brent", options);
  }
}
