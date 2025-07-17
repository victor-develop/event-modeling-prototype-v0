import React, { useCallback, useReducer, useState, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  applyEdgeChanges, applyNodeChanges,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type NodeSelectionChange,
  MarkerType,
  // Removed unused import
  // type Edge as ReactFlowEdge
} from '@xyflow/react';
import { isValidConnection, getEdgeStyle, ConnectionPattern, getConnectionPatternType } from './utils/patternValidation';
// Import our enhanced types
import type {
  EventModelingNode,
  TriggerNodeData, CommandNodeData, EventNodeData, ViewNodeData
} from './types/nodeTypes';
import type { EventModelingEdge } from './types/edgeTypes';
import { EdgePriority } from './types/edgeTypes';
import { nanoid } from 'nanoid';

import '@xyflow/react/dist/style.css';

import Topbar from './components/Topbar';
import SwimlaneNode from './components/SwimlaneNode';
import BlockNode from './components/BlockNode';
import HistoryPanel from './components/HistoryPanel';
import ValidationPanel from './components/ValidationPanel';
import WelcomeGuide from './components/WelcomeGuide';

// Import new node types
import TriggerNode from './components/nodes/TriggerNode';
import CommandNode from './components/nodes/CommandNode';
import EventNode from './components/nodes/EventNode';
import ViewNode from './components/nodes/ViewNode';


// --- Event Sourcing Setup ---

export const EventTypes = {
  ReactFlow: {
    CHANGE_NODES: 'CHANGE_NODES',
    CHANGE_EDGES: 'CHANGE_EDGES',
    NEW_CONNECTION: 'NEW_CONNECTION',
  },
  ModelingEditor: {
    ADD_SWIMLANE: 'ADD_SWIMLANE',
    ADD_BLOCK: 'ADD_BLOCK',
    ADD_TRIGGER: 'ADD_TRIGGER',
    ADD_COMMAND: 'ADD_COMMAND',
    ADD_EVENT: 'ADD_EVENT',
    ADD_VIEW: 'ADD_VIEW',
    UPDATE_NODE_LABEL: 'UPDATE_NODE_LABEL',
    UPDATE_COMMAND_PARAMETERS: 'UPDATE_COMMAND_PARAMETERS',
    UPDATE_EVENT_PAYLOAD: 'UPDATE_EVENT_PAYLOAD',
    UPDATE_VIEW_SOURCES: 'UPDATE_VIEW_SOURCES',
    MOVE_BLOCK: 'MOVE_BLOCK',
    MOVE_NODE: 'MOVE_NODE',
  },
  EventSourcing: {
    TIME_TRAVEL: 'TIME_TRAVEL',
    LOAD_EVENTS: 'LOAD_EVENTS',
    CREATE_SNAPSHOT: 'CREATE_SNAPSHOT',
  }
} as const;

export const TIME_TRAVELLABLE_EVENTS = [
  EventTypes.ReactFlow.NEW_CONNECTION,
  ...Object.values(EventTypes.ModelingEditor),
];

export type ReactFlowNativeEventType = 
  { type: typeof EventTypes.ReactFlow.CHANGE_NODES; payload: NodeChange[] }
  | { type: typeof EventTypes.ReactFlow.CHANGE_EDGES; payload: EdgeChange[] }
  | { type: typeof EventTypes.ReactFlow.NEW_CONNECTION; payload: Connection }

export type ModelingEditorEventType =
  | { type: typeof EventTypes.ModelingEditor.ADD_SWIMLANE; payload: any }
  | { type: typeof EventTypes.ModelingEditor.ADD_BLOCK; payload: any }
  | { type: typeof EventTypes.ModelingEditor.ADD_TRIGGER; payload: any }
  | { type: typeof EventTypes.ModelingEditor.ADD_COMMAND; payload: any }
  | { type: typeof EventTypes.ModelingEditor.ADD_EVENT; payload: any }
  | { type: typeof EventTypes.ModelingEditor.ADD_VIEW; payload: any }
  | { type: typeof EventTypes.ModelingEditor.UPDATE_NODE_LABEL; payload: { nodeId: string; label: string } }
  | { type: typeof EventTypes.ModelingEditor.UPDATE_COMMAND_PARAMETERS; payload: { nodeId: string; parameters: Record<string, string> } }
  | { type: typeof EventTypes.ModelingEditor.UPDATE_EVENT_PAYLOAD; payload: { nodeId: string; payload: Record<string, any> } }
  | { type: typeof EventTypes.ModelingEditor.UPDATE_VIEW_SOURCES; payload: { nodeId: string; sourceEvents: string[] } }
  | { type: typeof EventTypes.ModelingEditor.MOVE_BLOCK; payload: { nodeId: string; position: { x: number; y: number } } }
  | { type: typeof EventTypes.ModelingEditor.MOVE_NODE; payload: { nodeId: string; position: { x: number; y: number } } };

export type EventSourcingEventType =
   { type: typeof EventTypes.EventSourcing.TIME_TRAVEL; payload: { index: number } }
  | { type: typeof EventTypes.EventSourcing.LOAD_EVENTS; payload: IntentionEventType[] }
  | { type: typeof EventTypes.EventSourcing.CREATE_SNAPSHOT; payload: { snapshotNodes: any[]; snapshotEdges: any[]; snapshotIndex: number } }; // New event type

