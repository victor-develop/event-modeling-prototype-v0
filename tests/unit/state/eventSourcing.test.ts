import { describe, it, expect } from 'vitest';
import {
  EventTypes,
  reduceCanvas,
  appReducer,
  initialState,
  AppState,
  IntentionEventType
} from '../../../src/state/eventSourcing';

describe('reduceCanvas', () => {
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
      const movedNode = result.nodes.find(node => node.id === 'node1');
      expect(movedNode).toBeDefined();
      expect(movedNode.position).toEqual(newPosition);
      expect(movedNode.positionPerDrop).toEqual(newPosition);

      // Verify other node remains unchanged
      const unchangedNode = result.nodes.find(node => node.id === 'node2');
      expect(unchangedNode).toBeDefined();
      expect(unchangedNode.position).toEqual({ x: 200, y: 200 });
      expect(unchangedNode.positionPerDrop).toBeUndefined();
    });

    it('should update node position and positionPerDrop when moving a block', () => {
      // Arrange
      const initialNodes = [
        { id: 'block1', position: { x: 100, y: 100 } },
        { id: 'block2', position: { x: 200, y: 200 } }
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
      expect(result.nodes).toHaveLength(2);
      const movedNode = result.nodes.find(node => node.id === 'block1');
      expect(movedNode).toBeDefined();
      expect(movedNode.position).toEqual(newPosition);
      expect(movedNode.positionPerDrop).toEqual(newPosition);
    });
  });

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
      const updatedNode = result.nodes.find(node => node.id === 'node1');
      expect(updatedNode).toBeDefined();
      expect(updatedNode.data.label).toBe('New Label');

      // Verify other node remains unchanged
      const unchangedNode = result.nodes.find(node => node.id === 'node2');
      expect(unchangedNode).toBeDefined();
      expect(unchangedNode.data.label).toBe('Node 2');
    });
  });

  // Test REMOVE_NODE action
  describe('REMOVE_NODE action', () => {
    it('should remove a node and its connected edges', () => {
      // Arrange
      const initialNodes = [
        { id: 'node1', data: { label: 'Node 1' } },
        { id: 'node2', data: { label: 'Node 2' } }
      ];
      const initialEdges = [
        { id: 'edge1', source: 'node1', target: 'node2' },
        { id: 'edge2', source: 'node2', target: 'node1' },
        { id: 'edge3', source: 'node2', target: 'node2' }
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
        { id: 'node1', data: { label: 'Node 1' } },
        { id: 'node2', data: { label: 'Node 2' } }
      ];
      const initialEdges = [];
      const newConnectionCommand: IntentionEventType = {
        type: EventTypes.ReactFlow.NEW_CONNECTION,
        payload: {
          source: 'node1',
          target: 'node2',
          sourceHandle: null,
          targetHandle: null
        }
      };

      // Act
      const result = reduceCanvas(newConnectionCommand, initialNodes, initialEdges);

      // Assert
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].source).toBe('node1');
      expect(result.edges[0].target).toBe('node2');
      expect(result.edges[0].type).toBe('command-pattern');
    });

    it('should not create an edge if source or target is missing', () => {
      // Arrange
      const initialNodes = [
        { id: 'node1', data: { label: 'Node 1' } },
        { id: 'node2', data: { label: 'Node 2' } }
      ];
      const initialEdges = [];
      const invalidConnectionCommand: IntentionEventType = {
        type: EventTypes.ReactFlow.NEW_CONNECTION,
        payload: {
          source: 'node1',
          target: null,
          sourceHandle: null,
          targetHandle: null
        }
      };

      // Act
      const result = reduceCanvas(invalidConnectionCommand, initialNodes, initialEdges);

      // Assert
      expect(result.edges).toHaveLength(0);
    });
  });
});

