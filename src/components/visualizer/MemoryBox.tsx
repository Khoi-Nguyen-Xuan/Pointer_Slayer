/* Memory box component for displaying ONE memory cell information */
import type { MemoryCell } from "../../models/memory";
import { formatAddress } from "../../utils/formatAddress";
import { AddressLabel } from "./AddressLabel";

import "./MemoryBox.css";

interface MemoryBoxProps {
  cell: MemoryCell;
  isHighlighted?: boolean;
  displayValue?: number | null;
}

function formatDataType(cell: MemoryCell): string {
  return cell.pointerDepth === 0
    ? cell.baseType
    : `${cell.baseType} ${"*".repeat(cell.pointerDepth)}`;
}

function formatValue(cell: MemoryCell, value: number | null): string {
  if (value === null) {
    return "uninitialized";
  }

  if (cell.pointerDepth > 0) {
    return formatAddress(value);
  }

  return String(value);
}

export function MemoryBox({
  cell,
  isHighlighted = false,
  displayValue = cell.value,
}: MemoryBoxProps) {
  const isPointer = cell.pointerDepth > 0;
  const pointerTarget = isPointer
    ? typeof cell.value === "number"
      ? cell.value
      : undefined
    : undefined;

  return (
    <article
      className={`memory-box${isHighlighted ? " memory-box-highlighted" : ""}`}
      data-memory-cell-address={cell.address}
      data-memory-cell-type={formatDataType(cell)}
      data-pointer-depth={cell.pointerDepth}
      data-pointer-source={pointerTarget}
      aria-label={`Memory cell for ${cell.name}`}
    >
      <header>
        <span><strong>{cell.name}</strong> {formatDataType(cell)}</span>
      </header>

      <dl>
        <div>
          <dt>Value</dt>

          <dd>
            {formatValue(cell, displayValue)}
          </dd>
        </div>

        <div>
          <dt>Address</dt>

          <dd>
            <AddressLabel address={cell.address} />
          </dd>
        </div>
      </dl>
    </article>
  );
}