export type IntentionEventType =
  ReactFlowNativeEventType
  | ModelingEditorEventType
  | EventSourcingEventType;



interface AppState {
  nodes: any[];
  edges: any[];
  events: IntentionEventType[];
  currentEventIndex: number;
  snapshotNodes: any[] | null; // New: Store snapshot nodes
  snapshotEdges: any[] | null; // New: Store snapshot edges
  snapshotIndex: number; // New: Index in the original event stream where snapshot was taken
}

export const initialState: AppState = {
  nodes: [],
  edges: [],
  events: [],
  currentEventIndex: -1,
  snapshotNodes: null,
  snapshotEdges: null,
  snapshotIndex: -1,
};

export const applyEvents = (
  events: IntentionEventType[],
  targetIndex: number,
  initialNodes: any[] = [], // New parameter
  initialEdges: any[] = [], // New parameter
  startIndex: number = 0, // New parameter: index to start applying events from
): { nodes: any[]; edges: any[] } => {
  let tempNodes: any[] = [...initialNodes]; // Start with initial nodes
  let tempEdges: any[] = [...initialEdges]; // Start with initial edges

  for (let i = startIndex; i <= targetIndex; i++) { // Loop from startIndex
    const event = events[i];
    const reducedResult = reduceCanvas(event, tempNodes, tempEdges);
    tempNodes = reducedResult.nodes;
    tempEdges = reducedResult.edges;
  }
  return { nodes: tempNodes, edges: tempEdges };
};

function reduceCanvas(command: IntentionEventType, nodes: any[], edges: any[]) {
    let newNodes = [...nodes];
    let newEdges = [...edges];

    switch (command.type) {
    // CHANGE_NODES, CHANGE_EDGES, NEW_CONNECTION are React Flow's built-in event types.
    case EventTypes.ReactFlow.CHANGE_NODES:
      newNodes = applyNodeChanges(command.payload, newNodes);
      break;
    case EventTypes.ReactFlow.CHANGE_EDGES:
      newEdges = applyEdgeChanges(command.payload, newEdges);
      break;
    case EventTypes.ReactFlow.NEW_CONNECTION:
      const connection = command.payload;
      if (connection.source && connection.target) {
        // Cast connection to any to access additional properties we've added
        const extendedConnection = connection as any;
        const newEdge = {
          id: `${connection.source}-${connection.target}-${Date.now()}`, // Add timestamp to ensure unique IDs
          source: connection.source,
          target: connection.target,
          animated: extendedConnection.animated || false,
          style: extendedConnection.style || {},
          // Explicitly use MarkerType from ReactFlow
          markerEnd: extendedConnection.markerEnd || { type: MarkerType.ArrowClosed },
          // Ensure edge type is explicitly set to match our registered edge type
          type: 'command-pattern',
          data: extendedConnection.data || { pattern: 'default' }
        };
        console.log('Adding new edge:', newEdge);
        newEdges = [...newEdges, newEdge];
      }
      break;

    // ADD_SWIMLANE, ADD_BLOCK, UPDATE_NODE_LABEL are specific to our app.
    case EventTypes.ModelingEditor.ADD_SWIMLANE:
      newNodes = [...newNodes, command.payload];
      break;
    case EventTypes.ModelingEditor.ADD_BLOCK:
      const block = command.payload;
      
      // Automatically adjust parent swimlane width if needed
      if (block.parentId) {
        const parentNode = newNodes.find(n => n.id === block.parentId);
        if (parentNode) {
          // Calculate block dimensions with padding
          const blockWidth = parseFloat(block.style?.width as string || '140'); // Default block width
          const horizontalPadding = 30; // Add padding for visual space
          const minSwimlaneWidth = 800; // Minimum swimlane width
          
          // Calculate right edge of new block including padding
          const blockRightEdge = block.position.x + blockWidth + horizontalPadding;
          const currentParentWidth = parseFloat(parentNode.style?.width as string || '800');
          
          // Calculate the new parent width if needed (ensure minimum width too)
          const newParentWidth = Math.max(
            minSwimlaneWidth,
            blockRightEdge > currentParentWidth ? blockRightEdge : currentParentWidth
          );
          
          // Update parent swimlane width if needed
          if (newParentWidth > currentParentWidth) {
            const updatedNodes = newNodes.map(n => {
              if (n.id === block.parentId) {
                return {
                  ...n,
                  style: {
                    ...n.style,
                    width: newParentWidth
                  }
                };
              }
              return n;
            });
            newNodes = updatedNodes;
          }
        }
      }
      
      newNodes = [...newNodes, block];
      break;
      
    // New node type actions
    case EventTypes.ModelingEditor.ADD_TRIGGER:
      newNodes = [...newNodes, command.payload];
      break;
    case EventTypes.ModelingEditor.ADD_COMMAND:
      newNodes = [...newNodes, command.payload];
      break;
    case EventTypes.ModelingEditor.ADD_EVENT:
      newNodes = [...newNodes, command.payload];
      break;
    case EventTypes.ModelingEditor.ADD_VIEW:
      newNodes = [...newNodes, command.payload];
      break;
      
    case EventTypes.ModelingEditor.UPDATE_NODE_LABEL:
      newNodes = newNodes.map(node => {
        if (node.id === command.payload.nodeId) {
          return {
            ...node,
            data: { ...node.data, label: command.payload.label }
          };
        }
        return node;
      });
      break;
      
    // New property update actions  
    case EventTypes.ModelingEditor.UPDATE_COMMAND_PARAMETERS:
      newNodes = newNodes.map(node => {
        if (node.id === command.payload.nodeId) {
          return {
            ...node,
            data: { ...node.data, parameters: command.payload.parameters }
          };
        }
        return node;
      });
      break;
      
    case EventTypes.ModelingEditor.UPDATE_EVENT_PAYLOAD:
      newNodes = newNodes.map(node => {
        if (node.id === command.payload.nodeId) {
          return {
            ...node,
            data: { ...node.data, payload: command.payload.payload }
          };
        }
        return node;
      });
      break;
      
    case EventTypes.ModelingEditor.UPDATE_VIEW_SOURCES:
      newNodes = newNodes.map(node => {
        if (node.id === command.payload.nodeId) {
          return {
            ...node,
            data: { ...node.data, sourceEvents: command.payload.sourceEvents }
          };
        }
        return node;
      });
      break;
      
    case EventTypes.ModelingEditor.MOVE_BLOCK:
      newNodes = newNodes.map(node => {
        if (node.id === command.payload.nodeId) {
          return {
            ...node,
            position: command.payload.position
          };
        }
        return node;
      });
      break;
      
    case EventTypes.ModelingEditor.MOVE_NODE:
      newNodes = newNodes.map(node => {
        if (node.id === command.payload.nodeId) {
          return {
            ...node,
            position: command.payload.position
          };
        }
        return node;
      });
      break;
    };

    return { nodes: newNodes, edges: newEdges };
}

