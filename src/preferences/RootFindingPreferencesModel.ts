import { PreferencesModel } from "scenerystack/sim";
import { RootFindingPreferencesNode } from "./RootFindingPreferencesNode.js";

export class RootFindingPreferencesModel extends PreferencesModel {
  public constructor() {
    super({
      visualOptions: {
        supportsProjectorMode: true,
        supportsInteractiveHighlights: true,
      },
      simulationOptions: {
        customPreferences: [{ createContent: () => new RootFindingPreferencesNode() }],
      },
      localizationOptions: { supportsDynamicLocale: true },
    });
  }
}
