import { DerivedProperty, Multilink, NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2 } from "scenerystack/dot";
import { HBox, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { PhetFont, ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView } from "scenerystack/sim";
import { Checkbox, ComboBox, RectangularPushButton } from "scenerystack/sun";
import { StringManager } from "../../i18n/StringManager.js";
import Colors from "../../RootFindingColors.js";
import {
  AXIS_FIELD_HEIGHT,
  AXIS_FIELD_WIDTH,
  FIELD_HEIGHT,
  GRAPH_WIDTH,
  HISTORY_ROWS,
  SCREEN_VIEW_MARGIN,
  SETUP_WIDTH,
} from "../../RootFindingConstants.js";
import { type Field, isBracketed, type Method, type Preset, presetsFor, usesAuxiliary } from "../model/problems.js";
import type { RootFindingModel } from "../model/RootFindingModel.js";
import {
  FLAT_PANEL_PUSH_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  ROOT_FINDING_COMBO_BOX_OPTIONS,
} from "../RootFindingButtonOptions.js";
import { RootFindingPanel } from "../RootFindingPanel.js";
import { type AxisField, GraphViewport } from "./GraphViewport.js";
import { createIterationGraph, formatNumber } from "./IterationGraph.js";
import { RootFindingScreenSummaryContent } from "./RootFindingScreenSummaryContent.js";

type Label = TReadOnlyProperty<string>;
const strings = () => StringManager.getInstance().getSolverStrings();

function label(value: string | Label, size: number, width: number, bold = false): Text {
  return new Text(value, {
    font: new PhetFont({ size, weight: bold ? "bold" : "normal" }),
    fill: Colors.textColorProperty,
    maxWidth: width,
  });
}

function button(name: Label, listener: () => void, width: number, primary = false): RectangularPushButton {
  return new RectangularPushButton({
    ...FLAT_PANEL_PUSH_BUTTON_OPTIONS,
    baseColor: primary ? Colors.actionColorProperty : Colors.controlSurfaceColorProperty,
    accessibleName: name,
    minWidth: width,
    minHeight: 32,
    xMargin: 9,
    yMargin: 5,
    content: new Text(name, {
      font: new PhetFont({ size: 14, weight: "bold" }),
      fill: Colors.controlSurfaceTextColorProperty,
      maxWidth: width - 12,
    }),
    listener,
  });
}

function interpolate(pattern: string, values: Record<string, string>): string {
  return pattern.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "");
}

function textEntry(
  name: Label,
  help: Label,
  valueProperty: Label,
  invalidProperty: TReadOnlyProperty<boolean>,
  options: { width: number; height: number; numeric: boolean; edit: (value: string) => void; apply: () => void },
): Node {
  const { width, height, numeric, edit, apply } = options;
  const input = new Node({
    tagName: "input",
    inputType: "text",
    focusable: true,
    cursor: "text",
    accessibleName: name,
    accessibleHelpText: help,
    pdomAttributes: [
      { attribute: "autocomplete", value: "off" },
      { attribute: "spellcheck", value: "false" },
      { attribute: "maxlength", value: "160" },
      { attribute: "inputmode", value: numeric ? "decimal" : "text" },
    ],
  });
  const box = new Rectangle(0, 0, width, height, {
    cornerRadius: 4,
    fill: Colors.controlSurfaceColorProperty,
    stroke: Colors.graphAxisColorProperty,
  });
  const value = new Text("", {
    font: new PhetFont({ size: 15, family: "monospace" }),
    fill: Colors.controlSurfaceTextColorProperty,
    maxWidth: width - 14,
    centerY: height / 2,
    left: 7,
  });
  input.children = [box, value];
  input.addInputListener({
    down: () => input.focus(),
    input: (event) => {
      const target = event.domEvent?.target;
      if (target instanceof HTMLInputElement) {
        edit(target.value);
      }
    },
    keydown: (event) => {
      const keyEvent = event.domEvent;
      if (keyEvent?.key === "Enter") {
        keyEvent.preventDefault();
        apply();
      } else if (
        keyEvent &&
        (keyEvent.ctrlKey || keyEvent.metaKey) &&
        keyEvent.key.toLowerCase() === "a" &&
        keyEvent.target instanceof HTMLInputElement
      ) {
        keyEvent.preventDefault();
        keyEvent.target.select();
      }
    },
  });
  valueProperty.link((next) => {
    if (input.inputValue !== next) {
      input.inputValue = next;
    }
    value.string = next;
  });
  invalidProperty.link((invalid) => {
    box.stroke = invalid ? Colors.errorColorProperty : Colors.graphAxisColorProperty;
    box.lineWidth = invalid ? 2 : 1;
    input.setPDOMAttribute("aria-invalid", invalid ? "true" : "false");
  });
  return new VBox({ align: "left", spacing: 4, children: [label(name, 14, width), input], pdomOrder: [input] });
}

