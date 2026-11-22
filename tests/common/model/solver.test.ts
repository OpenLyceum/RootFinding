import { describe, expect, it } from "vitest";
import { compileExpression } from "../../../src/common/model/expressions.js";
import {
  type Inputs,
  ITERATION_LIMIT,
  isBracketed,
  type Method,
  methods,
  presetInputs,
  TOLERANCE,
  validateInputs,
} from "../../../src/common/model/problems.js";
import { RootFindingModel } from "../../../src/common/model/RootFindingModel.js";
import { type Iteration, RootSolver } from "../../../src/common/model/solver.js";

function setup(method: Method, inputs: Inputs = presetInputs(method, "cubic")): RootSolver {
  const result = validateInputs(method, inputs);
  if (!("problem" in result)) {
    throw new Error("Test inputs are invalid");
  }
  return new RootSolver(method, result.problem);
}

function run(solver: RootSolver): Iteration[] {
  const history: Iteration[] = [];
  for (let i = 0; i < ITERATION_LIMIT; i++) {
    const row = solver.advance();
    if (!row) {
      break;
    }
    history.push(row);
  }
  return history;
}

describe("compiled arithmetic", () => {
  it("respects arithmetic precedence, unary signs, and right-associative exponentiation", () => {
    expect(compileExpression("-x^2 + 2^3^2 - 4/2 + 2^-2")?.(3)).toBe(501.25);
    expect(compileExpression("cos(pi) + cbrt(8) + log(e) + 2.5e-1")?.(0)).toBe(2.25);
  });

  it.each(["x; 8", "x.foo", "globalThis", "x(2)", "Math.sin(x)", "2x", "(x", "sin()", "1e500", "x".repeat(161)])(
    "rejects %s",
    (input) => {
      expect(compileExpression(input)).toBeNull();
    },
  );
});

describe("numerical methods", () => {
  it.each(methods)("solves the default cubic with %s", (method) => {
    const solver = setup(method);
    const rows = run(solver);
    expect(["exact", "converged"]).toContain(solver.status);
    expect(rows.at(-1)?.estimate.x).toBeCloseTo(1.5213797068, 6);
    expect(Math.abs(rows.at(-1)?.estimate.y ?? Infinity)).toBeLessThanOrEqual(TOLERANCE);
    if (isBracketed(method)) {
      const widths = rows.map((row) => row.size ?? Infinity);
      expect(widths).toEqual([...widths].sort((a, b) => b - a));
      for (const { bracket } of rows) {
        expect(bracket?.[0].y).toBeLessThanOrEqual(0);
        expect(bracket?.[1].y).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("halves the first Bisection bracket and shows Newton's tangent intercept", () => {
    const bisection = setup("bisection").advance();
    expect(bisection?.kind).toBe("midpoint");
    expect(bisection?.estimate.x).toBe(1.5);
    expect(bisection?.size).toBe(0.5);
    const newton = setup("newton").advance();
    expect(newton?.kind).toBe("tangent");
    expect(newton?.estimate.x).toBeCloseTo(1.5 + 0.125 / 5.75, 12);
  });

  it("keeps the same high endpoint when False Position stalls", () => {
    const solver = setup("falsePosition", presetInputs("falsePosition", "stall"));
    const rows = run(solver);
    expect(rows).toHaveLength(ITERATION_LIMIT);
    expect(rows.every((row) => row.bracket?.[1].x === 2)).toBe(true);
    expect(solver.status).toBe("limit");
  });

  it("uses both Brent interpolation methods and falls back to bisection", () => {
    const rows = [...run(setup("brent")), ...run(setup("brent", presetInputs("brent", "stall")))];
    expect(new Set(rows.map((row) => row.kind))).toEqual(new Set(["secant", "inverseQuadratic", "midpoint"]));
  });

  it("rejects an invalid bracket, accepts an exact endpoint, and stops at a discontinuity", () => {
    const initial = presetInputs("bisection", "cubic");
    expect(setup("bisection", { ...initial, first: "2", second: "3" }).status).toBe("invalidBracket");
    const endpoint = setup("bisection", { ...initial, function: "x - 2" });
    expect(endpoint.status).toBe("exact");
    expect(endpoint.initial?.estimate.x).toBe(2);
    const pole = setup("bisection", { ...initial, first: "-1", second: "1", function: "1/x" });
    expect(pole.advance()).toBeNull();
    expect(pole.status).toBe("undefined");
  });

  it("stops at unusable slopes for Newton and Secant", () => {
    const newton = setup("newton", { ...presetInputs("newton", "repeated"), first: "1", function: "(x - 1)^2 + 1" });
    const secant = setup("secant", {
      ...presetInputs("secant", "cubic"),
      function: "x^2 + 1",
      first: "-1",
      second: "1",
    });
    for (const solver of [newton, secant]) {
      expect(solver.advance()).toBeNull();
      expect(solver.status).toBe("zeroSlope");
    }
  });

  it.each([
    ["newton", "newtonCycle"],
    ["fixedPoint", "fixedCycle"],
  ] as const)("shows a cycle in %s", (method, preset) => {
    const solver = setup(method, presetInputs(method, preset));
    const rows = run(solver);
    expect(rows.map((row) => row.estimate.x)).toEqual(method === "newton" ? [1, 0] : [2, 0]);
    expect(solver.status).toBe("stagnation");
  });

  it("reports when the map's fixed point misses the function root", () => {
    const solver = setup("fixedPoint", { ...presetInputs("fixedPoint", "cubic"), function: "x - 10", auxiliary: "2" });
    expect(solver.advance()?.estimate.y).toBe(-8);
    expect(solver.status).toBe("inconsistent");
  });

  it("rejects edits without replacing the current run", () => {
    const model = new RootFindingModel("bisection");
    model.stepOnce();
    const previous = model.runProperty.value;
    model.edit("function", "sin(");
    expect(model.apply()).toBe(false);
    expect(model.runProperty.value).toBe(previous);
    expect(model.invalidFieldProperty.value).toBe("function");
    model.edit("function", "x - 1.5");
    expect(model.apply()).toBe(true);
    expect(model.runProperty.value.history).toHaveLength(0);
    model.stepOnce();
    expect(model.runProperty.value.status).toBe("exact");
    model.restart();
    expect(model.runProperty.value.status).toBe("ready");
    model.reset();
    expect(model.inputsProperty.value.function).toBe("x^3 - x - 2");
    model.dispose();
  });
});
