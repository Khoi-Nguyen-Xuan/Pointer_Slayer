import { describe, expect, it } from "vitest";
import { parseLine, parseProgram } from "../engine/parser/parser";
import { AddressAllocator } from "../engine/simulator/addressAllocator";
import { executeStatement, ExecutionError } from "../engine/simulator/executeStatement";
import { simulateProgram, SimulationError } from "../engine/simulator/simulator";
import type { MemoryCell, MemoryState } from "../models/memory";

// Two independent chains: pp -> p -> x, and qq -> q -> y.
const setup = `int x = 5;
int y = 10;
int *p = &x;
int *q = &y;
int **pp = &p;
int **qq = &q;`;

function simulateLast(line: string) {
  const result = simulateProgram(parseProgram(`${setup}\n${line}`));
  return result.steps[result.steps.length - 1];
}

function executeLine(code: string, memory: MemoryState, allocator = new AddressAllocator()) {
  const statement = parseLine(code);
  if (statement === null) throw new Error("Expected an executable statement");
  return executeStatement(statement, memory, allocator);
}

describe("declarations", () => {
  it.each([
    ["int z;", 0, null],
    ["int *z;", 1, null],
    ["int **z;", 2, null],
    ["int z = 0;", 0, 0],
    ["int z = -10;", 0, -10],
    ["int z = y;", 0, 10],
    ["int *z = &x;", 1, 0x1000],
    ["int *z = q;", 1, 0x1004],
    ["int **z = &p;", 2, 0x1008],
    ["int **z = qq;", 2, 0x100c],
    ["int *z = *pp;", 1, 0x1000],
    ["int z = **qq;", 0, 10],
  ])("creates a correctly typed cell for %s", (code, pointerDepth, value) => {
    const step = simulateLast(code);
    const expected = { name: "z", baseType: "int", pointerDepth, address: 0x1018, value };
    expect(step.memory.cells.at(-1)).toEqual(expected);
    expect(step.changes).toEqual([{ type: "created", cell: expected }]);
    const change = step.changes[0];
    if (change.type === "created") {
      expect(change.cell).not.toBe(step.memory.cells.at(-1));
    }
  });

  it("takes the address of an uninitialized cell without reading it", () => {
    const result = simulateProgram(parseProgram(`int x;
int *p;
int **pp = &p;
*pp = &x;
**pp = 9;`));
    const cells = result.steps.at(-1)!.memory.cells;
    expect(cells.map((cell) => cell.value)).toEqual([9, 0x1000, 0x1004]);
    expect(result.steps[3].changes).toEqual([{
      type: "pointer_changed", pointerName: "p", previousAddress: null, newAddress: 0x1000,
    }]);
    expect(result.steps[4].changes).toEqual([{
      type: "value_changed", variableName: "x", previousValue: null, newValue: 9,
    }]);
  });
});

