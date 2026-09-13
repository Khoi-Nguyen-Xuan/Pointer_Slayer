import type { ElementPositions, ElementRect } from "../../hooks/useElementPositions";
import type { MemoryState } from "../../models/memory";
import type { SimulationStep } from "../../models/simulation";

export const ARROW_ANIMATION_MS = 700;

export interface MemoryArrow {
  id: string;
  pointerAddress: number;
  source: { x: number; y: number };
  target: { x: number; y: number };
}

/** Give arrows entering the same side of a box separate attachment points. */
export function getMemoryArrows(
  memory: MemoryState,
  positions: ElementPositions,
): MemoryArrow[] {
  const groups = new Map<string, {
    targetAddress: number;
    target: ElementRect;
    pointsRight: boolean;
    sources: { address: number; rect: ElementRect }[];
  }>();

  for (const cell of memory.cells) {
    if (cell.pointerDepth === 0 || cell.value === null) continue;
    const source = positions.memoryTargets.get(cell.address);
    const target = positions.memoryTargets.get(cell.value);
    if (!source || !target) continue;

    const pointsRight = source.centerX < target.centerX;
    const key = `${cell.value}:${pointsRight ? "left" : "right"}`;
    let group = groups.get(key);
    if (!group) {
      group = { targetAddress: cell.value, target, pointsRight, sources: [] };
      groups.set(key, group);
    }
    group.sources.push({ address: cell.address, rect: source });
  }

  const arrows: MemoryArrow[] = [];
  for (const { targetAddress, target, pointsRight, sources } of groups.values()) {
    // Match the vertical order of sources to reduce crossings near the box.
    sources.sort((a, b) => a.rect.centerY - b.rect.centerY || a.address - b.address);
    const spacing = sources.length < 2
      ? 0
      : Math.min(16, Math.max(0, target.height - 24) / (sources.length - 1));

    sources.forEach((source, index) => {
      const offset = (index - (sources.length - 1) / 2) * spacing;
      arrows.push({
        id: `${source.address}->${targetAddress}`,
        pointerAddress: source.address,
        source: {
          x: pointsRight ? source.rect.right : source.rect.left,
          y: source.rect.centerY,
        },
        target: {
          x: pointsRight ? target.left : target.right,
          y: target.centerY + offset,
        },
      });
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
