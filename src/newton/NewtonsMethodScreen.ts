import type { ScreenOptions } from "scenerystack/sim";
import { RootFindingScreen } from "../common/RootFindingScreen.js";

export class NewtonsMethodScreen extends RootFindingScreen {
  public constructor(options: ScreenOptions) {
    super("newton", options);
  }
}
