import { ITERATION_LIMIT, isBracketed, type Method, type Problem, TOLERANCE } from "./problems.js";

type Point = { x: number; y: number };
type Bracket = readonly [Point, Point];
type Proposal = { x: number; kind: StepKind; from?: Point; second?: Point; third?: Point };
export type Status =
  | "ready"
  | "working"
  | "exact"
  | "converged"
  | "invalidBracket"
  | "undefined"
  | "zeroSlope"
  | "stagnation"
  | "limit"
  | "inconsistent";
type StepKind = "initial" | "midpoint" | "tangent" | "chord" | "secant" | "cobweb" | "inverseQuadratic";
export type Iteration = {
  estimate: Point;
  kind: StepKind;
  size: number | null;
  bracket: Bracket | null;
  from: Point | null;
  second: Point | null;
  third: Point | null;
};

function ordered(a: Point, b: Point): Bracket {
  return a.x <= b.x ? [a, b] : [b, a];
}

function sameSign(a: Point, b: Point): boolean {
  return a.y < 0 === b.y < 0;
}

function midpoint(a: Point, b: Point): number {
  return a.x / 2 + b.x / 2;
}

function secant(a: Point, b: Point): number {
  const difference = b.y - a.y;
  const ratio = Number.isFinite(difference) ? b.y / difference : b.y / 2 / (b.y / 2 - a.y / 2);
  return b.x - (b.x - a.x) * ratio;
}

function inverseQuadratic(a: Point, b: Point, c: Point): number {
  return (
    a.x * (b.y / (a.y - b.y)) * (c.y / (a.y - c.y)) +
    b.x * (a.y / (b.y - a.y)) * (c.y / (b.y - c.y)) +
    c.x * (a.y / (c.y - a.y)) * (b.y / (c.y - b.y))
  );
}

export class RootSolver {
  private a: Point;
  private b: Point;
  private c: Point;
  private d: Point;
  private bisected = true;
  private last: Point | null = null;
  private count = 0;
  public status: Status = "ready";
  public bracket: Bracket | null = null;
  public initial: Iteration | null = null;

  private readonly method: Method;
  private readonly problem: Problem;

  public constructor(method: Method, problem: Problem) {
    this.method = method;
    this.problem = problem;
    this.a = this.evaluate(problem.first);
    this.b = this.evaluate(problem.second);
    this.c = this.a;
    this.d = this.a;
    if (isBracketed(method) && !(this.a.x < this.b.x)) {
      this.status = "invalidBracket";
      return;
    }
    // In fixed-point mode, a zero of f alone does not establish that g fixes it.
    const exact = [this.a, this.b].find(
      (point) => point.y === 0 && (method !== "fixedPoint" || problem.auxiliary?.(point.x) === point.x),
    );
    if (exact) {
      this.status = "exact";
      this.initial = {
        estimate: exact,
        kind: "initial",
        size: null,
        bracket: null,
        from: null,
        second: null,
        third: null,
      };
      return;
    }
    if (!(Number.isFinite(this.a.y) && Number.isFinite(this.b.y))) {
      this.status = "undefined";
      return;
    }
    if (isBracketed(method)) {
      if (sameSign(this.a, this.b)) {
        this.status = "invalidBracket";
        return;
      }
      this.bracket = [this.a, this.b];
      if (method === "brent" && Math.abs(this.a.y) < Math.abs(this.b.y)) {
        [this.a, this.b] = [this.b, this.a];
      }
      this.c = this.a;
      this.d = this.a;
    }
  }

  private evaluate(x: number): Point {
    return { x, y: this.problem.f(x) };
  }

