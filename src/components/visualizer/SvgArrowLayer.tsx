import { useEffect, useMemo, useRef } from "react";

import type { ElementPositions } from "../../hooks/useElementPositions";
import type { SimulationStep } from "../../models/simulation";
import { ARROW_ANIMATION_MS, getMemoryArrows } from "./memoryArrows";

interface SvgArrowLayerProps {
  positions: ElementPositions;
  step: SimulationStep;
  arrowPath: readonly number[];
  onAnimationComplete: () => void;
}

export function SvgArrowLayer({
  positions,
  step,
  arrowPath,
  onAnimationComplete,
}: SvgArrowLayerProps) {
  const arrowRefs = useRef<Map<string, SVGGElement>>(new Map());
  const progress = useRef<{ step: SimulationStep; nextArrow: number } | null>(null);
  const arrows = useMemo(
    () => getMemoryArrows(step.memory, positions),
    [step.memory, positions],
  );

  useEffect(() => {
    if (arrowPath.length === 0) return;
    if (progress.current?.step !== step) {
      progress.current = { step, nextArrow: 0 };
    }
    const currentProgress = progress.current;

    // The measurement hook may not have supplied all the boxes yet.
    if (!arrowPath.every((address) => arrows.some((arrow) => arrow.pointerAddress === address))) {
      return;
    }

    let cancelled = false;
    const animations: Animation[] = [];
    const activeGroups: SVGGElement[] = [];
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : ARROW_ANIMATION_MS;

    const replayPath = async () => {
      for (let index = currentProgress.nextArrow; index < arrowPath.length; index += 1) {
        const arrow = arrows.find((candidate) => candidate.pointerAddress === arrowPath[index]);
        if (!arrow || cancelled) return;
        const group = arrowRefs.current.get(arrow.id);
        const line = group?.querySelector("line");
        const arrowhead = group?.querySelector("path");
        if (!group || !line || !arrowhead) return;

        const angle = Math.atan2(
          arrow.target.y - arrow.source.y,
          arrow.target.x - arrow.source.x,
        ) * 180 / Math.PI;
        group.dataset.animating = "true";
        activeGroups.push(group);

        const lineAnimation = line.animate(
          [{ strokeDasharray: "0 1" }, { strokeDasharray: "1 0" }],
          { duration, easing: "linear" },
        );
        const headAnimation = arrowhead.animate(
          [
            { transform: `translate(${arrow.source.x}px, ${arrow.source.y}px) rotate(${angle}deg)` },
            { transform: `translate(${arrow.target.x}px, ${arrow.target.y}px) rotate(${angle}deg)` },
          ],
          { duration, easing: "linear" },
        );
        animations.push(lineAnimation, headAnimation);

        try {
          await Promise.all([lineAnimation.finished, headAnimation.finished]);
        } catch {
          // Navigation, editing, or resizing cancels the active animation.
          return;
        }
        if (cancelled) return;
        delete group.dataset.animating;
        currentProgress.nextArrow = index + 1;
      }

      if (!cancelled) onAnimationComplete();
    };

    void replayPath();

    return () => {
      cancelled = true;
      for (const animation of animations) animation.cancel();
      for (const group of activeGroups) delete group.dataset.animating;
    };
  }, [step, arrows, arrowPath, onAnimationComplete]);

  return (
    <svg className="memory-arrows" aria-hidden="true">
      {arrows.map((arrow) => (
        <g
          key={arrow.id}
          data-pointer-address={arrow.pointerAddress}
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
            strokeDasharray="1 0"
            x1={arrow.source.x}
            x2={arrow.target.x}
            y1={arrow.source.y}
            y2={arrow.target.y}
          />
          <path
            className="memory-arrowhead"
            d="M -5 -3 L 0 0 L -5 3 Z"
            transform={`translate(${arrow.target.x} ${arrow.target.y}) rotate(${Math.atan2(
              arrow.target.y - arrow.source.y,
              arrow.target.x - arrow.source.x,
            ) * 180 / Math.PI})`}
          />
        </g>
      ))}
    </svg>
  );
}
