import type { SupportedDataType } from "../constants/supportedFeatures";

/**
 * Primitive value stored inside a normal variable.
 */
export type PrimitiveValue = number;
export interface MemoryCell {
  name: string;
  baseType: SupportedDataType;

  /**
   * Declared type: 0 = int, 1 = int*, 2 = int**.
   */
  pointerDepth: 0 | 1 | 2;

  /**
   * Fake educational memory address.
   */
  address: number;

  /**
   * For pointerDepth 0:
   *   value is the integer stored there.
   *
   * For pointerDepth 1 or 2:
   *   value is the address of the directly referenced cell.
   */
  value: number | null;
}

/**
 * Entire simulated memory at a particular moment.
 */
export interface MemoryState {
  cells: MemoryCell[];
}
