import { Bounds2, toFixed } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Node, Path, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import Colors from "../../RootFindingColors.js";
import {
  GRAPH_HEIGHT,
  GRAPH_INSET_BOTTOM,
  GRAPH_INSET_LEFT,
  GRAPH_PAD,
  GRAPH_SAMPLES,
  GRAPH_WIDTH,
} from "../../RootFindingConstants.js";
import type { Problem } from "../model/problems.js";
import { isBracketed } from "../model/problems.js";
import type { RootFindingModel } from "../model/RootFindingModel.js";
import type { Iteration } from "../model/solver.js";

const plot = new Bounds2(GRAPH_INSET_LEFT, GRAPH_PAD, GRAPH_WIDTH - GRAPH_PAD, GRAPH_HEIGHT - GRAPH_INSET_BOTTOM);
const TICKS = 5;

// Display both small residuals and large divergent estimates without rounding them to zero.
export function formatNumber(value: number): string {
  const magnitude = Math.abs(value);
  return magnitude >= 1e5 || (magnitude > 0 && magnitude < 1e-4)
    ? value.toExponential(3)
    : String(Number(toFixed(value, 7)));
}

function sampleCurve(
  functionToPlot: Problem["auxiliary"],
  xMin: number,
  xMax: number,
  yMax: number,
  xView: (x: number) => number,
  yView: (y: number) => number,
): Shape {
  const curveShape = new Shape();
  let previous: number | null = null;
  for (let i = 0; functionToPlot && i <= GRAPH_SAMPLES; i++) {
    const x = xMin + ((xMax - xMin) * i) / GRAPH_SAMPLES;
    const y = functionToPlot(x);
    if (!Number.isFinite(y) || Math.abs(y / yMax) > 24) {
      previous = null;
      continue;
    }
    if (previous === null || Math.abs(y - previous) / yMax > 3) {
      curveShape.moveTo(xView(x), yView(y));
    } else {
      curveShape.lineTo(xView(x), yView(y));
    }
    previous = y;
  }
  return curveShape;
}

type Line = (ax: number, ay: number, bx: number, by: number) => void;
type Marker = (x: number, y: number) => void;

function drawInterpolation(row: Iteration, marker: Marker, line: Line): void {
  const { from, second, third, estimate, kind } = row;
  if (!from) {
    return;
  }
  marker(from.x, from.y);
  if (!second) {
    line(from.x, from.y, estimate.x, 0);
    return;
  }
  marker(second.x, second.y);
  if (kind === "inverseQuadratic" && third) {
    const low = Math.min(0, from.y, second.y, third.y);
    const high = Math.max(0, from.y, second.y, third.y);
    const inverseX = (y: number) =>
      from.x * ((y - second.y) / (from.y - second.y)) * ((y - third.y) / (from.y - third.y)) +
      second.x * ((y - from.y) / (second.y - from.y)) * ((y - third.y) / (second.y - third.y)) +
      third.x * ((y - from.y) / (third.y - from.y)) * ((y - second.y) / (third.y - second.y));
    for (let i = 0; i < 64; i++) {
      const y1 = low + ((high - low) * i) / 64;
      const y2 = low + ((high - low) * (i + 1)) / 64;
      line(inverseX(y1), y1, inverseX(y2), y2);
    }
    marker(third.x, third.y);
    return;
  }
  line(from.x, from.y, second.x, second.y);
  if (estimate.x < Math.min(from.x, second.x) || estimate.x > Math.max(from.x, second.x)) {
    const nearest = Math.abs(estimate.x - from.x) < Math.abs(estimate.x - second.x) ? from : second;
    line(nearest.x, nearest.y, estimate.x, 0);
  }
}

function drawConstruction(model: RootFindingModel, history: readonly Iteration[], marker: Marker, line: Line): void {
  const fixed = model.method === "fixedPoint";
  const last = history.at(-1);
  if (!last) {
    const { problem } = model.runProperty.value;
    const evaluate = fixed ? problem.auxiliary : problem.f;
    marker(problem.first, evaluate?.(problem.first) ?? NaN);
    if (isBracketed(model.method) || model.method === "secant") {
      marker(problem.second, problem.f(problem.second));
    }
    return;
  }
  if (fixed) {
    for (const row of history.slice(-12)) {
      if (row.from) {
        const x = row.from.x;
        const next = row.estimate.x;
        line(x, x, x, next);
        line(x, next, next, next);
      }
    }
    marker(last.estimate.x, last.estimate.x);
    return;
  }
  drawInterpolation(last, marker, line);
  line(last.estimate.x, 0, last.estimate.x, last.estimate.y);
  marker(last.estimate.x, 0);
  marker(last.estimate.x, last.estimate.y);
}

