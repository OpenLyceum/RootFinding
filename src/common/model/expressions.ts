export type Expression = (x: number) => number;

const functions = new Map<string, Expression>([
  ["abs", Math.abs],
  ["sqrt", Math.sqrt],
  ["cbrt", Math.cbrt],
  ["exp", Math.exp],
  ["log", Math.log],
  ["sin", Math.sin],
  ["cos", Math.cos],
  ["tan", Math.tan],
]);

// The size bound also bounds parser recursion and evaluator depth.
const MAX_LENGTH = 160;
const tokenPattern = /(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z]+|[()+*/^-]/y;
const operators = new Map<string, { priority: number; evaluate: (a: number, b: number) => number }>([
  ["+", { priority: 1, evaluate: (a, b) => a + b }],
  ["-", { priority: 1, evaluate: (a, b) => a - b }],
  ["*", { priority: 2, evaluate: (a, b) => a * b }],
  ["/", { priority: 2, evaluate: (a, b) => a / b }],
  ["^", { priority: 4, evaluate: (a, b) => a ** b }],
]);

export function compileExpression(source: string): Expression | null {
  if (source.length > MAX_LENGTH) {
    return null;
  }
  const input = source.replaceAll("−", "-");
  const tokens: string[] = [];
  let offset = 0;
  while (offset < input.length) {
    if (/\s/.test(input.charAt(offset))) {
      offset++;
      continue;
    }
    tokenPattern.lastIndex = offset;
    const match = tokenPattern.exec(input);
    if (!match) {
      return null;
    }
    tokens.push(match[0]);
    offset = tokenPattern.lastIndex;
  }

  let index = 0;
  function consume(expected: string): void {
    if (tokens[index++] !== expected) {
      throw new SyntaxError("Expected a closing parenthesis");
    }
  }
  function primary(): Expression {
    const token = tokens[index++];
    if (token === "+" || token === "-") {
      const operand = parse(3);
      return token === "-" ? (x) => -operand(x) : operand;
    }
    if (token === "(") {
      const inside = parse(1);
      consume(")");
      return inside;
    }
    if (token === "x") {
      return (x) => x;
    }
    if (token === "pi" || token === "e") {
      return () => (token === "pi" ? Math.PI : Math.E);
    }
    const mathFunction = token && functions.get(token);
    if (mathFunction) {
      consume("(");
      const argument = parse(1);
      consume(")");
      return (x) => mathFunction(argument(x));
    }
    const value = Number(token);
    if (!Number.isFinite(value)) {
      throw new SyntaxError("Expected a finite number or supported expression");
    }
    return () => value;
  }
  function parse(minimumPriority: number): Expression {
    let left = primary();
    for (;;) {
      const token = tokens[index] ?? "";
      const operator = operators.get(token);
      if (!operator || operator.priority < minimumPriority) {
        return left;
      }
      index++;
      const previous = left;
      const right = parse(operator.priority + (token === "^" ? 0 : 1));
      left = (x) => operator.evaluate(previous(x), right(x));
    }
  }
  try {
    const result = parse(1);
    return index === tokens.length ? result : null;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
}
