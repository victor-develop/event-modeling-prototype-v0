import React, { useCallback } from 'react';
import {
  ReactFlow,
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  applyNodeChanges, // Import applyNodeChanges
} from '@xyflow/react';
import { nanoid } from 'nanoid';

import '@xyflow/react/dist/style.css';

import {
  nodes as initialNodes,
  edges as initialEdges,
} from './initial-elements';

import AnnotationNode from './AnnotationNode';
import ToolbarNode from './ToolbarNode';
import ResizerNode from './ResizerNode';
import CircleNode from './CircleNode';
import TextInputNode from './TextInputNode';
import ButtonEdge from './ButtonEdge';
import Topbar from './components/Topbar';
import SwimlaneNode from './components/SwimlaneNode';

const nodeTypes = {
  annotation: AnnotationNode,
  tools: ToolbarNode,
  resizer: ResizerNode,
  circle: CircleNode,
  textinput: TextInputNode,
  swimlane: SwimlaneNode,
};

const edgeTypes = {
  button: ButtonEdge,
};

const nodeClassName = (node) => node.type;

const OverviewFlow = () => {
  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [],
  );

  // Custom onNodesChange to limit horizontal dragging for swimlanes
  const onNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => {
        const updatedNodes = applyNodeChanges(changes, nds);
        return updatedNodes.map((node) => {
          if (node.type === 'swimlane' && node.position) {
            // If the node is a swimlane and its position changed,
            // reset its x position to its original x (or a fixed value)
            // For simplicity, let's assume initial x for swimlanes is 50
            return {
              ...node,
              position: {
                x: 50, // Keep x fixed
                y: node.position.y,
              },
            };
          }
          return node;
        });
      });
    },
    [setNodes],
  );

  const onAddSwimlane = useCallback(() => {
    const swimlanes = nodes.filter(node => node.type === 'swimlane');
    let newY = 50; // Default starting Y

    if (swimlanes.length > 0) {
      // Find the bottom-most swimlane
      const lastSwimlane = swimlanes.reduce((prev, current) => {
        const prevBottom = prev.position.y + (prev.style?.height || 0);
        const currentBottom = current.position.y + (current.style?.height || 0);
        return prevBottom > currentBottom ? prev : current;
      });
      newY = (lastSwimlane.position.y || 0) + (lastSwimlane.style?.height || 200) + 20; // 20px spacing
    }

    const newSwimlane = {
      id: nanoid(),
      type: 'swimlane',
      position: { x: 50, y: newY },
      data: { label: `Swimlane ${swimlanes.length + 1}` },
      style: { width: 800, height: 200, backgroundColor: 'rgba(200,200,255,0.2)', border: '1px solid #ccc' },
    };
    setNodes((nds) => nds.concat(newSwimlane));
  }, [nodes, setNodes]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar onAddSwimlane={onAddSwimlane} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange} // Use custom onNodesChange
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        attributionPosition="top-right"
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        style={{ flexGrow: 1 }}
      >
        <MiniMap zoomable pannable nodeClassName={nodeClassName} />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
};

export default OverviewFlow;