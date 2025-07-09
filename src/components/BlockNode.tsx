import React, { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';

interface BlockNodeProps {
  id: string;
  data: { label: string };
}

const BlockNode: React.FC<BlockNodeProps> = ({ id, data }) => {
  const { setNodes } = useReactFlow();

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

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        border: '1px solid #555',
        borderRadius: '5px',
        backgroundColor: '#fff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <input
        type="text"
        value={data.label}
        onChange={onLabelChange}
        style={{ border: 'none', background: 'transparent', textAlign: 'center', width: '100%' }}
      />
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default memo(BlockNode);
