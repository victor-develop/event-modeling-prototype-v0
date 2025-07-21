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

describe('reduceCanvas edge cases', () => {
  // Test UPDATE_EVENT_PAYLOAD with null/undefined data
  describe('UPDATE_EVENT_PAYLOAD with edge cases', () => {
    it('should handle node without data property', () => {
      // Arrange
      const initialNodes = [
        { id: 'event1' }, // Node without data property
        { id: 'event2', data: { payload: { key: 'value' } } }
      ];
      const initialEdges = [];
      
      const updatePayloadCommand = {
        type: EventTypes.ModelingEditor.UPDATE_EVENT_PAYLOAD,
        payload: { nodeId: 'event1', payload: { newKey: 'newValue' } }
      };

      // Act
      const result = reduceCanvas(updatePayloadCommand, initialNodes, initialEdges);

      // Assert
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0].data).toEqual({ payload: { newKey: 'newValue' } });
      expect(result.nodes[1].data.payload).toEqual({ key: 'value' });
    });

    it('should handle node with data but without payload property', () => {
      // Arrange
      const initialNodes = [
        { id: 'event1', data: { label: 'Event 1' } }, // Node with data but no payload
        { id: 'event2', data: { payload: { key: 'value' } } }
      ];
      const initialEdges = [];
      
      const updatePayloadCommand = {
        type: EventTypes.ModelingEditor.UPDATE_EVENT_PAYLOAD,
        payload: { nodeId: 'event1', payload: { newKey: 'newValue' } }
      };

      // Act
      const result = reduceCanvas(updatePayloadCommand, initialNodes, initialEdges);

      // Assert
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0].data).toEqual({ label: 'Event 1', payload: { newKey: 'newValue' } });
      expect(result.nodes[1].data.payload).toEqual({ key: 'value' });
    });
  });

  // Test UPDATE_VIEW_SOURCES with null/undefined data
  describe('UPDATE_VIEW_SOURCES with edge cases', () => {
    it('should handle node without data property', () => {
      // Arrange
      const initialNodes = [
        { id: 'view1' }, // Node without data property
        { id: 'view2', data: { sourceEvents: ['event2'] } }
      ];
      const initialEdges = [];
      
      const updateSourcesCommand = {
        type: EventTypes.ModelingEditor.UPDATE_VIEW_SOURCES,
        payload: { nodeId: 'view1', sourceEvents: ['event1', 'event3'] }
      };

      // Act
      const result = reduceCanvas(updateSourcesCommand, initialNodes, initialEdges);

      // Assert
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0].data).toEqual({ sourceEvents: ['event1', 'event3'] });
      expect(result.nodes[1].data.sourceEvents).toEqual(['event2']);
    });

    it('should handle node with data but without sourceEvents property', () => {
      // Arrange
      const initialNodes = [
        { id: 'view1', data: { label: 'View 1' } }, // Node with data but no sourceEvents
        { id: 'view2', data: { sourceEvents: ['event2'] } }
      ];
      const initialEdges = [];
      
      const updateSourcesCommand = {
        type: EventTypes.ModelingEditor.UPDATE_VIEW_SOURCES,
        payload: { nodeId: 'view1', sourceEvents: ['event1', 'event3'] }
      };

      // Act
      const result = reduceCanvas(updateSourcesCommand, initialNodes, initialEdges);

      // Assert
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0].data).toEqual({ label: 'View 1', sourceEvents: ['event1', 'event3'] });
      expect(result.nodes[1].data.sourceEvents).toEqual(['event2']);
    });
  });
});
