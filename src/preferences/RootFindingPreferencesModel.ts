/**
 * RootFindingPreferencesModel.ts
 *
 * Model for the simulation-specific preferences shown in Preferences →
 * Simulation. Keep this empty shell until the sim needs real preferences; the
 * optional tandem keeps main.ts wiring uniform.
 */
import RootFindingNamespace from "../RootFindingNamespace.js";
import "./rootFindingQueryParameters.js";

export class RootFindingPreferencesModel {
  // Pattern for a preference (skill: scenerystack-preferences). Every preference is
  // one chain: query parameter → Property here → label in every strings_*.json →
  // control in RootFindingPreferencesNode → reset() below.
  //
  //   import { BooleanProperty } from "scenerystack/axon";
  //   import rootFindingQueryParameters from "./rootFindingQueryParameters.js"; // replaces the bare import
  //
  //   public readonly showGridProperty: BooleanProperty;
  //
  //   // in the constructor (rename _tandem → tandem):
  //   this.showGridProperty = new BooleanProperty(
  //     rootFindingQueryParameters.showGrid,
  //     tandem ? { tandem: tandem.createTandem("showGridProperty") } : undefined,
  //   );
  //
  //   // in reset():
  //   this.showGridProperty.reset();

  public reset(): void {
    // No sim-specific preferences yet.
  }
}

RootFindingNamespace.register("RootFindingPreferencesModel", RootFindingPreferencesModel);