export const appReducer = (state: AppState, command: IntentionEventType): AppState => {
  if (command.type === EventTypes.EventSourcing.TIME_TRAVEL) {
    let newNodes: any[] = [];
    let newEdges: any[] = [];
    let startIndex = 0;

    // If a snapshot exists, always start from the snapshot's state
    if (state.snapshotNodes && state.snapshotEdges) {
      newNodes = state.snapshotNodes;
      newEdges = state.snapshotEdges;
      // The events array in state is already truncated, so we apply from its start
      // The startIndex for applyEvents should be 0 relative to the current events array
    }

    const { nodes: replayedNodes, edges: replayedEdges } = applyEvents(
      state.events,
      command.payload.index,
      newNodes,
      newEdges,
      startIndex
    );

    return {
      ...state,
      nodes: replayedNodes,
      edges: replayedEdges,
      currentEventIndex: command.payload.index,
    };
  }

  if (command.type === EventTypes.EventSourcing.LOAD_EVENTS) {
    const newEvents = command.payload;
    const newCurrentEventIndex = newEvents.length > 0 ? newEvents.length - 1 : -1;
    const { nodes: newNodes, edges: newEdges } = applyEvents(newEvents, newCurrentEventIndex);
    return {
      ...state,
      nodes: newNodes,
      edges: newEdges,
      events: newEvents,
      currentEventIndex: newCurrentEventIndex,
      snapshotNodes: null, // Reset snapshot on load
      snapshotEdges: null, // Reset snapshot on load
      snapshotIndex: -1,   // Reset snapshot on load
    };
  }

  if (command.type === EventTypes.EventSourcing.CREATE_SNAPSHOT) { // Handle new CREATE_SNAPSHOT type
    const { snapshotNodes, snapshotEdges, snapshotIndex } = command.payload;
    const remainingEvents = state.events.slice(snapshotIndex + 1); // Keep events after snapshot

    return {
      ...state,
      nodes: snapshotNodes, // The state is now the snapshot
      edges: snapshotEdges, // The state is now the snapshot
      events: remainingEvents, // Only events after the snapshot remain
      currentEventIndex: -1, // After snapshot, always focus on the starting point
      snapshotNodes: snapshotNodes, // Store the snapshot
      snapshotEdges: snapshotEdges, // Store the snapshot
      snapshotIndex: snapshotIndex, // Store the original index of the snapshot
    };
  }

  const { nodes: newNodes, edges: newEdges } = reduceCanvas(command, state.nodes, state.edges);

  const [newEvents, newCurrentEventIndex] = TIME_TRAVELLABLE_EVENTS.includes(command.type as any)
  ? [state.events.slice(0, state.currentEventIndex + 1).concat(command), state.currentEventIndex + 1]
  : [state.events, state.currentEventIndex];

  return {
    ...state,
    nodes: newNodes,
    edges: newEdges,
    events: newEvents,
    currentEventIndex: newCurrentEventIndex,
  };
};

// --- End Event Sourcing Setup ---

