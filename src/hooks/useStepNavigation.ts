import { useCallback, useEffect, useMemo, useState } from "react";

import type { SimulationStep } from "../models/simulation";

interface UseStepNavigationResult {
  currentStepIndex: number;
  currentStep: SimulationStep | null;

  canGoPrevious: boolean;
  canGoNext: boolean;

  previous: () => void;
  next: () => void;
  goToStep: (stepIndex: number) => void;
  reset: () => void;
}

export function useStepNavigation(
  steps: SimulationStep[],
): UseStepNavigationResult {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const lastStepIndex = steps.length - 1;

  /**
   * If the program is edited, a new simulation may contain fewer steps.
   *
   * Example:
   * - old simulation: 6 steps
   * - user is viewing step 5
   * - new simulation: 3 steps
   *
   * Step 5 no longer exists, so clamp the current index to step 2.
   */
  useEffect(() => {
    setCurrentStepIndex((previousIndex) => {
      if (steps.length === 0) {
        return 0;
      }

      return Math.min(previousIndex, lastStepIndex);
    });
  }, [steps.length, lastStepIndex]);

  const currentStep = useMemo(() => {
    return steps[currentStepIndex] ?? null;
  }, [steps, currentStepIndex]);

  const canGoPrevious = currentStepIndex > 0;

  const canGoNext =
    steps.length > 0 && currentStepIndex < lastStepIndex;

  const previous = useCallback(() => {
    setCurrentStepIndex((previousIndex) =>
      Math.max(0, previousIndex - 1),
    );
  }, []);

  const next = useCallback(() => {
    setCurrentStepIndex((previousIndex) => {
      if (steps.length === 0) {
        return 0;
      }

      return Math.min(lastStepIndex, previousIndex + 1);
    });
  }, [steps.length, lastStepIndex]);

  const goToStep = useCallback(
    (stepIndex: number) => {
      if (steps.length === 0) {
        setCurrentStepIndex(0);
        return;
      }

      const clampedIndex = Math.min(
        Math.max(stepIndex, 0),
        lastStepIndex,
      );

      setCurrentStepIndex(clampedIndex);
    },
    [steps.length, lastStepIndex],
  );

  const reset = useCallback(() => {
    setCurrentStepIndex(0);
  }, []);

  return {
    currentStepIndex,
    currentStep,
    canGoPrevious,
    canGoNext,
    previous,
    next,
    goToStep,
    reset,
  };
}