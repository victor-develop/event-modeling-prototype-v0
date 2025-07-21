// State management and event sourcing for Event Modeling App
import { applyEdgeChanges, applyNodeChanges, MarkerType } from '@xyflow/react';
import type { NodeChange, EdgeChange, Connection } from '@xyflow/react';

// --- Event Types and Constants ---
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
    ADD_UI: 'ADD_UI',
    ADD_PROCESSOR: 'ADD_PROCESSOR',
    UPDATE_NODE_LABEL: 'UPDATE_NODE_LABEL',
    UPDATE_COMMAND_PARAMETERS: 'UPDATE_COMMAND_PARAMETERS',
    UPDATE_EVENT_PAYLOAD: 'UPDATE_EVENT_PAYLOAD',
    UPDATE_VIEW_SOURCES: 'UPDATE_VIEW_SOURCES',
    MOVE_BLOCK: 'MOVE_BLOCK',
    MOVE_NODE: 'MOVE_NODE',
    REMOVE_NODE: 'REMOVE_NODE',
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

// --- Types ---
export type ReactFlowNativeEventType = 
  { type: typeof EventTypes.ReactFlow.CHANGE_NODES; payload: NodeChange[] }
  | { type: typeof EventTypes.ReactFlow.CHANGE_EDGES; payload: EdgeChange[] }
  | { type: typeof EventTypes.ReactFlow.NEW_CONNECTION; payload: Connection };

export type ModelingEditorEventType =
  | { type: typeof EventTypes.ModelingEditor.ADD_SWIMLANE; payload: any }
  | { type: typeof EventTypes.ModelingEditor.ADD_BLOCK; payload: any }
  | { type: typeof EventTypes.ModelingEditor.ADD_TRIGGER; payload: any }
  | { type: typeof EventTypes.ModelingEditor.ADD_COMMAND; payload: any }
  | { type: typeof EventTypes.ModelingEditor.ADD_EVENT; payload: any }
  | { type: typeof EventTypes.ModelingEditor.ADD_VIEW; payload: any }
  | { type: typeof EventTypes.ModelingEditor.ADD_UI; payload: any }
  | { type: typeof EventTypes.ModelingEditor.ADD_PROCESSOR; payload: any }
  | { type: typeof EventTypes.ModelingEditor.UPDATE_NODE_LABEL; payload: { nodeId: string; label: string } }
  | { type: typeof EventTypes.ModelingEditor.UPDATE_COMMAND_PARAMETERS; payload: { nodeId: string; parameters: Record<string, string> } }
  | { type: typeof EventTypes.ModelingEditor.UPDATE_EVENT_PAYLOAD; payload: { nodeId: string; payload: Record<string, any> } }
  | { type: typeof EventTypes.ModelingEditor.UPDATE_VIEW_SOURCES; payload: { nodeId: string; sourceEvents: string[] } }
  | { type: typeof EventTypes.ModelingEditor.MOVE_BLOCK; payload: { nodeId: string; position: { x: number; y: number } } }
  | { type: typeof EventTypes.ModelingEditor.MOVE_NODE; payload: { nodeId: string; position: { x: number; y: number } } }
  | { type: typeof EventTypes.ModelingEditor.REMOVE_NODE; payload: { nodeId: string } };

export type EventSourcingEventType =
   { type: typeof EventTypes.EventSourcing.TIME_TRAVEL; payload: { index: number } }
  | { type: typeof EventTypes.EventSourcing.LOAD_EVENTS; payload: IntentionEventType[] }
  | { type: typeof EventTypes.EventSourcing.CREATE_SNAPSHOT; payload: { snapshotNodes: any[]; snapshotEdges: any[]; snapshotIndex: number } };

export type IntentionEventType =
  ReactFlowNativeEventType
  | ModelingEditorEventType
  | EventSourcingEventType;

