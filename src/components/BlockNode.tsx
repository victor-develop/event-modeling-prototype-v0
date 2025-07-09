import React, { memo, useCallback, useState, useRef, useEffect } from 'react'; // Import useState, useRef, useEffect
import { Handle, Position, useReactFlow } from '@xyflow/react';

interface BlockNodeProps {
  id: string;
  data: { label: string };
}

const BlockNode: React.FC<BlockNodeProps> = ({ id, data }) => {
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false); // State for edit mode
  const inputRef = useRef<HTMLInputElement>(null); // Ref for input focus

  // Focus the input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const onLabelChange = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              label: evt.target.value,
            },
          };
        }
        return node;
      }),
    );
  }, [id, setNodes]);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleKeyDown = useCallback((evt: React.KeyboardEvent<HTMLInputElement>) => {
    if (evt.key === 'Enter') {
      setIsEditing(false);
    }
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={data.label}
          onChange={onLabelChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            border: 'none',
            background: 'transparent',
            textAlign: 'center',
            width: '100%',
            padding: '5px',
            boxSizing: 'border-box',
            outline: 'none',
            boxShadow: 'none',
          }}
        />
      ) : (
        <div
          onDoubleClick={handleDoubleClick}
          style={{ cursor: 'text', padding: '5px', width: '100%', textAlign: 'center' }}
        >
          {data.label}
        </div>
      )}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default memo(BlockNode);