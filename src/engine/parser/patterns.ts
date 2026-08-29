/**
 * Reusable pieces of C syntax supported by Pointer Slayer.
 */

const IDENTIFIER = "[A-Za-z_][A-Za-z0-9_]*";
const INTEGER_LITERAL = "[+-]?\\d+";

/**
 * Regex patterns for every statement supported by the MVP.
 *
 * Supported:
 *
 * int x;
 * int x = 5;
 *
 * int *p;
 * int *p = &x;
 *
 * x = 10;
 * p = &x;
 * *p = 20;
 */

export const PARSER_PATTERNS = {
  /**
   * int x;
   * int x = 5;
   * int number = -10;
   */
  variableDeclaration: new RegExp(
    `^\\s*int\\s+(?<name>${IDENTIFIER})` +
      `(?:\\s*=\\s*(?<initialValue>${INTEGER_LITERAL}))?` +
      `\\s*;\\s*$`,
  ),

  /**
   * int *p;
   * int* p;
   * int * p;
   * int *p = &x;
   */
  pointerDeclaration: new RegExp(
    `^\\s*int\\s*\\*\\s*(?<name>${IDENTIFIER})` +
      `(?:\\s*=\\s*&\\s*(?<target>${IDENTIFIER}))?` +
      `\\s*;\\s*$`,
  ),

  /**
   * x = 10;
   * x = -5;
   */
  variableAssignment: new RegExp(
    `^\\s*(?<name>${IDENTIFIER})` +
      `\\s*=\\s*(?<value>${INTEGER_LITERAL})` +
      `\\s*;\\s*$`,
  ),

  /**
   * p = &x;
   */
  pointerAssignment: new RegExp(
    `^\\s*(?<pointerName>${IDENTIFIER})` +
      `\\s*=\\s*&\\s*(?<target>${IDENTIFIER})` +
      `\\s*;\\s*$`,
  ),

  /**
   * *p = 20;
   */
  dereferenceAssignment: new RegExp(
    `^\\s*\\*\\s*(?<pointerName>${IDENTIFIER})` +
      `\\s*=\\s*(?<value>${INTEGER_LITERAL})` +
      `\\s*;\\s*$`,
  ),
} as const;