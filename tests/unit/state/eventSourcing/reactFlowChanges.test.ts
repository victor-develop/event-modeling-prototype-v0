// Common test setup and imports
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
import { NodeChange, EdgeChange } from '@xyflow/react';

describe('reduceCanvas', () => {
  // Test ReactFlow.CHANGE_NODES action
  describe('CHANGE_NODES action', () => {
    it('should apply node changes', () => {
      // Arrange
      const initialNodes = [
        { id: 'node1', position: { x: 100, y: 100 } },
        { id: 'node2', position: { x: 200, y: 200 } }
      ];
      const initialEdges = [];
      
      const nodeChanges: NodeChange[] = [
        { id: 'node1', type: 'position', position: { x: 150, y: 150 } }
      ];
      
      // Use 'as any' to bypass type checking for this test
      const changeNodesCommand: any = {
        type: EventTypes.ReactFlow.CHANGE_NODES,
        payload: nodeChanges
      };

      // Act
      const result = reduceCanvas(changeNodesCommand, initialNodes, initialEdges);

      // Assert
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0].position).toEqual({ x: 150, y: 150 });
      expect(result.nodes[1].position).toEqual({ x: 200, y: 200 });
    });
  });

  // Test ReactFlow.CHANGE_EDGES action
  describe('CHANGE_EDGES action', () => {
    it('should apply edge changes', () => {
      // Arrange
      const initialNodes = [];
      const initialEdges = [
        { id: 'edge1', source: 'node1', target: 'node2' },
        { id: 'edge2', source: 'node2', target: 'node3' }
      ];
      
      const edgeChanges: EdgeChange[] = [
        { id: 'edge1', type: 'remove' }
      ];
      
      // Use 'as any' to bypass type checking for this test
      const changeEdgesCommand: any = {
        type: EventTypes.ReactFlow.CHANGE_EDGES,
        payload: edgeChanges
      };

      // Act
      const result = reduceCanvas(changeEdgesCommand, initialNodes, initialEdges);

      // Assert
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].id).toBe('edge2');
    });
  });
});

describe('appReducer', () => {
  // Test TIME_TRAVELLABLE_EVENTS branch
  describe('TIME_TRAVELLABLE_EVENTS handling', () => {
    it('should add command to events array and increment currentEventIndex', () => {
      // Arrange
      const initialAppState: AppState = {
        ...initialState,
        nodes: [],
        edges: [],
        events: [],
        currentEventIndex: -1
      };
      
      const moveNodeCommand: IntentionEventType = {
        type: EventTypes.ModelingEditor.MOVE_NODE,
        payload: { nodeId: 'node1', position: { x: 150, y: 150 } }
      };

      // Act
      const result = appReducer(initialAppState, moveNodeCommand);

      // Assert
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toBe(moveNodeCommand);
      expect(result.currentEventIndex).toBe(0);
    });

    it('should not add non-time-travellable command to events array', () => {
      // Arrange
      const initialAppState: AppState = {
        ...initialState,
        nodes: [],
        edges: [],
        events: [],
        currentEventIndex: -1
      };
      
      // Use 'as any' to bypass type checking for this test
      const changeNodesCommand: any = {
        type: EventTypes.ReactFlow.CHANGE_NODES,
        payload: [{ id: 'node1', type: 'position', position: { x: 150, y: 150 } }]
      };

      // Act
      const result = appReducer(initialAppState, changeNodesCommand);

      // Assert
      expect(result.events).toHaveLength(0);
      expect(result.currentEventIndex).toBe(-1);
    });
  });
});
