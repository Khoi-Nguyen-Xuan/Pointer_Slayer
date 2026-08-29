/**
 * Statements supported by the Pointer Slayer.
 *
 * Example C:
 *
 * int x = 5;
 * int *p = &x;
 * x = 10;
 * p = &y;
 * *p = 20;
 */


import type { SupportedDataType } from "../constants/supportedFeatures";

export interface VariableDeclaration {
  type: "variable_declaration";
  variableType: SupportedDataType;
  name: string;
  initialValue?: number;
}

export interface PointerDeclaration {
  type: "pointer_declaration";
  pointsToType: SupportedDataType;
  name: string;
  target?: string;
}

export interface VariableAssignment {
  type: "variable_assignment";

  /**
   * x = 10;
   */
  name: string;
  value: number;
}

export interface PointerAssignment {
  type: "pointer_assignment";

  /**
   * p = &x;
   */
  pointerName: string;
  target: string;
}

export interface DereferenceAssignment {
  type: "dereference_assignment";

  /**
   * *p = 20;
   */
  pointerName: string;
  value: number;
}

/**
 * Any statement understood by the simulator.
 *
 * Later the parser will return:
 *
 * ParsedStatement[]
 */
export type Statement =
  | VariableDeclaration
  | PointerDeclaration
  | VariableAssignment
  | PointerAssignment
  | DereferenceAssignment;


  /**
   *  Later:
    * switch (statement.type) {
    case "variable_declaration":
      // ...
      break;

    case "pointer_declaration":
      // ...
      break;

    case "variable_assignment":
      // ...
      break;
  }
   */