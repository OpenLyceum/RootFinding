import { RootFindingModel } from "../src/common/model/RootFindingModel.js";
import { TimeModel } from "../src/common/TimeModel.js";
import { describeDisposalLeaks } from "./helpers/memoryLeak.js";

describeDisposalLeaks([
  { name: "TimeModel", create: () => new TimeModel(), idempotentDispose: true },
  { name: "RootFindingModel", create: () => new RootFindingModel("bisection") },
]);
