import type { TReadOnlyProperty } from "scenerystack/axon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";

export class RootFindingScreenSummaryContent extends ScreenSummaryContent {
  public constructor(method: TReadOnlyProperty<string>, details: TReadOnlyProperty<string>) {
    const strings = StringManager.getInstance().getSolverStrings();
    super({
      playAreaContent: method,
      controlAreaContent: strings.a11yControlsStringProperty,
      currentDetailsContent: details,
      interactionHintContent: strings.a11yHintStringProperty,
    });
  }
}