// Define edge types for React Flow
const edgeTypes = {
  'command-pattern': (props: any) => {
    const { data } = props;
    // Fix: Pass null nodes instead of just the pattern type
    const edgeStyle = getEdgeStyle(null, null);
    
    // If we have a pattern type, use it to determine the style
    if (data?.patternType) {
      // Use the pattern-specific styling
      if (data.patternType === ConnectionPattern.COMMAND_PATTERN) {
        Object.assign(edgeStyle, {
          stroke: '#333',
          strokeWidth: 2,
        });
      } else if (data.patternType === ConnectionPattern.VIEW_PATTERN) {
        Object.assign(edgeStyle, {
          stroke: '#22a355',
          strokeWidth: 2,
          strokeDasharray: '5,5',
        });
      } else if (data.patternType === ConnectionPattern.AUTOMATION_PATTERN) {
        Object.assign(edgeStyle, {
          stroke: '#8844cc',
          strokeWidth: 2,
          strokeDasharray: '2,2',
          opacity: 0.8,
        });
      }
    }
    
    // pass our custom props through EdgeProps as provided by React Flow
    return (
      <g>
        {/* Custom edge path */}
        <path
          className="react-flow__edge-path"
          d={props.pathPoints || `M${props.sourceX},${props.sourceY} L${props.targetX},${props.targetY}`}
          style={edgeStyle}
        />
        {/* Edge label if condition exists */}
        {data?.condition && (
          <text
            className="react-flow__edge-text"
            x={(props.sourceX + props.targetX) / 2}
            y={(props.sourceY + props.targetY) / 2 - 10}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fill: '#777', fontSize: '12px', background: '#f5f5f5' }}
          >
            ?
          </text>
        )}
      </g>
    );
  },
};

const nodeClassName = (node: any): string => node.type;