export interface AppState {
  nodes: any[];
  edges: any[];
  events: IntentionEventType[];
  currentEventIndex: number;
  snapshotNodes: any[] | null;
  snapshotEdges: any[] | null;
  snapshotIndex: number;
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

// --- Event Sourcing Logic ---
export const applyEvents = (
  events: IntentionEventType[],
  targetIndex: number,
  initialNodes: any[] = [],
  initialEdges: any[] = [],
  startIndex: number = 0,
): { nodes: any[]; edges: any[] } => {
  let tempNodes: any[] = [...initialNodes];
  let tempEdges: any[] = [...initialEdges];

  for (let i = startIndex; i <= targetIndex; i++) {
    const event = events[i];
    const reducedResult = reduceCanvas(event, tempNodes, tempEdges);
    tempNodes = reducedResult.nodes;
    tempEdges = reducedResult.edges;
  }
  return { nodes: tempNodes, edges: tempEdges };
};

export function reduceCanvas(command: IntentionEventType, nodes: any[], edges: any[]) {
  let newNodes = [...nodes];
  let newEdges = [...edges];

  switch (command.type) {
    case EventTypes.ReactFlow.CHANGE_NODES:
      newNodes = applyNodeChanges(command.payload, newNodes);
      break;
    case EventTypes.ReactFlow.CHANGE_EDGES:
      newEdges = applyEdgeChanges(command.payload, newEdges);
      break;
    case EventTypes.ReactFlow.NEW_CONNECTION:
      const connection = command.payload;
      if (connection.source && connection.target) {
        const extendedConnection = connection as any;
        const newEdge = {
          id: `${connection.source}-${connection.target}-${Date.now()}`,
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
    case EventTypes.ModelingEditor.ADD_SWIMLANE:
      newNodes = [...newNodes, command.payload];
      break;
    case EventTypes.ModelingEditor.ADD_BLOCK:
    case EventTypes.ModelingEditor.ADD_TRIGGER:
    case EventTypes.ModelingEditor.ADD_COMMAND:
    case EventTypes.ModelingEditor.ADD_EVENT:
    case EventTypes.ModelingEditor.ADD_VIEW:
    case EventTypes.ModelingEditor.ADD_UI:
    case EventTypes.ModelingEditor.ADD_PROCESSOR:
      // Add the new block
      newNodes = [...newNodes, command.payload];
      
      // Update the parent swimlane width if needed
      newNodes = newNodes.map((node) => {
        if (node.id === command.payload.parentId) {
          const currentSwimlaneWidth = node.style?.width || 800;
          const potentialRightEdge = command.payload.position.x + (command.payload.style?.width || 100) + 20;
          
          if (potentialRightEdge > currentSwimlaneWidth) {
            return {
              ...node,
              style: {
                ...node.style,
                width: potentialRightEdge,
              },
            };
          }
        }
        return node;
      });
      break;
    case EventTypes.ModelingEditor.UPDATE_NODE_LABEL:
      newNodes = newNodes.map(node =>
        node.id === command.payload.nodeId
          ? { ...node, data: { ...node.data, label: command.payload.label } }
          : node
      );
      break;
    case EventTypes.ModelingEditor.UPDATE_COMMAND_PARAMETERS:
      newNodes = newNodes.map(node =>
        node.id === command.payload.nodeId
          ? { ...node, data: { ...node.data, parameters: command.payload.parameters } }
          : node
      );
      break;
    case EventTypes.ModelingEditor.UPDATE_EVENT_PAYLOAD:
      newNodes = newNodes.map(node =>
        node.id === command.payload.nodeId
          ? { ...node, data: { ...node.data, payload: command.payload.payload } }
          : node
      );
      break;
    case EventTypes.ModelingEditor.UPDATE_VIEW_SOURCES:
      newNodes = newNodes.map(node =>
        node.id === command.payload.nodeId
          ? { ...node, data: { ...node.data, sourceEvents: command.payload.sourceEvents } }
          : node
      );
      break;
    case EventTypes.ModelingEditor.MOVE_BLOCK:
    case EventTypes.ModelingEditor.MOVE_NODE:
      newNodes = newNodes.map(node =>
        node.id === command.payload.nodeId
          ? { 
              ...node, 
              position: command.payload.position,
              positionPerDrop: command.payload.position // Store the position after drop
            }
          : node
      );
      break;
    case EventTypes.ModelingEditor.REMOVE_NODE:
      // Remove the node
      newNodes = newNodes.filter(node => node.id !== command.payload.nodeId);
      // Remove any connected edges
      newEdges = newEdges.filter(edge => 
        edge.source !== command.payload.nodeId && 
        edge.target !== command.payload.nodeId
      );
      break;
    default:
      break;
  }

  return { nodes: newNodes, edges: newEdges };
}

// --- Main Reducer ---
export const appReducer = (state: AppState, command: IntentionEventType): AppState => {
  if (command.type === EventTypes.EventSourcing.TIME_TRAVEL) {
    let newNodes: any[] = [];
    let newEdges: any[] = [];
    let startIndex = 0;
    if (state.snapshotNodes && state.snapshotEdges) {
      newNodes = state.snapshotNodes;
      newEdges = state.snapshotEdges;
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
      snapshotNodes: null,
      snapshotEdges: null,
      snapshotIndex: -1,
    };
  }
  if (command.type === EventTypes.EventSourcing.CREATE_SNAPSHOT) {
    const { snapshotNodes, snapshotEdges, snapshotIndex } = command.payload;
    const remainingEvents = state.events.slice(snapshotIndex + 1);
    return {
      ...state,
      nodes: snapshotNodes,
      edges: snapshotEdges,
      events: remainingEvents,
      currentEventIndex: -1,
      snapshotNodes: snapshotNodes,
      snapshotEdges: snapshotEdges,
      snapshotIndex: snapshotIndex,
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
