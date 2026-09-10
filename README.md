# Pointer Slayer

**An interactive C pointer and memory visualizer built with React and TypeScript.**


## Demo

**Live Demo:** https://pointer-slayer.netlify.app/

**Repository:** https://github.com/Khoi-Nguyen-Xuan/Pointer_Slayer

---

Pointer Slayer is an educational web application designed to help students that I'm TAing in CMPUT 201 (Practical Programming Methodology) understand one of the most challenging concepts (at least for me) in C programming: **pointers and memory**.

Instead of simply showing the output of a C program, Pointer Slayer parses a supported subset of C code, simulates its execution entirely in the browser, and visualizes how variables, memory addresses, and pointers change **step by step**.

The project was inspired by the difficulty I often face when trying to trace pointer assignments such as:

```c
int x = 5;
int *p = &x;
*p = 10;
```

Pointer Slayer turns C program like this into an interactive visualization showing variables, addresses, values, and pointer relationships.

> Pointer Slayer is intentionally **not a compiler or IDE**. 
---


# Main Features

### Interactive C Code Editor

Users can write a small C program using the subset of syntax supported by Pointer Slayer.

Example:

```c
int x = 5;
int *p = &x;
*p = 20;
```

---

### Step-by-Step Program Execution

Rather than executing the entire program immediately, Pointer Slayer generates a sequence of simulation states.

Users can move forward and backward through the program and inspect how memory changes after each statement.

---

### Memory Visualization

Each variable is represented visually with information such as:

* variable name
* current value
* simulated memory address
* pointer target

For pointer variables, arrows visually connect the pointer to the memory location it references.

---

### Pointer Assignment Visualization

Pointer operations such as:

```c
int *p = &x;
```

are visualized as a relationship between two memory cells.

When pointer relationships change, the visualization updates accordingly.

---

### Pointer Dereferencing

Pointer writes are simulated as well.

For example:

```c
*p = 20;
```

updates the value stored in the memory location referenced by `p`.

---

### Interactive Step Navigation

Users can inspect execution using:

* Previous / Next controls
* step navigation
* simulation timeline / slider
* highlighted active source line


---

# Architecture

Pointer Slayer separates the application into three primary layers:

```text
                    User C Code
                         │
                         ▼
                ┌─────────────────┐
                │      Parser     │
                │                 │
                │ C source code   │
                │      →          │
                │ Statements      │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ Simulation      │
                │ Engine          │
                │                 │
                │ Statements      │
                │      →          │
                │ Memory States   │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ React UI        │
                │                 │
                │ Code Editor     │
                │ Memory Boxes    │
                │ Pointer Arrows  │
                │ Step Controls   │
                └─────────────────┘
```

This separation keeps parsing, program execution, and visualization independent from each other.

---

# How the Simulation Pipeline Works

Suppose the user enters:

```c
int x = 5;
int *p = &x;
*p = 20;
```

Pointer Slayer processes the program in 4 main stages.

## 1. Parsing

The parser converts source lines into structured statements.

For example, this line of C code:

```text
int x = 5;
```

becomes:

```ts
{
  type: "intDeclaration",
  name: "x",
  value: 5
}
```

Or this 

```text
int *p = &x;
```
becomes:

```ts
{
  type: "pointerDeclaration",
  name: "p",
  target: x
}
```

This creates a clean boundary between ** C syntax** and **execution logic**.

---

## 2. Simulation

The simulation engine executes the parsed statements sequentially.

Each statement produces a new snapshot of memory.

Conceptually:

```text
Step 0
[]

Step 1
[x = 5]

Step 2
[x = 5]
[p = &x]

Step 3
[x = 20]
[p = &x]
```

Because every state is preserved, the UI can move both forward and backward through the execution history without re-running the entire program.

---

## 3. Memory Representation

The simulator represents memory using structured TypeScript models instead of directly coupling program state to UI elements.

A memory state contains an array of memory cells:

```ts
interface MemoryState {
  cells: MemoryCell[];
}
```

Each memory cell contains the information required to represent a variable, including the simulated address and value.

Pointer variables store references to other memory locations.


---

## 4. Visualization

React receives the current `MemoryState` and renders it as memory boxes.

Pointer relationships are displayed using an SVG arrow layer positioned between the corresponding DOM elements.

---

# Project Architecture

