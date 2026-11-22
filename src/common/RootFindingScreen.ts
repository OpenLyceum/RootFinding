import { Screen, type ScreenOptions } from "scenerystack/sim";
import { StringManager } from "../i18n/StringManager.js";
import type { Method } from "./model/problems.js";
import { RootFindingModel } from "./model/RootFindingModel.js";
import { createMethodIcon } from "./RootFindingScreenIcons.js";
import { RootFindingKeyboardHelpContent } from "./view/RootFindingKeyboardHelpContent.js";
import { RootFindingScreenView } from "./view/RootFindingScreenView.js";

export class RootFindingScreen extends Screen<RootFindingModel, RootFindingScreenView> {
  public constructor(method: Method, options: ScreenOptions) {
    super(
      () => new RootFindingModel(method),
      (model) => {
        this.activeProperty.lazyLink((active) => {
          if (!active) {
            model.pause();
          }
        });
        return new RootFindingScreenView(
          model,
          StringManager.getInstance().getScreenNames()[`${method}StringProperty`],
        );
      },
      {
        ...options,
        createKeyboardHelpNode: () => new RootFindingKeyboardHelpContent(),
        homeScreenIcon: createMethodIcon(method),
        navigationBarIcon: createMethodIcon(method),
      },
    );
  }
}
