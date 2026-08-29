import type { MemoryCell, MemoryState } from "../../models/memory";

interface MemoryVisualizerProps {
  memory: MemoryState | null;
}

function formatAddress(address: number): string {
  return `0x${address.toString(16).toUpperCase()}`;
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

export function MemoryVisualizer({
  memory,
}: MemoryVisualizerProps) {
  if (memory === null || memory.cells.length === 0) {
    return (
      <section aria-label="Memory visualization">
        <header>
          <h2>Memory</h2>
        </header>

        <p>No variables in memory yet.</p>
      </section>
    );
  }

  return (
    <section aria-label="Memory visualization">
      <header>
        <h2>Memory</h2>
      </header>

      <div>
        {memory.cells.map((cell) => (
          <article key={cell.address}>
            <div>
              <strong>{cell.name}</strong>
            </div>

            <dl>
              <div>
                <dt>Type</dt>
                <dd>{formatDataType(cell.dataType)}</dd>
              </div>

              <div>
                <dt>Value</dt>
                <dd>{formatValue(cell)}</dd>
              </div>

              <div>
                <dt>Address</dt>
                <dd>{formatAddress(cell.address)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}