function expressionField(model: RootFindingModel, field: Field, name: Label, width: number): Node {
  return textEntry(
    name,
    strings().editHelpStringProperty,
    new DerivedProperty([model.inputsProperty], (inputs) => inputs[field]),
    new DerivedProperty([model.invalidFieldProperty], (invalid) => invalid === field),
    {
      width,
      height: FIELD_HEIGHT,
      numeric: field === "first" || field === "second",
      edit: (value) => model.edit(field, value),
      apply: () => model.apply(),
    },
  );
}

function axisControls(viewport: GraphViewport): Node {
  const s = strings();
  const fields: readonly AxisField[] = ["minX", "maxX", "minY", "maxY"];
  const entries = fields.map((field) =>
    textEntry(
      s[`${field}StringProperty`],
      s.axesApplyHelpStringProperty,
      new DerivedProperty([viewport.draftProperty], (draft) => draft[field]),
      new DerivedProperty(
        [viewport.invalidAxisProperty],
        (axis) => axis !== null && field.endsWith(axis.toUpperCase()),
      ),
      {
        width: AXIS_FIELD_WIDTH,
        height: AXIS_FIELD_HEIGHT,
        numeric: true,
        edit: (value) => viewport.edit(field, value),
        apply: () => viewport.apply(),
      },
    ),
  );
  const auto = new Checkbox(viewport.autoProperty, label(s.autoZoomStringProperty, 13, 82), {
    accessibleName: s.autoZoomStringProperty,
    accessibleHelpText: s.autoAxesHintStringProperty,
    boxWidth: 18,
    checkboxColor: Colors.controlSurfaceTextColorProperty,
    checkboxColorBackground: Colors.controlSurfaceColorProperty,
    touchAreaYDilation: 5,
  });
  const apply = button(s.applyAxesStringProperty, () => viewport.apply(), 97);
  const message = new DerivedProperty(
    [
      viewport.autoProperty,
      viewport.invalidAxisProperty,
      s.autoAxesHintStringProperty,
      s.manualAxesHintStringProperty,
      s.invalidAxesStringProperty,
    ],
    (automatic, invalid, automaticHint, manualHint, error) =>
      invalid ? error : automatic ? automaticHint : manualHint,
  );
  const note = label(message, 12, GRAPH_WIDTH - 20);
  viewport.invalidAxisProperty.link((invalid) => {
    note.fill = invalid ? Colors.errorColorProperty : Colors.mutedColorProperty;
  });
  const announcement = new Node({ tagName: "p", innerContent: message });
  const row = new HBox({ align: "bottom", spacing: 8, children: [auto, ...entries, apply] });
  return new RootFindingPanel(
    new VBox({
      align: "left",
      spacing: 5,
      children: [row, note, announcement],
      pdomOrder: [auto, ...entries, apply, announcement],
    }),
    { minWidth: GRAPH_WIDTH, xMargin: 9, yMargin: 6 },
  );
}

