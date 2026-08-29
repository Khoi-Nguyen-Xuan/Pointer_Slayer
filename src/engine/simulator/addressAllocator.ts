/**
 * Starting address for simulated memory.
 *
 * 0x1000 hexadecimal.
 */
export const DEFAULT_START_ADDRESS = 0x1000;

/**
 * 0x1000
 * 0x1004
 * 0x1008
 * 0x100C
 */
export const DEFAULT_ADDRESS_STEP = 4;

/**
 * Generates deterministic fake memory addresses.
 */
export class AddressAllocator {
  private nextAddress: number;
  private readonly addressStep: number;

  constructor(
    startAddress = DEFAULT_START_ADDRESS,
    addressStep = DEFAULT_ADDRESS_STEP,
  ) {
    this.nextAddress = startAddress;
    this.addressStep = addressStep;
  }

  /**
   * Returns the next available simulated memory address
   * and advances the allocator.
   *
   * allocate() -> 0x1000
   * allocate() -> 0x1004
   * allocate() -> 0x1008
   */
  allocate(): number {
    const address = this.nextAddress;

    this.nextAddress += this.addressStep;

    return address;
  }

  /**
   * Reset the allocator back to its initial educational
   * starting address.
   */
  reset(startAddress = DEFAULT_START_ADDRESS): void {
    this.nextAddress = startAddress;
  }
}