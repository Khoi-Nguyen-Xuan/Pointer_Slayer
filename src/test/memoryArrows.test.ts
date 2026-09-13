import { describe, expect, it } from "vitest";
import { parseProgram } from "../engine/parser/parser";
import { simulateProgram } from "../engine/simulator/simulator";
import type { ElementPositions, ElementRect } from "../hooks/useElementPositions";
import type { MemoryCell, MemoryState } from "../models/memory";
import { getMemoryArrows, getStepArrowPath, getStepHighlightNames } from "../components/visualizer/memoryArrows";

function rect(left: number, top: number, width = 100, height = 100): ElementRect {
  return { left, top, right: left + width, bottom: top + height, width, height, centerX: left + width / 2, centerY: top + height / 2 };
}

const memory: MemoryState = { cells: [
  { name: "x", baseType: "int", pointerDepth: 0, address: 100, value: 5 },
  { name: "p", baseType: "int", pointerDepth: 1, address: 200, value: 100 },
  { name: "q", baseType: "int", pointerDepth: 1, address: 300, value: 100 },
] };
const positions: ElementPositions = {
  pointerSources: new Map(),
  memoryTargets: new Map([[100, rect(0, 0)], [200, rect(200, 0)], [300, rect(200, 140)]]),
};

describe("arrow attachment points", () => {
  it("separates arrows sharing a target and orders their endpoints vertically", () => {
    const arrows = getMemoryArrows(memory, positions);
    expect(arrows.map((arrow) => arrow.target)).toEqual([{ x: 100, y: 46 }, { x: 100, y: 54 }]);
    expect(arrows.map((arrow) => arrow.pointerAddress)).toEqual([200, 300]);
    expect(getMemoryArrows({ cells: [...memory.cells].reverse() }, positions)).toEqual(arrows);
  });

  it("keeps a single incoming arrow centered", () => {
    const arrows = getMemoryArrows({ cells: memory.cells.slice(0, 2) }, positions);
    expect(arrows[0].target).toEqual({ x: 100, y: 50 });
  });

  it("keeps many attachment points inside the target box", () => {
    const cells: MemoryCell[] = [memory.cells[0]];
    const targets = new Map([[100, rect(0, 0)]]);
    for (let i = 0; i < 12; i++) {
      const address = 200 + i;
      cells.push({ name: `p${i}`, baseType: "int", pointerDepth: 1, address, value: 100 });
      targets.set(address, rect(200, i * 120));
    }
    const arrows = getMemoryArrows({ cells }, { pointerSources: new Map(), memoryTargets: targets });
    const endpoints = arrows.map((arrow) => arrow.target.y);
    expect(new Set(endpoints).size).toBe(12);
    expect(Math.min(...endpoints)).toBeGreaterThanOrEqual(12);
    expect(Math.max(...endpoints)).toBeLessThanOrEqual(88);
  });

  it("treats opposite sides of a box as separate attachment groups", () => {
    const targets = new Map(positions.memoryTargets);
    targets.set(300, rect(-200, 0));
    const arrows = getMemoryArrows(memory, { pointerSources: new Map(), memoryTargets: targets });
    expect(arrows.map((arrow) => arrow.target)).toEqual([{ x: 100, y: 50 }, { x: 0, y: 50 }]);
  });

  it("uses the current pointer address after retargeting", () => {
    const cells = memory.cells.map((cell) => cell.name === "q" ? { ...cell, value: null } : cell);
    expect(getMemoryArrows({ cells }, positions).map((arrow) => arrow.id)).toEqual(["200->100"]);
  });

  it("waits for missing box measurements instead of inventing an endpoint", () => {
    expect(getMemoryArrows(memory, { pointerSources: new Map(), memoryTargets: new Map() })).toEqual([]);
  });
});

const setup = `int x = 5;
int y = 10;
int *p = &x;
int *q = &x;
int **pp = &p;
int **qq = &p;`;

describe("step arrow paths", () => {
  it.each([
    ["*p = 10;", [0x1008]],
    ["**pp = 10;", [0x1010, 0x1008]],
    ["**qq = 10;", [0x1014, 0x1008]],
    ["**pp = 5;", [0x1010, 0x1008]],
    ["**pp = *q;", [0x1010, 0x1008]],
    ["*pp = &y;", [0x1010, 0x1008]],
    ["p = &y;", [0x1008]],
    ["pp = &q;", [0x1010]],
    ["int **r = &q;", [0x1018]],
    ["int **r;", []],
    ["x = 10;", []],
  ])("replays the correct sources in order for %s", (code, expected) => {
    const step = simulateProgram(parseProgram(`${setup}\n${code}`)).steps.at(-1)!;
    expect(getStepArrowPath(step)).toEqual(expected);
  });

  it("follows the current double-pointer target after a reassignment", () => {
    const step = simulateProgram(parseProgram(`${setup}\npp = &q;\n**pp = 10;`)).steps.at(-1)!;
    expect(getStepArrowPath(step)).toEqual([0x1010, 0x100c]);
  });
});

describe("destination highlights", () => {
  it.each([
    ["**pp = 10;", "x"],
    ["**pp = 5;", "x"],
    ["*p = 5;", "x"],
    ["*pp = p;", "p"],
    ["*pp = &y;", "p"],
  ])("highlights the resolved destination for %s", (code, expectedName) => {
    const step = simulateProgram(parseProgram(`${setup}\n${code}`)).steps.at(-1)!;
    expect([...getStepHighlightNames(step)]).toEqual([expectedName]);
  });

  it("does not invent a change event to highlight an unchanged destination", () => {
    const step = simulateProgram(parseProgram(`${setup}\n**pp = 5;`)).steps.at(-1)!;
    expect(step.changes).toEqual([]);
    expect([...getStepHighlightNames(step)]).toEqual(["x"]);
  });
});
