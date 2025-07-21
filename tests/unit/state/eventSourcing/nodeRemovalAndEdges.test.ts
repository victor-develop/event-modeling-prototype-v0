import {
  describe,
  it,
  expect,
  EventTypes,
  reduceCanvas,
  IntentionEventType,
  MarkerType
} from './setup';

describe('reduceCanvas', () => {
  // Test REMOVE_NODE action
  describe('REMOVE_NODE action', () => {
    it('should remove a node and its connected edges', () => {
      // Arrange
      const initialNodes = [
        { id: 'node1', position: { x: 100, y: 100 } },
        { id: 'node2', position: { x: 200, y: 200 } }
      ];
      const initialEdges = [
        { id: 'edge1', source: 'node1', target: 'node2' },
        { id: 'edge2', source: 'node3', target: 'node1' },
        { id: 'edge3', source: 'node3', target: 'node2' }
      ];
      
      const removeNodeCommand: IntentionEventType = {
        type: EventTypes.ModelingEditor.REMOVE_NODE,
        payload: {
          nodeId: 'node1'
        }
      };

      // Act
      const result = reduceCanvas(removeNodeCommand, initialNodes, initialEdges);

      // Assert
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe('node2');

      // Check that edges connected to node1 are removed
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].id).toBe('edge3');
    });
  });

  // Test NEW_CONNECTION action
  describe('NEW_CONNECTION action', () => {
    it('should create a new edge when connecting nodes', () => {
      // Arrange
      const initialNodes = [
        { id: 'node1', position: { x: 100, y: 100 } },
        { id: 'node2', position: { x: 200, y: 200 } }
      ];
      const initialEdges = [];
      
      const newConnectionCommand: IntentionEventType = {
        type: EventTypes.ReactFlow.NEW_CONNECTION,
        payload: {
          source: 'node1',
          target: 'node2',
          sourceHandle: 'out',
          targetHandle: 'in'
        }
      };

      // Act
      const result = reduceCanvas(newConnectionCommand, initialNodes, initialEdges);

      // Assert
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].source).toBe('node1');
      expect(result.edges[0].target).toBe('node2');
      // The implementation doesn't preserve sourceHandle/targetHandle
      expect(result.edges[0].type).toBe('command-pattern');
      expect(result.edges[0].markerEnd).toEqual({ type: MarkerType.ArrowClosed });
    });

    it('should not create an edge if source or target is missing', () => {
      // Arrange
      const initialNodes = [
        { id: 'node1', position: { x: 100, y: 100 } }
      ];
      const initialEdges = [];
      
      // Use 'as any' to bypass type checking for this test case
      const newConnectionCommand: any = {
        type: EventTypes.ReactFlow.NEW_CONNECTION,
        payload: {
          source: 'node1',
          target: null,
          sourceHandle: 'out',
          targetHandle: 'in'
        }
      };

      // Act
      const result = reduceCanvas(newConnectionCommand, initialNodes, initialEdges);

      // Assert
      expect(result.edges).toHaveLength(0);
    });
  });
});
