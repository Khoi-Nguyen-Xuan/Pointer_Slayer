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
 * The matched pattern supplies each dereference depth; no star counting is needed.
 * Overlapping patterns normalize to identical statements. A match does not prove
 * that a name is an int, pointer, or double pointer: the simulator validates types.
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

  // int x; / int x = 5;
  const variableDeclarationMatch = PARSER_PATTERNS.variableDeclaration.exec(code);
  if (variableDeclarationMatch) {
    const { name, initialValue } = variableDeclarationMatch.groups ?? {};

    if (!name) {
      throw new Error(
        "variableDeclaration matched with missing values.",
      );
    }

    return {
      type: "declaration",
      variableType: "int",
      name,
      pointerDepth: 0,
      initializer:
        initialValue === undefined
          ? undefined
          : {
              kind: "literal",
              value: Number(initialValue),
            },
    };
  }

  // int x = y;
  const variableCopyDeclarationMatch = PARSER_PATTERNS.variableCopyDeclaration.exec(code);
  if (variableCopyDeclarationMatch) {
    const { name, sourceName } = variableCopyDeclarationMatch.groups ?? {};

    if (!name) {
      throw new Error(
        "variableCopyDeclaration matched with missing values.",
      );
    }

    return {
      type: "declaration",
      variableType: "int",
      name,
      pointerDepth: 0,
      initializer:
        sourceName === undefined
          ? undefined
          : {
              kind: "read",
              sourceName,
              dereferenceDepth: 0,
            },
    };
  }

  // int *p; / int *p = &x;
  const pointerDeclarationMatch = PARSER_PATTERNS.pointerDeclaration.exec(code);
  if (pointerDeclarationMatch) {
    const { name, target } = pointerDeclarationMatch.groups ?? {};

    if (!name) {
      throw new Error(
        "pointerDeclaration matched with missing values.",
      );
    }

    return {
      type: "declaration",
      variableType: "int",
      name,
      pointerDepth: 1,
      initializer:
        target === undefined
          ? undefined
          : {
              kind: "address_of",
              target,
            },
    };
  }

  // int *p = q;
  const pointerCopyDeclarationMatch = PARSER_PATTERNS.pointerCopyDeclaration.exec(code);
  if (pointerCopyDeclarationMatch) {
    const { name, sourceName } = pointerCopyDeclarationMatch.groups ?? {};

    if (!name || !sourceName) {
      throw new Error(
        "pointerCopyDeclaration matched with missing values.",
      );
    }

    return {
      type: "declaration",
      variableType: "int",
      name,
      pointerDepth: 1,
      initializer: {
        kind: "read",
        sourceName,
        dereferenceDepth: 0,
      },
    };
  }

  // x = 10;
  const variableAssignmentMatch = PARSER_PATTERNS.variableAssignment.exec(code);
  if (variableAssignmentMatch) {
    const { name, value } = variableAssignmentMatch.groups ?? {};

    if (!name || value === undefined) {
      throw new Error(
        "variableAssignment matched with missing values.",
      );
    }

    return {
      type: "assignment",
      destination: {
        name: name,
        dereferenceDepth: 0,
      },
      expression: {
        kind: "literal",
        value: Number(value),
      },
    };
  }

  // x = y; (also p = q; and pp = qq;)
  const variableCopyAssignmentMatch = PARSER_PATTERNS.variableCopyAssignment.exec(code);
  if (variableCopyAssignmentMatch) {
    const { name, sourceName } = variableCopyAssignmentMatch.groups ?? {};

    if (!name || !sourceName) {
      throw new Error(
        "variableCopyAssignment matched with missing values.",
      );
    }

    return {
      type: "assignment",
      destination: {
        name: name,
        dereferenceDepth: 0,
      },
      expression: {
        kind: "read",
        sourceName,
        dereferenceDepth: 0,
      },
    };
  }

  // p = &x; (also pp = &p;)
  const pointerAssignmentMatch = PARSER_PATTERNS.pointerAssignment.exec(code);
  if (pointerAssignmentMatch) {
    const { name, target } = pointerAssignmentMatch.groups ?? {};

    if (!name || !target) {
      throw new Error(
        "pointerAssignment matched with missing values.",
      );
    }

    return {
      type: "assignment",
      destination: {
        name,
        dereferenceDepth: 0,
      },
      expression: {
        kind: "address_of",
        target,
      },
    };
  }

  // *p = 20;
  const dereferenceAssignmentMatch = PARSER_PATTERNS.dereferenceAssignment.exec(code);
  if (dereferenceAssignmentMatch) {
    const { pointerName, value } = dereferenceAssignmentMatch.groups ?? {};

    if (!pointerName || value === undefined) {
      throw new Error(
        "dereferenceAssignment matched with missing values.",
      );
    }

    return {
      type: "assignment",
      destination: {
        name: pointerName,
        dereferenceDepth: 1,
      },
      expression: {
        kind: "literal",
        value: Number(value),
      },
    };
  }

  // p = q; — same syntax and result as variableCopyAssignment
  const pointerCopyAssignmentMatch = PARSER_PATTERNS.pointerCopyAssignment.exec(code);
  if (pointerCopyAssignmentMatch) {
    const { name, sourceName } = pointerCopyAssignmentMatch.groups ?? {};

    if (!name || !sourceName) {
      throw new Error(
        "pointerCopyAssignment matched with missing values.",
      );
    }

    return {
      type: "assignment",
      destination: {
        name,
        dereferenceDepth: 0,
      },
      expression: {
        kind: "read",
        sourceName,
        dereferenceDepth: 0,
      },
    };
  }

  // int **pp; / int **pp = &p;
  const doublePointerDeclarationV1Match = PARSER_PATTERNS.doublePointerDeclarationV1.exec(code);
  if (doublePointerDeclarationV1Match) {
    const { name, target } = doublePointerDeclarationV1Match.groups ?? {};

    if (!name) {
      throw new Error(
        "doublePointerDeclarationV1 matched with missing values.",
      );
    }

    return {
      type: "declaration",
      variableType: "int",
      name,
      pointerDepth: 2,
      initializer:
        target === undefined
          ? undefined
          : {
              kind: "address_of",
              target,
            },
    };
  }

  // int **pp = qq;
  const doublePointerDeclarationV2Match = PARSER_PATTERNS.doublePointerDeclarationV2.exec(code);
  if (doublePointerDeclarationV2Match) {
    const { name, sourceName } = doublePointerDeclarationV2Match.groups ?? {};

    if (!name) {
      throw new Error(
        "doublePointerDeclarationV2 matched with missing values.",
      );
    }

    return {
      type: "declaration",
      variableType: "int",
      name,
      pointerDepth: 2,
      initializer:
        sourceName === undefined
          ? undefined
          : {
              kind: "read",
              sourceName,
              dereferenceDepth: 0,
            },
    };
  }

  // pp = &q; — same syntax and result as pointerAssignment
  const doublePointerAssignmentV1Match = PARSER_PATTERNS.doublePointerAssignmentV1.exec(code);
  if (doublePointerAssignmentV1Match) {
    const { name, target } = doublePointerAssignmentV1Match.groups ?? {};

    if (!name || !target) {
      throw new Error(
        "doublePointerAssignmentV1 matched with missing values.",
      );
    }

    return {
      type: "assignment",
      destination: {
        name,
        dereferenceDepth: 0,
      },
      expression: {
        kind: "address_of",
        target,
      },
    };
  }

  // pp = qq; — same syntax and result as variableCopyAssignment
  const doublePointerAssignmentV2Match = PARSER_PATTERNS.doublePointerAssignmentV2.exec(code);
  if (doublePointerAssignmentV2Match) {
    const { name, sourceName } = doublePointerAssignmentV2Match.groups ?? {};

    if (!name || !sourceName) {
      throw new Error(
        "doublePointerAssignmentV2 matched with missing values.",
      );
    }

    return {
      type: "assignment",
      destination: {
        name,
        dereferenceDepth: 0,
      },
      expression: {
        kind: "read",
        sourceName,
        dereferenceDepth: 0,
      },
    };
  }

  // *pp = &y;
  const doublePointerFirstDereferenceV1Match = PARSER_PATTERNS.doublePointerFirstDereferenceV1.exec(code);
  if (doublePointerFirstDereferenceV1Match) {
    const { pointerName, target } = doublePointerFirstDereferenceV1Match.groups ?? {};

    if (!pointerName || !target) {
      throw new Error(
        "doublePointerFirstDereferenceV1 matched with missing values.",
      );
    }

    return {
      type: "assignment",
      destination: {
        name: pointerName,
        dereferenceDepth: 1,
      },
      expression: {
        kind: "address_of",
        target,
      },
    };
  }

  // *pp = q;
  const doublePointerFirstDereferenceV2Match = PARSER_PATTERNS.doublePointerFirstDereferenceV2.exec(code);
  if (doublePointerFirstDereferenceV2Match) {
    const { pointerName, sourceName } = doublePointerFirstDereferenceV2Match.groups ?? {};

    if (!pointerName || !sourceName) {
      throw new Error(
        "doublePointerFirstDereferenceV2 matched with missing values.",
      );
    }

    return {
      type: "assignment",
      destination: {
        name: pointerName,
        dereferenceDepth: 1,
      },
      expression: {
        kind: "read",
        sourceName,
        dereferenceDepth: 0,
      },
    };
  }

  // **pp = 10;
  const doublePointerSecondDereferenceV1Match = PARSER_PATTERNS.doublePointerSecondDereferenceV1.exec(code);
  if (doublePointerSecondDereferenceV1Match) {
    const { pointerName, value } = doublePointerSecondDereferenceV1Match.groups ?? {};

    if (!pointerName || value === undefined) {
      throw new Error(
        "doublePointerSecondDereferenceV1 matched with missing values.",
      );
    }

    return {
      type: "assignment",
      destination: {
        name: pointerName,
        dereferenceDepth: 2,
      },
      expression: {
        kind: "literal",
        value: Number(value),
      },
    };
  }

  // **pp = y;
  const doublePointerSecondDereferenceV2Match = PARSER_PATTERNS.doublePointerSecondDereferenceV2.exec(code);
  if (doublePointerSecondDereferenceV2Match) {
    const { pointerName, sourceName } = doublePointerSecondDereferenceV2Match.groups ?? {};

    if (!pointerName || !sourceName) {
      throw new Error(
        "doublePointerSecondDereferenceV2 matched with missing values.",
      );
    }

    return {
      type: "assignment",
      destination: {
        name: pointerName,
        dereferenceDepth: 2,
      },
      expression: {
        kind: "read",
        sourceName,
        dereferenceDepth: 0,
      },
    };
  }

  // **pp = *p;
  const doublePointerSecondDereferenceV3Match = PARSER_PATTERNS.doublePointerSecondDereferenceV3.exec(code);
  if (doublePointerSecondDereferenceV3Match) {
    const { pointerName, sourceName } = doublePointerSecondDereferenceV3Match.groups ?? {};

    if (!pointerName || !sourceName) {
      throw new Error(
        "doublePointerSecondDereferenceV3 matched with missing values.",
      );
    }

    return {
      type: "assignment",
      destination: {
        name: pointerName,
        dereferenceDepth: 2,
      },
      expression: {
        kind: "read",
        sourceName,
        dereferenceDepth: 1,
      },
    };
  }

  // int *q = *pp;
  const copyInnerPointerDeclarationMatch = PARSER_PATTERNS.copyInnerPointerDeclaration.exec(code);
  if (copyInnerPointerDeclarationMatch) {
    const { name, sourceName } = copyInnerPointerDeclarationMatch.groups ?? {};

    if (!name || !sourceName) {
      throw new Error(
        "copyInnerPointerDeclaration matched with missing values.",
      );
    }

    return {
      type: "declaration",
      variableType: "int",
      name,
      pointerDepth: 1,
      initializer: {
        kind: "read",
        sourceName,
        dereferenceDepth: 1,
      },
    };
  }

  // q = *pp;
  const copyInnerPointerAssignmentMatch = PARSER_PATTERNS.copyInnerPointerAssignment.exec(code);
  if (copyInnerPointerAssignmentMatch) {
    const { name, sourceName } = copyInnerPointerAssignmentMatch.groups ?? {};

    if (!name || !sourceName) {
      throw new Error(
        "copyInnerPointerAssignment matched with missing values.",
      );
    }

    return {
      type: "assignment",
      destination: {
        name,
        dereferenceDepth: 0,
      },
      expression: {
        kind: "read",
        sourceName,
        dereferenceDepth: 1,
      },
    };
  }

  // int y = **pp;
  const DeclareInnerPointerSecondDereferenceMatch = PARSER_PATTERNS.DeclareInnerPointerSecondDereference.exec(code);
  if (DeclareInnerPointerSecondDereferenceMatch) {
    const { name, sourceName } = DeclareInnerPointerSecondDereferenceMatch.groups ?? {};

    if (!name || !sourceName) {
      throw new Error(
        "DeclareInnerPointerSecondDereference matched with missing values.",
      );
    }

    return {
      type: "declaration",
      variableType: "int",
      name,
      pointerDepth: 0,
      initializer: {
        kind: "read",
        sourceName,
        dereferenceDepth: 2,
      },
    };
  }

  // y = **pp;
  const AssignInnerPointerSecondDereferenceMatch = PARSER_PATTERNS.AssignInnerPointerSecondDereference.exec(code);
  if (AssignInnerPointerSecondDereferenceMatch) {
    const { name, sourceName } = AssignInnerPointerSecondDereferenceMatch.groups ?? {};

    if (!name || !sourceName) {
      throw new Error(
        "AssignInnerPointerSecondDereference matched with missing values.",
      );
    }

    return {
      type: "assignment",
      destination: {
        name: name,
        dereferenceDepth: 0,
      },
      expression: {
        kind: "read",
        sourceName,
        dereferenceDepth: 2,
      },
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