  private brentProposal(): Proposal {
    const { a, b, c, d } = this;
    const quadratic = a.y !== c.y && b.y !== c.y;
    const interpolated = quadratic ? inverseQuadratic(a, b, c) : secant(a, b);
    // Accept interpolation only between the best estimate and the point one
    // quarter of the way from the opposite endpoint toward that estimate.
    const bound = a.x * 0.75 + b.x * 0.25;
    const previousMovement = this.bisected ? Math.abs(b.x - c.x) : Math.abs(c.x - d.x);
    const inside = Math.min(bound, b.x) < interpolated && interpolated < Math.max(bound, b.x);
    this.bisected = !inside || Math.abs(interpolated - b.x) >= previousMovement / 2 || previousMovement < TOLERANCE;
    this.d = c;
    this.c = b;
    if (this.bisected) {
      return { x: midpoint(a, b), kind: "midpoint" };
    }
    return quadratic
      ? { x: interpolated, kind: "inverseQuadratic", from: a, second: b, third: c }
      : { x: interpolated, kind: "secant", from: a, second: b };
  }

  private propose(): Proposal | null {
    const { a, b } = this;
    switch (this.method) {
      case "bisection":
        return { x: midpoint(a, b), kind: "midpoint" };
      case "falsePosition":
      case "secant":
        if (a.y === b.y || a.x === b.x) {
          this.status = "zeroSlope";
          return null;
        }
        return { x: secant(a, b), kind: this.method === "secant" ? "secant" : "chord", from: a, second: b };
      case "newton": {
        const slope = this.problem.auxiliary?.(b.x) ?? NaN;
        if (!Number.isFinite(slope) || slope === 0) {
          this.status = Number.isFinite(slope) ? "zeroSlope" : "undefined";
          return null;
        }
        return { x: b.x - b.y / slope, kind: "tangent", from: b };
      }
      case "fixedPoint":
        return { x: this.problem.auxiliary?.(b.x) ?? NaN, kind: "cobweb", from: b };
      case "brent":
        return this.brentProposal();
    }
  }

  private retainBracket(estimate: Point): void {
    if (estimate.y === 0) {
      this.a = estimate;
      this.b = estimate;
    } else if (sameSign(this.a, estimate)) {
      this.a = estimate;
    } else {
      this.b = estimate;
    }
    if (this.method === "brent" && Math.abs(this.a.y) < Math.abs(this.b.y)) {
      [this.a, this.b] = [this.b, this.a];
    }
    this.bracket = ordered(this.a, this.b);
  }

  private determineStatus(estimate: Point, size: number, stationary: boolean): Status {
    const fixedResidual = this.method === "fixedPoint" ? (this.problem.auxiliary?.(estimate.x) ?? NaN) - estimate.x : 0;
    const residual = Math.abs(estimate.y);
    if (!Number.isFinite(fixedResidual)) {
      return "undefined";
    }
    if (residual === 0 && fixedResidual === 0) {
      return "exact";
    }
    if (size <= TOLERANCE && residual <= TOLERANCE && Math.abs(fixedResidual) <= TOLERANCE) {
      return "converged";
    }
    if (this.method === "fixedPoint" && fixedResidual === 0 && residual > TOLERANCE) {
      return "inconsistent";
    }
    if (stationary || (!this.bracket && this.last?.x === estimate.x)) {
      return "stagnation";
    }
    return this.count >= ITERATION_LIMIT ? "limit" : "working";
  }

  public advance(): Iteration | null {
    if (this.status !== "ready" && this.status !== "working") {
      return null;
    }
    const proposal = this.propose();
    if (!proposal) {
      return null;
    }
    const { x, kind, from = null, second = null, third = null } = proposal;
    const estimate = this.evaluate(x);
    if (!(Number.isFinite(x) && Number.isFinite(estimate.y))) {
      this.status = "undefined";
      return null;
    }
    const { a, b } = this;
    const stationary = x === b.x || (this.bracket !== null && x === a.x);
    if (this.bracket) {
      this.retainBracket(estimate);
    } else {
      this.a = b;
      this.b = estimate;
    }
    const size = this.bracket ? this.bracket[1].x - this.bracket[0].x : Math.abs(x - b.x);
    this.count++;
    this.status = this.determineStatus(estimate, size, stationary);
    this.last = b;
    return { estimate, kind, size, bracket: this.bracket, from, second, third };
  }
}
