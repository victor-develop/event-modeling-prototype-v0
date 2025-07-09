import React, { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { nanoid } from 'nanoid';

interface SwimlaneNodeProps {
  id: string;
  data: { label: string };
  style?: React.CSSProperties;
}

const SwimlaneNode: React.FC<SwimlaneNodeProps> = ({ id, data, style }) => {
  const { setNodes, getNodes } = useReactFlow();

  const onAddBlock = useCallback(() => {
    const parentNode = getNodes().find((node) => node.id === id);
    if (!parentNode) return;

    const childNodes = getNodes().filter((node) => node.parentId === id);

    let newX = 10;
    const blockHeight = 50;
    const blockWidth = 100;
    const blockPadding = 20;
    const topOffsetForBlocks = 80; // Increased space for label and button

    if (childNodes.length > 0) {
      const rightmostChild = childNodes.reduce((prev, current) => {
        return (prev.position.x + (prev.style?.width || 0)) > (current.position.x + (current.style?.width || 0))
          ? prev
          : current;
      });
      newX = rightmostChild.position.x + (rightmostChild.style?.width || blockWidth) + blockPadding;
    }

    const newBlock = {
      id: nanoid(),
      type: 'default',
      position: { x: newX, y: topOffsetForBlocks }, // Position below the button/label
      data: { label: `Block ${childNodes.length + 1}` },
      parentId: id,
      extent: 'parent',
      style: { width: blockWidth, height: blockHeight, border: '1px solid #555', backgroundColor: '#fff' },
    };

    const currentSwimlaneWidth = parentNode.style?.width || 800;
    const potentialRightEdge = newX + blockWidth + blockPadding;

    let updatedSwimlaneWidth = currentSwimlaneWidth;
    if (potentialRightEdge > currentSwimlaneWidth) {
      updatedSwimlaneWidth = potentialRightEdge;
    }

    setNodes((nds) => {
      const updatedNodes = nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            style: {
              ...node.style,
              width: updatedSwimlaneWidth,
            },
          };
        }
        return node;
      });
      return updatedNodes.concat(newBlock);
    });
  }, [id, setNodes, getNodes]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        border: '1px solid #ccc',
        borderRadius: '5px',
        backgroundColor: 'rgba(200,200,255,0.2)',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>{data.label}</div>
      <button onClick={onAddBlock} style={{ marginBottom: '10px', padding: '5px 10px', cursor: 'pointer' }}>
        Add Block
      </button>
      {/* The actual blocks are rendered by React Flow based on their parentId */}
      {/* This div is just for visual structure within the custom node */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', overflowX: 'auto' }}>
        {/* Child nodes (blocks) are not rendered directly here. */}
        {/* Their positions are relative to the parent node's (0,0) */}
        {/* and are handled by React Flow's rendering engine. */}
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default memo(SwimlaneNode);
