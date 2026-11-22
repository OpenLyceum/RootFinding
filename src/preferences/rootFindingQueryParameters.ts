import { QueryStringMachine } from "scenerystack/query-string-machine";

// Defer to Joist whenever a deep link selects or filters the screens.
const rootFindingQueryParameters = {
  openBisectionByDefault: !(
    QueryStringMachine.containsKey("initialScreen") || QueryStringMachine.containsKey("screens")
  ),
};

export default rootFindingQueryParameters;
