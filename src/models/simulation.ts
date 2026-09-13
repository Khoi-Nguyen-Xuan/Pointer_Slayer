import type { MemoryCell, MemoryState } from "./memory";
import type { Statement } from "./statement";

/**
 * Define type of changes happen during one simulation step.
 */
export type MemoryChange =
  | {
      type: "created";
      cell: MemoryCell;
    }
  | {
      type: "value_changed";
      variableName: string;
      previousValue: number | null;
      newValue: number | null;
    }
  | {
      type: "pointer_changed";
      pointerName: string;
      previousAddress: number | null;
      newAddress: number | null;
    };

/**
 * Represents the result of executing one line.
 */
export interface SimulationStep {
  // Index of this step in the simulation sequence.
  stepIndex: number;

  // Line number in the original source code.
  lineNumber: number;

  // Original source code line.
  sourceLine: string;

  // ParsedStatement being returned by parser
  statement: Statement;

  // Memory snapshot after executing this statement.
  memory: MemoryState;

  // Specific changes made to the memory during this step.
  changes: MemoryChange[];
}

/**
 * Complete result produced by our simulator.
 */
export interface SimulationResult {
  steps: SimulationStep[];
}