import { useRef } from "react";

import { useElementPositions } from "../../hooks/useElementPositions";
import type { MemoryState } from "../../models/memory";
import { MemoryBox } from "./MemoryBox";
import { SvgArrowLayer } from "./SvgArrowLayer";

import "./MemoryVisualizer.css";

interface MemoryVisualizerProps {
  memory: MemoryState | null;
  animationKey: number;
}

export function MemoryVisualizer({
  memory,
  animationKey,
}: MemoryVisualizerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const positions = useElementPositions(containerRef, memory);

  if (memory === null || memory.cells.length === 0) {
    return (
      <section aria-label="Memory visualization">
        <header>
          <h2>Memory</h2>
        </header>

        <p className="memory-visualizer">No variables in memory yet.</p>
      </section>
    );
  }

  return (
    <section aria-label="Memory visualization">
      <header>
        <h2>Memory</h2>
      </header>

      <div className="memory-visualizer" ref={containerRef}>
        <div className="memory-cells">
          <div className="memory-column memory-variables">
            {memory.cells
              .filter((cell) => cell.dataType === "int")
              .map((cell) => (
                <MemoryBox key={cell.address} cell={cell} />
              ))}
          </div>

          <div className="memory-column memory-pointers">
            {memory.cells
              .filter((cell) => cell.dataType === "int_pointer")
              .map((cell) => (
                <MemoryBox key={cell.address} cell={cell} />
              ))}
          </div>
        </div>

        <SvgArrowLayer
          positions={positions}
          animationKey={animationKey}
          memory={memory}
        />
      </div>
    </section>
  );
}