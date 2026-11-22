import { Multilink } from "scenerystack/axon";
import { HBox, Node, Rectangle, RichText, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { StringManager } from "../../i18n/StringManager.js";
import Colors from "../../RootFindingColors.js";
import { SETUP_WIDTH } from "../../RootFindingConstants.js";
import { isBracketed, type Method } from "../model/problems.js";
import type { RootFindingModel } from "../model/RootFindingModel.js";
import type { Iteration } from "../model/solver.js";
import { formatNumber } from "./IterationGraph.js";

type Strings = ReturnType<StringManager["getSolverStrings"]>;
type Run = RootFindingModel["runProperty"]["value"];
type Explanation = readonly [string, string, string];
const TAG_WIDTH = 69;
const ROW_HEIGHT = 39;
const GAP = 8;

export function interpolate(pattern: string, values: Record<string, string>): string {
  return pattern.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "");
}

function translate(property: { value: string }, values: Record<string, number>): string {
  return interpolate(
    property.value,
    Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, Number.isFinite(value) ? formatNumber(value) : "—"]),
    ),
  );
}

function startingValues(s: Strings, method: Method, run: Run): string {
  const { first, second, f } = run.problem;
  if (isBracketed(method)) {
    return translate(s.bracketSourceStringProperty, { a: first, b: second, fa: f(first), fb: f(second) });
  }
  return method === "secant"
    ? translate(s.initialPairStringProperty, { from: first, second })
    : translate(s.initialSingleStringProperty, { from: first });
}

function stepSource(s: Strings, row: Iteration): string {
  const { previousBracket, from, second, slope, third } = row;
  if (previousBracket) {
    const [a, b] = previousBracket;
    const endpoints = translate(s.bracketSourceStringProperty, { a: a.x, b: b.x, fa: a.y, fb: b.y });
    return third ? `${endpoints} ${translate(s.brentThirdStringProperty, { third: third.x, ty: third.y })}` : endpoints;
  }
  if (row.kind === "cobweb" && from) {
    return translate(s.cobwebSourceStringProperty, { from: from.x });
  }
  if (from && slope !== null) {
    return translate(s.tangentSourceStringProperty, { from: from.x, fy: from.y, slope });
  }
  return from && second
    ? translate(s.secantSourceStringProperty, { from: from.x, fy: from.y, second: second.x, sy: second.y })
    : "";
}

const fallbackKeys = {
  outside: "brentOutsideStringProperty",
  progress: "brentProgressStringProperty",
  tolerance: "brentToleranceStringProperty",
  nonfinite: "brentNonfiniteStringProperty",
} as const;

function stepConstruction(s: Strings, row: Iteration): string {
  const {
    estimate: { x },
    from,
    slope,
    previousBracket,
    fallback,
  } = row;
  switch (row.kind) {
    case "midpoint": {
      if (!previousBracket) {
        return "";
      }
      const midpoint = translate(s.midpointBuildStringProperty, {
        a: previousBracket[0].x,
        b: previousBracket[1].x,
        x,
      });
      return fallback
        ? `${translate(s[fallbackKeys[fallback.reason]], { candidate: fallback.candidate })} ${midpoint}`
        : midpoint;
    }
    case "tangent":
      return from && slope !== null
        ? translate(s.tangentBuildStringProperty, { from: from.x, fy: from.y, slope, x })
        : "";
    case "chord":
      return translate(s.chordBuildStringProperty, { x });
    case "secant":
      return translate(s.secantBuildStringProperty, { x });
    case "inverseQuadratic":
      return translate(s.inverseBuildStringProperty, { x });
    case "cobweb":
      return translate(s.cobwebBuildStringProperty, { x });
    case "initial":
      return "";
  }
}

function explain(s: Strings, method: Method, run: Run): Explanation {
  const row = run.history.at(-1);
  const methodDescription = s[`${method}DescriptionStringProperty`].value;
  if (!row) {
    return [
      startingValues(s, method, run),
      methodDescription,
      run.status === "ready" ? s.readyDecisionStringProperty.value : s[`${run.status}StringProperty`].value,
    ];
  }
  const { x, y } = row.estimate;
  const exact = y === 0 && (method !== "fixedPoint" || run.status === "exact");
  const decision = exact
    ? translate(method === "fixedPoint" ? s.fixedExactDecisionStringProperty : s.exactDecisionStringProperty, { x })
    : row.bracket
      ? translate(s.keptDecisionStringProperty, { x, fx: y, low: row.bracket[0].x, high: row.bracket[1].x })
      : translate(s.openDecisionStringProperty, { x, residual: Math.abs(y) });
  return [
    row.kind === "initial" ? startingValues(s, method, run) : stepSource(s, row),
    row.kind === "initial" ? methodDescription : stepConstruction(s, row),
    decision,
  ];
}

export function createStepExplanation(model: RootFindingModel): Node {
  const s = StringManager.getInstance().getSolverStrings();
  const tags = [s.stepSourcesStringProperty, s.stepConstructionStringProperty, s.stepDecisionStringProperty];
  const colors = [Colors.accentColorProperty, Colors.constructionColorProperty, Colors.functionCurveColorProperty];
  const rows = tags.map((tag, index) => {
    const text = new RichText("", {
      lineWrap: SETUP_WIDTH - TAG_WIDTH - GAP - 11,
      font: new PhetFont(13),
      fill: Colors.textColorProperty,
      maxHeight: ROW_HEIGHT,
      accessibleParagraph: null,
    });
    const tint = colors[index] ?? Colors.textColorProperty;
    const heading = new Text(tag, {
      font: new PhetFont({ size: 13, weight: "bold" }),
      fill: tint,
      maxWidth: TAG_WIDTH - 10,
    });
    const row = new HBox({
      align: "top",
      spacing: GAP,
      children: [
        new Rectangle(0, 0, 3, ROW_HEIGHT - 7, { fill: tint, cornerRadius: 2 }),
        new Node({ children: [new Rectangle(0, 0, TAG_WIDTH - 10, ROW_HEIGHT), heading] }),
        text,
      ],
    });
    return { row, text };
  });
  const screenReader = new Node({ tagName: "p" });
  const panel = new VBox({
    align: "left",
    spacing: 2,
    children: [...rows.map(({ row }) => row), screenReader],
    pdomOrder: [screenReader],
  });
  Multilink.multilinkAny([model.runProperty, ...Object.values(s)], () => {
    const content = explain(s, model.method, model.runProperty.value);
    rows.forEach(({ text }, index) => {
      text.string = content[index] ?? "";
    });
    screenReader.innerContent = tags.map((tag, i) => `${tag.value}. ${content[i]}`).join(" ");
  });
  return panel;
}
