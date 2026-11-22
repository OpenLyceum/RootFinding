import {
  BasicActionsKeyboardHelpSection,
  ComboBoxKeyboardHelpSection,
  KeyboardHelpSection,
  KeyboardHelpSectionRow,
  TextKeyNode,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";
import { StringManager } from "../../i18n/StringManager.js";

export class RootFindingKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    const strings = StringManager.getInstance().getSolverStrings();
    super(
      [new BasicActionsKeyboardHelpSection()],
      [
        new KeyboardHelpSection(strings.headingStringProperty, [
          KeyboardHelpSectionRow.labelWithIcon(strings.editHelpStringProperty, TextKeyNode.enter(), {
            labelInnerContent: strings.editHelpStringProperty,
          }),
        ]),
        new ComboBoxKeyboardHelpSection(),
      ],
    );
  }
}
