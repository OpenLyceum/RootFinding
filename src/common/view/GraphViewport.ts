import { BooleanProperty, Property } from "scenerystack/axon";
import { GRAPH_LIMIT, MIN_AUTO_X_SPAN, MIN_MANUAL_SPAN } from "../../RootFindingConstants.js";
import { isBracketed, type Method } from "../model/problems.js";
import type { RootFindingModel } from "../model/RootFindingModel.js";

export type GraphBounds = { minX: number; maxX: number; minY: number; maxY: number };
export type AxisField = keyof GraphBounds;
type Draft = Record<AxisField, string>;
type Run = RootFindingModel["runProperty"]["value"];

const MIN_RELATIVE_SPAN = 1e-8;

function calculateBounds(method: Method, run: Run): GraphBounds {
  const { bracket, history, problem } = run;
  const latest = history.at(-1);
  const seeds = [problem.first, problem.second];
  const shownBracket = latest?.previousBracket ?? bracket;
  const bracketXs = shownBracket?.map((point) => point.x) ?? [];
  const recentXs = [latest?.from?.x, latest?.second?.x, latest?.third?.x, latest?.estimate.x].filter(
    (x): x is number => x !== undefined && Math.abs(x) <= GRAPH_LIMIT,
  );
  const focus = isBracketed(method) && shownBracket ? [...bracketXs] : recentXs;
  // The third Brent sample may be just outside the interval. Include it
  // when it is local enough to reveal the construction without losing the bracket.
  if (
    latest?.third &&
    shownBracket &&
    latest.third.x >= shownBracket[0].x - (shownBracket[1].x - shownBracket[0].x) * 0.5 &&
    latest.third.x <= shownBracket[1].x + (shownBracket[1].x - shownBracket[0].x) * 0.5
  ) {
    focus.push(latest.third.x);
  }
  const values = focus.length > 0 ? focus : seeds;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = max - min;
  const previous = history.at(-2)?.bracket;
  const previousWidth = previous ? previous[1].x - previous[0].x : Math.abs(problem.second - problem.first);
  const minSpan = Math.max(MIN_AUTO_X_SPAN, Math.max(Math.abs(min), Math.abs(max)) * MIN_RELATIVE_SPAN);
  const pad = latest
    ? Math.max(minSpan / 2, width * (shownBracket ? 0.19 : 0.55), bracket && width === 0 ? previousWidth * 0.15 : 0)
    : Math.max(1.25, width * 0.4);
  const minX = Math.max(-GRAPH_LIMIT, min - pad);
  const maxX = Math.min(GRAPH_LIMIT, max + pad);

  if (method === "fixedPoint") {
    return { minX, maxX, minY: minX, maxY: maxX };
  }
  if (!latest) {
    const valuesAtSeeds = seeds.map((x) => Math.abs(problem.f(x))).filter(Number.isFinite);
    const height = Math.min(GRAPH_LIMIT, Math.max(2, ...valuesAtSeeds) * 1.2);
    return { minX, maxX, minY: -height, maxY: height };
  }

  // Fit the local curve as well as the x-axis so a narrowing bracket stays
  // readable even when f has a large or small slope.
  const ys = [0];
  for (let i = 0; i <= 8; i++) {
    const y = problem.f(minX + ((maxX - minX) * i) / 8);
    if (Number.isFinite(y)) {
      ys.push(Math.max(-GRAPH_LIMIT, Math.min(GRAPH_LIMIT, y)));
    }
  }
  const low = Math.min(...ys);
  const high = Math.max(...ys);
  const margin = Math.max(1e-10, (high - low) * 0.16);
  return { minX, maxX, minY: Math.max(-GRAPH_LIMIT, low - margin), maxY: Math.min(GRAPH_LIMIT, high + margin) };
}

