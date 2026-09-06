import type { MemoryCell } from "../../models/memory";
import { formatAddress } from "../../utils/formatAddress";
import { AddressLabel } from "./AddressLabel";

import "./AddressBox.css";

interface AddressBoxProps {
  address: MemoryCell["address"];
  dataType: MemoryCell["dataType"];
  value: MemoryCell["value"];
}

export function AddressBox({ address, dataType, value }: AddressBoxProps) {
  const formattedValue = value === null
    ? "uninitialized"
    : dataType === "int_pointer"
      ? formatAddress(value)
      : String(value);

  return (
    <article
      className="address-box"
      data-address-source={address}
      data-memory-address={address}
      aria-label={`Memory address ${address}`}
    >
      <AddressLabel address={address} />
      <span className="address-box-value">{formattedValue}</span>
    </article>
  );
}