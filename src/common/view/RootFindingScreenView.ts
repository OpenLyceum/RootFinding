import { BooleanProperty, DerivedProperty, Multilink, NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2, roundSymmetric } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, HBox, Line, Node, Path, Rectangle, RichText, Text, VBox } from "scenerystack/scenery";
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
import {
  type Field,
  isBracketed,
  type Method,
  numericalDerivative,
  type Preset,
  presetsFor,
  TOLERANCE,
  usesAuxiliary,
} from "../model/problems.js";
import type { RootFindingModel } from "../model/RootFindingModel.js";
import type { Iteration } from "../model/solver.js";
import {
  FLAT_PANEL_PUSH_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  ROOT_FINDING_COMBO_BOX_OPTIONS,
} from "../RootFindingButtonOptions.js";
import { RootFindingPanel } from "../RootFindingPanel.js";
import { type AxisField, GraphViewport } from "./GraphViewport.js";
import { createIterationGraph, formatNumber } from "./IterationGraph.js";
import { RootFindingScreenSummaryContent } from "./RootFindingScreenSummaryContent.js";
import { createStepExplanation, interpolate } from "./StepExplanation.js";

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
  const messageProperty = new DerivedProperty(
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
  const note = label(messageProperty, 12, GRAPH_WIDTH - 20);
  viewport.invalidAxisProperty.link((invalid) => {
    note.fill = invalid ? Colors.errorColorProperty : Colors.mutedColorProperty;
  });
  const announcement = new Node({ tagName: "p", innerContent: messageProperty });
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
  // Newton's applied f′ is either typed and checked against f, or derived numerically.
  const derivativeStateProperty = new DerivedProperty([model.runProperty], ({ problem }) =>
    problem.derivativeMismatch ? "mismatch" : problem.numericDerivative ? "numeric" : "typed",
  );
  const messageProperty = new DerivedProperty(
    [
      model.invalidFieldProperty,
      draft,
      applied,
      derivativeStateProperty,
      s.syntaxErrorStringProperty,
      s.numberErrorStringProperty,
      s.pendingStringProperty,
      s.expressionHelpStringProperty,
      s.derivativeMismatchStringProperty,
      s.derivativeNumericStringProperty,
      s.derivativeBlankStringProperty,
    ],
    (invalid, inputs, current, derivative, syntax, number, pending, help, mismatch, numeric, blank) =>
      invalid
        ? invalid === "first" || invalid === "second"
          ? number
          : syntax
        : Object.keys(inputs).some((field) => inputs[field as Field] !== current[field as Field])
          ? pending
          : model.method !== "newton"
            ? help
            : derivative === "mismatch"
              ? mismatch
              : derivative === "numeric"
                ? numeric
                : blank,
  );
  const note = label(messageProperty, 13, SETUP_WIDTH);
  const liveMessage = new Node({ tagName: "p", innerContent: messageProperty });
  Multilink.multilink([model.invalidFieldProperty, derivativeStateProperty], (field, derivative) => {
    note.fill = field || derivative === "mismatch" ? Colors.errorColorProperty : Colors.mutedColorProperty;
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

/**
 * Estimated order of convergence at row j from three successive step sizes:
 * p ≈ log(sⱼ / sⱼ₋₁) / log(sⱼ₋₁ / sⱼ₋₂). Bisection gives 1, the secant ≈ 1.6, Newton 2.
 */
function orderAt(sizes: ReadonlyArray<number | null>, j: number): number | null {
  const [s0, s1, s2] = [sizes[j - 2], sizes[j - 1], sizes[j]];
  if (!(s0 && s1 && s2 && s0 > 0 && s1 > 0 && s2 > 0)) {
    return null;
  }
  const denominator = Math.log(s1 / s0);
  const order = Math.log(s2 / s1) / denominator;
  return Number.isFinite(order) && Math.abs(denominator) > 1e-9 ? order : null;
}

/** log₁₀ of the residual |f(xₖ)| against the step k, with the tolerance as a dashed line. */
function errorPlot(model: RootFindingModel, width: number, height: number): Node {
  const s = strings();
  const inset = { left: 44, right: 8, top: 6, bottom: 18 };
  const frame = new Rectangle(0, 0, width, height, { stroke: Colors.graphAxisColorProperty, lineWidth: 0.5 });
  const layer = new Node();
  const node = new Node({ children: [frame, layer] });
  model.runProperty.link(({ history }) => {
    for (const child of layer.children.slice()) {
      layer.removeChild(child);
      child.dispose();
    }
    const logs = history.map((row) => Math.log10(Math.max(1e-16, Math.abs(row.estimate.y))));
    const tolerance = Math.log10(TOLERANCE);
    const finite = logs.filter((value) => Number.isFinite(value));
    const low = Math.floor(Math.min(tolerance - 1, ...finite));
    const high = Math.ceil(Math.max(tolerance + 1, ...finite));
    const steps = Math.max(5, history.length - 1);
    const px = (k: number) => inset.left + ((width - inset.left - inset.right) * k) / steps;
    const py = (value: number) =>
      inset.top + ((height - inset.top - inset.bottom) * (high - value)) / Math.max(1, high - low);
    const axisLabel = (markup: string, x: number, y: number) => {
      const tick = new RichText(markup, { font: new PhetFont(11), fill: Colors.mutedColorProperty, maxWidth: 40 });
      tick.right = x;
      tick.centerY = y;
      layer.addChild(tick);
    };
    axisLabel(`10<sup>${high}</sup>`, inset.left - 4, py(high));
    axisLabel(`10<sup>${low}</sup>`, inset.left - 4, py(low));
    const toleranceLine = new Line(px(0), py(tolerance), px(steps), py(tolerance), {
      stroke: Colors.functionCurveColorProperty,
      lineDash: [5, 4],
    });
    layer.addChild(toleranceLine);
    const stepLabel = label(s.iterationStringProperty, 11, 60);
    stepLabel.right = width - inset.right;
    stepLabel.bottom = height - 2;
    layer.addChild(stepLabel);
    if (logs.length > 0) {
      const shape = new Shape();
      for (const [k, value] of logs.entries()) {
        if (k === 0) {
          shape.moveTo(px(k), py(value));
        } else {
          shape.lineTo(px(k), py(value));
        }
      }
      layer.addChild(new Path(shape, { stroke: Colors.actionColorProperty, lineWidth: 2 }));
      for (const [k, value] of logs.entries()) {
        layer.addChild(new Circle(3, { x: px(k), y: py(value), fill: Colors.actionColorProperty }));
      }
    }
  });
  return node;
}

/** The table cells for one history row. */
function rowValues(record: Iteration, index: number, sizes: ReadonlyArray<number | null>): string[] {
  const s = strings();
  const order = orderAt(sizes, index);
  return [
    String(record.kind === "initial" ? 0 : index + 1),
    formatNumber(record.estimate.x),
    formatNumber(Math.abs(record.estimate.y)),
    record.size === null ? "—" : formatNumber(record.size),
    order === null ? "—" : formatNumber(roundSymmetric(order * 100) / 100),
    s[`${record.kind}StringProperty`].value,
  ];
}

function historyPanel(model: RootFindingModel): Node {
  const s = strings();
  const rowsPerPage = HISTORY_ROWS;
  const width = GRAPH_WIDTH - 26;
  const pageProperty = new NumberProperty(0);
  const showPlotProperty = new BooleanProperty(false);
  const previous = button(
    s.previousStringProperty,
    () => {
      pageProperty.value--;
    },
    78,
  );
  const later = button(
    s.laterStringProperty,
    () => {
      pageProperty.value++;
    },
    78,
  );
  const pageLabel = label("", 13, 60);
  const plotToggle = new Checkbox(showPlotProperty, label(s.errorPlotStringProperty, 13, 110), {
    boxWidth: 15,
    spacing: 6,
    checkboxColor: Colors.textColorProperty,
    checkboxColorBackground: Colors.panelBackgroundColorProperty,
    accessibleName: s.errorPlotStringProperty,
  });
  const heading = new HBox({
    spacing: 10,
    children: [label(s.historyStringProperty, 19, 200, true), previous, pageLabel, later, plotToggle],
  });
  const columns = [0, 44, 140, 240, 345, 405];
  const widths = [40, 92, 96, 100, 55, 175];
  const headerLabels = [
    s.iterationStringProperty,
    s.estimateStringProperty,
    s.residualStringProperty,
    isBracketed(model.method) ? s.widthStringProperty : s.changeStringProperty,
    s.orderStringProperty,
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
  const table = new Node({ children: [header, new Node({ y: 20, children: [backing, empty, textLayer] })] });
  const plot = errorPlot(model, width, 19 * rowsPerPage + 18);
  showPlotProperty.link((showPlot) => {
    table.visible = !showPlot;
    plot.visible = showPlot;
    previous.visible = !showPlot;
    later.visible = !showPlot;
    pageLabel.visible = !showPlot;
  });
  const panel = new RootFindingPanel(
    new VBox({
      align: "left",
      spacing: 5,
      children: [heading, new Node({ children: [table, plot] }), resultText],
      pdomOrder: [previous, later, plotToggle, resultText],
    }),
  );
  model.runProperty.link(({ history }) => {
    pageProperty.value = Math.max(0, Math.ceil(history.length / rowsPerPage) - 1);
  });
  const kindKeys = ["initial", "midpoint", "tangent", "chord", "secant", "cobweb", "inverseQuadratic"] as const;
  Multilink.multilinkAny(
    [model.runProperty, pageProperty, ...kindKeys.map((kind) => s[`${kind}StringProperty`]), ...headerLabels],
    () => {
      const { history } = model.runProperty.value;
      const index = pageProperty.value;
      const pages = Math.max(1, Math.ceil(history.length / rowsPerPage));
      previous.enabled = index > 0;
      later.enabled = index < pages - 1;
      pageLabel.string = `${index + 1} / ${pages}`;
      empty.visible = history.length === 0;
      const start = index * rowsPerPage;
      const sizes = history.map((row) => row.size);
      const descriptions: string[] = [];
      for (const [i, row] of texts.entries()) {
        const record = history[start + i];
        const values = record ? rowValues(record, start + i, sizes) : [];
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
  const playLabelProperty = new DerivedProperty(
    [model.timer.isPlayingProperty, s.playStringProperty, s.pauseStringProperty],
    (playing, runLabel, pauseLabel) => (playing ? pauseLabel : runLabel),
  );
  const play = button(
    playLabelProperty,
    () => {
      model.timer.isPlayingProperty.value = !model.timer.isPlayingProperty.value;
    },
    92,
    true,
  );
  const step = button(s.stepStringProperty, () => model.stepOnce(), 92);
  const restart = button(s.restartStringProperty, () => model.restart(), 102);
  const state = label("", 15, SETUP_WIDTH, true);
  const explanation = createStepExplanation(model);
  const statusKeys = [
    "ready",
    "working",
    "exact",
    "converged",
    "invalidBracket",
    "undefined",
    "zeroSlope",
    "stagnation",
    "cycle",
    "limit",
    "inconsistent",
  ] as const;
  const kindKeys = ["initial", "midpoint", "tangent", "chord", "secant", "cobweb", "inverseQuadratic"] as const;
  Multilink.multilinkAny(
    [
      model.runProperty,
      ...statusKeys.map((k) => s[`${k}StringProperty`]),
      ...kindKeys.map((k) => s[`${k}StringProperty`]),
      s.stepHeaderStringProperty,
      s.mapSlopeStringProperty,
    ],
    () => {
      const { history, status } = model.runProperty.value;
      const active = status === "ready" || status === "working";
      play.enabled = active;
      step.enabled = active;
      const latest = history.at(-1);
      state.string =
        status === "working" && latest
          ? interpolate(s.stepHeaderStringProperty.value, {
              number: String(history.length),
              kind: s[`${latest.kind}StringProperty`].value,
            })
          : s[`${status}StringProperty`].value;
      // Fixed-point iteration converges near a fixed point x* when |g′(x*)| < 1.
      const g = model.runProperty.value.problem.auxiliary;
      if (model.method === "fixedPoint" && latest && g) {
        const slope = Math.abs(numericalDerivative(g)(latest.estimate.x));
        state.string += `  ·  ${interpolate(s.mapSlopeStringProperty.value, { value: formatNumber(slope) })}`;
      }
      state.fill = active
        ? Colors.textColorProperty
        : status === "exact" || status === "converged"
          ? Colors.functionCurveColorProperty
          : Colors.errorColorProperty;
    },
  );
  return new RootFindingPanel(
    new VBox({
      align: "left",
      spacing: 8,
      children: [new HBox({ spacing: 8, children: [step, play, restart] }), state, explanation],
      pdomOrder: [step, play, restart, explanation],
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
      layoutBounds: new Bounds2(0, 0, 1024, 728),
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
      children: [playPanel(model), setupPanel(model, menuLayer)],
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
    this.controls.setScaleMagnitude(portrait ? 1.42 : 1);
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
