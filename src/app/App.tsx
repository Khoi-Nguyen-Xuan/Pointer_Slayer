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
      <a
        className="github-link"
        href="https://github.com/Khoi-Nguyen-Xuan/Pointer_Slayer"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View Pointer Slayer on GitHub (opens in a new tab)"
        title="View on GitHub"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
          <path d="M12 .297C5.37.297 0 5.67 0 12.297c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.043-1.61-4.043-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.084 1.838 1.237 1.838 1.237 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.52 11.52 0 0 1 3.003-.404c1.02.005 2.047.138 3.003.404 2.291-1.552 3.297-1.23 3.297-1.23.655 1.652.243 2.873.12 3.176.77.84 1.235 1.911 1.235 3.221 0 4.61-2.805 5.625-5.478 5.922.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
      </a>
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
