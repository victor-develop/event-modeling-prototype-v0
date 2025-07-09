import React, { useCallback, useReducer } from 'react';
import {
  ReactFlow,
  addEdge,
  MiniMap,
  Controls,
  Background,
  useEdgesState,
  type Edge,
} from '@xyflow/react';
import { nanoid } from 'nanoid';

import '@xyflow/react/dist/style.css';

import Topbar from './components/Topbar';
import SwimlaneNode from './components/SwimlaneNode';
import BlockNode from './components/BlockNode';
import HistoryPanel from './components/HistoryPanel';
import ButtonEdge from './ButtonEdge';

// --- Event Sourcing Setup ---

type EventType =
  | { type: 'ADD_SWIMLANE'; payload: any }
  | { type: 'ADD_BLOCK'; payload: any }
  | { type: 'MOVE_NODE'; payload: { nodeId: string; position: { x: number; y: number } } }
  | { type: 'UPDATE_NODE_LABEL'; payload: { nodeId: string; label: string } }
  | { type: 'TIME_TRAVEL'; payload: { index: number } };

interface AppState {
  nodes: any[];
  edges: any[];
  events: EventType[];
  currentEventIndex: number;
}

const initialState: AppState = {
  nodes: [],
  edges: [],
  events: [],
  currentEventIndex: -1,
};

const applyEvents = (events: EventType[], targetIndex: number): { nodes: any[]; edges: any[] } => {
  let tempNodes: any[] = [];
  let tempEdges: any[] = [];

  for (let i = 0; i <= targetIndex; i++) {
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


const appReducer = (state: AppState, event: EventType): AppState => {
  if (event.type === 'TIME_TRAVEL') {
    const { nodes: newNodes, edges: newEdges } = applyEvents(state.events, event.payload.index);
    return {
      ...state,
      nodes: newNodes,
      edges: newEdges,
      currentEventIndex: event.payload.index,
    };
  }

  let newNodes = [...state.nodes];
  let newEdges = [...state.edges];

  switch (event.type) {
    case 'ADD_SWIMLANE':
      newNodes = newNodes.concat(event.payload);
      break;
    case 'ADD_BLOCK':
      newNodes = newNodes.concat(event.payload);
      newNodes = newNodes.map((node) => {
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
      newNodes = newNodes.map((node) => {
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
      newNodes = newNodes.map((node) =>
        node.id === event.payload.nodeId
          ? { ...node, data: { ...node.data, label: event.payload.label } }
          : node,
      );
      break;
    default:
      return state;
  }

  const newEvents = state.events.slice(0, state.currentEventIndex + 1).concat(event);
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

const OverviewFlow = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { nodes, edges: stateEdges, events, currentEventIndex } = state;

  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

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

  const onConnect = useCallback(
    (params: any) => {
      setEdges((eds: Edge[]) => addEdge(params, eds));
    },
    [],
  );

  const onNodesChange = useCallback(
    (changes: any) => {
      changes.forEach((change: any) => {
        if (change.type === 'position' && change.position) {
          // Dispatch MOVE_NODE only if it's not a swimlane
          const nodeToMove = nodes.find(n => n.id === change.id);
          if (nodeToMove && nodeToMove.type !== 'swimlane') {
            dispatchMoveNode(change.id, change.position);
          }
        }
      });
    },
    [dispatchMoveNode, nodes],
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

  const customNodeTypes = {
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
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar onAddSwimlane={onAddSwimlane} />
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
        />
      </div>
    </div>
  );
};

export default OverviewFlow;
