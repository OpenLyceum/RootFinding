import type { Bounds2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Node, Path, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { StringManager } from "../../i18n/StringManager.js";
import Colors from "../../RootFindingColors.js";
import { isBracketed, type Method } from "../model/problems.js";
import type { RootFindingModel } from "../model/RootFindingModel.js";
import type { Iteration } from "../model/solver.js";

const LABEL_COUNT = 9;
const POINT_RADIUS = 4.5;
const LABEL_WIDTH = 112;
const GUIDE_DASH = [4, 4];
type Line = (ax: number, ay: number, bx: number, by: number) => void;
type Mark = (x: number, y: number, label: string, role?: "source" | "next" | "rejected") => void;
type PlotStep = { trace: Line; arrow: Line; guide: Line; mark: Mark };
type Run = RootFindingModel["runProperty"]["value"];

function plotInterpolation(row: Iteration, { trace, arrow, mark }: PlotStep): void {
  const { from, second, third, estimate, kind, previousBracket } = row;
  if (!from) {
    return;
  }
  if (!previousBracket) {
    mark(from.x, from.y, second ? "xₙ₋₁" : "xₙ");
  }
  if (!second) {
    arrow(from.x, from.y, estimate.x, 0);
    return;
  }
  if (!previousBracket) {
    mark(second.x, second.y, "xₙ");
  }
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
      trace(inverseX(y1), y1, inverseX(y2), y2);
    }
    mark(third.x, third.y, "c");
    return;
  }
  trace(from.x, from.y, second.x, second.y);
  const nearest = Math.abs(estimate.x - from.x) < Math.abs(estimate.x - second.x) ? from : second;
  arrow(nearest.x, nearest.y, estimate.x, 0);
}

function sign(value: number): string {
  return value === 0 ? "0" : value < 0 ? "−" : "+";
}

function plotBracket(bracket: NonNullable<Iteration["bracket"]>, drawing: PlotStep): void {
  for (const [index, endpoint] of bracket.entries()) {
    drawing.mark(endpoint.x, endpoint.y, `${index === 0 ? "a" : "b"} (${sign(endpoint.y)})`);
    drawing.guide(endpoint.x, 0, endpoint.x, endpoint.y);
  }
}

function plotInitial(method: Method, run: Run, drawing: PlotStep): void {
  const { first, second, f, auxiliary } = run.problem;
  if (isBracketed(method)) {
    plotBracket(
      run.bracket ?? [
        { x: first, y: f(first) },
        { x: second, y: f(second) },
      ],
      drawing,
    );
    return;
  }
  drawing.mark(first, method === "fixedPoint" ? (auxiliary?.(first) ?? NaN) : f(first), "x₀");
  if (method === "secant") {
    drawing.mark(second, f(second), "x₁");
  }
}

function plotStep(method: Method, run: Run, drawing: PlotStep): void {
  const last = run.history.at(-1);
  if (!last) {
    plotInitial(method, run, drawing);
    return;
  }
  const interval = last.previousBracket ?? run.bracket;
  if (method === "fixedPoint") {
    for (const row of run.history.slice(-8, -1)) {
      if (row.from) {
        const x = row.from.x;
        const next = row.estimate.x;
        drawing.guide(x, x, x, next);
        drawing.guide(x, next, next, next);
      }
    }
    const next = last.estimate.x;
    drawing.mark(next, next, "xₙ₊₁", "next");
    if (last.from) {
      const x = last.from.x;
      drawing.arrow(x, x, x, next);
      drawing.arrow(x, next, next, next);
      drawing.mark(x, next, "g(xₙ)");
      drawing.mark(x, x, "xₙ");
    }
    return;
  }
  const { estimate } = last;
  const candidate = last.kind === "midpoint" ? "m" : interval ? "x*" : "xₙ₊₁";
  drawing.mark(estimate.x, 0, candidate, "next");
  if (last.kind !== "initial") {
    drawing.mark(estimate.x, estimate.y, `f(${candidate}) ${sign(estimate.y)}`, "next");
    drawing.guide(estimate.x, 0, estimate.x, estimate.y);
  }
  if (interval) {
    plotBracket(interval, drawing);
  }
  if (last.fallback) {
    const strings = StringManager.getInstance().getSolverStrings();
    drawing.mark(last.fallback.candidate, 0, strings.rejectedPointStringProperty.value, "rejected");
  }
  plotInterpolation(last, drawing);
}

