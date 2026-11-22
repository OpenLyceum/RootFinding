import type { Expression } from "./expressions.js";
import { compileExpression } from "./expressions.js";

export type Method = "bisection" | "newton" | "falsePosition" | "secant" | "fixedPoint" | "brent";
export type Field = "function" | "auxiliary" | "first" | "second";
export type Inputs = Record<Field, string>;
export type Problem = { f: Expression; auxiliary: Expression | null; first: number; second: number };

export const TOLERANCE = 1e-6;
export const ITERATION_LIMIT = 100;

export function isBracketed(method: Method): boolean {
  return method === "bisection" || method === "falsePosition" || method === "brent";
}

export function usesAuxiliary(method: Method): boolean {
  return method === "newton" || method === "fixedPoint";
}

export function validateInputs(method: Method, inputs: Inputs): { problem: Problem } | { field: Field } {
  const f = compileExpression(inputs.function);
  if (!f) {
    return { field: "function" };
  }
  const auxiliary = usesAuxiliary(method) ? compileExpression(inputs.auxiliary) : null;
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
  return { problem: { f, auxiliary, first, second } };
}

function parseStartingValue(source: string): number {
  const text = source.trim().replaceAll("−", "-");
  const value = Number(text);
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text) && Math.abs(value) <= 1e6 ? value : NaN;
}

const presetNames = ["cubic", "cosine", "stall", "repeated", "newtonCycle", "fixedCycle"] as const;
export type Preset = (typeof presetNames)[number];

export function presetsFor(method: Method): readonly Preset[] {
  if (method === "newton") {
    return ["cubic", "cosine", "repeated", "newtonCycle"];
  }
  if (method === "fixedPoint") {
    return ["cubic", "cosine", "fixedCycle"];
  }
  return ["cubic", "cosine", "stall"];
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
  }
}
