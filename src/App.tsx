import React, { useCallback, useReducer, useMemo, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  applyEdgeChanges, applyNodeChanges,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Edge,
  MarkerType,
  BaseEdge
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
          id: `${connection.source}-${connection.target}`,
          source: connection.source,
          target: connection.target,
          animated: extendedConnection.animated || false,
          style: extendedConnection.style || {},
          markerEnd: extendedConnection.markerEnd || { type: MarkerType.ArrowClosed },
          type: 'command-pattern',
          data: extendedConnection.data || { pattern: 'default' }
        };
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

const edgeTypes = {
};

const nodeClassName = (node: any) => node.type;

const App = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(() => {
    // Check if the user has seen the welcome guide before
    const hasSeenGuide = localStorage.getItem('hasSeenWelcomeGuide');
    return hasSeenGuide !== 'true';
  });
  
  // Handle closing the welcome guide
  const handleWelcomeGuideClose = () => {
    setShowWelcomeGuide(false);
    localStorage.setItem('hasSeenWelcomeGuide', 'true');
  };
  
  // Track selected node and edge for the enhanced HistoryPanel
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = React.useState<string | null>(null);
  const { nodes, edges, events, currentEventIndex } = state;

  const dispatchNodeChanges = useCallback((changes: NodeChange[]) => {
    dispatch({ type: EventTypes.ReactFlow.CHANGE_NODES, payload: changes });
  }, [nodes]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    // Track edge selection for HistoryPanel details tab
    if (changes.some(change => change.type === 'select')) {
      const selectChange = changes.find(change => change.type === 'select');
      if (selectChange && selectChange.type === 'select') {
        // If an edge is selected, clear any selected node
        if (selectChange.selected) {
          setSelectedEdgeId(selectChange.id);
          setSelectedNodeId(null);
        } else {
          setSelectedEdgeId(null);
        }
      }
    }
    
    dispatch({
      type: EventTypes.ReactFlow.CHANGE_EDGES,
      payload: changes
    });
  }, [edges]);

  const dispatchNewConnection = useCallback((params: Connection) => {
    dispatch({ type: EventTypes.ReactFlow.NEW_CONNECTION, payload: params });
  }, []);
  
  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);
      
      // Validate connection based on pattern rules
      const validation = isValidConnection(sourceNode || null, targetNode || null);
      const patternType = getConnectionPatternType(sourceNode || null, targetNode || null);
      
      if (validation.valid && patternType) {
        // Add additional properties needed for our custom edges
        const enhancedParams = { 
          ...params,
          data: { 
            pattern: patternType,
            patternType: patternType
          }
        };
        
        dispatchNewConnection(enhancedParams as Connection);
      } else {
        console.warn(validation.message);
        // Could show toast notification here for invalid connections
      }
    },
    [dispatchNewConnection, nodes],
  );

  const dispatchAddSwimlane = useCallback((swimlane: any) => {
    dispatch({ type: EventTypes.ModelingEditor.ADD_SWIMLANE, payload: swimlane });
  }, []);

  const dispatchAddBlock = useCallback((block: any) => {
    dispatch({ type: EventTypes.ModelingEditor.ADD_BLOCK, payload: block });
  }, []);

  // New node type dispatchers
  const dispatchAddTrigger = useCallback((trigger: any) => {
    dispatch({ type: EventTypes.ModelingEditor.ADD_TRIGGER, payload: trigger });
  }, []);

  const dispatchAddCommand = useCallback((command: any) => {
    dispatch({ type: EventTypes.ModelingEditor.ADD_COMMAND, payload: command });
  }, []);

  const dispatchAddEvent = useCallback((event: any) => {
    dispatch({ type: EventTypes.ModelingEditor.ADD_EVENT, payload: event });
  }, []);

  const dispatchAddView = useCallback((view: any) => {
    dispatch({ type: EventTypes.ModelingEditor.ADD_VIEW, payload: view });
  }, []);

  const dispatchUpdateNodeLabel = useCallback((nodeId: string, label: string) => {
    dispatch({
      type: EventTypes.ModelingEditor.UPDATE_NODE_LABEL,
      payload: { nodeId, label }
    });
  }, []);
  
  // New property update dispatchers
  const dispatchUpdateCommandParameters = useCallback((nodeId: string, parameters: Record<string, string>) => {
    dispatch({
      type: EventTypes.ModelingEditor.UPDATE_COMMAND_PARAMETERS,
      payload: { nodeId, parameters }
    });
  }, []);

  const dispatchUpdateEventPayload = useCallback((nodeId: string, payload: Record<string, any>) => {
    dispatch({
      type: EventTypes.ModelingEditor.UPDATE_EVENT_PAYLOAD,
      payload: { nodeId, payload }
    });
  }, []);

  const dispatchUpdateViewSources = useCallback((nodeId: string, sourceEvents: string[]) => {
    dispatch({
      type: EventTypes.ModelingEditor.UPDATE_VIEW_SOURCES,
      payload: { nodeId, sourceEvents }
    });
  }, []);
  
  const dispatchMoveBlock = useCallback((nodeId: string, position: { x: number; y: number }) => {
    dispatch({
      type: EventTypes.ModelingEditor.MOVE_BLOCK,
      payload: { nodeId, position }
    });
  }, []);

  const dispatchMoveNode = useCallback((nodeId: string, position: { x: number; y: number }) => {
    dispatch({
      type: EventTypes.ModelingEditor.MOVE_NODE,
      payload: { nodeId, position }
    });
  }, []);

  const onTimeTravel = useCallback((index: number) => {
    dispatch({ type: EventTypes.EventSourcing.TIME_TRAVEL, payload: { index } });
  }, []);

  const onExportEvents = useCallback(() => {
    // Create a comprehensive export object that includes all model data
    const exportData = {
      version: '1.0', // For future compatibility
      timestamp: new Date().toISOString(),
      events,
      currentState: {
        nodes,
        edges
      },
      // Include metadata about the model patterns
      metadata: {
        patterns: {
          commandPatterns: edges.filter(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            return sourceNode?.type === 'trigger' && targetNode?.type === 'command' || 
                  sourceNode?.type === 'command' && targetNode?.type === 'event';
          }).length,
          viewPatterns: edges.filter(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            return sourceNode?.type === 'event' && targetNode?.type === 'view';
          }).length,
          automationPatterns: edges.filter(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            return sourceNode?.type === 'event' && targetNode?.type === 'command';
          }).length
        },
        nodeCounts: {
          swimlanes: nodes.filter(n => n.type === 'swimlane').length,
          blocks: nodes.filter(n => n.type === 'block').length,
          triggers: nodes.filter(n => n.type === 'trigger').length,
          commands: nodes.filter(n => n.type === 'command').length,
          events: nodes.filter(n => n.type === 'event').length,
          views: nodes.filter(n => n.type === 'view').length
        }
      }
    };
    
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'event-model-export.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  }, [events, nodes, edges]);

  const onImportEvents = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const parsed = JSON.parse(event.target?.result as string);
            
            // Check if this is an enhanced model export or just an events array
            if (Array.isArray(parsed)) {
              // Legacy format - just an events array
              dispatch({ type: EventTypes.EventSourcing.LOAD_EVENTS, payload: parsed });
              console.log('Imported legacy events format');
            } 
            else if (parsed.events && Array.isArray(parsed.events)) {
              // New enhanced format - contains events plus additional data
              dispatch({ type: EventTypes.EventSourcing.LOAD_EVENTS, payload: parsed.events });
              console.log(`Imported enhanced model with ${parsed.events.length} events`);
              
              // Show metadata if available
              if (parsed.metadata) {
                console.log('Model metadata:', parsed.metadata);
                
                // Display a simple summary of the imported model
                const nodeCounts = parsed.metadata.nodeCounts;
                const patternCounts = parsed.metadata.patterns;
                if (nodeCounts && patternCounts) {
                  alert(`Successfully imported model with: \n` +
                        `- ${nodeCounts.swimlanes || 0} swimlanes\n` +
                        `- ${nodeCounts.triggers || 0} triggers\n` +
                        `- ${nodeCounts.commands || 0} commands\n` +
                        `- ${nodeCounts.events || 0} events\n` +
                        `- ${nodeCounts.views || 0} views\n\n` +
                        `Patterns:\n` +
                        `- ${patternCounts.commandPatterns || 0} command patterns\n` +
                        `- ${patternCounts.viewPatterns || 0} view patterns\n` +
                        `- ${patternCounts.automationPatterns || 0} automation patterns`);
                }
              }
            } 
            else {
              throw new Error('Unrecognized format');
            }
          } catch (error) {
            console.error('Failed to parse import file:', error);
            alert('Failed to import model. Please ensure the file is a valid event model export.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, []);
  
  // Add a new function to directly import model state (nodes and edges) for advanced use cases
  const importModelState = useCallback(() => {
    // Create a file input element to import raw JSON state
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const modelData = JSON.parse(event.target?.result as string);
            
            // Check if this is a valid model state
            if (modelData.nodes && Array.isArray(modelData.nodes) && 
                modelData.edges && Array.isArray(modelData.edges)) {
              // Create a snapshot with the imported nodes and edges
              dispatch({ 
                type: EventTypes.EventSourcing.CREATE_SNAPSHOT, 
                payload: {
                  snapshotNodes: modelData.nodes,
                  snapshotEdges: modelData.edges,
                  snapshotIndex: 0
                }
              });
              console.log(`Imported direct model state with ${modelData.nodes.length} nodes and ${modelData.edges.length} edges`);
              alert(`Successfully imported model state with ${modelData.nodes.length} nodes and ${modelData.edges.length} edges.`);
            } else {
              throw new Error('Invalid model state format');
            }
          } catch (error) {
            console.error('Failed to parse model state:', error);
            alert('Failed to import model state. Please ensure the file contains valid nodes and edges arrays.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, []);

  const onCompressSnapshot = useCallback(() => {
    // Dispatch CREATE_SNAPSHOT with the current state
    dispatch({
      type: EventTypes.EventSourcing.CREATE_SNAPSHOT,
      payload: {
        snapshotNodes: nodes,
        snapshotEdges: edges, // Use edges from the current state
        snapshotIndex: currentEventIndex,
      },
    });
  }, [nodes, edges, currentEventIndex]);


  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const filteredChanges = changes.filter(change => {
      if (change.type === 'position') {
        const node = nodes.find(n => n.id === change.id);
        return node?.type !== 'swimlane';
      }
      return true;
    });

    // Track node selection for HistoryPanel details tab
    if (changes.some(change => change.type === 'select')) {
      const selectChange = changes.find(change => change.type === 'select');
      if (selectChange && selectChange.type === 'select') {
        // If a node is selected, clear any selected edge
        if (selectChange.selected) {
          setSelectedNodeId(selectChange.id);
          setSelectedEdgeId(null);
        } else {
          setSelectedNodeId(null);
        }
      }
    }
    
    const mappedChanges = filteredChanges.map(change => {
      if (change.type === 'position' && change.position) {
        const node = nodes.find(n => n.id === change.id);
        if (node) {
          // Apply constraints based on node type
          if (node.type === 'block') {
            // Blocks can only move horizontally
            return { ...change, position: { x: change.position.x, y: node.position.y } };
          } else if (node.type === 'trigger' || node.type === 'command' || 
                    node.type === 'event' || node.type === 'view') {
            // New node types can move freely
            return change;
          }
        }
      }
      return change;
    });

    if (mappedChanges.length > 0) {
      dispatchNodeChanges(mappedChanges);
    }
  }, [dispatchNodeChanges, nodes]);

  // Handle moving specific node types
  const handleNodeMove = useCallback((nodeId: string, position: { x: number; y: number }) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      if (node.type === 'block') {
        dispatchMoveBlock(nodeId, { x: position.x, y: node.position.y });
      } else if (node.type === 'trigger' || node.type === 'command' || 
                node.type === 'event' || node.type === 'view') {
        dispatchMoveNode(nodeId, position);
      }
    }
  }, [nodes, dispatchMoveBlock, dispatchMoveNode]);

  const onNodeDragStop = useCallback((_: React.MouseEvent, node: any) => {
    handleNodeMove(node.id, node.position);
  }, [handleNodeMove]);

  // Function to add a new swimlane with specified kind
  const addSwimlane = useCallback((kind = 'event') => {
    const id = nanoid();
    const swimlaneWidth = 900; // Wider to accommodate multiple blocks horizontally
    const swimlaneHeight = 200; // Fixed height for consistency
    const verticalGap = 50;  // Gap between swimlanes
    
    // Find existing swimlanes to calculate vertical position
    const swimlanes = nodes.filter(node => node.type === 'swimlane');
    
    // Calculate Y position based on existing swimlanes
    // Position new swimlane below all existing swimlanes
    let yPosition = 50; // Default Y position if no swimlanes exist
    
    if (swimlanes.length > 0) {
      // Find the lowest swimlane and position below it
      yPosition = Math.max(...swimlanes.map(sl => {
        const height = parseFloat(sl.style?.height) || swimlaneHeight;
        return sl.position.y + height;
      })) + verticalGap;
    }

    const newSwimlane = {
      id,
      type: 'swimlane',
      position: { x: 100, y: yPosition },
      style: { width: swimlaneWidth, height: swimlaneHeight },
      data: { 
        label: `${kind.charAt(0).toUpperCase() + kind.slice(1)} Lane`,
        kind: kind // Store swimlane kind
      },
      // Prevent horizontal dragging, only allow vertical repositioning
      dragHandle: '.vertical-drag-handle' // Will add this class to a drag handle
    };

    dispatchAddSwimlane(newSwimlane);
  }, [nodes, dispatchAddSwimlane]);

  // Function to add a new trigger node
  const addTrigger = useCallback(() => {
    const id = nanoid();
    const newTrigger = {
      id,
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'New Trigger',
        triggerType: 'user',
        actor: ''
      }
    };

    dispatchAddTrigger(newTrigger);
  }, [dispatchAddTrigger]);

