import {
  describe,
  it,
  expect,
  EventTypes,
  reduceCanvas,
  IntentionEventType
} from './setup';

describe('reduceCanvas', () => {
  // Test MOVE_NODE action
  describe('MOVE_NODE action', () => {
    it('should update node position and positionPerDrop when moving a node', () => {
      // Arrange
      const initialNodes = [
        { id: 'node1', position: { x: 100, y: 100 } },
        { id: 'node2', position: { x: 200, y: 200 } }
      ];
      const initialEdges = [];
      const newPosition = { x: 150, y: 150 };
      
      const moveNodeCommand: IntentionEventType = {
        type: EventTypes.ModelingEditor.MOVE_NODE,
        payload: {
          nodeId: 'node1',
          position: newPosition
        }
      };

      // Act
      const result = reduceCanvas(moveNodeCommand, initialNodes, initialEdges);

      // Assert
      expect(result.nodes).toHaveLength(2);
      
      // Verify the moved node has updated position and positionPerDrop
      const movedNode = result.nodes.find(node => node.id === 'node1');
      expect(movedNode).toBeDefined();
      expect(movedNode.position).toEqual(newPosition);
      expect(movedNode.positionPerDrop).toEqual(newPosition);

      // Verify other node remains unchanged
      const unchangedNode = result.nodes.find(node => node.id === 'node2');
      expect(unchangedNode).toBeDefined();
      expect(unchangedNode.position).toEqual({ x: 200, y: 200 });
    });

    it('should update node position and positionPerDrop when moving a block', () => {
      // Arrange
      const initialNodes = [
        { id: 'block1', type: 'block', position: { x: 100, y: 100 } }
      ];
      const initialEdges = [];
      const newPosition = { x: 150, y: 150 };
      
      const moveBlockCommand: IntentionEventType = {
        type: EventTypes.ModelingEditor.MOVE_BLOCK,
        payload: {
          nodeId: 'block1',
          position: newPosition
        }
      };

      // Act
      const result = reduceCanvas(moveBlockCommand, initialNodes, initialEdges);

      // Assert
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].position).toEqual(newPosition);
      expect(result.nodes[0].positionPerDrop).toEqual(newPosition);
    });
  });
});
