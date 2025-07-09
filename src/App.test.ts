import { describe, it, expect } from 'vitest';
import { appReducer, applyEvents, initialState } from './App'; // Assuming these are exported

// Mock EventType for testing
type EventType =
  | { type: 'ADD_SWIMLANE'; payload: any }
  | { type: 'ADD_BLOCK'; payload: any }
  | { type: 'MOVE_NODE'; payload: { nodeId: string; position: { x: number; y: number } } }
  | { type: 'UPDATE_NODE_LABEL'; payload: { nodeId: string; label: string } }
  | { type: 'TIME_TRAVEL'; payload: { index: number } }
  | { type: 'LOAD_EVENTS'; payload: EventType[] }
  | { type: 'CREATE_SNAPSHOT'; payload: { snapshotNodes: any[]; snapshotEdges: any[]; snapshotIndex: number } };

// Helper function to create a simple event
const createEvent = (type: string, payload: any): EventType => {
  return { type: type as any, payload };
};

describe('appReducer and applyEvents with Snapshot', () => {
  it('should create a snapshot and truncate events', () => {
    let state = initialState;

    // Add some initial events
    state = appReducer(state, createEvent('ADD_SWIMLANE', { id: 's1', type: 'swimlane', position: { x: 0, y: 0 } }));
    state = appReducer(state, createEvent('ADD_BLOCK', { id: 'b1', parentId: 's1', type: 'block', position: { x: 10, y: 10 } }));
    state = appReducer(state, createEvent('MOVE_NODE', { nodeId: 'b1', position: { x: 20, y: 20 } }));

    const snapshotIndex = state.currentEventIndex;
    const snapshotNodes = state.nodes;
    const snapshotEdges = state.edges;

    // Create a snapshot
    state = appReducer(state, createEvent('CREATE_SNAPSHOT', {
      snapshotNodes,
      snapshotEdges,
      snapshotIndex,
    }));

    // Assertions after snapshot
    expect(state.events.length).toBe(0); // All events before snapshot should be removed
    expect(state.currentEventIndex).toBe(-1); // Index should be reset
    expect(state.snapshotNodes).toEqual(snapshotNodes);
    expect(state.snapshotEdges).toEqual(snapshotEdges);
    expect(state.snapshotIndex).toBe(snapshotIndex);
    expect(state.nodes).toEqual(snapshotNodes); // Current nodes should be the snapshot
    expect(state.edges).toEqual(snapshotEdges); // Current edges should be the snapshot
  });

  it('should correctly time travel after a snapshot', () => {
    let state = initialState;

    // Events before snapshot
    state = appReducer(state, createEvent('ADD_SWIMLANE', { id: 's1', type: 'swimlane', position: { x: 0, y: 0 } })); // Event 0
    state = appReducer(state, createEvent('ADD_BLOCK', { id: 'b1', parentId: 's1', type: 'block', position: { x: 10, y: 10 }, data: { label: 'Block 1' } })); // Added data.label

    const snapshotIndex = state.currentEventIndex; // Index 1
    const snapshotNodes = state.nodes;
    const snapshotEdges = state.edges;

    state = appReducer(state, createEvent('CREATE_SNAPSHOT', {
      snapshotNodes,
      snapshotEdges,
      snapshotIndex,
    }));

    // Events after snapshot
    state = appReducer(state, createEvent('MOVE_NODE', { nodeId: 'b1', position: { x: 50, y: 50 } })); // New Event 0 (original index 2)
    state = appReducer(state, createEvent('UPDATE_NODE_LABEL', { nodeId: 'b1', label: 'Updated Block' })); // New Event 1 (original index 3)

    // Time travel to the first event after snapshot (original index 2, new index 0)
    state = appReducer(state, createEvent('TIME_TRAVEL', { index: 0 }));

    // Assert state after time travel
    expect(state.nodes.find(n => n.id === 'b1')?.position).toEqual({ x: 50, y: 50 });
    expect(state.nodes.find(n => n.id === 'b1')?.data.label).toBe('Block 1'); // Label not updated yet
    expect(state.currentEventIndex).toBe(0);

    // Time travel to the last event (original index 3, new index 1)
    state = appReducer(state, createEvent('TIME_TRAVEL', { index: 1 }));
    expect(state.nodes.find(n => n.id === 'b1')?.data.label).toBe('Updated Block');
    expect(state.currentEventIndex).toBe(1);

    // Time travel back to the snapshot point (effectively, the state of the snapshot)
    // This is tricky because the events array is truncated.
    // The `TIME_TRAVEL` event's index refers to the *current* `events` array.
    // So, if `state.events` is empty after snapshot, we can't time travel to a past event.
    // This test case needs to reflect the actual behavior: if events are truncated,
    // you can only time travel within the remaining events.
    // The earliest point is the snapshot itself.
    // Let's re-evaluate the `TIME_TRAVEL` logic in `appReducer` for this.
    // The `applyEvents` function now takes `startIndex` and `initialNodes/Edges`.
    // So, if `event.payload.index` is less than `state.snapshotIndex`, it should still work.

    // Let's re-run the time travel to an index that would have been before the snapshot
    // but is now effectively the snapshot state.
    // Since `state.events` is truncated, `index: -1` would represent the snapshot state.
    state = appReducer(state, createEvent('TIME_TRAVEL', { index: -1 }));
    expect(state.nodes).toEqual(snapshotNodes);
    expect(state.edges).toEqual(snapshotEdges);
    expect(state.currentEventIndex).toBe(-1);
  });

  it('should clear snapshot and load new events', () => {
    let state = initialState;

    // Add some initial events and create a snapshot
    state = appReducer(state, createEvent('ADD_SWIMLANE', { id: 's1', type: 'swimlane', position: { x: 0, y: 0 } }));
    state = appReducer(state, createEvent('ADD_BLOCK', { id: 'b1', parentId: 's1', type: 'block', position: { x: 10, y: 10 } }));
    state = appReducer(state, createEvent('CREATE_SNAPSHOT', {
      snapshotNodes: state.nodes,
      snapshotEdges: state.edges,
      snapshotIndex: state.currentEventIndex,
    }));

    // New events to load
    const newEvents: EventType[] = [
      createEvent('ADD_SWIMLANE', { id: 's2', type: 'swimlane', position: { x: 100, y: 100 } }),
      createEvent('ADD_BLOCK', { id: 'b2', parentId: 's2', type: 'block', position: { x: 110, y: 110 } }),
    ];

    state = appReducer(state, createEvent('LOAD_EVENTS', newEvents));

    // Assertions after loading new events
    expect(state.events).toEqual(newEvents);
    expect(state.currentEventIndex).toBe(newEvents.length - 1);
    expect(state.snapshotNodes).toBeNull(); // Snapshot should be cleared
    expect(state.snapshotEdges).toBeNull(); // Snapshot should be cleared
    expect(state.snapshotIndex).toBe(-1); // Snapshot index should be reset
    expect(state.nodes.length).toBe(2); // Should have the two new nodes
    expect(state.nodes.find(n => n.id === 's2')).toBeDefined();
    expect(state.nodes.find(n => n.id === 'b2')).toBeDefined();
  });
});
