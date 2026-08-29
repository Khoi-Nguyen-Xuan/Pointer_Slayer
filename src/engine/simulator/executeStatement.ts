import type { MemoryCell, MemoryState } from "../../models/memory";
import type { MemoryChange } from "../../models/simulation";
import type { Statement } from "../../models/statement";
import { AddressAllocator } from "./addressAllocator";

/**
 * Result of executing exactly one parsed statement.
 *
 * memory:
 *   Full memory state AFTER the statement executes.
 *
 * changes:
 *   Only the things that changed during this statement.
 *   Later the UI will use this for highlighting and animation.
 */
export interface ExecuteStatementResult {
  memory: MemoryState;
  changes: MemoryChange[];
}

/**
 * Represents a semantic/runtime problem in our simulated program.
 */
export class ExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionError";
  }
}

/**
 * Create an independent copy of memory.
 *
 * This is VERY important.
 *
 * We do not want to mutate the previous MemoryState because
 * SimulationStep objects will eventually keep snapshots of
 * memory from earlier steps.
 *
 * Example:
 *
 * Step 1:
 * x = 5
 *
 * Step 2:
 * x = 10
 *
 * Step 1 must still show x = 5.
 */
function cloneMemory(memory: MemoryState): MemoryState {
  return {
    cells: memory.cells.map((cell) => ({ ...cell })),
  };
}

/**
 * Find a memory cell by variable name.
 */
function findCell(
  memory: MemoryState,
  name: string,
): MemoryCell | undefined {
  return memory.cells.find((cell) => cell.name === name);
}

/**
 * Find a variable or throw a useful simulation error.
 */
function requireCell(
  memory: MemoryState,
  name: string,
): MemoryCell {
  const cell = findCell(memory, name);

  if (!cell) {
    throw new ExecutionError(
      `Variable "${name}" has not been declared.`,
    );
  }

  return cell;
}

/**
 * Ensure a variable name has not already been declared.
 */
function ensureNameAvailable(
  memory: MemoryState,
  name: string,
): void {
  if (findCell(memory, name)) {
    throw new ExecutionError(
      `Variable "${name}" has already been declared.`,
    );
  }
}

/**
 * Ensure a cell is a normal int variable.
 */
function requireIntVariable(
  memory: MemoryState,
  name: string,
): MemoryCell {
  const cell = requireCell(memory, name);

  if (cell.dataType !== "int") {
    throw new ExecutionError(
      `"${name}" is not an int variable.`,
    );
  }

  return cell;
}

/**
 * Ensure a cell is an int pointer.
 */
function requireIntPointer(
  memory: MemoryState,
  name: string,
): MemoryCell {
  const cell = requireCell(memory, name);

  if (cell.dataType !== "int_pointer") {
    throw new ExecutionError(
      `"${name}" is not a pointer.`,
    );
  }

  return cell;
}

/**
 * Execute exactly ONE Statement.
 *
 * Its only job is:
 *
 * Statement + Current Memory
 *              ↓
 *         New Memory
 */
export function executeStatement(
  statement: Statement,
  memory: MemoryState,
  addressAllocator: AddressAllocator,
): ExecuteStatementResult {
  /**
   * Work on a copy so previous simulation states
   * remain unchanged.
   */
  const nextMemory = cloneMemory(memory);

  switch (statement.type) {
    /**
     * ------------------------------------------------------
     * int x;
     * int x = 5;
     * ------------------------------------------------------
     */
    case "variable_declaration": {
      ensureNameAvailable(nextMemory, statement.name);

      const cell: MemoryCell = {
        name: statement.name,
        dataType: "int",
        address: addressAllocator.allocate(),
        value: statement.initialValue ?? null,
      };

      nextMemory.cells.push(cell);

      return {
        memory: nextMemory,

        changes: [
          {
            type: "created",
            cell: { ...cell },
          },
        ],
      };
    }

    /**
     * ------------------------------------------------------
     * int *p;
     * int *p = &x;
     * ------------------------------------------------------
     */
    case "pointer_declaration": {
      ensureNameAvailable(nextMemory, statement.name);

      let targetAddress: number | null = null;

      /**
       * If:
       *
       * int *p = &x;
       *
       * then x must already exist and must be an int.
       */
      if (statement.target !== undefined) {
        const target = requireIntVariable(
          nextMemory,
          statement.target,
        );

        targetAddress = target.address;
      }

      const cell: MemoryCell = {
        name: statement.name,
        dataType: "int_pointer",
        address: addressAllocator.allocate(),

        /**
         * IMPORTANT:
         *
         * p stores x's ADDRESS.
         *
         * It does NOT store "x".
         */
        value: targetAddress,
      };

      nextMemory.cells.push(cell);

      return {
        memory: nextMemory,

        changes: [
          {
            type: "created",
            cell: { ...cell },
          },
        ],
      };
    }

    /**
     * ------------------------------------------------------
     * x = 10;
     * ------------------------------------------------------
     */
    case "variable_assignment": {
      const cell = requireIntVariable(
        nextMemory,
        statement.name,
      );

      const previousValue = cell.value;

      cell.value = statement.value;

      return {
        memory: nextMemory,

        changes: [
          {
            type: "value_changed",
            variableName: statement.name,
            previousValue,
            newValue: statement.value,
          },
        ],
      };
    }

    /**
     * ------------------------------------------------------
     * p = &x;
     * ------------------------------------------------------
     */
    case "pointer_assignment": {
      const pointer = requireIntPointer(
        nextMemory,
        statement.pointerName,
      );

      const target = requireIntVariable(
        nextMemory,
        statement.target,
      );

      const previousAddress = pointer.value;
      const newAddress = target.address;

      /**
       * Store the target variable's ADDRESS inside p.
       */
      pointer.value = newAddress;

      return {
        memory: nextMemory,

        changes: [
          {
            type: "pointer_changed",
            pointerName: statement.pointerName,
            previousAddress,
            newAddress,
          },
        ],
      };
    }

    /**
     * ------------------------------------------------------
     * *p = 20;
     * ------------------------------------------------------
     *
     * This is the most important pointer operation.
     *
     * If:
     *
     * p.value === 0x1000
     *
     * we search memory for the cell whose:
     *
     * address === 0x1000
     *
     * and modify THAT variable.
     */
    case "dereference_assignment": {
      const pointer = requireIntPointer(
        nextMemory,
        statement.pointerName,
      );

      /**
       * int *p;
       *
       * In our educational model, an uninitialized pointer
       * has value = null and cannot be dereferenced.
       */
      if (pointer.value === null) {
        throw new ExecutionError(
          `Pointer "${statement.pointerName}" does not point to a variable.`,
        );
      }

      const target = nextMemory.cells.find(
        (cell) => cell.address === pointer.value,
      );

      if (!target) {
        throw new ExecutionError(
          `Pointer "${statement.pointerName}" contains an invalid address.`,
        );
      }

      if (target.dataType !== "int") {
        throw new ExecutionError(
          `Pointer "${statement.pointerName}" does not point to an int variable.`,
        );
      }

      const previousValue = target.value;

      target.value = statement.value;

      return {
        memory: nextMemory,

        changes: [
          {
            type: "value_changed",
            variableName: target.name,
            previousValue,
            newValue: statement.value,
          },
        ],
      };
    }

    /**
     * TypeScript exhaustiveness check.
     *
     * If we later add a new Statement type but forget
     * to handle it here, TypeScript can warn us.
     */
    default: {
      const exhaustiveCheck: never = statement;

      throw new ExecutionError(
        `Unsupported statement: ${JSON.stringify(exhaustiveCheck)}`,
      );
    }
  }
}