// ... (rest of the code remains the same)
  // Function to add a new command node
  const addCommand = useCallback(() => {
    const id = nanoid();
    const newCommand = {
      id,
      type: 'command',
      position: { x: 250, y: 100 },
      data: { 
        label: 'New Command',
        parameters: {},
        validation: {},
        preconditions: []
      }
    };

    dispatchAddCommand(newCommand);
  }, [dispatchAddCommand]);

  // Function to add a new event node
  const addEvent = useCallback(() => {
    const id = nanoid();
    const newEvent = {
      id,
      type: 'event',
      position: { x: 400, y: 100 },
      data: { 
        label: 'New Event',
        payload: {},
        version: '1.0',
        timestamp: new Date().toISOString(),
        isExternalEvent: false
      }
    };

    dispatchAddEvent(newEvent);
  }, [dispatchAddEvent]);

  // Function to add a new view node
  const addView = useCallback(() => {
    const id = nanoid();
    const newView = {
      id,
      type: 'view',
      position: { x: 550, y: 100 },
      data: { 
        label: 'New View',
        sourceEvents: [],
        viewType: 'read',
        refreshPattern: 'on-demand',
        permissions: []
      }
    };

    dispatchAddView(newView);
  }, [dispatchAddView]);

  const customNodeTypes = React.useMemo(() => ({
    swimlane: (nodeProps: any) => (
      <SwimlaneNode
        {...nodeProps}
        dispatchAddBlock={dispatchAddBlock}
        dispatchUpdateNodeLabel={dispatchUpdateNodeLabel}
      />
    ),
    block: (nodeProps: any) => (
      <BlockNode
        {...nodeProps}
        dispatchUpdateNodeLabel={dispatchUpdateNodeLabel}
      />
    ),
    // Add new node types
    trigger: (nodeProps: any) => (
      <TriggerNode
        {...nodeProps}
        dispatchUpdateNodeLabel={dispatchUpdateNodeLabel}
      />
    ),
    command: (nodeProps: any) => (
      <CommandNode
        {...nodeProps}
        dispatchUpdateNodeLabel={dispatchUpdateNodeLabel}
        dispatchUpdateCommandParameters={dispatchUpdateCommandParameters}
      />
    ),
    event: (nodeProps: any) => (
      <EventNode
        {...nodeProps}
        dispatchUpdateNodeLabel={dispatchUpdateNodeLabel}
        dispatchUpdateEventPayload={dispatchUpdateEventPayload}
      />
    ),
    view: (nodeProps: any) => (
      <ViewNode
        {...nodeProps}
        dispatchUpdateNodeLabel={dispatchUpdateNodeLabel}
        dispatchUpdateViewSources={dispatchUpdateViewSources}
      />
    ),
  }), [dispatchAddBlock, dispatchUpdateNodeLabel, dispatchUpdateCommandParameters, dispatchUpdateEventPayload, dispatchUpdateViewSources]);

  // Define custom edge types with appropriate styling and enhanced edge data
  const edgeTypes = useMemo(() => ({
    'command-pattern': ({ id, source, target, markerEnd, data }: Edge) => {
      const sourceNode = nodes.find(n => n.id === source);
      const targetNode = nodes.find(n => n.id === target);
      const edgeStyle = getEdgeStyle(sourceNode || null, targetNode || null);
      
      // Enhanced tooltip with edge data if available
      const title = data?.condition ? `Condition: ${data.condition}` : 
                   data?.notes ? `Notes: ${data.notes}` : '';
      
      return (
        <BaseEdge
          id={id}
          source={source}
          target={target}
          style={edgeStyle}
          markerEnd={markerEnd}
          label={data?.condition ? '?' : undefined}
          labelStyle={{ fill: '#777', fontSize: '12px' }}
          labelBgStyle={{ fill: '#f5f5f5' }}
          title={title}
        />
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
          edgeTypes={edgeTypes}
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