function setupPanel(model: RootFindingModel, menuLayer: Node): Node {
  const s = strings();
  const applied = model.appliedInputsProperty;
  const draft = model.inputsProperty;
  const choices: (Preset | "custom")[] = [...presetsFor(model.method), "custom"];
  const choose = new ComboBox(
    model.presetProperty,
    choices.map((choice) => ({
      value: choice,
      tandemName: `${choice}Item`,
      accessibleName: s[`${choice}StringProperty`],
      createNode: () =>
        new Text(s[`${choice}StringProperty`], {
          font: new PhetFont(15),
          fill: Colors.controlSurfaceTextColorProperty,
          maxWidth: SETUP_WIDTH - 70,
        }),
    })),
    menuLayer,
    {
      ...ROOT_FINDING_COMBO_BOX_OPTIONS,
      accessibleName: s.presetStringProperty,
      xMargin: 8,
      yMargin: 5,
    },
  );
  const showTwo = !usesAuxiliary(model.method);
  const halfWidth = (SETUP_WIDTH - 10) / 2;
  const functionField = expressionField(model, "function", s.functionStringProperty, SETUP_WIDTH);
  const startField = expressionField(
    model,
    "first",
    isBracketed(model.method) ? s.leftStringProperty : s.startStringProperty,
    showTwo ? halfWidth : SETUP_WIDTH,
  );
  const startingValues = showTwo
    ? new HBox({
        spacing: 10,
        children: [
          startField,
          expressionField(
            model,
            "second",
            isBracketed(model.method) ? s.rightStringProperty : s.secondStringProperty,
            halfWidth,
          ),
        ],
      })
    : startField;
  const fields = usesAuxiliary(model.method)
    ? [
        functionField,
        expressionField(
          model,
          "auxiliary",
          model.method === "newton" ? s.derivativeStringProperty : s.mapStringProperty,
          SETUP_WIDTH,
        ),
        startingValues,
      ]
    : [functionField, startingValues];
  const message = new DerivedProperty(
    [
      model.invalidFieldProperty,
      draft,
      applied,
      s.syntaxErrorStringProperty,
      s.numberErrorStringProperty,
      s.pendingStringProperty,
      s.expressionHelpStringProperty,
    ],
    (invalid, inputs, current, syntax, number, pending, help) =>
      invalid
        ? invalid === "first" || invalid === "second"
          ? number
          : syntax
        : Object.keys(inputs).some((field) => inputs[field as Field] !== current[field as Field])
          ? pending
          : help,
  );
  const note = label(message, 13, SETUP_WIDTH);
  const liveMessage = new Node({ tagName: "p", innerContent: message });
  model.invalidFieldProperty.link((field) => {
    note.fill = field ? Colors.errorColorProperty : Colors.mutedColorProperty;
  });
  const apply = button(s.applyStringProperty, () => model.apply(), 100, true);
  return new RootFindingPanel(
    new VBox({
      align: "left",
      spacing: 9,
      children: [label(s.headingStringProperty, 21, SETUP_WIDTH, true), choose, ...fields, apply, note, liveMessage],
      pdomOrder: [choose, ...fields, apply, liveMessage],
    }),
  );
}