export function createIterationGraph(model: RootFindingModel): Node {
  const fixed = model.method === "fixedPoint";
  const fill = new Rectangle(0, 0, GRAPH_WIDTH, GRAPH_HEIGHT, {
    cornerRadius: 8,
    fill: Colors.graphBackgroundColorProperty,
    stroke: Colors.panelBorderColorProperty,
  });
  const bracket = new Path(null, { fill: Colors.bracketColorProperty });
  const grid = new Path(null, { stroke: Colors.graphGridColorProperty });
  const axes = new Path(null, { stroke: Colors.graphAxisColorProperty, lineWidth: 1.25 });
  const curve = new Path(null, { stroke: Colors.functionCurveColorProperty, lineWidth: 2.75 });
  const reference = new Path(null, { stroke: Colors.graphAxisColorProperty, lineDash: [5, 4], lineWidth: 1.4 });
  const construction = new Path(null, { stroke: Colors.constructionColorProperty, lineWidth: 2.25 });
  const points = new Path(null, { fill: Colors.constructionColorProperty });
  const ticks = Array.from(
    { length: TICKS * 2 },
    () =>
      new Text("", {
        font: new PhetFont(12),
        fill: Colors.mutedColorProperty,
        maxWidth: GRAPH_INSET_LEFT - GRAPH_PAD,
      }),
  );
  const plotLayer = new Node({
    clipArea: Shape.bounds(plot),
    children: [bracket, grid, axes, reference, curve, construction, points],
  });
  const graph = new Node({
    children: [
      fill,
      plotLayer,
      ...ticks,
      new Text("x", {
        right: GRAPH_WIDTH - 8,
        centerY: plot.centerY - 12,
        font: new PhetFont(13),
        fill: Colors.textColorProperty,
      }),
      new Text(fixed ? "g(x)" : "f(x)", {
        left: 10,
        top: 4,
        font: new PhetFont(13),
        fill: Colors.functionCurveColorProperty,
      }),
    ],
  });
  let sampledProblem: typeof model.runProperty.value.problem | null = null;
  let xMin = 0;
  let xMax = 0;
  let yMax = 0;
  function drawFunction(problem: Problem): void {
    const seeds = [problem.first, problem.second];
    const seedMin = Math.min(...seeds);
    const seedMax = Math.max(...seeds);
    const margin = Math.max(1.25, (seedMax - seedMin) * 0.4);
    xMin = seedMin - margin;
    xMax = seedMax + margin;
    const heights = seeds
      .map((x) => Math.abs(fixed ? (problem.auxiliary?.(x) ?? NaN) : problem.f(x)))
      .filter(Number.isFinite);
    yMax = Math.max(2, ...heights, ...(fixed ? seeds.map(Math.abs) : [])) * 1.2;
    yMax = Math.min(1e12, yMax);
    const xView = (x: number) => plot.left + ((x - xMin) / (xMax - xMin)) * plot.width;
    const yView = (y: number) => plot.centerY - ((y / yMax) * plot.height) / 2;
    const gridShape = new Shape();
    for (let i = 0; i < TICKS; i++) {
      const fraction = i / (TICKS - 1);
      const x = xMin + fraction * (xMax - xMin);
      const y = yMax - fraction * 2 * yMax;
      const xPixel = xView(x);
      const yPixel = yView(y);
      gridShape.moveTo(xPixel, plot.top).lineTo(xPixel, plot.bottom);
      gridShape.moveTo(plot.left, yPixel).lineTo(plot.right, yPixel);
      const xTick = ticks[i];
      const yTick = ticks[i + TICKS];
      if (xTick && yTick) {
        xTick.string = formatNumber(x);
        xTick.centerX = xPixel;
        xTick.top = plot.bottom + 6;
        yTick.string = formatNumber(y);
        yTick.right = plot.left - 6;
        yTick.centerY = yPixel;
      }
    }
    grid.shape = gridShape;
    const axesShape = new Shape().moveTo(plot.left, yView(0)).lineTo(plot.right, yView(0));
    if (xMin <= 0 && xMax >= 0) {
      axesShape.moveTo(xView(0), plot.top).lineTo(xView(0), plot.bottom);
    }
    axes.shape = axesShape;
    reference.shape = fixed ? new Shape().moveTo(xView(xMin), yView(xMin)).lineTo(xView(xMax), yView(xMax)) : null;
    curve.shape = sampleCurve(fixed ? problem.auxiliary : problem.f, xMin, xMax, yMax, xView, yView);
  }

  model.runProperty.link(({ problem, history, bracket: interval }) => {
    if (problem !== sampledProblem) {
      drawFunction(problem);
      sampledProblem = problem;
    }
    const xView = (x: number) => plot.left + Math.max(-30, Math.min(31, (x - xMin) / (xMax - xMin))) * plot.width;
    const yView = (y: number) => plot.centerY - (Math.max(-30, Math.min(30, y / yMax)) * plot.height) / 2;
    const x0 = interval ? xView(interval[0].x) : 0;
    const x1 = interval ? xView(interval[1].x) : 0;
    bracket.shape = interval ? Shape.rect(x0, plot.top, Math.max(0, x1 - x0), plot.height) : null;
    const overlay = new Shape();
    const markers = new Shape();
    const marker = (x: number, y: number) => {
      if (Number.isFinite(y)) {
        markers.circle(xView(x), yView(y), 4.5);
      }
    };
    const line = (ax: number, ay: number, bx: number, by: number) => {
      if ([ax, ay, bx, by].every(Number.isFinite)) {
        overlay.moveTo(xView(ax), yView(ay)).lineTo(xView(bx), yView(by));
      }
    };
    drawConstruction(model, history, marker, line);
    construction.shape = overlay;
    points.shape = markers;
  });
  return graph;
}