function createBadge(): { node: Node; background: Rectangle; text: Text } {
  const background = new Rectangle(0, 0, 1, 1, {
    cornerRadius: 4,
    fill: Colors.graphBackgroundColorProperty,
  });
  const text = new Text("", {
    fill: Colors.textColorProperty,
    font: new PhetFont({ size: 13, weight: "bold" }),
    maxWidth: LABEL_WIDTH,
  });
  return { node: new Node({ children: [background, text], visible: false }), background, text };
}

export class StepGraphOverlay {
  public readonly regionLayer: Node;
  public readonly constructionLayer: Node;
  private readonly kept = new Path(null, { fill: Colors.bracketColorProperty });
  private readonly discarded = new Path(null, { fill: Colors.discardedBracketColorProperty });
  private readonly guides = new Path(null, {
    stroke: Colors.graphAxisColorProperty,
    lineWidth: 1.1,
    lineDash: GUIDE_DASH,
    opacity: 0.75,
  });
  private readonly construction = new Path(null, { stroke: Colors.constructionColorProperty, lineWidth: 2.25 });
  private readonly sources = new Path(null, {
    fill: Colors.graphBackgroundColorProperty,
    stroke: Colors.accentColorProperty,
    lineWidth: 2,
  });
  private readonly candidates = new Path(null, {
    fill: Colors.constructionColorProperty,
    stroke: Colors.graphBackgroundColorProperty,
    lineWidth: 1,
  });
  private readonly rejected = new Path(null, { stroke: Colors.errorColorProperty, lineWidth: 1.8 });
  private readonly badges = Array.from({ length: LABEL_COUNT }, createBadge);
  private readonly plot: Bounds2;

  public constructor(plot: Bounds2) {
    this.plot = plot;
    this.regionLayer = new Node({ children: [this.discarded, this.kept] });
    this.constructionLayer = new Node({
      children: [
        this.guides,
        this.construction,
        this.sources,
        this.candidates,
        this.rejected,
        ...this.badges.map((badge) => badge.node),
      ],
    });
  }

  public draw(model: RootFindingModel, run: Run, xView: (x: number) => number, yView: (y: number) => number): void {
    for (const badge of this.badges) {
      badge.node.visible = false;
    }
    this.drawRegions(run, xView);
    const construction = new Shape();
    const guides = new Shape();
    const sources = new Shape();
    const candidates = new Shape();
    const rejected = new Shape();
    const visible = (x: number, y: number) => this.plot.containsCoordinates(x, y);
    const line =
      (shape: Shape, arrow: boolean): Line =>
      (ax, ay, bx, by) => {
        if (![ax, ay, bx, by].every(Number.isFinite)) {
          return;
        }
        const startX = xView(ax);
        const startY = yView(ay);
        const x = xView(bx);
        const y = yView(by);
        shape.moveTo(startX, startY).lineTo(x, y);
        const distance = Math.hypot(x - startX, y - startY);
        if (arrow && distance > 14 && visible(x, y)) {
          const ux = (x - startX) / distance;
          const uy = (y - startY) / distance;
          // Finish the head just before the marker so the direction stays visible.
          const headX = x - ux * 5;
          const headY = y - uy * 5;
          shape
            .moveTo(headX - 7 * ux - 4 * uy, headY - 7 * uy + 4 * ux)
            .lineTo(headX, headY)
            .lineTo(headX - 7 * ux + 4 * uy, headY - 7 * uy - 4 * ux);
        }
      };
    const mark: Mark = (x, y, label, role = "source") => {
      if (!(Number.isFinite(x) && Number.isFinite(y))) {
        return;
      }
      const px = xView(x);
      const py = yView(y);
      if (!visible(px, py)) {
        return;
      }
      if (role === "rejected") {
        rejected
          .moveTo(px - 4, py - 4)
          .lineTo(px + 4, py + 4)
          .moveTo(px + 4, py - 4)
          .lineTo(px - 4, py + 4);
      } else {
        (role === "next" ? candidates : sources).newSubpath().circle(px, py, POINT_RADIUS);
      }
      this.label(label, px, py, role);
    };
    plotStep(model.method, run, {
      trace: line(construction, false),
      arrow: line(construction, true),
      guide: line(guides, false),
      mark,
    });
    this.construction.shape = construction;
    this.guides.shape = guides;
    this.sources.shape = sources;
    this.candidates.shape = candidates;
    this.rejected.shape = rejected;
  }

