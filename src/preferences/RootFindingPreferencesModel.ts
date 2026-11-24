import type { Tandem } from "scenerystack/tandem";
import RootFindingNamespace from "../RootFindingNamespace.js";
import "./rootFindingQueryParameters.js";

/** Root Finding's Simulation tab contains expression syntax help. */
export class RootFindingPreferencesModel {
  // biome-ignore lint/complexity/noUselessConstructor: tandem reserved for future preference Properties
  public constructor(_tandem?: Tandem) {
    // The expression syntax help has no editable settings.
  }
}

RootFindingNamespace.register("RootFindingPreferencesModel", RootFindingPreferencesModel);
