import React, { useCallback, useReducer } from 'react';
import {
  ReactFlow,
  addEdge,
  MiniMap,
  Controls,
  Background,
  useEdgesState,
  applyEdgeChanges, applyNodeChanges,
  type Edge,
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
import ButtonEdge from './ButtonEdge';

// --- Event Sourcing Setup ---

type IntentionEventType =
  | { type: 'CHANGE_NODES'; payload: NodeChange[] }
  | { type: 'CHANGE_EDGES'; payload: EdgeChange[] }
  | { type: 'NEW_CONNECTION'; payload: Connection }
  | { type: 'ADD_SWIMLANE'; payload: any }
  | { type: 'ADD_BLOCK'; payload: any }
  | { type: 'MOVE_NODE'; payload: { nodeId: string; position: { x: number; y: number } } }
  | { type: 'UPDATE_NODE_LABEL'; payload: { nodeId: string; label: string } }
  | { type: 'TIME_TRAVEL'; payload: { index: number } }
  | { type: 'LOAD_EVENTS'; payload: IntentionEventType[] }
  | { type: 'CREATE_SNAPSHOT'; payload: { snapshotNodes: any[]; snapshotEdges: any[]; snapshotIndex: number } }; // New event type

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
    switch (event.type) {
      case 'ADD_SWIMLANE':
        tempNodes = tempNodes.concat(event.payload);
        break;
      case 'ADD_BLOCK':
        tempNodes = tempNodes.concat(event.payload);
        tempNodes = tempNodes.map((node) => {
          if (node.id === event.payload.parentId) {
            const currentSwimlaneWidth = node.style?.width || 800;
            const potentialRightEdge = event.payload.position.x + (event.payload.style?.width || 100) + 20;
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
      case 'MOVE_NODE':
        tempNodes = tempNodes.map((node) => {
          if (node.id === event.payload.nodeId) {
            // If it's a swimlane, prevent movement
            if (node.type === 'swimlane') {
              return node; // Return the node unchanged
            }
            return { ...node, position: event.payload.position };
          }
          return node;
        });
        break;
      case 'UPDATE_NODE_LABEL':
        tempNodes = tempNodes.map((node) =>
          node.id === event.payload.nodeId
            ? { ...node, data: { ...node.data, label: event.payload.label } }
            : node,
        );
        break;
    }
  }
  return { nodes: tempNodes, edges: tempEdges };
};


export const appReducer = (state: AppState, command: IntentionEventType): AppState => {
  if (command.type === 'TIME_TRAVEL') {
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

  if (command.type === 'LOAD_EVENTS') {
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

  if (command.type === 'CREATE_SNAPSHOT') { // Handle new CREATE_SNAPSHOT type
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

  let newNodes = [...state.nodes];
  let newEdges = [...state.edges];

  switch (command.type) {
    case 'CHANGE_NODES':
      newNodes = applyNodeChanges(command.payload, newNodes);
      break;
    case 'CHANGE_EDGES':
      newEdges = applyEdgeChanges(command.payload, newEdges);
      break;
    case 'NEW_CONNECTION':
      newEdges = addEdge(command.payload, newEdges);
      break;
    case 'ADD_SWIMLANE':
      newNodes = newNodes.concat(command.payload);
      break;
    case 'ADD_BLOCK':
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
    case 'MOVE_NODE':
      newNodes = newNodes.map((node) => {
        if (node.id === command.payload.nodeId) {
          // If it's a swimlane, prevent movement
          if (node.type === 'swimlane') {
            return node; // Return the node unchanged
          }
          return { ...node, position: command.payload.position };
        }
        return node;
      });
      break;
    case 'UPDATE_NODE_LABEL':
      newNodes = newNodes.map((node) =>
        node.id === command.payload.nodeId
          ? { ...node, data: { ...node.data, label: command.payload.label } }
          : node,
      );
      break;
    default:
      return state;
  }

  const newEvents = state.events.slice(0, state.currentEventIndex + 1).concat(command);
  const newCurrentEventIndex = newEvents.length - 1;

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
  button: ButtonEdge,
};

const nodeClassName = (node: any) => node.type;

const App = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { nodes, edges, events, currentEventIndex } = state;

  const dispatchNodeChanges = useCallback((changes: NodeChange[]) => {
    dispatch({ type: 'CHANGE_NODES', payload: changes });
  }, [nodes]);

  const dispatchEdgeChanges = useCallback((changes: EdgeChange[]) => {
    dispatch({ type: 'CHANGE_EDGES', payload: changes });
  }, [edges]);

  const dispatchNewConnection = useCallback((payload: Connection) => {
    dispatch({ type: 'NEW_CONNECTION', payload });
  }, []);

  const dispatchAddSwimlane = useCallback((swimlaneData: any) => {
    dispatch({ type: 'ADD_SWIMLANE', payload: swimlaneData });
  }, []);

  const dispatchAddBlock = useCallback((blockData: any) => {
    dispatch({ type: 'ADD_BLOCK', payload: blockData });
  }, []);

  const dispatchMoveNode = useCallback((nodeId: string, position: { x: number; y: number }) => {
    dispatch({ type: 'MOVE_NODE', payload: { nodeId, position } });
  }, []);
  

  const dispatchUpdateNodeLabel = useCallback((nodeId: string, label: string) => {
    dispatch({ type: 'UPDATE_NODE_LABEL', payload: { nodeId, label } });
  }, []);

  const onTimeTravel = useCallback((index: number) => {
    dispatch({ type: 'TIME_TRAVEL', payload: { index } });
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
            dispatch({ type: 'LOAD_EVENTS', payload: parsedEvents });
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
      type: 'CREATE_SNAPSHOT',
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
      dispatchNodeChanges(changes);
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
      <div style={{ display: 'flex', flexGrow: 1 }}>
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
