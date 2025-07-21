// Common test setup and imports
import {
  describe,
  it,
  expect,
  EventTypes,
  appReducer,
  initialState,
  AppState,
  IntentionEventType
} from './setup';

describe('appReducer edge cases', () => {
  // Test LOAD_EVENTS action with empty events array
  describe('LOAD_EVENTS with empty events array', () => {
    it('should handle empty events array correctly', () => {
      // Arrange
      const initialAppState: AppState = {
        ...initialState,
        nodes: [{ id: 'existingNode' }],
        edges: [{ id: 'existingEdge' }],
        events: [{ type: EventTypes.ModelingEditor.MOVE_NODE, payload: { nodeId: 'existingNode', position: { x: 100, y: 100 } } }],
        currentEventIndex: 0
      };
      
      const emptyEvents: IntentionEventType[] = [];

      const loadEmptyEventsCommand: any = {
        type: EventTypes.EventSourcing.LOAD_EVENTS,
        payload: emptyEvents
      };

      // Act
      const result = appReducer(initialAppState, loadEmptyEventsCommand);

      // Assert
      expect(result.events).toBe(emptyEvents);
      expect(result.currentEventIndex).toBe(-1); // Should be -1 for empty events
      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });
  });
});
