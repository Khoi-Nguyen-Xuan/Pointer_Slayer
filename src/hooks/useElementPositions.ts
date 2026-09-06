import {
  useLayoutEffect,
  useState,
  type RefObject,
} from "react";

import type { MemoryState } from "../models/memory";

export interface ElementRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface ElementPositions {
  pointerSources: Map<number, ElementRect>;
  addressTargets: Map<number, ElementRect>;
}

const createEmptyPositions = (): ElementPositions => ({
  pointerSources: new Map<number, ElementRect>(),
  addressTargets: new Map<number, ElementRect>(),
});

function getRelativeRect(
  element: HTMLElement,
  containerRect: DOMRect,
): ElementRect {
  const rect = element.getBoundingClientRect();

  const left = rect.left - containerRect.left;
  const top = rect.top - containerRect.top;

  return {
    left,
    top,
    right: rect.right - containerRect.left,
    bottom: rect.bottom - containerRect.top,
    width: rect.width,
    height: rect.height,
    centerX: left + rect.width / 2,
    centerY: top + rect.height / 2,
  };
}

function rectsEqual(
  first: ElementRect,
  second: ElementRect,
): boolean {
  return (
    first.left === second.left &&
    first.top === second.top &&
    first.right === second.right &&
    first.bottom === second.bottom &&
    first.width === second.width &&
    first.height === second.height
  );
}

function mapsEqual(
  first: Map<number, ElementRect>,
  second: Map<number, ElementRect>,
): boolean {
  if (first.size !== second.size) {
    return false;
  }

  for (const [address, firstRect] of first) {
    const secondRect = second.get(address);

    if (
      secondRect === undefined ||
      !rectsEqual(firstRect, secondRect)
    ) {
      return false;
    }
  }

  return true;
}

function positionsEqual(
  first: ElementPositions,
  second: ElementPositions,
): boolean {
  return (
    mapsEqual(first.pointerSources, second.pointerSources) &&
    mapsEqual(first.addressTargets, second.addressTargets)
  );
}

export function useElementPositions(
  containerRef: RefObject<HTMLElement | null>,
  memory: MemoryState | null,
): ElementPositions {
  const [positions, setPositions] =
    useState<ElementPositions>(createEmptyPositions);

  useLayoutEffect(() => {
    const container = containerRef.current;

    if (container === null) {
      return;
    }

    let animationFrameId: number | null = null;

    const measure = () => {
      const containerRect = container.getBoundingClientRect();

      const pointerSources = new Map<number, ElementRect>();
      const addressTargets = new Map<number, ElementRect>();

      const pointerSourceElements =
        container.querySelectorAll<HTMLElement>(
          "[data-pointer-source]",
        );

      for (const element of pointerSourceElements) {
        const rawAddress = element.dataset.pointerSource;
        const address = Number(rawAddress);

        if (!Number.isFinite(address)) {
          continue;
        }

        pointerSources.set(
          address,
          getRelativeRect(element, containerRect),
        );
      }

      const addressTargetElements =
        container.querySelectorAll<HTMLElement>(
          "[data-memory-address]",
        );

      for (const element of addressTargetElements) {
        const rawAddress = element.dataset.memoryAddress;
        const address = Number(rawAddress);

        if (!Number.isFinite(address)) {
          continue;
        }

        addressTargets.set(
          address,
          getRelativeRect(element, containerRect),
        );
      }

      const nextPositions: ElementPositions = {
        pointerSources,
        addressTargets,
      };

      setPositions((previousPositions) =>
        positionsEqual(previousPositions, nextPositions)
          ? previousPositions
          : nextPositions,
      );
    };

    const scheduleMeasure = () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        animationFrameId = null;
        measure();
      });
    };

    measure();

    window.addEventListener("resize", scheduleMeasure);

    let resizeObserver: ResizeObserver | null = null;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(scheduleMeasure);

      resizeObserver.observe(container);

      const measurableElements =
        container.querySelectorAll<HTMLElement>(
          "[data-pointer-source], [data-memory-address]",
        );

      for (const element of measurableElements) {
        resizeObserver.observe(element);
      }
    }

    return () => {
      window.removeEventListener("resize", scheduleMeasure);
      resizeObserver?.disconnect();

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [containerRef, memory]);

  return positions;
}