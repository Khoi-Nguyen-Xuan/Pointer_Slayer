import { describe, expect, it } from "vitest";
import { parseLine, parseProgram, ParserError } from "../engine/parser/parser";
import { PARSER_PATTERNS } from "../engine/parser/patterns";
import type { Statement } from "../models/statement";

// One example for every saved pattern, including aliases that recognize the
// same syntax. Expected statements describe C operations independently of
// which regex wins the parser's first-match ordering.
const cases = {
  variableDeclaration: {
    code: "int x = 5;",
    expected: { type: "declaration", variableType: "int", name: "x", pointerDepth: 0, initializer: { kind: "literal", value: 5 } },
  },
  variableCopyDeclaration: {
    code: "int x = y;",
    expected: { type: "declaration", variableType: "int", name: "x", pointerDepth: 0, initializer: { kind: "read", sourceName: "y", dereferenceDepth: 0 } },
  },
  pointerDeclaration: {
    code: "int *p = &x;",
    expected: { type: "declaration", variableType: "int", name: "p", pointerDepth: 1, initializer: { kind: "address_of", target: "x" } },
  },
  pointerCopyDeclaration: {
    code: "int *p = q;",
    expected: { type: "declaration", variableType: "int", name: "p", pointerDepth: 1, initializer: { kind: "read", sourceName: "q", dereferenceDepth: 0 } },
  },
  variableAssignment: {
    code: "x = 10;",
    expected: { type: "assignment", destination: { name: "x", dereferenceDepth: 0 }, expression: { kind: "literal", value: 10 } },
  },
  variableCopyAssignment: {
    code: "x = y;",
    expected: { type: "assignment", destination: { name: "x", dereferenceDepth: 0 }, expression: { kind: "read", sourceName: "y", dereferenceDepth: 0 } },
  },
  pointerAssignment: {
    code: "p = &x;",
    expected: { type: "assignment", destination: { name: "p", dereferenceDepth: 0 }, expression: { kind: "address_of", target: "x" } },
  },
  dereferenceAssignment: {
    code: "*p = 20;",
    expected: { type: "assignment", destination: { name: "p", dereferenceDepth: 1 }, expression: { kind: "literal", value: 20 } },
  },
  pointerCopyAssignment: {
    code: "p = q;",
    expected: { type: "assignment", destination: { name: "p", dereferenceDepth: 0 }, expression: { kind: "read", sourceName: "q", dereferenceDepth: 0 } },
  },
  doublePointerDeclarationV1: {
    code: "int **pp = &p;",
    expected: { type: "declaration", variableType: "int", name: "pp", pointerDepth: 2, initializer: { kind: "address_of", target: "p" } },
  },
  doublePointerDeclarationV2: {
    code: "int **pp = qq;",
    expected: { type: "declaration", variableType: "int", name: "pp", pointerDepth: 2, initializer: { kind: "read", sourceName: "qq", dereferenceDepth: 0 } },
  },
  doublePointerAssignmentV1: {
    code: "pp = &q;",
    expected: { type: "assignment", destination: { name: "pp", dereferenceDepth: 0 }, expression: { kind: "address_of", target: "q" } },
  },
  doublePointerAssignmentV2: {
    code: "pp = qq;",
    expected: { type: "assignment", destination: { name: "pp", dereferenceDepth: 0 }, expression: { kind: "read", sourceName: "qq", dereferenceDepth: 0 } },
  },
  doublePointerFirstDereferenceV1: {
    code: "*pp = &y;",
    expected: { type: "assignment", destination: { name: "pp", dereferenceDepth: 1 }, expression: { kind: "address_of", target: "y" } },
  },
  doublePointerFirstDereferenceV2: {
    code: "*pp = q;",
    expected: { type: "assignment", destination: { name: "pp", dereferenceDepth: 1 }, expression: { kind: "read", sourceName: "q", dereferenceDepth: 0 } },
  },
  doublePointerSecondDereferenceV1: {
    code: "**pp = 10;",
    expected: { type: "assignment", destination: { name: "pp", dereferenceDepth: 2 }, expression: { kind: "literal", value: 10 } },
  },
  doublePointerSecondDereferenceV2: {
    code: "**pp = y;",
    expected: { type: "assignment", destination: { name: "pp", dereferenceDepth: 2 }, expression: { kind: "read", sourceName: "y", dereferenceDepth: 0 } },
  },
  doublePointerSecondDereferenceV3: {
    code: "**pp = *p;",
    expected: { type: "assignment", destination: { name: "pp", dereferenceDepth: 2 }, expression: { kind: "read", sourceName: "p", dereferenceDepth: 1 } },
  },
  copyInnerPointerDeclaration: {
    code: "int *q = *pp;",
    expected: { type: "declaration", variableType: "int", name: "q", pointerDepth: 1, initializer: { kind: "read", sourceName: "pp", dereferenceDepth: 1 } },
  },
  copyInnerPointerAssignment: {
    code: "q = *pp;",
    expected: { type: "assignment", destination: { name: "q", dereferenceDepth: 0 }, expression: { kind: "read", sourceName: "pp", dereferenceDepth: 1 } },
  },
  DeclareInnerPointerSecondDereference: {
    code: "int y = **pp;",
    expected: { type: "declaration", variableType: "int", name: "y", pointerDepth: 0, initializer: { kind: "read", sourceName: "pp", dereferenceDepth: 2 } },
  },
  AssignInnerPointerSecondDereference: {
    code: "y = **pp;",
    expected: { type: "assignment", destination: { name: "y", dereferenceDepth: 0 }, expression: { kind: "read", sourceName: "pp", dereferenceDepth: 2 } },
  },
} satisfies Record<keyof typeof PARSER_PATTERNS, { code: string; expected: Statement }>;

