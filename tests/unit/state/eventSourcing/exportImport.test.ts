import { describe, it, expect, EventTypes, initialState, AppState, IntentionEventType } from './setup';
import { appReducer } from '../../../../src/state/eventSourcing';
import { nanoid } from 'nanoid';

// Helper function to create events
const createEvent = (type: string, payload: any): IntentionEventType => ({
  type,
  payload,
} as IntentionEventType);

describe('Export/Import Functionality', () => {
  it('should handle LOAD_EVENTS action correctly', () => {
    // Create sample events to load
    const nodeId1 = nanoid();
    const nodeId2 = nanoid();
    
    const sampleEvents = [
      createEvent(EventTypes.ModelingEditor.ADD_COMMAND, {
        id: nodeId1,
        type: 'command',
        position: { x: 100, y: 100 },
        data: { label: 'Imported Command' }
      }),
      createEvent(EventTypes.ModelingEditor.ADD_EVENT, {
        id: nodeId2,
        type: 'event',
        position: { x: 300, y: 100 },
        data: { label: 'Imported Event' }
      }),
      createEvent(EventTypes.ReactFlow.NEW_CONNECTION, {
        source: nodeId1,
        target: nodeId2,
        sourceHandle: 'right',
        targetHandle: 'left'
      })
    ];
    
    // Apply LOAD_EVENTS action
    const loadEventsAction = createEvent(EventTypes.EventSourcing.LOAD_EVENTS, sampleEvents);
    const newState = appReducer(initialState, loadEventsAction);
    
    // Verify the state after loading events
    expect(newState.events).toEqual(sampleEvents);
    expect(newState.nodes.length).toBe(2);
    expect(newState.edges.length).toBe(1);
    expect(newState.currentEventIndex).toBe(2);
  });
  
  it('should handle LOAD_EVENTS with empty events array correctly', () => {
    // First add some events to the state
    const nodeId = nanoid();
    let testState = appReducer(initialState, createEvent(EventTypes.ModelingEditor.ADD_COMMAND, {
      id: nodeId,
      type: 'command',
      position: { x: 100, y: 100 },
      data: { label: 'Test Command' }
    }));
    
    // Verify we have a node and an event
    expect(testState.nodes.length).toBe(1);
    expect(testState.events.length).toBe(1);
    
    // Now load empty events
    const loadEmptyEvents = createEvent(EventTypes.EventSourcing.LOAD_EVENTS, []);
    testState = appReducer(testState, loadEmptyEvents);
    
    // Verify state is reset
    expect(testState.events).toEqual([]);
    expect(testState.nodes.length).toBe(0);
    expect(testState.edges.length).toBe(0);
    expect(testState.currentEventIndex).toBe(-1);
  });
  
  it('should handle legacy format (array of events)', () => {
    // Create a sample legacy format (just an array of events)
    const nodeId1 = nanoid();
    const nodeId2 = nanoid();
    
    const legacyEvents = [
      createEvent(EventTypes.ModelingEditor.ADD_COMMAND, {
        id: nodeId1,
        type: 'command',
        position: { x: 100, y: 100 },
        data: { label: 'Legacy Command' }
      }),
      createEvent(EventTypes.ModelingEditor.ADD_EVENT, {
        id: nodeId2,
        type: 'event',
        position: { x: 300, y: 100 },
        data: { label: 'Legacy Event' }
      })
    ];
    
    // Apply LOAD_EVENTS action with legacy format
    const loadLegacyEvents = createEvent(EventTypes.EventSourcing.LOAD_EVENTS, legacyEvents);
    const newState = appReducer(initialState, loadLegacyEvents);
    
    // Verify the state after loading legacy events
    expect(newState.events).toEqual(legacyEvents);
    expect(newState.nodes.length).toBe(2);
    expect(newState.currentEventIndex).toBe(1);
  });
  
  it('should create a model state that can be exported', () => {
    // Add some nodes and edges to the state
    const nodeId1 = nanoid();
    const nodeId2 = nanoid();
    
    // Build up a state with events
    let state = appReducer(initialState, createEvent(EventTypes.ModelingEditor.ADD_COMMAND, {
      id: nodeId1,
      type: 'command',
      position: { x: 100, y: 100 },
      data: { label: 'Test Command' }
    }));
    
    state = appReducer(state, createEvent(EventTypes.ModelingEditor.ADD_EVENT, {
      id: nodeId2,
      type: 'event',
      position: { x: 300, y: 100 },
      data: { label: 'Test Event' }
    }));
    
    state = appReducer(state, createEvent(EventTypes.ReactFlow.NEW_CONNECTION, {
      source: nodeId1,
      target: nodeId2,
      sourceHandle: 'right',
      targetHandle: 'left'
    }));
    
    // Create a model state object that would be exported
    const modelState = {
      nodes: state.nodes,
      edges: state.edges,
      events: state.events,
      currentEventIndex: state.currentEventIndex
    };
    
    // Verify the model state contains the correct data
    expect(modelState.nodes.length).toBe(2);
    expect(modelState.edges.length).toBe(1);
    expect(modelState.events.length).toBe(3);
    expect(modelState.currentEventIndex).toBe(2);
    
    // Verify we can serialize and deserialize the model
    const serialized = JSON.stringify(modelState);
    const deserialized = JSON.parse(serialized);
    
    expect(deserialized.nodes.length).toBe(2);
    expect(deserialized.edges.length).toBe(1);
    expect(deserialized.events.length).toBe(3);
    
    // Verify we can load the deserialized events
    const loadedState = appReducer(initialState, createEvent(EventTypes.EventSourcing.LOAD_EVENTS, deserialized.events));
    
    expect(loadedState.nodes.length).toBe(2);
    expect(loadedState.edges.length).toBe(1);
    expect(loadedState.events.length).toBe(3);
  });
});
