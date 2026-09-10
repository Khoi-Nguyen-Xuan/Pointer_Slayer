import { useEffect, useRef } from "react";

import type { ElementPositions } from "../../hooks/useElementPositions";
import type { MemoryState } from "../../models/memory";

interface SvgArrowLayerProps {
  positions: ElementPositions;
  animationKey: number;
  memory: MemoryState;
}

export function SvgArrowLayer({
  positions,
  animationKey,
  memory,
}: SvgArrowLayerProps) {
  const arrowRefs = useRef<Map<string, SVGGElement>>(new Map());
  const arrowheadRefs = useRef<Map<string, SVGPathElement>>(new Map());
  const previousArrowSignatures = useRef<Map<string, string>>(new Map());
  const cellsByAddress = new Map(
    memory.cells.map((cell) => [cell.address, cell]),
  );
  const arrows: Array<{
    id: string;
    signature: string;
    animate: boolean;
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
      const sourceCell = cellsByAddress.get(source.address);
      const targetCell = cellsByAddress.get(targetAddress);
      const signature = [
        id,
        sourceCell?.value ?? "null",
        targetCell?.value ?? "null",
      ].join(":");

      arrows.push({
        id,
        signature,
        animate: previousArrowSignatures.current.get(id) !== signature,
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
      if (!arrow.animate) {
        continue;
      }

      const id = arrow.id;
      const group = arrowRefs.current.get(id);
      const animations = Array.from(
        group?.querySelectorAll("animate") ?? [],
      ) as SVGAnimationElement[];

      for (const animation of animations) {
        animation.beginElement();
      }

      const arrowhead = arrowheadRefs.current.get(id);

      if (arrowhead !== undefined) {
        const angle = Math.atan2(
          arrow.target.y - arrow.source.y,
          arrow.target.x - arrow.source.x,
        ) * 180 / Math.PI;

        arrowhead.animate(
          [
            {
              transform: `translate(${arrow.source.x}px, ${arrow.source.y}px) rotate(${angle}deg)`,
            },
            {
              transform: `translate(${arrow.target.x}px, ${arrow.target.y}px) rotate(${angle}deg)`,
            },
          ],
          {
            duration: 700,
            easing: "linear",
            fill: "forwards",
          },
        );
      }
    }

    previousArrowSignatures.current = new Map(
      arrows.map((arrow) => [arrow.id, arrow.signature]),
    );
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
            strokeDasharray={arrow.animate ? "0 1" : "1 0"}
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

          {arrow.animate ? (
            <path
              className="memory-arrowhead"
              d="M -5 -3 L 0 0 L -5 3 Z"
              ref={(path) => {
                if (path === null) {
                  arrowheadRefs.current.delete(arrow.id);
                } else {
                  arrowheadRefs.current.set(arrow.id, path);
                }
              }}
              style={{
                transform: `translate(${arrow.source.x}px, ${arrow.source.y}px) rotate(${Math.atan2(
                  arrow.target.y - arrow.source.y,
                  arrow.target.x - arrow.source.x,
                ) * 180 / Math.PI}deg)`,
              }}
            >
            </path>
          ) : (
            <path
              className="memory-arrowhead"
              d="M -5 -3 L 0 0 L -5 3 Z"
              transform={`translate(${arrow.target.x} ${arrow.target.y}) rotate(${Math.atan2(
                arrow.target.y - arrow.source.y,
                arrow.target.x - arrow.source.x,
              ) * 180 / Math.PI})`}
            />
          )}
        </g>
      ))}
    </svg>
  );
}