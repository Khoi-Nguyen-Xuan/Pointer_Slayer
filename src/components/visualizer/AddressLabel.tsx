/* numeric address
      ↓
render identifiable address element */
import { formatAddress } from "../../utils/formatAddress";

interface AddressLabelProps {
  address: number;
}

export function AddressLabel({
  address,
}: AddressLabelProps) {
  return (
    <span aria-label={`Memory address ${formatAddress(address)}`}>
      {formatAddress(address)}
    </span>
  );
}