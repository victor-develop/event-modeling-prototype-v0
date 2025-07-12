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

## React Flow Change Interception Patterns

The application implements specific constraints and behaviors using React Flow's change handling system. This pattern enables fine-grained control over how nodes and edges behave in the diagram.

### Understanding Change Types

React Flow exposes different types of changes through callbacks like `onNodesChange` and `onEdgesChange`. These changes can be intercepted, filtered, modified, or blocked before being applied to the state:

#### Node Change Types

- **`position`**: When nodes are moved (contains `position`, `positionAbsolute`, and `dragging` properties)
- **`dimensions`**: When nodes are resized (contains `dimensions`, `resizing`, and `setAttributes` properties)
- **`select`**: When nodes are selected/deselected (contains `selected` property)
- **`remove`**: When nodes are deleted
- **`add`**: When new nodes are added (contains the entire node object as `item`)
- **`replace`**: When nodes are replaced with new versions (contains `id` and `item`)

#### Edge Change Types

- **`select`**: When edges are selected/deselected (contains `selected` property)
- **`remove`**: When edges are deleted
- **`add`**: When new edges are added (contains the entire edge object as `item`)
- **`replace`**: When edges are replaced with new versions (contains `id` and `item`)

### Implementing Change Interception

The application uses several patterns to intercept and control node and edge changes:

1. **Node & Edge Changes Restrictions:**
   * Swimlanes are prevented from being moved by filtering out position changes for nodes of type `swimlane`
   * Block nodes are constrained to move only horizontally by preserving their original y-position

Here's how different change types can be handled:
```typescript
const onNodesChange = useCallback(
  (changes: NodeChange[]) => {
    // Process each change based on its type
    const processedChanges = changes.map(change => {
      // Handle different change types
      switch (change.type) {
        case 'position':
          // Prevent swimlane movement
          const node = nodes.find(n => n.id === change.id);
          if (node?.type === 'swimlane') {
            // Return null to filter this change out later
            return null;
          }
          
          // Constrain block nodes to horizontal movement only
          if (node?.type === 'block' && change.position) {
            return {
              ...change,
              position: { x: change.position.x, y: node.position.y }
            };
          }
          break;
          
        case 'select':
          // Example: Prevent selection of certain node types
          const selectNode = nodes.find(n => n.id === change.id);
          if (selectNode?.type === 'special-node' && change.selected) {
            return null; // Prevent selection of special nodes
          }
          break;
          
        case 'remove':
          // Example: Prevent deletion of locked nodes
          const removeNode = nodes.find(n => n.id === change.id);
          if (removeNode?.data?.locked) {
            return null; // Prevent removal of locked nodes
          }
          break;
          
        case 'add':
          // Example: Modify properties of newly added nodes
          if (change.item.type === 'block') {
            return {
              ...change,
              item: {
                ...change.item,
                data: { ...change.item.data, initialized: true }
              }
            };
          }
          break;
      }
      return change;
    }).filter(Boolean); // Remove null entries (changes we want to block)
    
    // Apply the filtered and transformed changes
    if (processedChanges.length > 0) {
      dispatchNodeChanges(processedChanges);
    }
  },
  [dispatchNodeChanges, nodes],
);
```

Similarly for edges, we can implement a comprehensive `onEdgesChange` handler:

```typescript
const onEdgesChange = useCallback(
  (changes: EdgeChange[]) => {
    const processedChanges = changes.map(change => {
      switch (change.type) {
        case 'select':
          // Example: Log edge selections for analytics
          console.log('Edge selected:', change.id, change.selected);
          break;
          
        case 'remove':
          // Example: Prevent deletion of critical connections
          const edge = edges.find(e => e.id === change.id);
          if (edge?.data?.critical) {
            return null; // Block deletion of critical edges
          }
          break;
          
        case 'add':
          // Example: Modify properties of newly added edges
          return {
            ...change,
            item: {
              ...change.item,
              animated: true, // Make all new edges animated
              style: { stroke: '#ff0000' } // Style new edges
            }
          };
      }
      return change;
    }).filter(Boolean); // Remove null entries
    
    if (processedChanges.length > 0) {
      dispatchEdgeChanges(processedChanges);
    }
  },
  [dispatchEdgeChanges, edges],
);
```

### Best Practices for Change Interception

1. **Handle All Change Types:** Be aware of all possible change types and handle them appropriately
2. **Filter Changes:** Remove unwanted changes by returning `null` or filtering the array
3. **Transform Changes:** Modify changes by creating new objects with altered properties
4. **Preserve Immutability:** Always create new objects when modifying changes
5. **Optimize Performance:** Only process necessary changes and avoid expensive operations
6. **Apply Changes:** Use the appropriate dispatch function after processing

This pattern provides complete control over React Flow's behavior while maintaining a clean architecture that separates concerns.

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