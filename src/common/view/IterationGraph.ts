import { Multilink } from "scenerystack/axon";
import { Bounds2, toFixed } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Node, Path, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { StringManager } from "../../i18n/StringManager.js";
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
import type { RootFindingModel } from "../model/RootFindingModel.js";
import type { GraphBounds, GraphViewport } from "./GraphViewport.js";
import { StepGraphOverlay } from "./StepGraphOverlay.js";

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
  const overlay = new StepGraphOverlay(plot);
  const grid = new Path(null, { stroke: Colors.graphGridColorProperty });
  const axes = new Path(null, { stroke: Colors.graphAxisColorProperty, lineWidth: 1.25 });
  const curve = new Path(null, { stroke: Colors.functionCurveColorProperty, lineWidth: 2.75 });
  const reference = new Path(null, { stroke: Colors.graphAxisColorProperty, lineDash: [5, 4], lineWidth: 1.4 });
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
    children: [overlay.regionLayer, grid, axes, reference, curve, overlay.constructionLayer],
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
      new Text(fixed ? "g(x)     ·     y = x" : "f(x)", {
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

  const strings = StringManager.getInstance().getSolverStrings();
  Multilink.multilink(
    [
      model.runProperty,
      viewport.boundsProperty,
      strings.keptRegionStringProperty,
      strings.discardedRegionStringProperty,
      strings.rejectedPointStringProperty,
    ],
    (run, bounds) => {
      if (run.problem !== sampledProblem || bounds !== sampledBounds) {
        drawFunction(run.problem, bounds);
        sampledProblem = run.problem;
        sampledBounds = bounds;
      }
      const { minX, maxX, minY, maxY } = bounds;
      const xView = (x: number) => plot.left + limitProjected((x - minX) / (maxX - minX)) * plot.width;
      const yView = (y: number) => plot.bottom - limitProjected((y - minY) / (maxY - minY)) * plot.height;
      overlay.draw(model, run, xView, yView);
    },
  );
  return graph;
}
