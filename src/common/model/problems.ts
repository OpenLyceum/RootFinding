import type { Expression } from "./expressions.js";
import { compileExpression } from "./expressions.js";

export type Method = "bisection" | "newton" | "falsePosition" | "secant" | "fixedPoint" | "brent";
export type Field = "function" | "auxiliary" | "first" | "second";
export type Inputs = Record<Field, string>;
/**
 * A validated setup. For Newton's method `auxiliary` is f′: the typed one, or a numerical
 * derivative when the field is left blank (`numericDerivative`). `derivativeMismatch` flags a
 * typed f′ that disagrees with the slope of f near the starting guess.
 */
export type Problem = {
  f: Expression;
  auxiliary: Expression | null;
  first: number;
  second: number;
  numericDerivative?: boolean;
  derivativeMismatch?: boolean;
};

export const TOLERANCE = 1e-6;
export const ITERATION_LIMIT = 100;

export function isBracketed(method: Method): boolean {
  return method === "bisection" || method === "falsePosition" || method === "brent";
}

export function usesAuxiliary(method: Method): boolean {
  return method === "newton" || method === "fixedPoint";
}

/** Central-difference slope of f, with a step scaled to x. */
export function numericalDerivative(f: Expression): Expression {
  return (x) => {
    const h = 1e-6 * Math.max(1, Math.abs(x));
    return (f(x + h) - f(x - h)) / (2 * h);
  };
}

/** True when a typed f′ disagrees with the numerical slope of f somewhere near x₀. */
function mismatched(f: Expression, derivative: Expression, x0: number): boolean {
  const slope = numericalDerivative(f);
  return [-1, -0.5, 0, 0.5, 1].some((offset) => {
    const x = x0 + offset;
    const typed = derivative(x);
    const numeric = slope(x);
    return (
      Number.isFinite(typed) &&
      Number.isFinite(numeric) &&
      Math.abs(typed - numeric) > 1e-3 * Math.max(1, Math.abs(numeric))
    );
  });
}

export function validateInputs(method: Method, inputs: Inputs): { problem: Problem } | { field: Field } {
  const f = compileExpression(inputs.function);
  if (!f) {
    return { field: "function" };
  }
  // Newton's f′ may be left blank: the solver then differentiates f numerically.
  const numericDerivative = method === "newton" && inputs.auxiliary.trim() === "";
  const auxiliary = usesAuxiliary(method)
    ? numericDerivative
      ? numericalDerivative(f)
      : compileExpression(inputs.auxiliary)
    : null;
  if (usesAuxiliary(method) && !auxiliary) {
    return { field: "auxiliary" };
  }
  const first = parseStartingValue(inputs.first);
  if (!Number.isFinite(first)) {
    return { field: "first" };
  }
  const second = usesAuxiliary(method) ? first : parseStartingValue(inputs.second);
  if (!Number.isFinite(second)) {
    return { field: "second" };
  }
  const derivativeMismatch =
    method === "newton" && !numericDerivative && auxiliary !== null && mismatched(f, auxiliary, first);
  return { problem: { f, auxiliary, first, second, numericDerivative, derivativeMismatch } };
}

function parseStartingValue(source: string): number {
  const text = source.trim().replaceAll("−", "-");
  const value = Number(text);
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text) && Math.abs(value) <= 1e6 ? value : NaN;
}

const presetNames = [
  "cubic",
  "cosine",
  "exponential",
  "stall",
  "repeated",
  "newtonCycle",
  "overshoot",
  "nearFlat",
  "fixedCycle",
  "fixedDiverge",
] as const;
export type Preset = (typeof presetNames)[number];

/**
 * Each method's examples: two well-behaved roots, then cases that show how it can fail or
 * slow down. The nearly fixed endpoint is False Position's own weakness.
 */
export function presetsFor(method: Method): readonly Preset[] {
  if (method === "newton") {
    return ["cubic", "cosine", "repeated", "newtonCycle", "overshoot", "nearFlat"];
  }
  if (method === "fixedPoint") {
    return ["cubic", "cosine", "fixedCycle", "fixedDiverge"];
  }
  if (method === "falsePosition") {
    return ["cubic", "cosine", "exponential", "stall"];
  }
  return ["cubic", "cosine", "exponential"];
}

// Keep the expressions visible in the input panel, including those for presets.
export function presetInputs(method: Method, preset: Preset): Inputs {
  const auxiliary = method === "newton" ? "3*x^2 - 1" : "cbrt(x + 2)";
  switch (preset) {
    case "cubic":
      return { function: "x^3 - x - 2", auxiliary, first: usesAuxiliary(method) ? "1.5" : "1", second: "2" };
    case "cosine":
      return {
        function: "cos(x) - x",
        auxiliary: method === "newton" ? "-sin(x) - 1" : "cos(x)",
        first: usesAuxiliary(method) ? "0.5" : "0",
        second: "1",
      };
    case "stall":
      return { function: "x^10 - 1", auxiliary: "", first: "0", second: "2" };
    case "repeated":
      return { function: "(x - 1)^2", auxiliary: "2*(x - 1)", first: "2", second: "" };
    case "newtonCycle":
      return { function: "x^3 - 2*x + 2", auxiliary: "3*x^2 - 2", first: "0", second: "" };
    case "fixedCycle":
      return { function: "2*x - 2", auxiliary: "2 - x", first: "0", second: "" };
    case "exponential":
      return { function: "exp(x) - 10", auxiliary: "exp(x)", first: usesAuxiliary(method) ? "1" : "0", second: "4" };
    case "overshoot":
      // Past |x₀| ≈ 1.39 each tangent lands farther out on the other side.
      return { function: "atan(x)", auxiliary: "1/(1 + x^2)", first: "1.5", second: "" };
    case "nearFlat":
      // f′ is almost zero at x₀, so the first tangent shoots far away.
      return { function: "x^3 - x - 2", auxiliary: "3*x^2 - 1", first: "0.6", second: "" };
    case "fixedDiverge":
      // The same root as the cubic, but |g′| = 3x² > 1 there, so the cobweb spirals out.
      return { function: "x^3 - x - 2", auxiliary: "x^3 - 2", first: "1.55", second: "" };
  }
}
