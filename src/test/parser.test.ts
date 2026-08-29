import { describe, expect, it } from "vitest";
import {
  parseLine,
  parseProgram,
  ParserError,
} from "../engine/parser/parser";

describe("parseLine", () => {
  it("parses a variable declaration without an initial value", () => {
    expect(parseLine("int x;")).toEqual({
      type: "variable_declaration",
      variableType: "int",
      name: "x",
      initialValue: undefined,
    });
  });

  it("parses a variable declaration with an initial value", () => {
    expect(parseLine("int x = 5;")).toEqual({
      type: "variable_declaration",
      variableType: "int",
      name: "x",
      initialValue: 5,
    });
  });

  it("parses negative integer values", () => {
    expect(parseLine("int x = -10;")).toEqual({
      type: "variable_declaration",
      variableType: "int",
      name: "x",
      initialValue: -10,
    });
  });

  it("parses a pointer declaration without a target", () => {
    expect(parseLine("int *p;")).toEqual({
      type: "pointer_declaration",
      pointsToType: "int",
      name: "p",
      target: undefined,
    });
  });

  it("parses a pointer declaration with a target", () => {
    expect(parseLine("int *p = &x;")).toEqual({
      type: "pointer_declaration",
      pointsToType: "int",
      name: "p",
      target: "x",
    });
  });

  it("supports different pointer whitespace styles", () => {
    expect(parseLine("int* p = &x;")).toEqual({
      type: "pointer_declaration",
      pointsToType: "int",
      name: "p",
      target: "x",
    });

    expect(parseLine("int * p = &x;")).toEqual({
      type: "pointer_declaration",
      pointsToType: "int",
      name: "p",
      target: "x",
    });
  });

  it("parses a variable assignment", () => {
    expect(parseLine("x = 20;")).toEqual({
      type: "variable_assignment",
      name: "x",
      value: 20,
    });
  });

  it("parses a pointer assignment", () => {
    expect(parseLine("p = &x;")).toEqual({
      type: "pointer_assignment",
      pointerName: "p",
      target: "x",
    });
  });

  it("parses a dereference assignment", () => {
    expect(parseLine("*p = 20;")).toEqual({
      type: "dereference_assignment",
      pointerName: "p",
      value: 20,
    });
  });

  it("ignores blank lines", () => {
    expect(parseLine("")).toBeNull();
    expect(parseLine("   ")).toBeNull();
  });

  it("ignores comment-only lines", () => {
    expect(parseLine("// hello")).toBeNull();
  });

  it("removes trailing line comments", () => {
    expect(parseLine("int x = 5; // create x")).toEqual({
      type: "variable_declaration",
      variableType: "int",
      name: "x",
      initialValue: 5,
    });
  });

  it("rejects unsupported syntax", () => {
    expect(() => parseLine("int arr[5];")).toThrow(
      "Unsupported statement",
    );
  });
});

describe("parseProgram", () => {
  it("parses a complete pointer program", () => {
    const code = `int x = 5;
int y = 10;
int *p = &x;
p = &y;
*p = 20;`;

    const result = parseProgram(code);

    expect(result).toHaveLength(5);

    expect(result[0]).toEqual({
      lineNumber: 1,
      sourceLine: "int x = 5;",
      statement: {
        type: "variable_declaration",
        variableType: "int",
        name: "x",
        initialValue: 5,
      },
    });

    expect(result[2]).toEqual({
      lineNumber: 3,
      sourceLine: "int *p = &x;",
      statement: {
        type: "pointer_declaration",
        pointsToType: "int",
        name: "p",
        target: "x",
      },
    });

    expect(result[4]).toEqual({
      lineNumber: 5,
      sourceLine: "*p = 20;",
      statement: {
        type: "dereference_assignment",
        pointerName: "p",
        value: 20,
      },
    });
  });

  it("preserves real line numbers when blank lines exist", () => {
    const code = `int x = 5;

int *p = &x;

*p = 10;`;

    const result = parseProgram(code);

    expect(result.map((item) => item.lineNumber)).toEqual([
      1, 3, 5,
    ]);
  });

  it("throws ParserError with the correct source line", () => {
    const code = `int x = 5;
int arr[5];
int y = 10;`;

    expect(() => parseProgram(code)).toThrow(ParserError);

    try {
      parseProgram(code);
    } catch (error) {
      expect(error).toBeInstanceOf(ParserError);

      if (error instanceof ParserError) {
        expect(error.lineNumber).toBe(2);
        expect(error.sourceLine).toBe("int arr[5];");
      }
    }
  });
});