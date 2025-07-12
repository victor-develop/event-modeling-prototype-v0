import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { nanoid } from 'nanoid';

interface SwimlaneNodeProps {
  id: string;
  data: { label: string };
  // Removed style?: React.CSSProperties; as it's not directly used in JSX
  // New props for dispatching events
  dispatchAddBlock: (blockData: any) => void;
  dispatchUpdateNodeLabel: (nodeId: string, label: string) => void;
}

const SwimlaneNode: React.FC<SwimlaneNodeProps> = ({
  id,
  data,
  // Removed style from destructuring
  dispatchAddBlock,
  dispatchUpdateNodeLabel,
}) => {
  const { getNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setLabel(data.label);
    }
  }, [data.label, isEditing]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const onLabelChange = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    setLabel(evt.target.value);
  }, []);

  const onAddBlock = useCallback(() => {
    const parentNode = getNodes().find((node) => node.id === id);
    if (!parentNode) return;

    const childNodes = getNodes().filter((node) => node.parentId === id);

    let newX = 10;
    const blockHeight = 50;
    const blockWidth = 100;
    const blockPadding = 20;
    const topOffsetForBlocks = 80;

    if (childNodes.length > 0) {
      const rightmostChild = childNodes.reduce((prev, current) => {
        // Fix: Parse width to number before addition
        const prevWidth = parseFloat(prev.style?.width as string || '0') || 0;
        const currentWidth = parseFloat(current.style?.width as string || '0') || 0;
        return (prev.position.x + prevWidth) > (current.position.x + currentWidth)
          ? prev
          : current;
      });
      // Fix: Parse width to number before addition
      newX = rightmostChild.position.x + (parseFloat(rightmostChild.style?.width as string || '0') || blockWidth) + blockPadding;
    }

    const newBlock = {
      id: nanoid(),
      type: 'block',
      position: { x: newX, y: topOffsetForBlocks },
      data: { label: `Block ${childNodes.length + 1}` },
      parentId: id,
      extent: 'parent',
      style: { width: blockWidth, height: blockHeight, border: '1px solid #555', backgroundColor: '#fff' },
    };

    // The swimlane width update logic is now handled in the appReducer (ADD_BLOCK case)
    dispatchAddBlock(newBlock);
  }, [id, getNodes, dispatchAddBlock]);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    dispatchUpdateNodeLabel(id, label);
  }, [id, label, dispatchUpdateNodeLabel]);

  const handleKeyDown = useCallback((evt: React.KeyboardEvent<HTMLInputElement>) => {
    if (evt.key === 'Enter') {
      setIsEditing(false);
      dispatchUpdateNodeLabel(id, label);
    }
  }, [id, label, dispatchUpdateNodeLabel]);

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
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={label}
          onChange={onLabelChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{ fontWeight: 'bold', marginBottom: '10px', border: 'none', background: 'transparent', fontSize: '1em', outline: 'none' }}
        />
      ) : (
        <div
          onDoubleClick={handleDoubleClick}
          style={{ fontWeight: 'bold', marginBottom: '10px', cursor: 'text', fontSize: '1em' }}
        >
          {data.label}
        </div>
      )}
      <button onClick={onAddBlock} style={{ marginBottom: '10px', padding: '5px 10px', cursor: 'pointer' }}>
        Add Block
      </button>
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', overflowX: 'auto' }}>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default memo(SwimlaneNode);
