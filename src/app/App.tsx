import { useState } from "react";

import "./App.css";

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
        <h1 className="header">Pointer Slayer</h1>
        <p>Visualize C pointers and memory step by step.</p>
      </header>

      <div className="editor-visualizer-container">
        <div>
          <CodeEditor
            code={code}
            onChange={setCode}
            activeLine={currentStep?.lineNumber ?? null}
          />

          <div className="step-controls-container">
            <div className="controls-container">
              {hasError && (
                <section role="alert" aria-label="Simulation error">
                  <strong>Unable to simulate program.</strong>
                  <p>{error}</p>
                </section>
              )}

              {!hasError && steps.length > 0 && (
                <section aria-label="Current simulation step">
                  <p className="current-step-details">
                    <span>Line {currentStep?.lineNumber}</span>
                    <code>{currentStep?.sourceLine}</code>
                  </p>
                </section>
              )}
            </div>
            <StepSlider
              currentStepIndex={currentStepIndex}
              totalSteps={steps.length}
              onStepChange={goToStep}
            />

            <StepControls
              canGoPrevious={canGoPrevious}
              canGoNext={canGoNext}
              onPrevious={previous}
              onNext={next}
              currentStepIndex={currentStepIndex}
              totalSteps={steps.length}
            />
          </div>
        </div>
        <MemoryVisualizer
          memory={currentStep?.memory ?? null}
        />
      </div>


    </main>
  );
}