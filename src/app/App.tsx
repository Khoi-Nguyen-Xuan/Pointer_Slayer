import { useState } from "react";

import "./App.css";

import { CodeEditor } from "../components/editor/CodeEditor";
import { MemoryVisualizer } from "../components/visualizer/MemoryVisualizer";
import { StepControls } from "../components/controls/StepControls";
import { StepSlider } from "../components/controls/StepSlider";

import { useSimulation } from "../hooks/useSimulation";
import { useStepNavigation } from "../hooks/useStepNavigation";

const DEFAULT_CODE = `// 3 integer variables
int a = 10;
int b = 20;
int c = 30;

// 3 pointers to int
int *p1 = &a;
int *p2 = &b;
int *p3 = &c;

// 3 pointers to pointers
int **pp1 = &p1;
int **pp2 = &p2;
int **pp3 = &p3;

//dereference path
**pp2 = 50;
*p1 = 40; 

//Change pointer target
pp2=pp3;`;

export function App() {
  // State for the code in the editor
  const [code, setCode] = useState(DEFAULT_CODE);

  // Run the simulation on the current code
  const {
    steps,
    error,
    hasError,
  } = useSimulation(code);

  // Manage the current step in the simulation
  const {
    currentStepIndex,
    currentStep,
    canGoPrevious,
    canGoNext,
    previous,
    next,
    goToStep,
  } = useStepNavigation(steps);

  const hasDoublePointers = currentStep?.memory.cells.some(
    (cell) => cell.pointerDepth === 2,
  ) ?? false;

  return (
    <main>
      <header>
        <div>
          <h1 className="header">Pointer Slayer</h1>
          <div className="header-image">
            <img
              src="/images/nezuko.png"
              alt="Pointer Slayer Logo"
              width={200}
              height={200}
              className="nezuko-image"
              />
            <img
              src="/images/box.png"
              alt="Pointer Slayer Logo"
              width={200}
              height={200}
              className="box-image"
            />
          </div>
        </div>
        <p>Visualize C pointers and memory step by step.</p>
      </header>

      <div className={`editor-visualizer-container${hasDoublePointers ? " has-double-pointers" : ""}`}>
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
        <MemoryVisualizer step={currentStep} />
      </div>


    </main>
  );
}
