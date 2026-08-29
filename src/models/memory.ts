/**
 * Primitive value stored inside a normal variable.
 */
export type PrimitiveValue = number;

/**
 * Represents one variable occupying memory.
 *
 * Examples:
 *
 * int x = 5;
 *
 * {
 *   name: "x",
 *   dataType: "int",
 *   address: 4096,
 *   value: 5
 * }
 *
 *
 * int *p = &x;
 *
 * {
 *   name: "p",
 *   dataType: "int_pointer",
 *   address: 4100,
 *   value: 4096
 * }
 */
export interface MemoryCell {
  name: string;

  dataType: "int" | "int_pointer";

  /**
   * Fake educational memory address.
   */
  address: number;

  /**
   * For int:
   *   value is the integer stored there.
   *
   * For int_pointer:
   *   value is the address being pointed to.
   *
   * null means the cell currently has no meaningful value.
   */
  value: number | null;
}

/**
 * Entire simulated memory at a particular moment.
 */
export interface MemoryState {
  cells: MemoryCell[];
}