describe('appReducer', () => {
  // Test regular action handling
  describe('Regular action handling', () => {
    it('should update nodes and edges and add event to history', () => {
      // Arrange
      const state: AppState = {
        ...initialState,
        nodes: [{ id: 'node1', position: { x: 100, y: 100 } }],
        edges: [],
        events: [],
        currentEventIndex: -1
      };

      const moveNodeCommand: IntentionEventType = {
        type: EventTypes.ModelingEditor.MOVE_NODE,
        payload: {
          nodeId: 'node1',
          position: { x: 200, y: 200 }
        }
      };

      // Act
      const result = appReducer(state, moveNodeCommand);

      // Assert
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].position).toEqual({ x: 200, y: 200 });
      expect(result.nodes[0].positionPerDrop).toEqual({ x: 200, y: 200 });

      // Check that event was added to history
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toEqual(moveNodeCommand);
      expect(result.currentEventIndex).toBe(0);
    });

    it('should not add non-time-travellable events to history', () => {
      // Arrange
      const state: AppState = {
        ...initialState,
        nodes: [{ id: 'node1', position: { x: 100, y: 100 } }],
        edges: [],
        events: [],
        currentEventIndex: -1
      };

      const changeNodesCommand: IntentionEventType = {
        type: EventTypes.ReactFlow.CHANGE_NODES,
        payload: [{ id: 'node1', type: 'select' }]
      };

      // Act
      const result = appReducer(state, changeNodesCommand);

      // Assert
      // Check that event was NOT added to history
      expect(result.events).toHaveLength(0);
      expect(result.currentEventIndex).toBe(-1);
    });
  });

  // Test default case in reduceCanvas
  describe('Default case handling', () => {
    it('should return unchanged nodes and edges for unknown action types', () => {
      // Arrange
      const initialNodes = [{ id: 'node1', position: { x: 100, y: 100 } }];
      const initialEdges = [{ id: 'edge1', source: 'a', target: 'b' }];

      // Create a command with an unknown type
      const unknownCommand = {
        type: 'UNKNOWN_ACTION_TYPE',
        payload: {}
      } as any;

      // Act
      const result = reduceCanvas(unknownCommand, initialNodes, initialEdges);

      // Assert
      expect(result.nodes).toEqual(initialNodes);
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

  // Test UPDATE_EVENT_PAYLOAD action
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

  // Test TIME_TRAVEL action
  describe('TIME_TRAVEL action', () => {
    it('should restore state to a previous point in event history with snapshots', () => {
      // Arrange
      const addNodeEvent: IntentionEventType = {
        type: EventTypes.ModelingEditor.ADD_BLOCK,
        payload: {
          id: 'block1',
          type: 'block',
          position: { x: 100, y: 100 },
          data: { label: 'Block 1' }
        }
      };

      const moveNodeEvent: IntentionEventType = {
        type: EventTypes.ModelingEditor.MOVE_NODE,
        payload: {
          nodeId: 'block1',
          position: { x: 200, y: 200 }
        }
      };

      const state: AppState = {
        ...initialState,
        nodes: [{
          id: 'block1',
          type: 'block',
          position: { x: 200, y: 200 },
          positionPerDrop: { x: 200, y: 200 },
          data: { label: 'Block 1' }
        }],
        edges: [],
        events: [addNodeEvent, moveNodeEvent],
        currentEventIndex: 1,
        snapshotNodes: [{ id: 'snapshot-node', position: { x: 50, y: 50 } }],
        snapshotEdges: [{ id: 'snapshot-edge', source: 'a', target: 'b' }],
        snapshotIndex: 0
      };

      const timeTravelCommand: IntentionEventType = {
        type: EventTypes.EventSourcing.TIME_TRAVEL,
        payload: { index: 0 }
      };

      // Act
      const result = appReducer(state, timeTravelCommand);

      // Assert
      // The result should have the snapshot node plus the block node from the first event
      expect(result.nodes).toHaveLength(2);
      expect(result.currentEventIndex).toBe(0);

      // Events array should remain unchanged
      expect(result.events).toHaveLength(2);

      // Verify the nodes include both the snapshot node and the block node
      expect(result.nodes.some(node => node.id === 'snapshot-node')).toBe(true);
      expect(result.nodes.some(node => node.id === 'block1')).toBe(true);
    });

    it('should restore state to a previous point in event history without snapshots', () => {
      // Arrange
      const addNodeEvent: IntentionEventType = {
        type: EventTypes.ModelingEditor.ADD_BLOCK,
        payload: {
          id: 'block1',
          type: 'block',
          position: { x: 100, y: 100 },
          data: { label: 'Block 1' }
        }
      };

      const moveNodeEvent: IntentionEventType = {
        type: EventTypes.ModelingEditor.MOVE_NODE,
        payload: {
          nodeId: 'block1',
          position: { x: 200, y: 200 }
        }
      };

      const state: AppState = {
        ...initialState,
        nodes: [{
          id: 'block1',
          type: 'block',
          position: { x: 200, y: 200 },
          positionPerDrop: { x: 200, y: 200 },
          data: { label: 'Block 1' }
        }],
        edges: [],
        events: [addNodeEvent, moveNodeEvent],
        currentEventIndex: 1,
        snapshotNodes: null,
        snapshotEdges: null,
        snapshotIndex: -1
      };

      const timeTravelCommand: IntentionEventType = {
        type: EventTypes.EventSourcing.TIME_TRAVEL,
        payload: { index: 0 }
      };

      // Act
      const result = appReducer(state, timeTravelCommand);

      // Assert
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].position).toEqual({ x: 100, y: 100 });
      expect(result.currentEventIndex).toBe(0);

      // Events array should remain unchanged
      expect(result.events).toHaveLength(2);
    });
  });

  // Test LOAD_EVENTS action
  describe('LOAD_EVENTS action', () => {
    it('should load events and apply them to create a new state', () => {
      // Arrange
      const state: AppState = initialState;

      const events: IntentionEventType[] = [
        {
          type: EventTypes.ModelingEditor.ADD_BLOCK,
          payload: {
            id: 'block1',
            type: 'block',
            position: { x: 100, y: 100 },
            data: { label: 'Block 1' }
          }
        },
        {
          type: EventTypes.ModelingEditor.MOVE_NODE,
          payload: {
            nodeId: 'block1',
            position: { x: 200, y: 200 }
          }
        }
      ];

      const loadEventsCommand: IntentionEventType = {
        type: EventTypes.EventSourcing.LOAD_EVENTS,
        payload: events
      };

      // Act
      const result = appReducer(state, loadEventsCommand);

      // Assert
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].position).toEqual({ x: 200, y: 200 });
      expect(result.nodes[0].positionPerDrop).toEqual({ x: 200, y: 200 });

      expect(result.events).toEqual(events);
      expect(result.currentEventIndex).toBe(1);

      // Snapshot should be reset
      expect(result.snapshotNodes).toBeNull();
      expect(result.snapshotEdges).toBeNull();
      expect(result.snapshotIndex).toBe(-1);
    });
  });

  // Test CREATE_SNAPSHOT action
  describe('CREATE_SNAPSHOT action', () => {
    it('should create a snapshot and update state accordingly', () => {
      // Arrange
      const events: IntentionEventType[] = [
        {
          type: EventTypes.ModelingEditor.ADD_BLOCK,
          payload: {
            id: 'block1',
            type: 'block',
            position: { x: 100, y: 100 },
            data: { label: 'Block 1' }
          }
        },
        {
          type: EventTypes.ModelingEditor.MOVE_NODE,
          payload: {
            nodeId: 'block1',
            position: { x: 200, y: 200 }
          }
        },
        {
          type: EventTypes.ModelingEditor.UPDATE_NODE_LABEL,
          payload: {
            nodeId: 'block1',
            label: 'Updated Block'
          }
        }
      ];

      const state: AppState = {
        ...initialState,
        nodes: [{
          id: 'block1',
          type: 'block',
          position: { x: 200, y: 200 },
          positionPerDrop: { x: 200, y: 200 },
          data: { label: 'Updated Block' }
        }],
        edges: [],
        events: events,
        currentEventIndex: 2
      };

      const snapshotNodes = [{
        id: 'block1',
        type: 'block',
        position: { x: 200, y: 200 },
        positionPerDrop: { x: 200, y: 200 },
        data: { label: 'Updated Block' }
      }];

      const createSnapshotCommand: IntentionEventType = {
        type: EventTypes.EventSourcing.CREATE_SNAPSHOT,
        payload: {
          snapshotNodes: snapshotNodes,
          snapshotEdges: [],
          snapshotIndex: 1
        }
      };

      // Act
      const result = appReducer(state, createSnapshotCommand);

      // Assert
      expect(result.snapshotNodes).toEqual(snapshotNodes);
      expect(result.snapshotEdges).toEqual([]);
      expect(result.snapshotIndex).toBe(1);

      // Events after snapshot index should remain
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toEqual(events[2]);

      // Current event index should be reset
      expect(result.currentEventIndex).toBe(-1);
    });
  });
});