function historyPanel(model: RootFindingModel): Node {
  const s = strings();
  const rowsPerPage = HISTORY_ROWS;
  const width = GRAPH_WIDTH - 26;
  const page = new NumberProperty(0);
  const previous = button(
    s.previousStringProperty,
    () => {
      page.value--;
    },
    78,
  );
  const later = button(
    s.laterStringProperty,
    () => {
      page.value++;
    },
    78,
  );
  const pageLabel = label("", 13, 60);
  const heading = new HBox({
    spacing: 10,
    children: [label(s.historyStringProperty, 19, 275, true), previous, pageLabel, later],
  });
  const columns = [0, 49, 152, 263, 380];
  const widths = [44, 97, 105, 111, 214];
  const headerLabels = [
    s.iterationStringProperty,
    s.estimateStringProperty,
    s.residualStringProperty,
    isBracketed(model.method) ? s.widthStringProperty : s.changeStringProperty,
    s.constructionStringProperty,
  ];
  const header = new Node({
    children: headerLabels.map((title, index) => {
      const text = label(title, 12, widths[index] ?? 40, true);
      text.left = columns[index] ?? 0;
      return text;
    }),
  });
  const texts = Array.from({ length: rowsPerPage }, () => headerLabels.map((_, i) => label("", 13, widths[i] ?? 40)));
  const textLayer = new Node({ children: texts.flat() });
  const empty = label(s.emptyStringProperty, 13, width);
  empty.fill = Colors.mutedColorProperty;
  const backing = new Rectangle(0, 0, width, 19 * rowsPerPage, { pickable: false });
  const resultText = new Node({ tagName: "p" });
  const body = new Node({ children: [backing, empty, textLayer] });
  const panel = new RootFindingPanel(
    new VBox({
      align: "left",
      spacing: 5,
      children: [heading, header, body, resultText],
      pdomOrder: [previous, later, resultText],
    }),
  );
  model.runProperty.link(({ history }) => {
    page.value = Math.max(0, Math.ceil(history.length / rowsPerPage) - 1);
  });
  const kindKeys = ["initial", "midpoint", "tangent", "chord", "secant", "cobweb", "inverseQuadratic"] as const;
  Multilink.multilinkAny(
    [model.runProperty, page, ...kindKeys.map((kind) => s[`${kind}StringProperty`]), ...headerLabels],
    () => {
      const { history } = model.runProperty.value;
      const index = page.value;
      const pages = Math.max(1, Math.ceil(history.length / rowsPerPage));
      previous.enabled = index > 0;
      later.enabled = index < pages - 1;
      pageLabel.string = `${index + 1} / ${pages}`;
      empty.visible = history.length === 0;
      const start = index * rowsPerPage;
      const descriptions: string[] = [];
      for (const [i, row] of texts.entries()) {
        const record = history[start + i];
        const values = record
          ? [
              String(record.kind === "initial" ? 0 : start + i + 1),
              formatNumber(record.estimate.x),
              formatNumber(Math.abs(record.estimate.y)),
              record.size === null ? "—" : formatNumber(record.size),
              s[`${record.kind}StringProperty`].value,
            ]
          : [];
        if (record) {
          descriptions.push(headerLabels.map((name, j) => `${name.value} ${values[j]}`).join(", "));
        }
        for (const [j, text] of row.entries()) {
          text.string = values[j] ?? "";
          text.left = columns[j] ?? 0;
          text.top = i * 19;
        }
      }
      resultText.innerContent = descriptions.join(". ") || s.emptyStringProperty.value;
    },
  );
  return panel;
}

function playPanel(model: RootFindingModel): Node {
  const s = strings();
  const playLabel = new DerivedProperty(
    [model.timer.isPlayingProperty, s.playStringProperty, s.pauseStringProperty],
    (playing, runLabel, pauseLabel) => (playing ? pauseLabel : runLabel),
  );
  const play = button(
    playLabel,
    () => {
      model.timer.isPlayingProperty.value = !model.timer.isPlayingProperty.value;
    },
    92,
    true,
  );
  const step = button(s.stepStringProperty, () => model.stepOnce(), 92);
  const restart = button(s.restartStringProperty, () => model.restart(), 102);
  const state = label("", 15, SETUP_WIDTH, true);
  const stepDetail = label("", 13, SETUP_WIDTH);
  const statusKeys = [
    "ready",
    "working",
    "exact",
    "converged",
    "invalidBracket",
    "undefined",
    "zeroSlope",
    "stagnation",
    "limit",
    "inconsistent",
  ] as const;
  const kindKeys = ["initial", "midpoint", "tangent", "chord", "secant", "cobweb", "inverseQuadratic"] as const;
  Multilink.multilinkAny(
    [
      model.runProperty,
      ...statusKeys.map((k) => s[`${k}StringProperty`]),
      ...kindKeys.map((k) => s[`${k}StringProperty`]),
      s.detailStringProperty,
    ],
    () => {
      const { history, status } = model.runProperty.value;
      const active = status === "ready" || status === "working";
      play.enabled = active;
      step.enabled = active;
      state.string = s[`${status}StringProperty`].value;
      state.fill = active
        ? Colors.textColorProperty
        : status === "exact" || status === "converged"
          ? Colors.functionCurveColorProperty
          : Colors.errorColorProperty;
      const latest = history.at(-1);
      stepDetail.string = latest
        ? interpolate(s.detailStringProperty.value, {
            kind: s[`${latest.kind}StringProperty`].value,
            x: formatNumber(latest.estimate.x),
            residual: formatNumber(Math.abs(latest.estimate.y)),
          })
        : "";
    },
  );
  return new RootFindingPanel(
    new VBox({
      align: "left",
      spacing: 8,
      children: [new HBox({ spacing: 8, children: [step, play, restart] }), state, stepDetail],
      pdomOrder: [step, play, restart],
    }),
  );
}

