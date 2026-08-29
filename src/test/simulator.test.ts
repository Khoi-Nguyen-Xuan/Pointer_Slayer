import { describe, expect, it } from "vitest";

import { parseProgram } from "../engine/parser/parser";
import {
  simulateProgram,
  SimulationError,
} from "../engine/simulator/simulator";

describe("simulateProgram", () => {
  it("creates variables with deterministic memory addresses", () => {
    const code = `int x = 5;
int y = 10;`;

    const parsed = parseProgram(code);
    const result = simulateProgram(parsed);

    expect(result.steps).toHaveLength(2);

    const finalMemory = result.steps[1].memory;

    expect(finalMemory.cells).toEqual([
      {
        name: "x",
        dataType: "int",
        address: 0x1000,
        value: 5,
      },
      {
        name: "y",
        dataType: "int",
        address: 0x1004,
        value: 10,
      },
    ]);
  });

  it("creates a pointer that stores the target variable address", () => {
    const code = `int x = 5;
int *p = &x;`;

    const result = simulateProgram(parseProgram(code));

    const finalMemory = result.steps[1].memory;

    const x = finalMemory.cells.find(
      (cell) => cell.name === "x",
    );

    const p = finalMemory.cells.find(
      (cell) => cell.name === "p",
    );

    expect(x).toBeDefined();
    expect(p).toBeDefined();

    expect(x?.address).toBe(0x1000);
    expect(p?.address).toBe(0x1004);

    /**
     * Most important pointer relationship:
     *
     * p.value === x.address
     */
    expect(p?.value).toBe(x?.address);
  });

  it("changes the value of a normal variable", () => {
    const code = `int x = 5;
x = 20;`;

    const result = simulateProgram(parseProgram(code));

    const finalMemory = result.steps[1].memory;

    const x = finalMemory.cells.find(
      (cell) => cell.name === "x",
    );

    expect(x?.value).toBe(20);

    expect(result.steps[1].changes).toEqual([
      {
        type: "value_changed",
        variableName: "x",
        previousValue: 5,
        newValue: 20,
      },
    ]);
  });

  it("allows a pointer to change its target", () => {
    const code = `int x = 5;
int y = 10;
int *p = &x;
p = &y;`;

    const result = simulateProgram(parseProgram(code));

    const finalMemory = result.steps[3].memory;

    const x = finalMemory.cells.find(
      (cell) => cell.name === "x",
    );

    const y = finalMemory.cells.find(
      (cell) => cell.name === "y",
    );

    const p = finalMemory.cells.find(
      (cell) => cell.name === "p",
    );

    expect(x?.address).toBe(0x1000);
    expect(y?.address).toBe(0x1004);
    expect(p?.address).toBe(0x1008);

    /**
     * p originally points to x but after:
     *
     * p = &y;
     *
     * p should store y's address.
     */
    expect(p?.value).toBe(y?.address);
    expect(p?.value).not.toBe(x?.address);

    expect(result.steps[3].changes).toEqual([
      {
        type: "pointer_changed",
        pointerName: "p",
        previousAddress: 0x1000,
        newAddress: 0x1004,
      },
    ]);
  });

  it("dereferences a pointer and changes the pointed-to variable", () => {
    const code = `int x = 5;
int *p = &x;
*p = 20;`;

    const result = simulateProgram(parseProgram(code));

    const finalMemory = result.steps[2].memory;

    const x = finalMemory.cells.find(
      (cell) => cell.name === "x",
    );

    const p = finalMemory.cells.find(
      (cell) => cell.name === "p",
    );

    /**
     * Dereferencing p changes x.
     */
    expect(x?.value).toBe(20);

    /**
     * But p itself still contains x's address.
     */
    expect(p?.value).toBe(x?.address);

    expect(result.steps[2].changes).toEqual([
      {
        type: "value_changed",
        variableName: "x",
        previousValue: 5,
        newValue: 20,
      },
    ]);
  });

  it("dereferences the pointer's CURRENT target after reassignment", () => {
    const code = `int x = 5;
int y = 10;
int *p = &x;
p = &y;
*p = 99;`;

    const result = simulateProgram(parseProgram(code));

    const finalMemory = result.steps[4].memory;

    const x = finalMemory.cells.find(
      (cell) => cell.name === "x",
    );

    const y = finalMemory.cells.find(
      (cell) => cell.name === "y",
    );

    const p = finalMemory.cells.find(
      (cell) => cell.name === "p",
    );

    /**
     * p was redirected to y before dereferencing.
     *
     * Therefore:
     *
     * x stays 5
     * y becomes 99
     */
    expect(x?.value).toBe(5);
    expect(y?.value).toBe(99);

    expect(p?.value).toBe(y?.address);
  });

  it("preserves independent memory snapshots for every step", () => {
    const code = `int x = 5;
x = 10;
x = 20;`;

    const result = simulateProgram(parseProgram(code));

    const step0X = result.steps[0].memory.cells.find(
      (cell) => cell.name === "x",
    );

    const step1X = result.steps[1].memory.cells.find(
      (cell) => cell.name === "x",
    );

    const step2X = result.steps[2].memory.cells.find(
      (cell) => cell.name === "x",
    );

    /**
     * Previous snapshots MUST NOT change when later
     * statements execute.
     */
    expect(step0X?.value).toBe(5);
    expect(step1X?.value).toBe(10);
    expect(step2X?.value).toBe(20);
  });

  it("stores the correct source line information in each step", () => {
    const code = `int x = 5;

int *p = &x;

*p = 20;`;

    const result = simulateProgram(parseProgram(code));

    expect(result.steps).toHaveLength(3);

    expect(result.steps[0].lineNumber).toBe(1);
    expect(result.steps[1].lineNumber).toBe(3);
    expect(result.steps[2].lineNumber).toBe(5);

    expect(result.steps[0].sourceLine).toBe(
      "int x = 5;",
    );

    expect(result.steps[1].sourceLine).toBe(
      "int *p = &x;",
    );

    expect(result.steps[2].sourceLine).toBe(
      "*p = 20;",
    );
  });

  it("assigns sequential step indexes", () => {
    const code = `int x = 5;

int y = 10;

int *p = &x;`;

    const result = simulateProgram(parseProgram(code));

    expect(
      result.steps.map((step) => step.stepIndex),
    ).toEqual([0, 1, 2]);
  });

  it("produces the same addresses every time the same program runs", () => {
    const code = `int x = 5;
int y = 10;
int *p = &x;`;

    const parsed = parseProgram(code);

    const firstRun = simulateProgram(parsed);
    const secondRun = simulateProgram(parsed);

    const firstFinalMemory =
      firstRun.steps[firstRun.steps.length - 1].memory;

    const secondFinalMemory =
      secondRun.steps[secondRun.steps.length - 1].memory;

    expect(firstFinalMemory).toEqual(secondFinalMemory);
  });

  it("supports an uninitialized variable", () => {
    const result = simulateProgram(
      parseProgram("int x;"),
    );

    expect(result.steps[0].memory.cells[0]).toEqual({
      name: "x",
      dataType: "int",
      address: 0x1000,
      value: null,
    });
  });

  it("supports an uninitialized pointer", () => {
    const result = simulateProgram(
      parseProgram("int *p;"),
    );

    expect(result.steps[0].memory.cells[0]).toEqual({
      name: "p",
      dataType: "int_pointer",
      address: 0x1000,
      value: null,
    });
  });

  it("throws when assigning to an undeclared variable", () => {
    const code = `x = 10;`;

    expect(() =>
      simulateProgram(parseProgram(code)),
    ).toThrow(SimulationError);

    expect(() =>
      simulateProgram(parseProgram(code)),
    ).toThrow(
      'Variable "x" has not been declared.',
    );
  });

  it("throws when declaring the same variable twice", () => {
    const code = `int x = 5;
int x = 10;`;

    expect(() =>
      simulateProgram(parseProgram(code)),
    ).toThrow(
      'Variable "x" has already been declared.',
    );
  });

  it("throws when a pointer targets an undeclared variable", () => {
    const code = `int *p = &x;`;

    expect(() =>
      simulateProgram(parseProgram(code)),
    ).toThrow(
      'Variable "x" has not been declared.',
    );
  });

  it("throws when dereferencing an uninitialized pointer", () => {
    const code = `int *p;
*p = 20;`;

    expect(() =>
      simulateProgram(parseProgram(code)),
    ).toThrow(
      'Pointer "p" does not point to a variable.',
    );
  });

  it("throws when using a normal int as a pointer", () => {
    const code = `int x = 5;
x = &x;`;

    /**
     * Note:
     *
     * The parser interprets:
     *
     * x = &x;
     *
     * as a pointer assignment syntactically.
     *
     * The simulator then correctly rejects x because
     * x is not actually a pointer.
     */
    expect(() =>
      simulateProgram(parseProgram(code)),
    ).toThrow(
      '"x" is not a pointer.',
    );
  });

  it("throws when a pointer tries to point to another pointer in the MVP", () => {
    const code = `int x = 5;
int *p = &x;
int *q = &p;`;

    /**
     * Double pointers are intentionally unsupported
     * in the MVP.
     */
    expect(() =>
      simulateProgram(parseProgram(code)),
    ).toThrow(
      '"p" is not an int variable.',
    );
  });

  it("includes source information when simulation fails", () => {
    const code = `int x = 5;
int *p;
*p = 20;`;

    try {
      simulateProgram(parseProgram(code));

      /**
       * If simulation unexpectedly succeeds,
       * explicitly fail the test.
       */
      throw new Error(
        "Expected simulation to throw.",
      );
    } catch (error) {
      expect(error).toBeInstanceOf(SimulationError);

      if (error instanceof SimulationError) {
        expect(error.lineNumber).toBe(3);
        expect(error.sourceLine).toBe("*p = 20;");

        expect(error.message).toBe(
          'Pointer "p" does not point to a variable.',
        );
      }
    }
  });
});