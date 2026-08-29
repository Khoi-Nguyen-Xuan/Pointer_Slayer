import type { Statement } from "../../models/statement";
import { PARSER_PATTERNS } from "./patterns";

/**
 * A parsed statement together with its location
 * in the original source code.
 *
 * Keeping line information for:
 *
 * - step navigation
 * - highlighting the active editor line
 * - explanations
 * - simulation errors
 */

export interface ParsedStatement {
  statement: Statement;
  lineNumber: number;
  sourceLine: string;
}

/**
 * Error thrown when Pointer Slayer encounters syntax
 * outside the subset of C that it understands.
 */
export class ParserError extends Error {
  lineNumber: number;
  sourceLine: string;

  constructor(
    message: string,
    lineNumber: number,
    sourceLine: string,
  ) {
    super(message);

    this.name = "ParserError";
    this.lineNumber = lineNumber;
    this.sourceLine = sourceLine;
  }
}

/**
 * Remove a // comment from a line.
 *
 * Example:
 * int x = 5; // create x
 *
 * becomes:
 * int x = 5;
 */
function removeLineComment(line: string): string {
  const commentIndex = line.indexOf("//");

  if (commentIndex === -1) {
    return line;
  }

  return line.slice(0, commentIndex);
}

/**
 * Parse one supported C statement.
 *
 * Returns null for:
 * - blank lines
 * - comment-only lines
 *
 * Throws if the line contains unsupported syntax.
 */
export function parseLine(line: string): Statement | null {
  const code = removeLineComment(line).trim();

  if (code.length === 0) {
    return null;
  }

  /*
   * ------------------------------------------------------
   * Pointer declaration
   * ------------------------------------------------------
   *
   * int *p;
   * int *p = &x;
   */

  const pointerDeclarationMatch =
    PARSER_PATTERNS.pointerDeclaration.exec(code);

  if (pointerDeclarationMatch) {
    const { name, target } =
      pointerDeclarationMatch.groups ?? {};

    if (!name) {
      throw new Error(
        "Pointer declaration matched without a variable name.",
      );
    }

    return {
      type: "pointer_declaration",
      pointsToType: "int",
      name,
      target,
    };
  }

  /*
   * ------------------------------------------------------
   * Variable declaration
   * ------------------------------------------------------
   *
   * int x;
   * int x = 5;
   */

  const variableDeclarationMatch =
    PARSER_PATTERNS.variableDeclaration.exec(code);

  if (variableDeclarationMatch) {
    const { name, initialValue } =
      variableDeclarationMatch.groups ?? {};

    if (!name) {
      throw new Error(
        "Variable declaration matched without a variable name.",
      );
    }

    return {
      type: "variable_declaration",
      variableType: "int",
      name,
      initialValue:
        initialValue !== undefined
          ? Number(initialValue)
          : undefined,
    };
  }

  /*
   * ------------------------------------------------------
   * Dereference assignment
   * ------------------------------------------------------
   *
   * *p = 20;
   */

  const dereferenceAssignmentMatch =
    PARSER_PATTERNS.dereferenceAssignment.exec(code);

  if (dereferenceAssignmentMatch) {
    const { pointerName, value } =
      dereferenceAssignmentMatch.groups ?? {};

    if (!pointerName || value === undefined) {
      throw new Error(
        "Dereference assignment matched with missing values.",
      );
    }

    return {
      type: "dereference_assignment",
      pointerName,
      value: Number(value),
    };
  }

  /*
   * ------------------------------------------------------
   * Pointer assignment
   * ------------------------------------------------------
   *
   * p = &x;
   */

  const pointerAssignmentMatch =
    PARSER_PATTERNS.pointerAssignment.exec(code);

  if (pointerAssignmentMatch) {
    const { pointerName, target } =
      pointerAssignmentMatch.groups ?? {};

    if (!pointerName || !target) {
      throw new Error(
        "Pointer assignment matched with missing values.",
      );
    }

    return {
      type: "pointer_assignment",
      pointerName,
      target,
    };
  }

  /*
   * ------------------------------------------------------
   * Variable assignment
   * ------------------------------------------------------
   *
   * x = 10;
   */

  const variableAssignmentMatch =
    PARSER_PATTERNS.variableAssignment.exec(code);

  if (variableAssignmentMatch) {
    const { name, value } =
      variableAssignmentMatch.groups ?? {};

    if (!name || value === undefined) {
      throw new Error(
        "Variable assignment matched with missing values.",
      );
    }

    return {
      type: "variable_assignment",
      name,
      value: Number(value),
    };
  }

  throw new Error(`Unsupported statement: ${code}`);
}

/**
 * Parse an entire C program.
 *
 * For the MVP, Pointer Slayer expects one supported
 * statement per source-code line.
 */
export function parseProgram(
  sourceCode: string,
): ParsedStatement[] {
  const lines = sourceCode.split(/\r?\n/);

  const statements: ParsedStatement[] = [];

  lines.forEach((sourceLine, index) => {
    const lineNumber = index + 1;

    try {
      const statement = parseLine(sourceLine);

      if (statement === null) {
        return;
      }

      statements.push({
        statement,
        lineNumber,
        sourceLine: sourceLine.trim(),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown parser error.";

      throw new ParserError(
        message,
        lineNumber,
        sourceLine.trim(),
      );
    }
  });

  return statements;
}