# Event Modeling Application

This is a React application built with Vite and TypeScript, designed to demonstrate event modeling concepts using the `@xyflow/react` library for interactive node-based diagrams. It showcases a robust time-traveling feature, allowing users to navigate through the history of changes made to their event models.

## Key Features

*   **Interactive Event Modeling:** Create and manipulate event models using swimlanes and blocks, representing different stages and actions in a process.
*   **Time-Traveling with Event Sourcing Principles:**
    *   All changes to the diagram (adding swimlanes/blocks, moving nodes, updating labels) are recorded as a sequence of immutable events.
    *   The application's state can be reconstructed by replaying these events from the beginning up to any point in time, enabling powerful undo/redo and historical inspection.
*   **Export/Import Event Log:**
    *   **Export:** Save the entire event history as a JSON file, allowing you to persist your work or share event models.
    *   **Import:** Load a previously exported event log, clearing the current state and replaying the imported events to reconstruct the diagram.
*   **Compress Snapshot:**
    *   Optimize storage and performance by creating a "snapshot" of the current diagram state.
    *   When a snapshot is taken, all events leading up to that point are effectively "compressed" and removed from the active event log.
    *   The snapshot becomes the new earliest point to which the history can be rewound, saving memory and speeding up history replay for older states.

## Technologies Used

*   **React:** A JavaScript library for building user interfaces.
*   **TypeScript:** A typed superset of JavaScript that compiles to plain JavaScript.
*   **Vite:** A fast build tool that provides a lightning-fast development experience.
*   **@xyflow/react:** A powerful library for building interactive node-based editors and diagrams.
*   **nanoid:** A tiny, secure, URL-friendly, unique string ID generator.
*   **Vitest:** A blazing fast unit-test framework powered by Vite.

## How to Run

To get this project up and running on your local machine, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd event-modeling-app
    ```
    (Note: Replace `<repository-url>` with the actual URL if this were a real repository.)

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the development server:**
    ```bash
    npm run dev
    ```
    This will start the Vite development server, and you can access the application in your browser, usually at `http://localhost:5173`.

4.  **Run tests (Optional):**
    ```bash
    npm run test
    ```
    This will execute the unit tests using Vitest.