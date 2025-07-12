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

## Movement Constraint Patterns

The application implements specific movement constraints for different node types using React Flow's change handling system. These patterns ensure that nodes behave according to the event modeling paradigm.

### Movement Restriction Implementation

React Flow exposes "changes" through callbacks like `onNodesChange` and `onEdgesChange`. The application intercepts these changes to enforce specific behaviors:

1. **Swimlane Movement Restriction:**
   * Swimlanes are prevented from being moved by filtering out position changes for nodes of type `swimlane`
   * Implementation is in the `onNodesChange` callback where changes are filtered before being applied

```typescript
const onNodesChange = useCallback(
  (changes: NodeChange[]) => {
    // Filter out position changes for swimlane nodes
    const filteredChanges = changes.filter(change => {
      if (change.type === 'position') {
        const node = nodes.find(n => n.id === change.id);
        return node?.type !== 'swimlane';
      }
      return true;
    });
    
    // Apply remaining changes
    dispatchNodeChanges(filteredChanges);
  },
  [dispatchNodeChanges, nodes],
);
```

2. **Block Node Horizontal-Only Movement:**
   * Blocks are constrained to move only horizontally by preserving their original y-position
   * A `constrainBlockPosition` function is used to enforce this behavior

```typescript
const constrainBlockPosition = (nodeId: string, position: { x: number; y: number }) => {
  const node = nodes.find(n => n.id === nodeId);
  if (node && node.type === 'block') {
    return { x: position.x, y: node.position.y };
  }
  return position;
};
```

### Applying Custom Constraints

To implement custom node movement constraints:

1. **Intercept Changes:** Use the `onNodesChange` callback to receive all node change events
2. **Filter Changes:** Remove unwanted changes based on node type or other criteria
3. **Transform Changes:** Modify position changes to enforce constraints
4. **Apply Changes:** Only after filtering/transforming, apply the changes using `dispatchNodeChanges`

This pattern allows for fine-grained control over node behavior while leveraging React Flow's built-in functionality.

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