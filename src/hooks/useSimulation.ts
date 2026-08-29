import { useMemo } from "react";

import { parseProgram } from "../engine/parser/parser";
import { simulateProgram } from "../engine/simulator/simulator";
import type {
  SimulationResult,
  SimulationStep,
} from "../models/simulation";

interface UseSimulationResult {
  simulation: SimulationResult | null;
  steps: SimulationStep[];
  error: string | null;
  hasError: boolean;
}

const EMPTY_STEPS: SimulationStep[] = [];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unknown simulation error occurred.";
}

export function useSimulation(code: string): UseSimulationResult {
  return useMemo(() => {
    try {
      const statements = parseProgram(code);
      const simulation = simulateProgram(statements);

      return {
        simulation,
        steps: simulation.steps,
        error: null,
        hasError: false,
      };
    } catch (error: unknown) {
      return {
        simulation: null,
        steps: EMPTY_STEPS,
        error: getErrorMessage(error),
        hasError: true,
      };
    }
  }, [code]);
}