const App = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [selectedSwimlaneId, setSelectedSwimlaneId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(() => {
    // Check if the user has seen the welcome guide before
    // Check if the user has seen the welcome guide before
    const hasSeenWelcomeGuide = localStorage.getItem('hasSeenWelcomeGuide');
    return hasSeenWelcomeGuide !== 'true';
  });
  
  // Extract nodes and edges from state for convenience
  const { nodes, edges, events, currentEventIndex } = state;
  
  // Handle closing the welcome guide
  const handleWelcomeGuideClose = useCallback(() => {
    setShowWelcomeGuide(false);
    localStorage.setItem('hasSeenWelcomeGuide', 'true');
  }, []);
  
  // Function to add a new swimlane with specified kind
  const addSwimlane = useCallback((kind: string) => {
    const id = nanoid();
    const newSwimlane = {
      id,
      type: 'swimlane',
      position: { x: 100, y: 100 + nodes.filter(n => n.type === 'swimlane').length * 200 },
      style: {
        width: 800,
        height: 150,
        backgroundColor: kind === 'event' ? '#fff8e1' : 
                        kind === 'command_view' ? '#e3f2fd' : 
                        kind === 'trigger' ? '#e8f5e9' : '#f5f5f5',
        border: '1px dashed #aaa',
        borderRadius: '5px',
        padding: '10px'  
      },
      data: { 
        label: `${kind.charAt(0).toUpperCase() + kind.slice(1).replace('_', ' & ')} Swimlane`,
        kind: kind // Store the kind in the swimlane data
      }
    };
    
    dispatch({
      type: EventTypes.ModelingEditor.ADD_SWIMLANE,
      payload: newSwimlane
    });
    
    // Automatically select the new swimlane
    setSelectedSwimlaneId(id);
  }, [nodes, dispatch]);
  
  // Dispatch functions for different node types
  const dispatchAddEvent = useCallback((node: any) => {
    dispatch({
      type: EventTypes.ModelingEditor.ADD_EVENT,
      payload: node
    });
  }, [dispatch]);
  
  const dispatchAddView = useCallback((node: any) => {
    dispatch({
      type: EventTypes.ModelingEditor.ADD_VIEW,
      payload: node
    });
  }, [dispatch]);
  
  const dispatchAddCommand = useCallback((node: any) => {
    dispatch({
      type: EventTypes.ModelingEditor.ADD_COMMAND,
      payload: node
    });
  }, [dispatch]);
  
  const dispatchAddTrigger = useCallback((node: any) => {
    dispatch({
      type: EventTypes.ModelingEditor.ADD_TRIGGER,
      payload: node
    });
  }, [dispatch]);
  
  // Function to add a new trigger node within selected swimlane
  const addTrigger = useCallback(() => {
    // Require a selected swimlane
    if (!selectedSwimlaneId) {
      console.warn('No swimlane selected. Please select a swimlane first.');
      alert('Please select a swimlane first before adding a Trigger.');
      return;
    }
    
    // Find the selected swimlane
    const swimlane = nodes.find(node => node.id === selectedSwimlaneId);
    if (!swimlane) {
      console.warn('Selected swimlane not found');
      return;
    }
    
    // Validate swimlane kind - triggers can only be added to trigger lanes
    if (swimlane.data?.kind !== 'trigger') {
      console.warn(`Cannot add Trigger to ${swimlane.data?.kind} swimlane`);
      alert(`Cannot add a Trigger to this swimlane type. Triggers must be in a Trigger swimlane.`);
      return;
    }
    
    const id = nanoid();
    // Calculate position within the swimlane
    const xOffset = 50; // Offset from the left edge of swimlane
    const yOffset = 50; // Offset from the top edge of swimlane
    
    // Find existing blocks in this swimlane to position horizontally
    const blocksInLane = nodes.filter(n => n.parentId === selectedSwimlaneId);
    const blockGap = 160; // Horizontal gap between blocks
    
    // Position new block after the last block in this lane
    const xPosition = blocksInLane.length > 0 ?
      Math.max(...blocksInLane.map((b: any) => b.position.x)) + blockGap :
      swimlane.position.x + xOffset;
      
    const newTrigger = {
      id,
      type: 'trigger',
      position: { 
        x: xPosition, 
        y: swimlane.position.y + yOffset 
      },
      data: { 
        label: 'New Trigger',
        triggerType: 'user',
        condition: '',
        schedule: ''
      },
      // Link to parent swimlane
      parentId: selectedSwimlaneId,
      extent: 'parent' // Constrain to parent boundaries
    };

    dispatchAddTrigger(newTrigger);
  }, [dispatchAddTrigger, selectedSwimlaneId, nodes]);
  
  // Function to add a new command node within selected swimlane
  const addCommand = useCallback(() => {
    // Require a selected swimlane
    if (!selectedSwimlaneId) {
      console.warn('No swimlane selected. Please select a swimlane first.');
      alert('Please select a swimlane first before adding a Command.');
      return;
    }
    
    // Find the selected swimlane
    const swimlane = nodes.find(node => node.id === selectedSwimlaneId);
    if (!swimlane) {
      console.warn('Selected swimlane not found');
      return;
    }
    
    // Validate swimlane kind - commands can only be added to command_view lanes
    if (swimlane.data?.kind !== 'command_view') {
      console.warn(`Cannot add Command to ${swimlane.data?.kind} swimlane`);
      alert(`Cannot add a Command to this swimlane type. Commands must be in a Command & View swimlane.`);
      return;
    }
    
    const id = nanoid();
    // Calculate position within the swimlane
    const xOffset = 50; // Offset from the left edge of swimlane
    const yOffset = 50; // Offset from the top edge of swimlane
    
    // Find existing blocks in this swimlane to position horizontally
    const blocksInLane = nodes.filter(n => n.parentId === selectedSwimlaneId);
    const blockGap = 160; // Horizontal gap between blocks
    
    // Position new block after the last block in this lane
    const xPosition = blocksInLane.length > 0 ?
      Math.max(...blocksInLane.map((b: any) => b.position.x)) + blockGap :
      swimlane.position.x + xOffset;
      
    const newCommand = {
      id,
      type: 'command',
      position: { 
        x: xPosition, 
        y: swimlane.position.y + yOffset 
      },
      data: { 
        label: 'New Command',
        parameters: {},
        authorization: 'user',
        validation: []
      },
      // Link to parent swimlane
      parentId: selectedSwimlaneId,
      extent: 'parent' // Constrain to parent boundaries
    };

    dispatchAddCommand(newCommand);
  }, [dispatchAddCommand, selectedSwimlaneId, nodes]);

  // Function to add a new event node within selected swimlane
  const addEvent = useCallback(() => {
    // Require a selected swimlane
    if (!selectedSwimlaneId) {
      console.warn('No swimlane selected. Please select a swimlane first.');
      alert('Please select a swimlane first before adding an Event.');
      return;
    }
    
    // Find the selected swimlane
    const swimlane = nodes.find(node => node.id === selectedSwimlaneId);
    if (!swimlane) {
      console.warn('Selected swimlane not found');
      return;
    }
    
    // Validate swimlane kind - events can only be added to event lanes
    if (swimlane.data?.kind !== 'event') {
      console.warn(`Cannot add Event to ${swimlane.data?.kind} swimlane`);
      alert(`Cannot add an Event to this swimlane type. Events must be in an Event swimlane.`);
      return;
    }
    
    const id = nanoid();
    // Calculate position within the swimlane
    const xOffset = 50; // Offset from the left edge of swimlane
    const yOffset = 50; // Offset from the top edge of swimlane
    
    // Find existing blocks in this swimlane to position horizontally
    const blocksInLane = nodes.filter(n => n.parentId === selectedSwimlaneId);
    const blockGap = 160; // Horizontal gap between blocks
    
    // Position new block after the last block in this lane
    const xPosition = blocksInLane.length > 0 ?
      Math.max(...blocksInLane.map((b: any) => b.position.x)) + blockGap :
      swimlane.position.x + xOffset;
      
    const newEvent = {
      id,
      type: 'event',
      position: { 
        x: xPosition, 
        y: swimlane.position.y + yOffset 
      },
      data: { 
        label: 'New Event',
        payload: {},
        version: '1.0',
        timestamp: new Date().toISOString(),
        isExternalEvent: false
      },
      // Link to parent swimlane
      parentId: selectedSwimlaneId,
      extent: 'parent' // Constrain to parent boundaries
    };

    dispatchAddEvent(newEvent);
  }, [dispatchAddEvent, selectedSwimlaneId, nodes]);

  // Function to add a new view node within selected swimlane
  const addView = useCallback(() => {
    // Require a selected swimlane
    if (!selectedSwimlaneId) {
      console.warn('No swimlane selected. Please select a swimlane first.');
      alert('Please select a swimlane first before adding a View.');
      return;
    }
    
    // Find the selected swimlane
    const swimlane = nodes.find(node => node.id === selectedSwimlaneId);
    if (!swimlane) {
      console.warn('Selected swimlane not found');
      return;
    }
    
    // Validate swimlane kind - views can only be added to command_view lanes
    if (swimlane.data?.kind !== 'command_view') {
      console.warn(`Cannot add View to ${swimlane.data?.kind} swimlane`);
      alert(`Cannot add a View to this swimlane type. Views must be in a Command & View swimlane.`);
      return;
    }
    
    const id = nanoid();
    // Calculate position within the swimlane
    const xOffset = 50; // Offset from the left edge of swimlane
    const yOffset = 50; // Offset from the top edge of swimlane
    
    // Find existing blocks in this swimlane to position horizontally
    const blocksInLane = nodes.filter(n => n.parentId === selectedSwimlaneId);
    const blockGap = 160; // Horizontal gap between blocks
    
    // Position new block after the last block in this lane
    const xPosition = blocksInLane.length > 0 ?
      Math.max(...blocksInLane.map((b: any) => b.position.x)) + blockGap :
      swimlane.position.x + xOffset;
    
    const newView = {
      id,
      type: 'view',
      position: { 
        x: xPosition, 
        y: swimlane.position.y + yOffset 
      },
      data: { 
        label: 'New View',
        sourceEvents: [],
        viewType: 'read',
        refreshPattern: 'on-demand',
        permissions: []
      },
      // Link to parent swimlane
      parentId: selectedSwimlaneId,
      extent: 'parent' // Constrain to parent boundaries
    };

    dispatchAddView(newView);
  }, [dispatchAddView, selectedSwimlaneId, nodes]);

  // Handle node selection
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Check if this is a selection change
      const selectionChange = changes.find(change => 
        change.type === 'select' && (change as NodeSelectionChange).selected === true
      ) as NodeSelectionChange | undefined;
      
      // If a node was selected, update the selectedSwimlaneId if it's a swimlane
      if (selectionChange) {
        const selectedNode = nodes.find(n => n.id === selectionChange.id);
        if (selectedNode && selectedNode.type === 'swimlane') {
          setSelectedSwimlaneId(selectedNode.id);
          setSelectedNodeId(selectedNode.id);
        } else if (selectedNode) {
          // For non-swimlane nodes, just track the selection
          setSelectedNodeId(selectedNode.id);
        }
      }
      
      dispatch({
        type: EventTypes.ReactFlow.CHANGE_NODES,
        payload: changes
      });
    },
    [dispatch, nodes]
  );
  
  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      dispatch({
        type: EventTypes.ReactFlow.CHANGE_EDGES,
        payload: changes
      });
    },
    [dispatch]
  );
  
  // Handle node drag stop
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: any) => {
      dispatch({
        type: EventTypes.ModelingEditor.MOVE_NODE,
        payload: {
          nodeId: node.id,
          position: node.position
        }
      });
    },
    [dispatch]
  );
  
  // Handle connections between nodes
  const onConnect = useCallback(
    (connection: Connection) => {
      // Find the source and target nodes
      const sourceNode = nodes.find(node => node.id === connection.source);
      const targetNode = nodes.find(node => node.id === connection.target);
      
      // Validate the connection against event modeling patterns
      const validationResult = isValidConnection(sourceNode || null, targetNode || null);
      
      if (validationResult.valid) {
        // Enhance the connection with pattern type
        const patternType = getConnectionPatternType(sourceNode || null, targetNode || null);
        const enhancedConnection = {
          ...connection,
          data: {
            patternType,
            priority: EdgePriority.MEDIUM // Using MEDIUM instead of NORMAL which doesn't exist
          }
        };
        
        dispatch({
          type: EventTypes.ReactFlow.NEW_CONNECTION,
          payload: enhancedConnection
        });
      } else {
        console.warn('Invalid connection attempted', connection);
        alert('This connection is not allowed based on event modeling patterns.');
      }
    },
    [dispatch, nodes]
  );
  
  // Functions for updating node properties
  const dispatchUpdateNodeLabel = useCallback(
    (nodeId: string, label: string) => {
      dispatch({
        type: EventTypes.ModelingEditor.UPDATE_NODE_LABEL,
        payload: { nodeId, label }
      });
    },
    [dispatch]
  );
  
  const dispatchUpdateCommandParameters = useCallback(
    (nodeId: string, parameters: Record<string, string>) => {
      dispatch({
        type: EventTypes.ModelingEditor.UPDATE_COMMAND_PARAMETERS,
        payload: { nodeId, parameters }
      });
    },
    [dispatch]
  );
  
  const dispatchUpdateEventPayload = useCallback(
    (nodeId: string, payload: Record<string, any>) => {
      dispatch({
        type: EventTypes.ModelingEditor.UPDATE_EVENT_PAYLOAD,
        payload: { nodeId, payload }
      });
    },
    [dispatch]
  );
  
  const dispatchUpdateViewSources = useCallback(
    (nodeId: string, sourceEvents: string[]) => {
      dispatch({
        type: EventTypes.ModelingEditor.UPDATE_VIEW_SOURCES,
        payload: { nodeId, sourceEvents }
      });
    },
    [dispatch]
  );
  
  // Time travel functionality
  const onTimeTravel = useCallback(
    (index: number) => {
      dispatch({
        type: EventTypes.EventSourcing.TIME_TRAVEL,
        payload: { index }
      });
    },
    [dispatch]
  );
  
  // Export events to JSON
  const onExportEvents = useCallback(() => {
    const modelState = {
      nodes,
      edges,
      events,
      currentEventIndex
    };
    
    const dataStr = JSON.stringify(modelState, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'event-model.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [nodes, edges, events, currentEventIndex]);
  
  // Import events from JSON
  const onImportEvents = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsedContent = JSON.parse(content);
          
          // Check if this is a legacy format (just events array)
          if (Array.isArray(parsedContent)) {
            dispatch({
              type: EventTypes.EventSourcing.LOAD_EVENTS,
              payload: parsedContent
            });
            alert('Legacy event format imported successfully!');
          } 
          // Check if this is our enhanced format with nodes, edges, events
          else if (parsedContent.nodes && parsedContent.edges && parsedContent.events) {
            dispatch({
              type: EventTypes.EventSourcing.LOAD_EVENTS,
              payload: parsedContent.events
            });
            alert('Model imported successfully!');
          } else {
            alert('Unknown file format. Please use a valid event model file.');
          }
        } catch (err) {
          console.error('Error parsing JSON:', err);
          alert('Error parsing JSON file. Please ensure it is a valid JSON file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [dispatch]);
  
  // Create a snapshot to compress history
  const onCompressSnapshot = useCallback(() => {
    if (currentEventIndex < 0) {
      alert('No events to compress.');
      return;
    }
    
    dispatch({
      type: EventTypes.EventSourcing.CREATE_SNAPSHOT,
      payload: {
        snapshotNodes: nodes,
        snapshotEdges: edges,
        snapshotIndex: currentEventIndex
      }
    });
    
    alert('History compressed successfully! Previous events have been consolidated into a snapshot.');
  }, [dispatch, nodes, edges, currentEventIndex]);
  
  // Import direct model state (advanced feature)
  const importModelState = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsedContent = JSON.parse(content);
          
          // Direct model state import - for advanced use cases
          if (parsedContent.nodes && parsedContent.edges) {
            // Create synthetic events from the model state
            const syntheticEvents: IntentionEventType[] = [];
            
            // Add swimlanes first
            parsedContent.nodes
              .filter((n: any) => n.type === 'swimlane')
              .forEach((node: any) => {
                syntheticEvents.push({
                  type: EventTypes.ModelingEditor.ADD_SWIMLANE,
                  payload: node
                });
              });
            
            // Then add blocks
            parsedContent.nodes
              .filter((n: any) => n.type !== 'swimlane')
              .forEach((node: any) => {
                let eventType;
                switch (node.type) {
                  case 'trigger':
                    eventType = EventTypes.ModelingEditor.ADD_TRIGGER;
                    break;
                  case 'command':
                    eventType = EventTypes.ModelingEditor.ADD_COMMAND;
                    break;
                  case 'event':
                    eventType = EventTypes.ModelingEditor.ADD_EVENT;
                    break;
                  case 'view':
                    eventType = EventTypes.ModelingEditor.ADD_VIEW;
                    break;
                  default:
                    eventType = EventTypes.ModelingEditor.ADD_BLOCK;
                }
                
                syntheticEvents.push({
                  type: eventType,
                  payload: node
                });
              });
            
            // Finally add connections
            parsedContent.edges.forEach((edge: any) => {
              syntheticEvents.push({
                type: EventTypes.ReactFlow.NEW_CONNECTION,
                payload: {
                  source: edge.source,
                  target: edge.target,
                  sourceHandle: edge.sourceHandle,
                  targetHandle: edge.targetHandle
                }
              });
            });
            
            // Load the synthetic events
            dispatch({
              type: EventTypes.EventSourcing.LOAD_EVENTS,
              payload: syntheticEvents
            });
            
            alert('Model state imported successfully!');
          } else {
            alert('Invalid model state format. Please use a valid JSON export.');
          }
        } catch (err) {
          console.error('Error parsing JSON:', err);
          alert('Error parsing JSON file. Please ensure it is a valid JSON file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [dispatch]);

  const customNodeTypes = useMemo(() => ({
    swimlane: (nodeProps: any) => (
      <SwimlaneNode 
        {...nodeProps} 
        dispatchAddBlock={(blockData) => {
          // Based on block type, dispatch the appropriate action
          switch(blockData.type) {
            case 'trigger':
              dispatch({
                type: EventTypes.ModelingEditor.ADD_TRIGGER,
                payload: blockData
              });
              break;
            case 'command':
              dispatch({
                type: EventTypes.ModelingEditor.ADD_COMMAND,
                payload: blockData
              });
              break;
            case 'event':
              dispatch({
                type: EventTypes.ModelingEditor.ADD_EVENT,
                payload: blockData
              });
              break;
            case 'view':
              dispatch({
                type: EventTypes.ModelingEditor.ADD_VIEW,
                payload: blockData
              });
              break;
            default:
              console.error(`Unknown block type: ${blockData.type}`);
          }
        }}
        dispatchUpdateNodeLabel={dispatchUpdateNodeLabel}
      />
    ),
    block: (nodeProps: any) => (
      <BlockNode {...nodeProps} onLabelChange={dispatchUpdateNodeLabel} />
    ),
    // Add new node types
    trigger: (nodeProps: any) => (
      <TriggerNode {...nodeProps} onLabelChange={dispatchUpdateNodeLabel} />
    ),
    command: (nodeProps: any) => (
      <CommandNode {...nodeProps} onLabelChange={dispatchUpdateNodeLabel} onParametersChange={dispatchUpdateCommandParameters} />
    ),
    event: (nodeProps: any) => (
      <EventNode {...nodeProps} onLabelChange={dispatchUpdateNodeLabel} onPayloadChange={dispatchUpdateEventPayload} />
    ),
    view: (nodeProps: any) => (
      <ViewNode {...nodeProps} onLabelChange={dispatchUpdateNodeLabel} onSourcesChange={dispatchUpdateViewSources} />
    ),
  }), [dispatchUpdateNodeLabel, dispatchUpdateCommandParameters, dispatchUpdateEventPayload, dispatchUpdateViewSources]);

  // Define custom edge types with appropriate styling and enhanced edge data
  const edgeTypes = useMemo(() => ({
    'command-pattern': (props: any) => {
      const { source, target } = props;
      const sourceNode = nodes.find(n => n.id === source);
      const targetNode = nodes.find(n => n.id === target);
      const edgeStyle = getEdgeStyle(sourceNode || null, targetNode || null);
      
      // Instead of using BaseEdge directly with potentially incompatible types,
      // pass our custom props through EdgeProps as provided by React Flow
      return (
        <g>
          {/* Custom edge path */}
          <path
            className="react-flow__edge-path"
            d={props.pathPoints || `M${props.sourceX},${props.sourceY} L${props.targetX},${props.targetY}`}
            style={edgeStyle}
          />
          {/* Edge label if condition exists */}
          {props.data?.condition && (
            <text
              className="react-flow__edge-text"
              x={(props.sourceX + props.targetX) / 2}
              y={(props.sourceY + props.targetY) / 2 - 10}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fill: '#777', fontSize: '12px', background: '#f5f5f5' }}
            >
              ?
            </text>
          )}
        </g>
      );
    },
  }), [nodes]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar
        onAddSwimlane={addSwimlane}
        onAddTrigger={addTrigger}
        onAddCommand={addCommand}
        onAddEvent={addEvent}
        onAddView={addView}
        onExportEvents={onExportEvents}
        onImportEvents={onImportEvents}
        onCompressSnapshot={onCompressSnapshot}
        onImportModelState={importModelState}
      />
      
      {/* Welcome Guide for new users */}
      {showWelcomeGuide && <WelcomeGuide onClose={handleWelcomeGuideClose} />}
      <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          defaultEdgeOptions={{
            animated: false,
            markerEnd: { type: MarkerType.ArrowClosed },
            type: 'command-pattern'
          }}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          onEdgesChange={onEdgesChange}
          edgeTypes={edgeTypes} /* This ensures edgeTypes is used */
          onConnect={onConnect}
          fitView
          attributionPosition="top-right"
          nodeTypes={customNodeTypes}
          style={{ flexGrow: 1 }}
        >
          <MiniMap zoomable pannable nodeClassName={nodeClassName} />
          <Controls />
          <Background />
          {/* Add ValidationPanel to provide model correctness guidance */}
          <ValidationPanel 
            nodes={nodes} 
            edges={edges}
            onNodeSelect={(nodeId) => {
              // Clear any selected edge
              setSelectedEdgeId(null);
              
              // Select the node and scroll to it
              setSelectedNodeId(nodeId);
              
              // Highlight the selected node
              const updatedNodes = nodes.map(n => ({
                ...n,
                selected: n.id === nodeId
              }));
              
              dispatch({
                type: EventTypes.ReactFlow.CHANGE_NODES,
                payload: updatedNodes.map(node => ({
                  id: node.id,
                  type: 'select',
                  selected: node.id === nodeId
                }))
              });
            }}
            onEdgeSelect={(edgeId) => {
              // Clear any selected node
              setSelectedNodeId(null);
              
              // Select the edge
              setSelectedEdgeId(edgeId);
              
              // Highlight the selected edge
              dispatch({
                type: EventTypes.ReactFlow.CHANGE_EDGES,
                payload: edges.map(e => ({
                  id: e.id,
                  type: 'select',
                  selected: e.id === edgeId
                }))
              });
            }}
          />
        </ReactFlow>
        <HistoryPanel
          events={events}
          currentEventIndex={currentEventIndex}
          onTimeTravel={onTimeTravel}
          snapshotNodes={state.snapshotNodes}
          nodes={nodes}
          edges={edges}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
        />
      </div>
    </div>
  );
};

export default App;