describe("assignments", () => {
  it.each([
    ["x = -1;", "x", -1],
    ["x = y;", "x", 10],
    ["*p = 20;", "x", 20],
    ["**pp = 20;", "x", 20],
    ["**pp = y;", "x", 10],
    ["**pp = *q;", "x", 10],
    ["x = **qq;", "x", 10],
  ])("reports the resolved integer destination for %s", (code, name, value) => {
    const step = simulateLast(code);
    expect(step.memory.cells.find((cell) => cell.name === name)?.value).toBe(value);
    expect(step.changes).toEqual([{
      type: "value_changed", variableName: name, previousValue: 5, newValue: value,
    }]);
    expect(step.memory.cells.find((cell) => cell.name === "p")?.value).toBe(0x1000);
    expect(step.memory.cells.find((cell) => cell.name === "pp")?.value).toBe(0x1008);
  });

  it.each([
    ["p = &y;", "p", 0x1000, 0x1004],
    ["p = q;", "p", 0x1000, 0x1004],
    ["p = *qq;", "p", 0x1000, 0x1004],
    ["*pp = &y;", "p", 0x1000, 0x1004],
    ["*pp = q;", "p", 0x1000, 0x1004],
    ["pp = &q;", "pp", 0x1008, 0x100c],
    ["pp = qq;", "pp", 0x1008, 0x100c],
  ])("reports the resolved pointer destination for %s", (code, name, previousAddress, newAddress) => {
    const step = simulateLast(code);
    expect(step.changes).toEqual([{
      type: "pointer_changed", pointerName: name, previousAddress, newAddress,
    }]);
    expect(step.memory.cells.find((cell) => cell.name === name)?.value).toBe(newAddress);
    expect(step.memory.cells.slice(0, 2).map((cell) => cell.value)).toEqual([5, 10]);
    if (name === "p") {
      expect(step.memory.cells.find((cell) => cell.name === "pp")?.value).toBe(0x1008);
    }
  });

  it("uses the current chain after both pointer levels are reassigned", () => {
    const result = simulateProgram(parseProgram(`${setup}
*pp = &y;
**pp = 30;
pp = &q;
*pp = &x;
**pp = *p;`));
    const before = result.steps[5].memory;
    const final = result.steps.at(-1)!.memory;
    expect(before.cells.map((cell) => cell.value)).toEqual([5, 10, 0x1000, 0x1004, 0x1008, 0x100c]);
    expect(final.cells.map((cell) => cell.value)).toEqual([30, 30, 0x1004, 0x1000, 0x100c, 0x100c]);
    expect(result.steps.at(-1)!.changes).toEqual([{
      type: "value_changed", variableName: "x", previousValue: 5, newValue: 30,
    }]);
    for (let index = 0; index < before.cells.length; index += 1) {
      expect(final.cells[index]).not.toBe(before.cells[index]);
    }
  });

  it.each(["x = x;", "p = p;", "pp = pp;", "*pp = p;", "**pp = 5;"])("keeps a step without reporting a false change for %s", (code) => {
    const step = simulateLast(code);
    expect(step.stepIndex).toBe(6);
    expect(step.sourceLine).toBe(code);
    expect(step.changes).toEqual([]);
  });
});

describe("type compatibility", () => {
  it.each([
    ["int **z = p;", 'Cannot initialize "z" of type "int**" with a value of type "int*".'],
    ["int **z = &x;", 'Cannot initialize "z" of type "int**" with a value of type "int*".'],
    ["int *z = &p;", 'Cannot initialize "z" of type "int*" with a value of type "int**".'],
    ["int *z = x;", 'Cannot initialize "z" of type "int*" with a value of type "int".'],
    ["int z = p;", 'Cannot initialize "z" of type "int" with a value of type "int*".'],
    ["int **z = &pp;", 'Cannot initialize "z" of type "int**" with a value of type "int***".'],
    ["pp = p;", 'Cannot assign a value of type "int*" to "pp" of type "int**".'],
    ["p = pp;", 'Cannot assign a value of type "int**" to "p" of type "int*".'],
    ["x = p;", 'Cannot assign a value of type "int*" to "x" of type "int".'],
    ["p = 5;", 'Cannot assign a value of type "int" to "p" of type "int*".'],
    ["*pp = 5;", 'Cannot assign a value of type "int" to "p" of type "int*".'],
    ["**pp = q;", 'Cannot assign a value of type "int*" to "x" of type "int".'],
    ["x = &y;", 'Cannot assign a value of type "int*" to "x" of type "int".'],
    ["pp = &pp;", 'Cannot assign a value of type "int***" to "pp" of type "int**".'],
  ])("rejects incompatible types for %s", (code, error) => {
    expect(() => simulateLast(code)).toThrow(error);
  });

  it("does not interpret an integer equal to an address as a pointer", () => {
    expect(() => simulateProgram(parseProgram(`int x = 4096;
int *p;
p = x;`))).toThrow('Cannot assign a value of type "int" to "p" of type "int*".');
  });
});