export class RootFindingScreenView extends ScreenView {
  private readonly header: Node;
  private readonly graph: Node;
  private readonly controls: Node;
  private readonly history: Node;
  private readonly resetAll: Node;

  public constructor(model: RootFindingModel, title: Label) {
    const s = strings();
    const method: Method = model.method;
    const description = s[`${method}DescriptionStringProperty`];
    const details = DerivedProperty.deriveAny(
      [model.runProperty, model.appliedInputsProperty, ...Object.values(s)],
      () => {
        const { history, status, bracket } = model.runProperty.value;
        const applied = model.appliedInputsProperty.value;
        const latest = history.at(-1);
        const formula = interpolate(s.formulaDetailStringProperty.value, { formula: applied.function });
        const construction = latest
          ? interpolate(s.detailStringProperty.value, {
              kind: s[`${latest.kind}StringProperty`].value,
              x: formatNumber(latest.estimate.x),
              residual: formatNumber(Math.abs(latest.estimate.y)),
            })
          : "";
        const interval = bracket
          ? interpolate(s.bracketDetailStringProperty.value, {
              a: formatNumber(bracket[0].x),
              b: formatNumber(bracket[1].x),
            })
          : "";
        return [formula, s[`${status}StringProperty`].value, construction, interval].filter(Boolean).join(" ");
      },
    );
    super({
      layoutBounds: new Bounds2(0, 0, 1024, 674),
      screenSummaryContent: new RootFindingScreenSummaryContent(description, details),
    });

    const menuLayer = new Node();
    const methodHint = isBracketed(method)
      ? s.continuityStringProperty
      : method === "fixedPoint"
        ? s.fixedHintStringProperty
        : s.openStringProperty;
    const hint = label(methodHint, 14, GRAPH_WIDTH);
    hint.fill = Colors.mutedColorProperty;
    this.header = new VBox({
      align: "left",
      spacing: 4,
      children: [label(title, 29, GRAPH_WIDTH, true), label(description, 16, GRAPH_WIDTH), hint],
    });
    const viewport = new GraphViewport(model);
    const boundsControls = axisControls(viewport);
    this.graph = new VBox({
      align: "left",
      spacing: 6,
      children: [createIterationGraph(model, viewport), boundsControls],
    });
    this.history = historyPanel(model);
    this.controls = new VBox({
      align: "left",
      spacing: 12,
      children: [setupPanel(model, menuLayer), playPanel(model)],
    });
    this.resetAll = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        this.interruptSubtreeInput();
        model.reset();
        viewport.reset();
      },
    });
    this.addChild(
      new Node({
        children: [this.header, this.graph, this.history, this.controls, this.resetAll, menuLayer],
        pdomOrder: [this.controls, this.graph, this.history, this.resetAll, menuLayer],
      }),
    );
  }

  public override layout(viewBounds: Bounds2): void {
    const margin = SCREEN_VIEW_MARGIN;
    const portrait = viewBounds.width < viewBounds.height;
    this.header.left = margin;
    this.header.top = 14;
    this.graph.left = margin;
    this.graph.top = 91;
    this.controls.setScaleMagnitude(portrait ? 1.75 : 1);
    this.controls.left = portrait ? margin : this.graph.right + margin;
    this.controls.top = portrait ? this.graph.bottom + 12 : this.graph.top;
    this.history.left = margin;
    this.history.top = portrait ? this.controls.bottom + 14 : this.graph.bottom + 10;
    const bottom = portrait ? this.history.bottom + this.resetAll.height + 24 : this.layoutBounds.bottom;
    const bounds = portrait ? new Bounds2(0, 0, GRAPH_WIDTH + 2 * margin, bottom) : this.layoutBounds;
    this.resetAll.right = bounds.right - margin;
    this.resetAll.bottom = bounds.bottom - 12;
    this.matrix = ScreenView.getLayoutMatrix(bounds, viewBounds);
  }
}
