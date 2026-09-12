import type { MemoryState } from "../../models/memory";
import type {
  SimulationResult,
  SimulationStep,
} from "../../models/simulation";

import type { ParsedStatement } from "../parser/parser";

import { AddressAllocator } from "./addressAllocator";
import {
  executeStatement,
  ExecutionError,
} from "./executeStatement";

/**
 * Error thrown when a simulation fails while executing
 * a specific source-code line.
 */
export class SimulationError extends Error {
  lineNumber: number;
  sourceLine: string;

  constructor(
    message: string,
    lineNumber: number,
    sourceLine: string,
  ) {
    super(message);

    this.name = "SimulationError";
    this.lineNumber = lineNumber;
    this.sourceLine = sourceLine;
  }
}

/**
 * Create the empty memory state used at the beginning
 */
function createInitialMemory(): MemoryState {
  return {
    cells: [],
  };
}

/**
 * Simulate a list of parsed C statements.
 *
 * Input: ParsedStatement[]
 *
 * Output: SimulationResult containing one SimulationStep for every executable line.
 */
export function simulateProgram(
  parsedStatements: ParsedStatement[],
): SimulationResult {
  /**
   * Every simulation gets a fresh allocator.
   */
  const addressAllocator = new AddressAllocator();

  /**
   * Memory starts empty.
   */
  let memory = createInitialMemory();

  /**
   * Every executed statement produces one step.
   */
  const steps: SimulationStep[] = [];

  parsedStatements.forEach((parsedStatement, index) => {
    try {
      /**
       * Execute exactly one statement using the current
       * memory state.
       */
      const result = executeStatement(
        parsedStatement.statement,
        memory,
        addressAllocator,
      );

      /**
       * The returned memory becomes the current memory
       * for the next statement.
       */
      memory = result.memory;

      /**
       * Save a complete snapshot for the UI.
       */
      const step: SimulationStep = {
        stepIndex: index,
        lineNumber: parsedStatement.lineNumber,
        sourceLine: parsedStatement.sourceLine,
        statement: parsedStatement.statement,
        memory: result.memory,
        changes: result.changes,
      };

      steps.push(step);
    } catch (error) {
      /**
       * Convert low-level execution errors into simulation
       * errors that contain source-code information.
       */
      if (error instanceof ExecutionError) {
        throw new SimulationError(
          error.message,
          parsedStatement.lineNumber,
          parsedStatement.sourceLine,
        );
      }

      /**
       * Do not hide unexpected programming bugs.
       */
      throw error;
    }
  });

  return {
    steps,
  };
}

/*

Flow: 

C source code
     ↓
parser.ts (code => Statement)
     ↓
ParsedStatement[]
     ↓
simulator.ts
     ↓
executeStatement.ts (Statement + MemoryState => New MemoryState)
     ↓
MemoryState
     ↓
SimulationStep[] (!!!!!!!!!!!!!)
*/

/*

C source code: 
int x = 5;
int *p = &x;
*p = 20;


SimulationStep[]: [Step 1, Step 2, Step 3]

Step 1 => Memory state = [MemoryCell của line code thứ 1]
Step 2 => Memory state = [MemoryCell của line code thứ 1, MemoryCell của line code thứ 2]
Step 3 => Memory state = [MemoryCell của line code thứ 1, MemoryCell của line code thứ 2] (giá trị của MemoryCell của line code thứ 1 đã bị thay đổi) 
*/