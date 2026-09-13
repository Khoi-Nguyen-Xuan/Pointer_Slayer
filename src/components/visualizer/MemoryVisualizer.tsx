import { useCallback, useMemo, useRef, useState } from "react";

import { useElementPositions } from "../../hooks/useElementPositions";
import type { SimulationStep } from "../../models/simulation";
import { MemoryBox } from "./MemoryBox";
import { SvgArrowLayer } from "./SvgArrowLayer";
import { getStepArrowPath, getStepHighlightNames } from "./memoryArrows";

import "./MemoryVisualizer.css";

interface MemoryVisualizerProps {
  step: SimulationStep | null;
}

export function MemoryVisualizer({ step }: MemoryVisualizerProps) {
  return (
    <section aria-label="Memory visualization">
      <header>
        <h2>Memory</h2>
      </header>

      {step === null || step.memory.cells.length === 0 ? (
        <p className="memory-visualizer">No variables in memory yet.</p>
      ) : (
        <div className="memory-viewport" role="region" aria-label="Memory cells" tabIndex={0}>
          <MemorySnapshot key={step.stepIndex} step={step} />
        </div>
      )}
    </section>
  );
}

/** Each selected step gets its own animation lifetime; the scroll viewport stays put. */
function MemorySnapshot({ step }: { step: SimulationStep }) {
  const memory = step.memory;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const positions = useElementPositions(containerRef, memory);
  const arrowPath = useMemo(() => getStepArrowPath(step), [step]);
  const [completedStep, setCompletedStep] = useState<SimulationStep | null>(null);
  const onAnimationComplete = useCallback(() => setCompletedStep(step), [step]);
  const animationComplete = arrowPath.length === 0 || completedStep === step;
  const hasDoublePointers = memory.cells.some((cell) => cell.pointerDepth === 2);
  const highlightedVariableNames = animationComplete
    ? getStepHighlightNames(step)
    : new Set<string>();
  const pendingValues = new Map<string, number | null>();

  // Show the previous value while the pointer path runs, then reveal and highlight
  // the new value. The simulator's memory snapshot is never modified for animation.
  for (const change of step.changes) {
    if (!animationComplete && change.type === "value_changed") {
      pendingValues.set(change.variableName, change.previousValue);
    } else if (!animationComplete && change.type === "pointer_changed") {
      pendingValues.set(change.pointerName, change.previousAddress);
    }
  }

  return (
    <div
      className={`memory-visualizer${hasDoublePointers ? " has-double-pointers" : ""}`}
      ref={containerRef}
      data-animation-state={animationComplete ? "complete" : "running"}
    >
      <div className="memory-cells">
        <div className="memory-column memory-variables">
          <h3 className="memory-column-title">Integers</h3>
          {memory.cells
            .filter((cell) => cell.pointerDepth === 0)
            .map((cell) => (
              <MemoryBox
                key={cell.address}
                cell={cell}
                isHighlighted={highlightedVariableNames.has(cell.name)}
                displayValue={pendingValues.has(cell.name) ? pendingValues.get(cell.name) : cell.value}
              />
            ))}
        </div>

        <div className="memory-column memory-pointers">
          <h3 className="memory-column-title">Pointers</h3>
          {memory.cells
            .filter((cell) => cell.pointerDepth === 1)
            .map((cell) => (
              <MemoryBox
                key={cell.address}
                cell={cell}
                isHighlighted={highlightedVariableNames.has(cell.name)}
                displayValue={pendingValues.has(cell.name) ? pendingValues.get(cell.name) : cell.value}
              />
            ))}
        </div>

        {hasDoublePointers && (
          <div className="memory-column memory-double-pointers">
            <h3 className="memory-column-title">Double pointers</h3>
            {memory.cells
              .filter((cell) => cell.pointerDepth === 2)
              .map((cell) => (
                <MemoryBox
                  key={cell.address}
                  cell={cell}
                  isHighlighted={highlightedVariableNames.has(cell.name)}
                  displayValue={pendingValues.has(cell.name) ? pendingValues.get(cell.name) : cell.value}
                />
              ))}
          </div>
        )}
      </div>

      <SvgArrowLayer
        positions={positions}
        step={step}
        arrowPath={arrowPath}
        onAnimationComplete={onAnimationComplete}
      />
    </div>
  );
}