```text
src/
│
├── components/
│   ├── CodeEditor.tsx
│   ├── MemoryVisualizer.tsx
│   ├── StepControls.tsx
│   └── StepSlider.tsx
│
├── components/visualizer/
│   ├── MemoryBox.tsx
│   ├── AddressLabel.tsx
│   └── SvgArrowLayer.tsx
│
├── hooks/
│   ├── useSimulation.ts
│   ├── useStepNavigation.ts
│   └── useElementPositions.ts
│
├── models/
│   ├── statement.ts
│   ├── memory.ts
│   └── simulation.ts
│
├── parser/
│   ├── patterns.ts
│   ├── parser.ts
│   └── parser.test.ts
│
├── simulator/
│   ├── addressAllocator.ts
│   ├── executeStatement.ts
│   ├── simulator.ts
│   └── simulator.test.ts
│
└── App.tsx
```

---

# Core Modules

## Parser

The parser is responsible for translating supported C syntax into typed internal statements.

Responsibilities include:

* recognizing declarations
* recognizing pointer declarations
* detecting assignments
* detecting address-of expressions
* detecting pointer dereferences
* ignoring blank lines and comments

Keeping parsing separate from simulation makes it possible to extend the supported C syntax without rewriting the UI.

---

## Simulator

The simulator acts as a lightweight execution engine for the supported C subset.

It handles operations such as:

```c
int x;
int x = 5;

int *p;
int *p = &x;

x = 10;
p = &x;

*p = 20;
```

The simulator tracks:

* variable values
* simulated addresses
* pointer references
* memory updates
* execution history

---

## Address Allocator

Pointer visualization requires variables to have addresses even though Pointer Slayer does not execute native C code.

The application therefore uses a deterministic address allocator to assign simulated addresses to variables.

For example:

```text
x → 0x1000
y → 0x1004
p → 0x1008
```

These addresses allow pointer relationships to behave similarly to real C memory while keeping the entire application deterministic and browser-based.

---

## Simulation History

Instead of storing only the current program state, the simulator builds a history of memory snapshots.

```text
Simulation
│
├── Step 0 → Initial memory
├── Step 1 → After statement 1
├── Step 2 → After statement 2
└── Step 3 → After statement 3
```

This architecture enables:

* forward navigation
* backward navigation
* timeline scrubbing
* active-line highlighting
* deterministic visualization

---

## React Hooks

Application behavior is separated from presentation through custom React hooks.

### `useSimulation`

Connects source code to the parser and simulation engine.

```text
Code
 ↓
Parser
 ↓
Simulator
 ↓
Simulation States
```

### `useStepNavigation`

Manages the currently selected execution step and navigation behavior.

### `useElementPositions`

Tracks rendered memory-cell positions so pointer arrows can be drawn between the correct elements.

This keeps DOM measurement logic separate from memory simulation logic.

---

# Supported C Syntax

The current version only supports a subset of C.

### Integer declarations

```c
int x;
int x = 5;
```

### Pointer declarations

```c
int *p;
int *p = &x;
```

### Variable assignments

```c
x = 10;
```

### Pointer assignments

```c
p = &x;
```

### Pointer dereferencing

```c
*p = 20;
```

### Comments and whitespace

```c
// Pointer example

int x = 5;

int *p = &x;
```

---

# Technology Stack

### Frontend

* **React**
* **TypeScript**
* **Vite**
* **HTML**
* **CSS**

### Visualization

* React DOM measurements
* SVG-based pointer arrows
* CSS transitions / animations

### Testing

* **Vitest**

### Development Tooling

* **Oxlint**
* npm
* Git / GitHub

---

# Testing

The parsing and simulation layers are tested independently from the React interface.

The project currently includes **35 automated tests** covering the core engine:

```text
Parser tests:     16
Simulator tests:  19
────────────────────
Total:            35
```

Run the test suite with:

```bash
npm test
```

---

# Running the Project Locally

Clone the repository:

```bash
git clone https://github.com/Khoi-Nguyen-Xuan/Pointer_Slayer.git
```

Enter the project directory:

```bash
cd Pointer_Slayer
```

Install dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Then open the local URL displayed by Vite, typically:

```text
http://localhost:5173
```

---

# Build

Create a production build with:

```bash
npm run build
```

---

# Author

**Khoi Nguyen Xuan**


GitHub: [Khoi-Nguyen-Xuan](https://github.com/Khoi-Nguyen-Xuan)
