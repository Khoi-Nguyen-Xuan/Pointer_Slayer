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
  pointerSources: Map<number, ElementRect[]>;
  addressSources: Map<number, ElementRect>;
  addressTargets: Map<number, ElementRect>;
  memoryTargets: Map<number, ElementRect>;
}

const createEmptyPositions = (): ElementPositions => ({
  pointerSources: new Map<number, ElementRect[]>(),
  addressSources: new Map<number, ElementRect>(),
  addressTargets: new Map<number, ElementRect>(),
  memoryTargets: new Map<number, ElementRect>(),
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

function rectMapsEqual(
  first: Map<number, ElementRect>,
  second: Map<number, ElementRect>,
): boolean {
  if (first.size !== second.size) {
    return false;
  }

  for (const [address, firstRect] of first) {
    const secondRect = second.get(address);

    if (secondRect === undefined || !rectsEqual(firstRect, secondRect)) {
      return false;
    }
  }

  return true;
}

function sourceMapsEqual(
  first: Map<number, ElementRect[]>,
  second: Map<number, ElementRect[]>,
): boolean {
  if (first.size !== second.size) {
    return false;
  }

  for (const [address, firstRect] of first) {
    const secondRect = second.get(address);

    if (secondRect === undefined || firstRect.length !== secondRect.length) {
      return false;
    }

    for (let index = 0; index < firstRect.length; index += 1) {
      if (!rectsEqual(firstRect[index], secondRect[index])) {
        return false;
      }
    }
  }

  return true;
}

function positionsEqual(
  first: ElementPositions,
  second: ElementPositions,
): boolean {
  return (
    sourceMapsEqual(first.pointerSources, second.pointerSources) &&
    rectMapsEqual(first.addressSources, second.addressSources) &&
    rectMapsEqual(first.addressTargets, second.addressTargets) &&
    rectMapsEqual(first.memoryTargets, second.memoryTargets)
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

      const pointerSources = new Map<number, ElementRect[]>();
      const addressSources = new Map<number, ElementRect>();
      const addressTargets = new Map<number, ElementRect>();
      const memoryTargets = new Map<number, ElementRect>();

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

        const sources = pointerSources.get(address) ?? [];
        sources.push(getRelativeRect(element, containerRect));
        pointerSources.set(address, sources);
      }

      const addressSourceElements =
        container.querySelectorAll<HTMLElement>(
          "[data-address-source]",
        );

      for (const element of addressSourceElements) {
        const rawAddress = element.dataset.addressSource;
        const address = Number(rawAddress);

        if (!Number.isFinite(address)) {
          continue;
        }

        addressSources.set(
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

      const memoryTargetElements =
        container.querySelectorAll<HTMLElement>(
          "[data-memory-cell-address]",
        );

      for (const element of memoryTargetElements) {
        const rawAddress = element.dataset.memoryCellAddress;
        const address = Number(rawAddress);

        if (!Number.isFinite(address)) {
          continue;
        }

        memoryTargets.set(
          address,
          getRelativeRect(element, containerRect),
        );
      }

      const nextPositions: ElementPositions = {
        pointerSources,
        addressSources,
        addressTargets,
        memoryTargets,
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
          "[data-pointer-source], [data-address-source], [data-memory-address], [data-memory-cell-address]",
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