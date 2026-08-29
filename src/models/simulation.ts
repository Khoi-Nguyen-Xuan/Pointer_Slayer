import type { MemoryCell, MemoryState } from "./memory";
import type { Statement } from "./statement";

/**
 * Define type of changes might happen during one simulation step.
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
  /**
   * Zero-based index of the EXECUTABLE statement.
   */
  stepIndex: number;

  /**
   * Original source-code line number.
   */
  lineNumber: number;

  /**
   * Original C source line, e.g. "int x = 5;" or "int *p = &x;"
   */
  sourceLine: string;

  /**
   * Structured representation produced by our parser.
   */
  statement: Statement;

  /**
   * Full memory snapshot AFTER this statement executes.
   */
  memory: MemoryState;

  /**
   * Specific changes caused by this statement.
   */
  changes: MemoryChange[];
}

/**
 * Complete result produced by our simulator.
 */
export interface SimulationResult {
  steps: SimulationStep[];
}