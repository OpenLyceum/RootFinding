import { RichText, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { StringManager } from "../i18n/StringManager.js";
import Colors from "../RootFindingColors.js";
import RootFindingNamespace from "../RootFindingNamespace.js";

export class RootFindingPreferencesNode extends VBox {
  public constructor() {
    const strings = StringManager.getInstance().getPreferences();
    const fill = Colors.controlSurfaceTextColorProperty;
    super({
      align: "left",
      spacing: 11,
      children: [
        new RichText(strings.syntaxHeadingStringProperty, {
          font: new PhetFont({ size: 18, weight: "bold" }),
          fill,
          accessibleHeading: strings.syntaxHeadingStringProperty,
        }),
        ...[strings.operatorsStringProperty, strings.functionsStringProperty, strings.exampleStringProperty].map(
          (paragraph) =>
            new RichText(paragraph, {
              font: new PhetFont(15),
              fill,
              lineWrap: 425,
              accessibleParagraph: paragraph,
            }),
        ),
      ],
    });
  }
}

RootFindingNamespace.register("RootFindingPreferencesNode", RootFindingPreferencesNode);
