import type { ElementPositions } from "../../hooks/useElementPositions";

interface SvgArrowLayerProps {
  positions: ElementPositions;
  pointerAddresses: Set<number>;
}

export function SvgArrowLayer({
  positions,
  pointerAddresses,
}: SvgArrowLayerProps) {
  const arrows: Array<{
    source: { x: number; y: number };
    target: { x: number; y: number };
  }> = [];

  for (const [targetAddress, sources] of positions.pointerSources) {
    const addressTarget = positions.addressTargets.get(targetAddress);
    const memoryTarget = positions.memoryTargets.get(targetAddress);
    const targetIsPointer = pointerAddresses.has(targetAddress);
    const target = targetIsPointer ? memoryTarget : addressTarget;

    if (target === undefined) {
      continue;
    }

    for (const source of sources) {
      const pointsToAddress = !targetIsPointer;
      const pointsRight = source.centerX < target.centerX;

      arrows.push({
        source: {
          x: pointsToAddress ? source.left : pointsRight ? source.right : source.left,
          y: source.centerY,
        },
        target: {
          x: pointsToAddress ? target.right : pointsRight ? target.left : target.right,
          y: target.centerY,
        },
      });
    }
  }

  for (const [address, source] of positions.addressSources) {
    const target = positions.memoryTargets.get(address);

    if (target === undefined) {
      continue;
    }

    const pointsRight = source.centerX < target.centerX;

    arrows.push({
      source: {
        x: pointsRight ? source.right : source.left,
        y: source.centerY,
      },
      target: {
        x: pointsRight ? target.left : target.right,
        y: target.centerY,
      },
    });
  }

  return (
    <svg className="memory-arrows" aria-hidden="true">
      <defs>
        <marker
          id="memory-arrowhead"
          markerHeight="4"
          markerWidth="4"
          orient="auto-start-reverse"
          refX="3.5"
          refY="2"
          viewBox="0 0 4 4"
        >
          <path d="M 0 0 L 4 2 L 0 4 z" />
        </marker>
      </defs>

      {arrows.map((arrow, index) => (
        <line
          key={`${arrow.source.x}-${arrow.source.y}-${index}`}
          markerEnd="url(#memory-arrowhead)"
          x1={arrow.source.x}
          x2={arrow.target.x}
          y1={arrow.source.y}
          y2={arrow.target.y}
        />
      ))}
    </svg>
  );
}