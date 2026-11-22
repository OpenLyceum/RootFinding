import { Multilink } from "scenerystack/axon";
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

import type { GraphBounds, GraphViewport } from "./GraphViewport.js";

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
  bounds: GraphBounds,
  xView: (x: number) => number,
  yView: (y: number) => number,
): Shape {
  const { minX, maxX, minY, maxY } = bounds;
  const ySpan = maxY - minY;
  const curveShape = new Shape();
  let previous: number | null = null;
  for (let i = 0; functionToPlot && i <= GRAPH_SAMPLES; i++) {
    const x = minX + ((maxX - minX) * i) / GRAPH_SAMPLES;
    const y = functionToPlot(x);
    if (!Number.isFinite(y) || Math.abs((y - minY) / ySpan) > 24) {
      previous = null;
      continue;
    }
    if (previous === null || Math.abs(y - previous) / ySpan > 1.5) {
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

function limitProjected(fraction: number): number {
  return Math.max(-30, Math.min(31, fraction));
}

function formatTick(value: number, spacing: number): string {
  const digits = Math.ceil(Math.log10(Math.max(Math.abs(value), spacing) / spacing)) + 3;
  return String(Number(value.toPrecision(Math.min(17, digits))));
}

export function createIterationGraph(model: RootFindingModel, viewport: GraphViewport): Node {
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
        top: GRAPH_HEIGHT - 16,
        font: new PhetFont(13),
        fill: Colors.textColorProperty,
      }),
      new Text(fixed ? "g(x)" : "f(x)", {
        left: GRAPH_INSET_LEFT,
        top: 2,
        font: new PhetFont(13),
        fill: Colors.functionCurveColorProperty,
      }),
    ],
  });
  let sampledProblem: Problem | null = null;
  let sampledBounds: GraphBounds | null = null;

  function drawFunction(problem: Problem, bounds: GraphBounds): void {
    const { minX, maxX, minY, maxY } = bounds;
    const xSpan = maxX - minX;
    const ySpan = maxY - minY;
    const xView = (x: number) => plot.left + ((x - minX) / xSpan) * plot.width;
    const yView = (y: number) => plot.bottom - ((y - minY) / ySpan) * plot.height;
    const gridShape = new Shape();
    for (let i = 0; i < TICKS; i++) {
      const fraction = i / (TICKS - 1);
      const x = minX + fraction * xSpan;
      const y = maxY - fraction * ySpan;
      const xPixel = xView(x);
      const yPixel = yView(y);
      gridShape.moveTo(xPixel, plot.top).lineTo(xPixel, plot.bottom);
      gridShape.moveTo(plot.left, yPixel).lineTo(plot.right, yPixel);
      const xTick = ticks[i];
      const yTick = ticks[i + TICKS];
      if (xTick && yTick) {
        xTick.string = formatTick(x, xSpan / (TICKS - 1));
        xTick.centerX = Math.min(GRAPH_WIDTH - xTick.width / 2 - 4, xPixel);
        xTick.top = plot.bottom + 6;
        yTick.string = formatTick(y, ySpan / (TICKS - 1));
        yTick.right = plot.left - 6;
        yTick.centerY = yPixel;
      }
    }
    grid.shape = gridShape;
    const axesShape = new Shape();
    if (minY <= 0 && maxY >= 0) {
      axesShape.moveTo(plot.left, yView(0)).lineTo(plot.right, yView(0));
    }
    if (minX <= 0 && maxX >= 0) {
      axesShape.moveTo(xView(0), plot.top).lineTo(xView(0), plot.bottom);
    }
    axes.shape = axesShape;
    const diagonalLow = Math.max(minX, minY);
    const diagonalHigh = Math.min(maxX, maxY);
    reference.shape =
      fixed && diagonalLow < diagonalHigh
        ? new Shape().moveTo(xView(diagonalLow), yView(diagonalLow)).lineTo(xView(diagonalHigh), yView(diagonalHigh))
        : null;
    curve.shape = sampleCurve(fixed ? problem.auxiliary : problem.f, bounds, xView, yView);
  }

  Multilink.multilink(
    [model.runProperty, viewport.boundsProperty],
    ({ problem, history, bracket: interval }, bounds) => {
      if (problem !== sampledProblem || bounds !== sampledBounds) {
        drawFunction(problem, bounds);
        sampledProblem = problem;
        sampledBounds = bounds;
      }
      const { minX, maxX, minY, maxY } = bounds;
      const xView = (x: number) => plot.left + limitProjected((x - minX) / (maxX - minX)) * plot.width;
      const yView = (y: number) => plot.bottom - limitProjected((y - minY) / (maxY - minY)) * plot.height;
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
    },
  );
  return graph;
}
