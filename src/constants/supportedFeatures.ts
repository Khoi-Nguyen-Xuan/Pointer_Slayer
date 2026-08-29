/**
 * Central definition of the C syntax supported by Pointer Slayer.
 *
 * Pointer Slayer only supports the small subset of C needed
 * to teach beginner pointer concepts.
 */

export const SUPPORTED_FEATURES = {
  variableDeclarations: true,
  pointerDeclarations: true,
  variableAssignments: true,
  pointerAssignments: true,
  dereferenceAssignments: true,

  arrays: false,
  structs: false,
  malloc: false,
  free: false,
  pointerArithmetic: false,
  doublePointers: false,
  functionCalls: false,
  conditionals: false,
  loops: false,
} as const;

/**
 * Primitive C data types currently understood by the parser.
 */
export const SUPPORTED_DATA_TYPES = ["int"] as const;

/**
 * Type derived automatically from SUPPORTED_DATA_TYPES.
 *
 * Equivalent to:
 *
 * type SupportedDataType = "int";
 */
export type SupportedDataType =
  (typeof SUPPORTED_DATA_TYPES)[number];

/**
 * Examples of syntax that our parser should accept.
 *
 * These are documentation/examples only.
 * Actual parsing behavior will be tested separately.
 */
export const SUPPORTED_SYNTAX_EXAMPLES = {
  variableDeclaration: [
    "int x;",
    "int x = 5;",
  ],

  pointerDeclaration: [
    "int *p;",
    "int *p = &x;",
  ],

  variableAssignment: [
    "x = 10;",
  ],

  pointerAssignment: [
    "p = &x;",
  ],

  dereferenceAssignment: [
    "*p = 20;",
  ],
} as const;