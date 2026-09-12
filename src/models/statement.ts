import type { SupportedDataType } from "../constants/supportedFeatures";
export type DereferenceDepth = 0 | 1 | 2;
export type Expression =
  | { kind: "literal"; value: number }
  | { kind: "address_of"; target: string }
  | {
      kind: "read";
      sourceName: string;
      dereferenceDepth: DereferenceDepth;
    };

export interface Declaration {
  type: "declaration";
  variableType: SupportedDataType;
  name: string;
  pointerDepth: 0 | 1 | 2;
  initializer?: Expression;
}

export interface Assignment {
  type: "assignment";
  destination: {
    name: string;
    dereferenceDepth: DereferenceDepth;
  };
  expression: Expression;
}

export type Statement = Declaration | Assignment;
