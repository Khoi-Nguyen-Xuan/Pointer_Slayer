export function formatAddress(address: number): string {
  return `0x${address.toString(16).toUpperCase()}`;
}