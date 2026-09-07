import "./StepControls.css";

interface StepControlsProps {
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  currentStepIndex: number;
  totalSteps: number;
}

export function StepControls({
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
  currentStepIndex,
  totalSteps,
}: StepControlsProps) {
  const hasSteps = totalSteps > 0;

  return (
    <section className="step-controls" aria-label="Simulation controls">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!canGoPrevious}
      >
        Previous
      </button>

      <span aria-live="polite">
        {hasSteps
          ? `Step ${currentStepIndex + 1} of ${totalSteps}`
          : "No simulation steps"}
      </span>

      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
      >
        Next
      </button>
    </section>
  );
}