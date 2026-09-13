import type { MemoryCell, MemoryState } from "../../models/memory";
import type { MemoryChange } from "../../models/simulation";
import type { DereferenceDepth, Expression, Statement } from "../../models/statement";
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
 * Represents a semantic/runtime problem in program.
 */
export class ExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionError";
  }
}

// HELPER FUNCTIONS 
/**
 * Create an independent copy of memory.
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
 * Find a variable or throw a missing simulation error.
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
 * Ensure a variable has not already been declared.
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
 * Find the cell an expression refers to.
 * Depth 0 -> the named cell, 1 -> follows one address, 2 -> follows two.
 */
function resolveCell(
  memory: MemoryState,
  name: string,
  dereferenceDepth: DereferenceDepth,
): MemoryCell {
  let cell = requireCell(memory, name);

  for (let depth = 0; depth < dereferenceDepth; depth += 1) {
    if (cell.pointerDepth === 0) {
      throw new ExecutionError(`"${cell.name}" is not a pointer.`);
    }

    if (cell.value === null) {
      throw new ExecutionError(
        `Pointer "${cell.name}" does not point to a variable.`,
      );
    }

    //Check if any cell in memory has the address stored in the pointer's value
    const target = memory.cells.find((candidate) => candidate.address === cell.value);

    if (!target) {
      throw new ExecutionError(
        `Pointer "${cell.name}" contains an invalid address.`,
      );
    }

    // Each address must be followed by removing one pointer level.
    if (
      target.baseType !== cell.baseType ||
      target.pointerDepth !== cell.pointerDepth - 1
    ) {
      throw new ExecutionError(
        `Pointer "${cell.name}" points to "${target.name}" of type ` +
        `"${target.baseType}${"*".repeat(target.pointerDepth)}", but requires ` +
        `"${cell.baseType}${"*".repeat(cell.pointerDepth - 1)}".`,
      );
    }

    cell = target;
  }

  return cell;
}

/**
 * Evaluate an expression and return its value, type, and pointer depth.
 */
interface EvaluatedExpression {
  value: number;
  baseType: MemoryCell["baseType"];
  pointerDepth: number;
}

function evaluateExpression(
  expression: Expression,
  memory: MemoryState,
): EvaluatedExpression {
  switch (expression.kind) {
    case "literal": {
      return {
        value: expression.value,
        baseType: "int",
        pointerDepth: 0,
      };
    }

    case "address_of": {
      const target = requireCell(memory, expression.target);
      return {
        value: target.address,
        baseType: target.baseType,
        pointerDepth: target.pointerDepth + 1,
      };
    }

    case "read": {
      // Follow the dereference depth to find the cell being referenced, then return its value and type.
      const source = resolveCell(
        memory,
        expression.sourceName,
        expression.dereferenceDepth,
      );

      if (source.value === null) {
        throw new ExecutionError(
          `Variable "${source.name}" is uninitialized and cannot be read.`,
        );
      }

      return {
        value: source.value,
        baseType: source.baseType,
        pointerDepth: source.pointerDepth,
      };
    }

    default: {
      // Exhaustive check to ensure all expression kinds are handled.
      const exhaustiveCheck: never = expression;
      throw new ExecutionError(
        `Unsupported expression: ${JSON.stringify(exhaustiveCheck)}`,
      );
    }
  }
}

/** Execute one declaration or assignment WHILE preserve earlier memory snapshots. */
export function executeStatement(
  statement: Statement,
  memory: MemoryState,
  addressAllocator: AddressAllocator,
): ExecuteStatementResult {
  const nextMemory = cloneMemory(memory);

  switch (statement.type) {
    case "declaration": {

      // Ensure the variable name is not declared
      ensureNameAvailable(nextMemory, statement.name);

      // Value being assigned to the variable being declared
      let initialValue: number | null = null;

      // Declaration has an initializer, evaluate and check type compatibility.
      if (statement.initializer !== undefined) {
        const initializer = evaluateExpression(statement.initializer, nextMemory);

        if (
          initializer.baseType !== statement.variableType ||
          initializer.pointerDepth !== statement.pointerDepth
        ) {
          throw new ExecutionError(
            `Cannot initialize "${statement.name}" of type ` +
            `"${statement.variableType}${"*".repeat(statement.pointerDepth)}" ` +
            `with a value of type ` +
            `"${initializer.baseType}${"*".repeat(initializer.pointerDepth)}".`,
          );
        }

        initialValue = initializer.value;
      }

      // Create the new memory cell and add it to the memory state.
      const cell: MemoryCell = {
        name: statement.name,
        baseType: statement.variableType,
        pointerDepth: statement.pointerDepth,
        address: addressAllocator.allocate(),
        value: initialValue,
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

    // x = y; / p = q; / *pp = &y; / **pp = *p; / ...
    case "assignment": {
      const destination = resolveCell(
        nextMemory,
        statement.destination.name,
        statement.destination.dereferenceDepth,
      );
      const expression = evaluateExpression(statement.expression, nextMemory);

      // Validation of type compatibility between the destination and the evaluated expression.
      if (
        expression.baseType !== destination.baseType ||
        expression.pointerDepth !== destination.pointerDepth
      ) {
        throw new ExecutionError(
          `Cannot assign a value of type ` +
          `"${expression.baseType}${"*".repeat(expression.pointerDepth)}" ` +
          `to "${destination.name}" of type ` +
          `"${destination.baseType}${"*".repeat(destination.pointerDepth)}".`,
        );
      }

      const previousValue = destination.value;

      // Perform the assignment !!!
      destination.value = expression.value;

      // records a step when an assignment changes nothing.
      if (previousValue === destination.value) {
        return { memory: nextMemory, changes: [] };
      }

      // Classify the resolved cell

      //Case: Destination is a pointer 
      if (destination.pointerDepth > 0) {
        return {
          memory: nextMemory,
          changes: [
            {
              type: "pointer_changed",
              pointerName: destination.name,
              previousAddress: previousValue,
              newAddress: destination.value,
            },
          ],
        };
      }

      // Case: Destination is a variable
      return {
        memory: nextMemory,
        changes: [
          {
            type: "value_changed",
            variableName: destination.name,
            previousValue,
            newValue: destination.value,
          },
        ],
      };
    }

    default: {
      const exhaustiveCheck: never = statement;
      throw new ExecutionError(
        `Unsupported statement: ${JSON.stringify(exhaustiveCheck)}`,
      );
    }
  }
}
