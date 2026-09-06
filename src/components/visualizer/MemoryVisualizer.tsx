import type { MemoryState } from "../../models/memory";
import { MemoryBox } from "./MemoryBox";

interface MemoryVisualizerProps {
  memory: MemoryState | null;
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
          <MemoryBox
            key={cell.address}
            cell={cell}
          />
        ))}
      </div>
    </section>
  );
}