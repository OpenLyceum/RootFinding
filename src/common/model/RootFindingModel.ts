import { Property } from "scenerystack/axon";
import type { TModel } from "scenerystack/joist";
import { TimeModel } from "../TimeModel.js";
import {
  type Field,
  type Inputs,
  type Method,
  type Preset,
  type Problem,
  presetInputs,
  validateInputs,
} from "./problems.js";
import { type Iteration, RootSolver, type Status } from "./solver.js";

const SECONDS_PER_STEP = 0.9;
type Run = { problem: Problem; history: readonly Iteration[]; status: Status; bracket: RootSolver["bracket"] };

export class RootFindingModel implements TModel {
  public readonly timer = new TimeModel();
  public readonly inputsProperty: Property<Inputs>;
  public readonly appliedInputsProperty: Property<Inputs>;
  public readonly runProperty: Property<Run>;
  public readonly presetProperty = new Property<Preset | "custom">("cubic");
  public readonly invalidFieldProperty = new Property<Field | null>(null);
  private solver: RootSolver;
  private nextStepTime = SECONDS_PER_STEP;

  public readonly method: Method;

  public constructor(method: Method) {
    this.method = method;
    const inputs = presetInputs(method, "cubic");
    const result = validateInputs(method, inputs);
    if (!("problem" in result)) {
      throw new Error("Invalid default preset");
    }
    this.inputsProperty = new Property(inputs);
    this.appliedInputsProperty = new Property(inputs);
    this.solver = new RootSolver(method, result.problem);
    this.runProperty = new Property(this.snapshot(result.problem));
    this.presetProperty.lazyLink((preset) => {
      if (preset !== "custom") {
        this.loadPreset(preset);
      }
    });
  }

  private snapshot(
    problem: Problem,
    history: readonly Iteration[] = this.solver.initial ? [this.solver.initial] : [],
  ): Run {
    return { problem, history, status: this.solver.status, bracket: this.solver.bracket };
  }

  private loadPreset(preset: Preset): void {
    this.inputsProperty.value = presetInputs(this.method, preset);
    this.apply();
  }

  public edit(field: Field, value: string): void {
    this.presetProperty.value = "custom";
    this.inputsProperty.value = { ...this.inputsProperty.value, [field]: value };
    if (this.invalidFieldProperty.value === field) {
      this.invalidFieldProperty.value = null;
    }
  }

  public apply(): boolean {
    const inputs = this.inputsProperty.value;
    const result = validateInputs(this.method, inputs);
    if ("field" in result) {
      this.invalidFieldProperty.value = result.field;
      return false;
    }
    this.invalidFieldProperty.value = null;
    this.appliedInputsProperty.value = inputs;
    this.start(result.problem);
    return true;
  }

  private start(problem: Problem): void {
    this.timer.reset();
    this.nextStepTime = SECONDS_PER_STEP;
    this.solver = new RootSolver(this.method, problem);
    this.runProperty.value = this.snapshot(problem);
  }

  /**
   * Move one starting value of the applied setup, as a drag on the graph does,
   * and replay the run to the same step so the student sees how the iterations
   * respond. Unapplied edits to the other fields are left pending.
   */
  public moveStart(field: "first" | "second", value: number): void {
    const text = String(value);
    const applied = { ...this.appliedInputsProperty.value, [field]: text };
    const result = validateInputs(this.method, applied);
    if (!("problem" in result)) {
      return;
    }
    const steps = this.runProperty.value.history.filter((row) => row.kind !== "initial").length;
    this.presetProperty.value = "custom";
    this.inputsProperty.value = { ...this.inputsProperty.value, [field]: text };
    this.appliedInputsProperty.value = applied;
    this.invalidFieldProperty.value = null;
    this.timer.reset();
    this.nextStepTime = SECONDS_PER_STEP;
    this.solver = new RootSolver(this.method, result.problem);
    const history = this.solver.initial ? [this.solver.initial] : [];
    for (let i = 0; i < steps; i++) {
      const iteration = this.solver.advance();
      if (!iteration) {
        break;
      }
      history.push(iteration);
    }
    this.runProperty.value = this.snapshot(result.problem, history);
  }

  public restart(): void {
    this.start(this.runProperty.value.problem);
  }

  public stepOnce(): void {
    const { problem, history, status } = this.runProperty.value;
    if (status !== "ready" && status !== "working") {
      return;
    }
    const iteration = this.solver.advance();
    this.runProperty.value = this.snapshot(problem, iteration ? [...history, iteration] : history);
    if (this.solver.status !== "working") {
      this.pause();
    }
  }

  public step(dt: number): void {
    this.timer.step(dt);
    if (this.timer.isPlayingProperty.value && this.timer.timeProperty.value >= this.nextStepTime) {
      this.nextStepTime = this.timer.timeProperty.value + SECONDS_PER_STEP;
      this.stepOnce();
    }
  }

  public pause(): void {
    this.timer.isPlayingProperty.value = false;
  }

  public reset(): void {
    if (this.presetProperty.value === "cubic") {
      this.loadPreset("cubic");
    } else {
      this.presetProperty.value = "cubic";
    }
  }

  public dispose(): void {
    this.invalidFieldProperty.dispose();
    this.presetProperty.dispose();
    this.runProperty.dispose();
    this.appliedInputsProperty.dispose();
    this.inputsProperty.dispose();
    this.timer.dispose();
  }
}
