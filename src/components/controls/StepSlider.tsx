import { useEffect, useRef, useState, type ChangeEvent } from "react";

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
  const currentPercent = maxStepIndex === 0
    ? 0
    : currentStepIndex / maxStepIndex * 100;
  const [sliderPercent, setSliderPercent] = useState(currentPercent);
  const isInteracting = useRef(false);

  useEffect(() => {
    if (!isInteracting.current) {
      setSliderPercent(currentPercent);
    }
  }, [currentPercent]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextPercent = Number(event.target.value);

    isInteracting.current = true;
    setSliderPercent(nextPercent);

    onStepChange(
      Math.round(nextPercent / 100 * maxStepIndex),
    );
  };

  const endInteraction = () => {
    isInteracting.current = false;
    setSliderPercent(currentPercent);
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
        max={100}
        step={0.1}
        value={hasSteps ? sliderPercent : 0}
        onChange={handleChange}
        onPointerDown={() => {
          isInteracting.current = true;
        }}
        onKeyDown={() => {
          isInteracting.current = true;
        }}
        onPointerUp={endInteraction}
        onKeyUp={endInteraction}
        onBlur={endInteraction}
        disabled={!hasSteps}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={hasSteps ? Math.round(sliderPercent) : 0}
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