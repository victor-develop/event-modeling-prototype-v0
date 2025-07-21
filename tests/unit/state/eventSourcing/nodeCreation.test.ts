import {
  describe,
  it,
  expect,
  EventTypes,
  reduceCanvas,
  IntentionEventType
} from './setup';

describe('reduceCanvas', () => {
  // Test ADD_SWIMLANE action
  describe('ADD_SWIMLANE action', () => {
    it('should add a new swimlane node', () => {
      // Arrange
      const initialNodes = [];
      const initialEdges = [];
      const newSwimlane = {
        id: 'swimlane1',
        type: 'swimlane',
        position: { x: 0, y: 0 },
        data: { label: 'New Swimlane' }
      };
      
      const addSwimlaneCommand: IntentionEventType = {
        type: EventTypes.ModelingEditor.ADD_SWIMLANE,
        payload: newSwimlane
      };

      // Act
      const result = reduceCanvas(addSwimlaneCommand, initialNodes, initialEdges);

      // Assert
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0]).toEqual(newSwimlane);
    });
  });

  // Test ADD_BLOCK action
  describe('ADD_BLOCK action', () => {
    it('should add a new block and update parent swimlane width if needed', () => {
      // Arrange
      const swimlane = {
        id: 'swimlane1',
        type: 'swimlane',
        position: { x: 0, y: 0 },
        style: { width: 800 },
        data: { label: 'Swimlane' }
      };
      const initialNodes = [swimlane];
      const initialEdges = [];

      const newBlock = {
        id: 'block1',
        type: 'block',
        position: { x: 750, y: 100 },
        parentId: 'swimlane1',
        style: { width: 100 },
        data: { label: 'New Block' }
      };

      const addBlockCommand: IntentionEventType = {
        type: EventTypes.ModelingEditor.ADD_BLOCK,
        payload: newBlock
      };

      // Act
      const result = reduceCanvas(addBlockCommand, initialNodes, initialEdges);

      // Assert
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes.find(n => n.id === 'block1')).toEqual(newBlock);

      // Check if swimlane width was updated (750 + 100 + 20 = 870 > 800)
      const updatedSwimlane = result.nodes.find(n => n.id === 'swimlane1');
      expect(updatedSwimlane).toBeDefined();
      expect(updatedSwimlane.style.width).toBe(870);
    });

    it('should not update parent swimlane width if not needed', () => {
      // Arrange
      const swimlane = {
        id: 'swimlane1',
        type: 'swimlane',
        position: { x: 0, y: 0 },
        style: { width: 800 },
        data: { label: 'Swimlane' }
      };
      const initialNodes = [swimlane];
      const initialEdges = [];

      const newBlock = {
        id: 'block1',
        type: 'block',
        position: { x: 500, y: 100 },
        parentId: 'swimlane1',
        style: { width: 100 },
        data: { label: 'New Block' }
      };

      const addBlockCommand: IntentionEventType = {
        type: EventTypes.ModelingEditor.ADD_BLOCK,
        payload: newBlock
      };

      // Act
      const result = reduceCanvas(addBlockCommand, initialNodes, initialEdges);

      // Assert
      expect(result.nodes).toHaveLength(2);

      // Check if swimlane width was not updated (500 + 100 + 20 = 620 < 800)
      const updatedSwimlane = result.nodes.find(n => n.id === 'swimlane1');
      expect(updatedSwimlane).toBeDefined();
      expect(updatedSwimlane.style.width).toBe(800);
    });
  });
});