  private drawRegions(run: Run, xView: (value: number) => number): void {
    const s = StringManager.getInstance().getSolverStrings();
    const retained = run.bracket;
    const previous = run.history.at(-1)?.previousBracket;
    const shapeFor = (low: number, high: number) =>
      Shape.rect(low, this.plot.top, Math.max(0, high - low), this.plot.height);
    this.kept.shape = retained ? shapeFor(xView(retained[0].x), xView(retained[1].x)) : null;
    this.discarded.shape = null;
    if (!(previous && retained)) {
      return;
    }
    const left = previous[0].x < retained[0].x;
    const right = previous[1].x > retained[1].x;
    const shade = new Shape();
    if (left) {
      shade.rect(xView(previous[0].x), this.plot.top, xView(retained[0].x) - xView(previous[0].x), this.plot.height);
    }
    if (right) {
      shade.rect(xView(retained[1].x), this.plot.top, xView(previous[1].x) - xView(retained[1].x), this.plot.height);
    }
    this.discarded.shape = shade;
    this.labelRegion(s.keptRegionStringProperty.value, xView(retained[0].x), xView(retained[1].x), "kept");
    if (left) {
      this.labelRegion(s.discardedRegionStringProperty.value, xView(previous[0].x), xView(retained[0].x), "rejected");
    }
    if (right) {
      this.labelRegion(s.discardedRegionStringProperty.value, xView(retained[1].x), xView(previous[1].x), "rejected");
    }
  }

  private labelRegion(text: string, low: number, high: number, role: "kept" | "rejected"): void {
    const left = Math.max(this.plot.left, low);
    const right = Math.min(this.plot.right, high);
    if (right - left > 86) {
      this.label(text, (left + right) / 2, this.plot.top + 29, role, true);
    }
  }

  private label(
    text: string,
    x: number,
    y: number,
    role: "source" | "next" | "rejected" | "kept",
    region = false,
  ): void {
    const badge = this.badges.find(({ node }) => !node.visible);
    if (!badge) {
      return;
    }
    badge.text.string = text;
    badge.text.fill =
      role === "source"
        ? Colors.accentColorProperty
        : role === "next"
          ? Colors.constructionColorProperty
          : role === "kept"
            ? Colors.functionCurveColorProperty
            : Colors.errorColorProperty;
    const width = badge.text.width + 10;
    const height = badge.text.height + 5;
    badge.background.setRect(0, 0, width, height);
    badge.text.centerX = width / 2;
    badge.text.centerY = height / 2;
    const options = region
      ? [[x - width / 2, y - height - 5]]
      : [
          [x + 7, y - height - 5],
          [x + 7, y + 6],
          [x - width - 7, y - height - 5],
          [x - width - 7, y + 6],
          [x - width / 2, y - height - 10],
        ];
    for (const [left = 0, top = 0] of options) {
      if (
        left < this.plot.left ||
        left + width > this.plot.right ||
        top < this.plot.top ||
        top + height > this.plot.bottom
      ) {
        continue;
      }
      const collides = this.badges.some(
        ({ node }) =>
          node.visible &&
          node.left < left + width + 2 &&
          node.right > left - 2 &&
          node.top < top + height + 2 &&
          node.bottom > top - 2,
      );
      if (!collides) {
        badge.node.left = left;
        badge.node.top = top;
        badge.node.visible = true;
        return;
      }
    }
  }
}