function roundedRange(min: number, max: number): [number, number] {
  // Give the displayed bounds a few useful digits while rounding outward so
  // the latest construction stays in view.
  const unit = 10 ** (Math.floor(Math.log10(max - min)) - 2);
  const low = Number((Math.floor(min / unit) * unit).toPrecision(12));
  const high = Number((Math.ceil(max / unit) * unit).toPrecision(12));
  return [Math.max(-GRAPH_LIMIT, low), Math.min(GRAPH_LIMIT, high)];
}

function automaticBounds(method: Method, run: Run): GraphBounds {
  const bounds = calculateBounds(method, run);
  const [minX, maxX] = roundedRange(bounds.minX, bounds.maxX);
  const [minY, maxY] = roundedRange(bounds.minY, bounds.maxY);
  return { minX, maxX, minY, maxY };
}

function asDraft({ minX, maxX, minY, maxY }: GraphBounds): Draft {
  return { minX: String(minX), maxX: String(maxX), minY: String(minY), maxY: String(maxY) };
}

function validRange(low: string, high: string): boolean {
  const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
  const min = Number(low);
  const max = Number(high);
  return (
    decimal.test(low.trim()) &&
    decimal.test(high.trim()) &&
    min >= -GRAPH_LIMIT &&
    max <= GRAPH_LIMIT &&
    max - min >= MIN_MANUAL_SPAN
  );
}

/** View state only. Moving the camera never changes a solver's applied setup. */
export class GraphViewport {
  public readonly autoProperty = new BooleanProperty(true);
  public readonly boundsProperty: Property<GraphBounds>;
  public readonly draftProperty: Property<Draft>;
  public readonly invalidAxisProperty = new Property<"x" | "y" | null>(null);

  private readonly model: RootFindingModel;
  // While a starting value is dragged the camera stays put, so the handle
  // follows the pointer instead of the view chasing the handle.
  private held = false;

  public constructor(model: RootFindingModel) {
    this.model = model;
    const bounds = automaticBounds(model.method, model.runProperty.value);
    this.boundsProperty = new Property(bounds);
    this.draftProperty = new Property(asDraft(bounds));
    this.autoProperty.lazyLink((auto) => {
      if (auto) {
        this.fit();
      }
    });
    model.runProperty.lazyLink(() => {
      if (this.autoProperty.value && !this.held) {
        this.fit();
      }
    });
  }

  private fit(): void {
    this.publish(automaticBounds(this.model.method, this.model.runProperty.value));
  }

  private publish(bounds: GraphBounds): void {
    const current = this.boundsProperty.value;
    if (Object.keys(bounds).some((key) => bounds[key as AxisField] !== current[key as AxisField])) {
      this.boundsProperty.value = bounds;
    }
    this.draftProperty.value = asDraft(bounds);
    this.invalidAxisProperty.value = null;
  }

  /**
   * Freeze the camera while a starting value is dragged. With auto zoom on,
   * it first frames the starting values rather than the latest step, so a
   * seed the run has left behind is in reach.
   */
  public hold(held: boolean): void {
    if (held && this.autoProperty.value) {
      const run = this.model.runProperty.value;
      this.publish(automaticBounds(this.model.method, { ...run, history: [], bracket: null }));
    }
    this.held = held;
    if (!held && this.autoProperty.value) {
      this.fit();
    }
  }

  public edit(field: AxisField, value: string): void {
    this.autoProperty.value = false;
    this.draftProperty.value = { ...this.draftProperty.value, [field]: value.replaceAll("−", "-") };
    this.invalidAxisProperty.value = null;
  }

  public apply(): void {
    const { minX, maxX, minY, maxY } = this.draftProperty.value;
    const invalid = !validRange(minX, maxX) ? "x" : !validRange(minY, maxY) ? "y" : null;
    if (invalid) {
      this.invalidAxisProperty.value = invalid;
      return;
    }
    this.autoProperty.value = false;
    this.publish({ minX: Number(minX), maxX: Number(maxX), minY: Number(minY), maxY: Number(maxY) });
  }

  public reset(): void {
    this.autoProperty.value = true;
    this.fit();
  }
}
