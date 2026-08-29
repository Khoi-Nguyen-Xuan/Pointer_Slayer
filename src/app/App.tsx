import { useState } from "react";

import { CodeEditor } from "../components/editor/CodeEditor";
import { MemoryVisualizer } from "../components/visualizer/MemoryVisualizer";
import { StepControls } from "../components/controls/StepControls";
import { StepSlider } from "../components/controls/StepSlider";

import { useSimulation } from "../hooks/useSimulation";
import { useStepNavigation } from "../hooks/useStepNavigation";

const DEFAULT_CODE = `int x = 5;
int *p = &x;
x = 10;
*p = 20;`;

export function App() {
  const [code, setCode] = useState(DEFAULT_CODE);

  const {
    steps,
    error,
    hasError,
  } = useSimulation(code);

  const {
    currentStepIndex,
    currentStep,
    canGoPrevious,
    canGoNext,
    previous,
    next,
    goToStep,
  } = useStepNavigation(steps);

  return (
    <main>
      <header>
        <h1>Pointer Slayer</h1>
        <p>Visualize C pointers and memory step by step.</p>
      </header>

      <div>
        <CodeEditor
          code={code}
          onChange={setCode}
          activeLine={currentStep?.lineNumber ?? null}
        />

        <MemoryVisualizer
          memory={currentStep?.memory ?? null}
        />
      </div>

      {hasError && (
        <section role="alert" aria-label="Simulation error">
          <strong>Unable to simulate program.</strong>
          <p>{error}</p>
        </section>
      )}

      {!hasError && steps.length > 0 && (
        <section aria-label="Current simulation step">
          <p>
            Line {currentStep?.lineNumber}:{" "}
            <code>{currentStep?.sourceLine}</code>
          </p>
        </section>
      )}

      <StepControls
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        onPrevious={previous}
        onNext={next}
        currentStepIndex={currentStepIndex}
        totalSteps={steps.length}
      />

      <StepSlider
        currentStepIndex={currentStepIndex}
        totalSteps={steps.length}
        onStepChange={goToStep}
      />
    </main>
  );
}