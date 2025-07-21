import {
  describe,
  it,
  expect,
  EventTypes,
  reduceCanvas,
  appReducer,
  initialState,
  AppState,
  IntentionEventType
} from './setup';

describe('appReducer', () => {
  // Test TIME_TRAVEL action
  describe('TIME_TRAVEL action', () => {
    it('should replay events up to the target index', () => {
      // Arrange
      const snapshotNodes = [{ id: 'node1', position: { x: 100, y: 100 } }];
      const snapshotEdges = [];
      
      const events = [
        {
          type: EventTypes.ModelingEditor.MOVE_NODE,
          payload: { nodeId: 'node1', position: { x: 150, y: 150 } }
        },
        {
          type: EventTypes.ModelingEditor.MOVE_NODE,
          payload: { nodeId: 'node1', position: { x: 200, y: 200 } }
        },
        {
          type: EventTypes.ModelingEditor.MOVE_NODE,
          payload: { nodeId: 'node1', position: { x: 250, y: 250 } }
        }
      ];
      
      const initialAppState: AppState = {
        ...initialState,
        nodes: [{ id: 'node1', position: { x: 250, y: 250 } }], // Current state has the last position
        edges: snapshotEdges,
        events,
        currentEventIndex: 2,
        snapshotNodes,
        snapshotEdges,
        snapshotIndex: 0
      };
      
      // Use 'as any' to bypass type checking for this test
      const timeTravelCommand: any = {
        type: EventTypes.EventSourcing.TIME_TRAVEL,
        payload: {
          index: 1 // Use 'index' instead of 'targetIndex' to match the implementation
        }
      };

      // Act
      const result = appReducer(initialAppState, timeTravelCommand);

      // Assert
      // Should have snapshot nodes + events replayed up to index 1
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].position).toEqual({ x: 200, y: 200 });
      expect(result.currentEventIndex).toBe(1);
    });
  });

  // Test LOAD_EVENTS action
  describe('LOAD_EVENTS action', () => {
    it('should load events and apply them to the state', () => {
      // Arrange
      const initialAppState: AppState = {
        ...initialState,
        nodes: [],
        edges: []
      };
      
      const events = [
        {
          type: EventTypes.ModelingEditor.ADD_SWIMLANE,
          payload: {
            id: 'swimlane1',
            type: 'swimlane',
            position: { x: 0, y: 0 },
            data: { label: 'Swimlane 1' }
          }
        },
        {
          type: EventTypes.ModelingEditor.ADD_BLOCK,
          payload: {
            id: 'block1',
            type: 'block',
            position: { x: 100, y: 100 },
            parentId: 'swimlane1',
            data: { label: 'Block 1' }
          }
        }
      ];
      
      // Use 'as any' to bypass type checking for this test
      const loadEventsCommand: any = {
        type: EventTypes.EventSourcing.LOAD_EVENTS,
        payload: events // Direct array of events, not wrapped in an object
      };

      // Act
      const result = appReducer(initialAppState, loadEventsCommand);

      // Assert
      expect(result.events).toEqual(events);
      expect(result.nodes).toHaveLength(2);
      expect(result.currentEventIndex).toBe(1);
    });
  });

  // Test CREATE_SNAPSHOT action
  describe('CREATE_SNAPSHOT action', () => {
    it('should create a snapshot and update state', () => {
      // Arrange
      const nodes = [
        { id: 'node1', position: { x: 100, y: 100 } },
        { id: 'node2', position: { x: 200, y: 200 } }
      ];
      const edges = [
        { id: 'edge1', source: 'node1', target: 'node2' }
      ];
      
      const initialAppState: AppState = {
        ...initialState,
        nodes,
        edges,
        events: [],
        currentEventIndex: -1
      };
      
      // Use 'as any' to bypass type checking for this test
      const createSnapshotCommand: any = {
        type: EventTypes.EventSourcing.CREATE_SNAPSHOT,
        payload: {
          snapshotNodes: nodes,
          snapshotEdges: edges,
          snapshotIndex: 0
        }
      };

      // Act
      const result = appReducer(initialAppState, createSnapshotCommand);

      // Assert
      expect(result.snapshotNodes).toEqual(nodes);
      expect(result.snapshotEdges).toEqual(edges);
      expect(result.snapshotIndex).toBe(0);
    });
  });
});

describe('reduceCanvas default case', () => {
  it('should return unchanged state for unknown action types', () => {
    // Arrange
    const initialNodes = [{ id: 'node1', position: { x: 100, y: 100 } }];
    const initialEdges = [{ id: 'edge1', source: 'node1', target: 'node2' }];
    
    const unknownCommand: IntentionEventType = {
      type: 'UNKNOWN_ACTION' as any,
      payload: {}
    };

    // Act
    const result = reduceCanvas(unknownCommand, initialNodes, initialEdges);

    // Assert
    expect(result.nodes).toStrictEqual(initialNodes);
    expect(result.edges).toStrictEqual(initialEdges);
  });
});
