import React, { useCallback, useReducer } from 'react';
import {
  ReactFlow,
  addEdge,
  MiniMap,
  Controls,
  Background,
  applyEdgeChanges, applyNodeChanges,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react';
import { nanoid } from 'nanoid';

import '@xyflow/react/dist/style.css';

import Topbar from './components/Topbar';
import SwimlaneNode from './components/SwimlaneNode';
import BlockNode from './components/BlockNode';
import HistoryPanel from './components/HistoryPanel';

// --- Event Sourcing Setup ---

const EventTypes = {
  ReactFlow: {
    CHANGE_NODES: 'CHANGE_NODES',
    CHANGE_EDGES: 'CHANGE_EDGES',
    NEW_CONNECTION: 'NEW_CONNECTION',
  },
  ModelingEditor: {
    ADD_SWIMLANE: 'ADD_SWIMLANE',
    ADD_BLOCK: 'ADD_BLOCK',
    UPDATE_NODE_LABEL: 'UPDATE_NODE_LABEL',
  },
  EventSourcing: {
    TIME_TRAVEL: 'TIME_TRAVEL',
    LOAD_EVENTS: 'LOAD_EVENTS',
    CREATE_SNAPSHOT: 'CREATE_SNAPSHOT',
  }
} as const;

type ReactFlowNativeEventType = 
  { type: typeof EventTypes.ReactFlow.CHANGE_NODES; payload: NodeChange[] }
  | { type: typeof EventTypes.ReactFlow.CHANGE_EDGES; payload: EdgeChange[] }
  | { type: typeof EventTypes.ReactFlow.NEW_CONNECTION; payload: Connection }

type ModelingEditorEventType =
  | { type: typeof EventTypes.ModelingEditor.ADD_SWIMLANE; payload: any }
  | { type: typeof EventTypes.ModelingEditor.ADD_BLOCK; payload: any }
  | { type: typeof EventTypes.ModelingEditor.UPDATE_NODE_LABEL; payload: { nodeId: string; label: string } };

type EventSourcingEventType =
   { type: typeof EventTypes.EventSourcing.TIME_TRAVEL; payload: { index: number } }
  | { type: typeof EventTypes.EventSourcing.LOAD_EVENTS; payload: IntentionEventType[] }
  | { type: typeof EventTypes.EventSourcing.CREATE_SNAPSHOT; payload: { snapshotNodes: any[]; snapshotEdges: any[]; snapshotIndex: number } }; // New event type

type IntentionEventType =
  ReactFlowNativeEventType
  | ModelingEditorEventType
  | EventSourcingEventType;

const TIME_TRAVELLABLE_EVENTS = [
  EventTypes.ModelingEditor.ADD_SWIMLANE,
  EventTypes.ModelingEditor.ADD_BLOCK,
  EventTypes.ReactFlow.NEW_CONNECTION,
  EventTypes.ModelingEditor.UPDATE_NODE_LABEL
]

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
      newEdges = addEdge({ ...command.payload, markerEnd: { type: 'arrowclosed' } }, newEdges);
      break;
    case EventTypes.ModelingEditor.ADD_SWIMLANE:
      newNodes = newNodes.concat(command.payload);
      break;
    case EventTypes.ModelingEditor.ADD_BLOCK:
      newNodes = newNodes.concat(command.payload);
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
      newNodes = newNodes.map((node) =>
        node.id === command.payload.nodeId
          ? { ...node, data: { ...node.data, label: command.payload.label } }
          : node,
      );
      break;
    default:
      break;
  }
  return {
    nodes: newNodes,
    edges: newEdges,
  };
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

  const [newEvents, newCurrentEventIndex] = TIME_TRAVELLABLE_EVENTS.includes(command.type)
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
  const { nodes, edges, events, currentEventIndex } = state;

  const dispatchNodeChanges = useCallback((changes: NodeChange[]) => {
    dispatch({ type: EventTypes.ReactFlow.CHANGE_NODES, payload: changes });
  }, [nodes]);

  const dispatchEdgeChanges = useCallback((changes: EdgeChange[]) => {
    dispatch({ type: EventTypes.ReactFlow.CHANGE_EDGES, payload: changes });
  }, [edges]);

  const dispatchNewConnection = useCallback((payload: Connection) => {
    dispatch({ type: EventTypes.ReactFlow.NEW_CONNECTION, payload });
  }, []);

  const dispatchAddSwimlane = useCallback((swimlaneData: any) => {
    dispatch({ type: EventTypes.ModelingEditor.ADD_SWIMLANE, payload: swimlaneData });
  }, []);

  const dispatchAddBlock = useCallback((blockData: any) => {
    dispatch({ type: EventTypes.ModelingEditor.ADD_BLOCK, payload: blockData });
  }, []);

  const dispatchUpdateNodeLabel = useCallback((nodeId: string, label: string) => {
    dispatch({ type: EventTypes.ModelingEditor.UPDATE_NODE_LABEL, payload: { nodeId, label } });
  }, []);

  const onTimeTravel = useCallback((index: number) => {
    dispatch({ type: EventTypes.EventSourcing.TIME_TRAVEL, payload: { index } });
  }, []);

  const onExportEvents = useCallback(() => {
    const json = JSON.stringify(events, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'event-log.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  }, [events]);

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
            const parsedEvents: IntentionEventType[] = JSON.parse(event.target?.result as string);
            dispatch({ type: EventTypes.EventSourcing.LOAD_EVENTS, payload: parsedEvents });
          } catch (error) {
            console.error('Failed to parse event log:', error);
            alert('Failed to load events. Please ensure the file is a valid JSON event log.');
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


  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      dispatchEdgeChanges(changes);
    },
    [dispatchEdgeChanges],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      dispatchNewConnection(params);
    },
    [dispatchNewConnection],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // filter out swimlane position changes to prevent swimlanes from being moved
      const filteredChanges = changes.filter(change => !(change.type === 'position' && nodes.find(node => node.id === change.id)?.type === 'swimlane'));
      const mappedChanges = filteredChanges.map(change => {
        if (change && change.type === 'position' && change.position) {
          const movingNode = nodes.find(node => node.id === change.id);
          if (movingNode && movingNode.type === 'block') {
          return {
            ...change,
            position: {
              x: change.position.x, 
              y: movingNode.position.y, // Keep the y position of blocks fixed to their swimlane
            },
          }
        }}
        return  change;
      })
      // Dispatch only if there are changes to nodes
      mappedChanges.length > 0 && dispatchNodeChanges(mappedChanges);
    },
    [dispatchNodeChanges],
  );

  const onAddSwimlane = useCallback(() => {
    const swimlanes = nodes.filter(node => node.type === 'swimlane');
    let newY = 50;

    if (swimlanes.length > 0) {
      const lastSwimlane = swimlanes.reduce((prev, current) => {
        const prevBottom = prev.position.y + (prev.style?.height || 0);
        const currentBottom = current.position.y + (current.style?.height || 0);
        return prevBottom > currentBottom ? prev : current;
      });
      newY = (lastSwimlane.position.y || 0) + (lastSwimlane.style?.height || 200) + 20;
    }

    const newSwimlane = {
      id: nanoid(),
      type: 'swimlane',
      position: { x: 50, y: newY },
      data: { label: `Swimlane ${swimlanes.length + 1}` },
      style: { width: 800, height: 200, backgroundColor: 'rgba(200,200,255,0.2)', border: '1px solid #ccc' },
    };
    dispatchAddSwimlane(newSwimlane);
  }, [nodes, dispatchAddSwimlane]);

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
  }), [dispatchAddBlock, dispatchUpdateNodeLabel]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar
        onAddSwimlane={onAddSwimlane}
        onExportEvents={onExportEvents}
        onImportEvents={onImportEvents}
        onCompressSnapshot={onCompressSnapshot} // Pass new handler
      />
      <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          attributionPosition="top-right"
          nodeTypes={customNodeTypes}
          edgeTypes={edgeTypes}
          style={{ flexGrow: 1 }}
        >
          <MiniMap zoomable pannable nodeClassName={nodeClassName} />
          <Controls />
          <Background />
        </ReactFlow>
        <HistoryPanel
          events={events}
          currentEventIndex={currentEventIndex}
          onTimeTravel={onTimeTravel}
          snapshotNodes={state.snapshotNodes}
          snapshotEdges={state.snapshotEdges}
        />
      </div>
    </div>
  );
};

export default App;
