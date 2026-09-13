import type { ElementPositions } from "../../hooks/useElementPositions";
import type { MemoryState } from "../../models/memory";
import type { SimulationStep } from "../../models/simulation";

export const ARROW_ANIMATION_MS = 700;

export interface MemoryArrow {
  id: string;
  pointerAddress: number;
  source: { x: number; y: number };
  target: { x: number; y: number };
}

/** Connect the centers of the facing box edges without endpoint offsets. */
export function getMemoryArrows(
  memory: MemoryState,
  positions: ElementPositions,
): MemoryArrow[] {
  const arrows: MemoryArrow[] = [];
  for (const cell of memory.cells) {
    if (cell.pointerDepth === 0 || cell.value === null) continue;
    const source = positions.memoryTargets.get(cell.address);
    const target = positions.memoryTargets.get(cell.value);
    if (!source || !target) continue;

    const pointsRight = source.centerX < target.centerX;
    arrows.push({
      id: `${cell.address}->${cell.value}`,
      pointerAddress: cell.address,
      source: {
        x: pointsRight ? source.right : source.left,
        y: source.centerY,
      },
      target: {
        x: pointsRight ? target.left : target.right,
        y: target.centerY,
      },
    });
  }
  return arrows;
}

/**
 * Pointer sources to replay in order, independent of whether the value changed.
 * **pp = 10 traverses pp then p; *pp = &y traverses pp then retargets p.
 */
export function getStepArrowPath(step: SimulationStep): number[] {
  const { statement, memory, changes } = step;
  const path: number[] = [];

  if (statement.type === "assignment") {
    let cell = memory.cells.find((candidate) => candidate.name === statement.destination.name);
    for (let depth = 0; depth < statement.destination.dereferenceDepth; depth += 1) {
      if (!cell || cell.pointerDepth === 0 || cell.value === null) break;
      path.push(cell.address);
      const targetAddress = cell.value;
      cell = memory.cells.find((candidate) => candidate.address === targetAddress);
    }
  }

  for (const change of changes) {
    const pointer = change.type === "created"
      ? change.cell
      : change.type === "pointer_changed"
        ? memory.cells.find((cell) => cell.name === change.pointerName)
        : undefined;
    if (pointer && pointer.pointerDepth > 0 && pointer.value !== null) {
      path.push(pointer.address);
    }
  }

  return [...new Set(path)];
}

/** Highlight the cell written through a pointer even if its value stayed equal. */
export function getStepHighlightNames(step: SimulationStep): Set<string> {
  const names = new Set<string>();
  for (const change of step.changes) {
    if (change.type === "value_changed") names.add(change.variableName);
    else if (change.type === "pointer_changed") names.add(change.pointerName);
  }

  const { statement, memory } = step;
  if (statement.type === "assignment" && statement.destination.dereferenceDepth > 0) {
    let cell = memory.cells.find((candidate) => candidate.name === statement.destination.name);
    for (let depth = 0; depth < statement.destination.dereferenceDepth; depth += 1) {
      if (!cell || cell.pointerDepth === 0 || cell.value === null) return names;
      const targetAddress = cell.value;
      cell = memory.cells.find((candidate) => candidate.address === targetAddress);
    }
    if (cell) names.add(cell.name);
  }
  return names;
}
