import { QueryStringMachine } from "scenerystack/query-string-machine";
import RootFindingNamespace from "../RootFindingNamespace.js";

const rootFindingQueryParameters = QueryStringMachine.getAll({});

RootFindingNamespace.register("rootFindingQueryParameters", rootFindingQueryParameters);
