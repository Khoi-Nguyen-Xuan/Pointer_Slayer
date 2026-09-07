import { useEffect, useRef } from "react";

import type { ElementPositions } from "../../hooks/useElementPositions";

interface SvgArrowLayerProps {
  positions: ElementPositions;
  animationKey: number;
}

export function SvgArrowLayer({
  positions,
  animationKey,
}: SvgArrowLayerProps) {
  const arrowRefs = useRef<Map<string, SVGGElement>>(new Map());
  const arrows: Array<{
    id: string;
    source: { x: number; y: number };
    target: { x: number; y: number };
  }> = [];

  for (const [targetAddress, sources] of positions.pointerSources) {
    const target = positions.memoryTargets.get(targetAddress);
    if (target === undefined) {
      continue;
    }

    for (const source of sources) {
      const pointsRight = source.rect.centerX < target.centerX;
      const id = `${source.address}->${targetAddress}`;

      arrows.push({
        id,
        source: {
          x: pointsRight ? source.rect.right : source.rect.left,
          y: source.rect.centerY,
        },
        target: {
          x: pointsRight ? target.left : target.right,
          y: target.centerY,
        },
      });
    }
  }

  useEffect(() => {
    for (const arrow of arrows) {
      const id = arrow.id;
      const group = arrowRefs.current.get(id);
      const animations = Array.from(
        group?.querySelectorAll("animate, animateMotion") ?? [],
      ) as SVGAnimationElement[];

      for (const animation of animations) {
        animation.beginElement();
      }
    }
  }, [animationKey, positions]);

  return (
    <svg className="memory-arrows" aria-hidden="true">
      {arrows.map((arrow) => (
        <g
          key={arrow.id}
          ref={(group) => {
            if (group === null) {
              arrowRefs.current.delete(arrow.id);
            } else {
              arrowRefs.current.set(arrow.id, group);
            }
          }}
        >
          <line
            pathLength={1}
            strokeDasharray="0 1"
            x1={arrow.source.x}
            x2={arrow.target.x}
            y1={arrow.source.y}
            y2={arrow.target.y}
          >
            <animate
              attributeName="stroke-dasharray"
              begin="indefinite"
              dur="700ms"
              fill="freeze"
              from="0 1"
              to="1 0"
            />
          </line>

          <path
            className="memory-arrowhead"
            d="M -5 -3 L 0 0 L -5 3 Z"
          >
            <animateMotion
              begin="indefinite"
              dur="700ms"
              fill="freeze"
              path={`M ${arrow.source.x} ${arrow.source.y} L ${arrow.target.x} ${arrow.target.y}`}
              rotate="auto"
            />
          </path>
        </g>
      ))}
    </svg>
  );
}