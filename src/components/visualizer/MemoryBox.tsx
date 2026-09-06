/* Memory box component for displaying ONE memory cell information */
import type { MemoryCell } from "../../models/memory";
import { formatAddress } from "../../utils/formatAddress";
import { AddressLabel } from "./AddressLabel";

interface MemoryBoxProps {
  cell: MemoryCell;
}

function formatDataType(dataType: MemoryCell["dataType"]): string {
  switch (dataType) {
    case "int":
      return "int";

    case "int_pointer":
      return "int *";
  }
}

function formatValue(cell: MemoryCell): string {
  if (cell.value === null) {
    return "uninitialized";
  }

  if (cell.dataType === "int_pointer") {
    return formatAddress(cell.value);
  }

  return String(cell.value);
}

export function MemoryBox({
  cell,
}: MemoryBoxProps) {
  const isPointer = cell.dataType === "int_pointer";

  return (
    <article
      data-memory-cell-address={cell.address}
      aria-label={`Memory cell for ${cell.name}`}
    >
      <header>
        <strong>{cell.name}</strong>
        <span>{formatDataType(cell.dataType)}</span>
      </header>

      <dl>
        <div>
          <dt>Value</dt>

          <dd>
            <span
              data-pointer-source={
                isPointer ? cell.address : undefined
              }
            >
              {formatValue(cell)}
            </span>
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