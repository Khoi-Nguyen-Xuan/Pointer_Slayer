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
 */
export type SupportedDataType =
  (typeof SUPPORTED_DATA_TYPES)[number];
