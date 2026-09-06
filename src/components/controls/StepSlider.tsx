import type { ChangeEvent } from "react";

import "./StepSlider.css";

interface StepSliderProps {
  currentStepIndex: number;
  totalSteps: number;
  onStepChange: (stepIndex: number) => void;
}

export function StepSlider({
  currentStepIndex,
  totalSteps,
  onStepChange,
}: StepSliderProps) {
  const hasSteps = totalSteps > 0;

  const maxStepIndex = hasSteps ? totalSteps - 1 : 0;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextStepIndex = Number(event.target.value);

    onStepChange(nextStepIndex);
  };

  return (
    <section className="step-slider" aria-label="Simulation step slider">
      <label htmlFor="simulation-step-slider">
        Simulation step
      </label>

      <input
        id="simulation-step-slider"
        type="range"
        min={0}
        max={maxStepIndex}
        step={1}
        value={hasSteps ? currentStepIndex : 0}
        onChange={handleChange}
        disabled={!hasSteps}
        aria-valuemin={hasSteps ? 1 : 0}
        aria-valuemax={totalSteps}
        aria-valuenow={hasSteps ? currentStepIndex + 1 : 0}
        aria-valuetext={
          hasSteps
            ? `Step ${currentStepIndex + 1} of ${totalSteps}`
            : "No simulation steps"
        }
      />

      <span>
        {hasSteps
          ? `${currentStepIndex + 1} / ${totalSteps}`
          : "0 / 0"}
      </span>
    </section>
  );
}