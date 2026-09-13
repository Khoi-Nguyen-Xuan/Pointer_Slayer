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
 * Error thrown when a simulation fails while executing a specific source-code line.
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
 * Output: SimulationResult containing one SimulationStep for every executable line.
 */
export function simulateProgram(
  parsedStatements: ParsedStatement[],
): SimulationResult {
  
  //Every simulation gets a fresh allocator
  const addressAllocator = new AddressAllocator();

  //Memory starts empty
  let memory = createInitialMemory();

  //Initialize an array to hold the steps
  const steps: SimulationStep[] = [];

  //Parser.ts 
  parsedStatements.forEach((parsedStatement, index) => {
    try {

      //Execute one statement using the current memory state.
      //result contains the new memory state and the changes made by this statement.
      const result = executeStatement(
        parsedStatement.statement,
        memory,
        addressAllocator,
      );

      //Update the memory state for the next statement
      memory = result.memory;

      //Save the step information for UI highlighting and animation.
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
      if (error instanceof ExecutionError) {
        throw new SimulationError(
          error.message,
          parsedStatement.lineNumber,
          parsedStatement.sourceLine,
        );
      }

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
