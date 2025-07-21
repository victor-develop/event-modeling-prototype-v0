import {
  describe,
  it,
  expect,
  EventTypes,
  reduceCanvas,
  IntentionEventType
} from './setup';

describe('reduceCanvas', () => {
  // Test UPDATE_NODE_LABEL action
  describe('UPDATE_NODE_LABEL action', () => {
    it('should update the label of a node', () => {
      // Arrange
      const initialNodes = [
        { id: 'node1', data: { label: 'Old Label' } },
        { id: 'node2', data: { label: 'Node 2' } }
      ];
      const initialEdges = [];
      
      const updateLabelCommand: IntentionEventType = {
        type: EventTypes.ModelingEditor.UPDATE_NODE_LABEL,
        payload: {
          nodeId: 'node1',
          label: 'New Label'
        }
      };

      // Act
      const result = reduceCanvas(updateLabelCommand, initialNodes, initialEdges);

      // Assert
      expect(result.nodes).toHaveLength(2);
      
      // Verify the updated node has new label
      const updatedNode = result.nodes.find(node => node.id === 'node1');
      expect(updatedNode).toBeDefined();
      expect(updatedNode.data.label).toBe('New Label');

      // Verify other node remains unchanged
      const unchangedNode = result.nodes.find(node => node.id === 'node2');
      expect(unchangedNode).toBeDefined();
      expect(unchangedNode.data.label).toBe('Node 2');
    });
  });

  // Test UPDATE_COMMAND_PARAMETERS action
  describe('UPDATE_COMMAND_PARAMETERS action', () => {
    it('should update command parameters', () => {
      // Arrange
      const initialNodes = [
        { id: 'command1', data: { parameters: { oldParam: 'oldValue' } } },
        { id: 'command2', data: { parameters: { param: 'value' } } }
      ];
      const initialEdges = [];
      
      const updateParametersCommand = {
        type: EventTypes.ModelingEditor.UPDATE_COMMAND_PARAMETERS,
        payload: { nodeId: 'command1', parameters: { newParam: 'newValue' } }
      };

      // Act
      const result = reduceCanvas(updateParametersCommand, initialNodes, initialEdges);

      // Assert
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0].data.parameters).toEqual({ newParam: 'newValue' });
      expect(result.nodes[1].data.parameters).toEqual({ param: 'value' });
    });
  });

  // Test UPDATE_EVENT_PAYLOAD action
  describe('UPDATE_EVENT_PAYLOAD action', () => {
    it('should update payload in node data', () => {
      // Arrange
      const initialNodes = [{
        id: 'event1',
        type: 'event',
        position: { x: 100, y: 100 },
        data: { label: 'Event 1', payload: null }
      }];
      const initialEdges = [];

      const updatePayloadCommand: IntentionEventType = {
        type: EventTypes.ModelingEditor.UPDATE_EVENT_PAYLOAD,
        payload: {
          nodeId: 'event1',
          payload: { key: 'value' }
        }
      };

      // Act
      const result = reduceCanvas(updatePayloadCommand, initialNodes, initialEdges);

      // Assert
      expect(result.nodes[0].data.payload).toEqual({ key: 'value' });
      expect(result.edges).toEqual(initialEdges);
    });
  });

  // Test UPDATE_EVENT_PAYLOAD action for processor nodes
  describe('UPDATE_EVENT_PAYLOAD action', () => {
    it('should update payload in processor node data', () => {
      // Arrange
      const initialNodes = [{
        id: 'processor1',
        type: 'processor',
        position: { x: 100, y: 100 },
        data: { label: 'Processor 1', payload: null }
      }];
      const initialEdges = [];

      const updatePayloadCommand: IntentionEventType = {
        type: EventTypes.ModelingEditor.UPDATE_EVENT_PAYLOAD,
        payload: {
          nodeId: 'processor1',
          payload: { key: 'value' }
        }
      };

      // Act
      const result = reduceCanvas(updatePayloadCommand, initialNodes, initialEdges);

      // Assert
      expect(result.nodes[0].data.payload).toEqual({ key: 'value' });
      expect(result.edges).toEqual(initialEdges);
    });
  });

  // Test UPDATE_VIEW_SOURCES action
  describe('UPDATE_VIEW_SOURCES action', () => {
    it('should update sourceEvents in node data', () => {
      // Arrange
      const initialNodes = [{
        id: 'view1',
        type: 'view',
        position: { x: 100, y: 100 },
        data: { label: 'View 1', sourceEvents: [] }
      }];
      const initialEdges = [];

      const updateSourcesCommand: IntentionEventType = {
        type: EventTypes.ModelingEditor.UPDATE_VIEW_SOURCES,
        payload: {
          nodeId: 'view1',
          sourceEvents: ['event1', 'event2']
        }
      };

      // Act
      const result = reduceCanvas(updateSourcesCommand, initialNodes, initialEdges);

      // Assert
      expect(result.nodes[0].data.sourceEvents).toEqual(['event1', 'event2']);
      expect(result.edges).toEqual(initialEdges);
    });
  });
});