describe("invalid reads and dereferences", () => {
  it.each([
    ["int x;\nint y = x;", 'Variable "x" is uninitialized and cannot be read.'],
    ["int *p;\nint *q = p;", 'Variable "p" is uninitialized and cannot be read.'],
    ["int **pp;\nint **qq = pp;", 'Variable "pp" is uninitialized and cannot be read.'],
    ["int **pp;\n**pp = 5;", 'Pointer "pp" does not point to a variable.'],
    ["int **pp;\nint y = **pp;", 'Pointer "pp" does not point to a variable.'],
    ["int *p;\nint **pp = &p;\n**pp = 5;", 'Pointer "p" does not point to a variable.'],
    ["int *p;\nint **pp = &p;\nint y = **pp;", 'Pointer "p" does not point to a variable.'],
    ["int *p;\nint **pp = &p;\nint *q = *pp;", 'Variable "p" is uninitialized and cannot be read.'],
    ["int x;\nint *p = &x;\nint **pp = &p;\nint y = **pp;", 'Variable "x" is uninitialized and cannot be read.'],
    ["int x = 5;\n*x = 10;", '"x" is not a pointer.'],
    ["int x = 5;\nint *p = &x;\n**p = 10;", '"x" is not a pointer.'],
    ["int x = 5;\nint *p = &x;\nint y = **p;", '"x" is not a pointer.'],
    ["int x = absent;", 'Variable "absent" has not been declared.'],
    ["int x = 5;\nx = absent;", 'Variable "absent" has not been declared.'],
  ])("rejects %s", (code, error) => {
    expect(() => simulateProgram(parseProgram(code))).toThrow(error);
  });

  it.each(["**pp = 10;", "x = **pp;"])("validates addresses at the second dereference for %s", (code) => {
    const memory: MemoryState = { cells: [
      { name: "x", baseType: "int", pointerDepth: 0, address: 0x1000, value: 5 },
      { name: "p", baseType: "int", pointerDepth: 1, address: 0x1004, value: 0xdead },
      { name: "pp", baseType: "int", pointerDepth: 2, address: 0x1008, value: 0x1004 },
    ] };
    expect(() => executeLine(code, memory)).toThrow('Pointer "p" contains an invalid address.');
  });

  it.each(["**pp = 10;", "x = **pp;"])("validates addresses at the first dereference for %s", (code) => {
    const memory: MemoryState = { cells: [
      { name: "x", baseType: "int", pointerDepth: 0, address: 0x1000, value: 5 },
      { name: "pp", baseType: "int", pointerDepth: 2, address: 0x1004, value: 0xdead },
    ] };
    expect(() => executeLine(code, memory)).toThrow('Pointer "pp" contains an invalid address.');
  });

  it("rejects a chain whose target has the wrong declared depth", () => {
    const memory: MemoryState = { cells: [
      { name: "x", baseType: "int", pointerDepth: 0, address: 0x1000, value: 5 },
      { name: "pp", baseType: "int", pointerDepth: 2, address: 0x1004, value: 0x1000 },
    ] };
    expect(() => executeLine("**pp = 10;", memory)).toThrow(
      'Pointer "pp" points to "x" of type "int", but requires "int*".',
    );
  });

  it("preserves source line information for new type errors", () => {
    const code = `${setup}\n\n  pp = p; // incompatible`;
    expect(() => simulateProgram(parseProgram(code))).toThrow(SimulationError);
    expect(() => simulateProgram(parseProgram(code))).toThrow(expect.objectContaining({
      lineNumber: 8, sourceLine: "pp = p; // incompatible",
    }));
  });
});

describe("execution isolation", () => {
  it.each(["int **z = p;", "pp = p;", "**pp = q;", "**pp = absent;"])("leaves caller memory and allocator unchanged on failure: %s", (code) => {
    const memory = simulateProgram(parseProgram(setup)).steps.at(-1)!.memory;
    const before = structuredClone(memory);
    const allocator = new AddressAllocator(0x2000);
    expect(() => executeLine(code, memory, allocator)).toThrow(ExecutionError);
    expect(memory).toEqual(before);
    expect(allocator.allocate()).toBe(0x2000);
  });

  it("keeps the created event independent from later memory writes", () => {
    const memory: MemoryState = { cells: [] };
    const result = executeLine("int x = 5;", memory);
    const created = result.changes[0];
    result.memory.cells[0].value = 20;
    expect(memory.cells).toEqual([]);
    expect(created).toEqual({
      type: "created",
      cell: { name: "x", baseType: "int", pointerDepth: 0, address: 0x1000, value: 5 } satisfies MemoryCell,
    });
  });
});