describe("parseLine", () => {
  for (const key of Object.keys(cases) as (keyof typeof cases)[]) {
    const { code, expected } = cases[key];
    it(`parses ${key}: ${code}`, () => {
      expect(PARSER_PATTERNS[key].test(code)).toBe(true);
      expect(parseLine(code)).toEqual(expected);
    });
  }

  it.each([
    ["int x;", "x", 0],
    ["int *p;", "p", 1],
    ["int **pp;", "pp", 2],
  ])("preserves the declared type without an initializer: %s", (code, name, pointerDepth) => {
    expect(parseLine(code)).toEqual({
      type: "declaration", variableType: "int", name, pointerDepth, initializer: undefined,
    });
  });

  it.each(["int* p = &x;", "  int * p=& x;  ", "int\t*p = &x; // comment"])("supports whitespace and trailing comments: %s", (code) => {
    expect(parseLine(code)).toEqual(cases.pointerDeclaration.expected);
  });

  it("supports spaces between dereference operators and identifiers", () => {
    expect(parseLine(" \t* * pp = * p ; // copy integer")).toEqual(cases.doublePointerSecondDereferenceV3.expected);
    expect(parseLine("int * * pp = & p;")).toEqual(cases.doublePointerDeclarationV1.expected);
  });

  it.each([0, -10, 10])("preserves numeric values: %s", (value) => {
    const literal = value > 0 ? `+${value}` : String(value);
    expect(parseLine(`int x = ${literal};`)).toEqual({
      type: "declaration", variableType: "int", name: "x", pointerDepth: 0,
      initializer: { kind: "literal", value },
    });
    expect(parseLine(`**pp = ${literal};`)).toEqual({
      type: "assignment", destination: { name: "pp", dereferenceDepth: 2 },
      expression: { kind: "literal", value },
    });
  });

  it("does not treat an identifier beginning with int as a declaration", () => {
    expect(parseLine("inty = **pp;")).toEqual({
      type: "assignment", destination: { name: "inty", dereferenceDepth: 0 },
      expression: { kind: "read", sourceName: "pp", dereferenceDepth: 2 },
    });
    expect(PARSER_PATTERNS.DeclareInnerPointerSecondDereference.test("inty = **pp;")).toBe(false);
  });

  it("leaves declaration lookup and type compatibility to the simulator", () => {
    expect(parseLine("int **pp = p;")).toEqual({
      type: "declaration", variableType: "int", name: "pp", pointerDepth: 2,
      initializer: { kind: "read", sourceName: "p", dereferenceDepth: 0 },
    });
  });

  it.each(["", "  \t", "// comment", "  // comment"])("ignores blank and comment lines: %s", (code) => {
    expect(parseLine(code)).toBeNull();
  });

  it.each(["int arr[5];", "int ***ppp;", "***pp = 10;", "int **pp = &;", "**pp = ;", "int x = 1; x = 2;", "**pp = 10", "x = y + 1;"])("rejects unsupported syntax: %s", (code) => {
    expect(() => parseLine(code)).toThrow("Unsupported statement");
  });
});

describe("parseProgram", () => {
  it("preserves statements, comments, and original line numbers with CRLF input", () => {
    const result = parseProgram("// start\r\nint x = 5;\r\n\r\n int *p = &x; // pointer\r\nint **pp = &p;\r\n**pp = *p;");
    expect(result).toEqual([
      { lineNumber: 2, sourceLine: "int x = 5;", statement: cases.variableDeclaration.expected },
      { lineNumber: 4, sourceLine: "int *p = &x; // pointer", statement: cases.pointerDeclaration.expected },
      { lineNumber: 5, sourceLine: "int **pp = &p;", statement: cases.doublePointerDeclarationV1.expected },
      { lineNumber: 6, sourceLine: "**pp = *p;", statement: cases.doublePointerSecondDereferenceV3.expected },
    ]);
  });

  it("returns no statements for a blank or comment-only program", () => {
    expect(parseProgram("\n // comment\n")).toEqual([]);
  });

  it("reports the original line and source on syntax errors", () => {
    const code = "int x = 5;\n\n  int arr[5]; // unsupported\nint y = 10;";
    expect(() => parseProgram(code)).toThrow(ParserError);
    expect(() => parseProgram(code)).toThrow(expect.objectContaining({
      lineNumber: 3,
      sourceLine: "int arr[5]; // unsupported",
      message: "Unsupported statement: int arr[5];",
    }));
  });
});
