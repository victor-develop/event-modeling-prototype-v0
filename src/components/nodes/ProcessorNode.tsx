import React, { useState, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';

export interface ProcessorNodeProps {
  id: string;
  data: {
    label: string;
  };
}

const ProcessorNode: React.FC<ProcessorNodeProps> = ({ id, data }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label || 'Processor');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  const handleBlur = () => setIsEditing(false);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setLabel(e.target.value);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') setIsEditing(false);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        border: '1.5px solid #6b7280',
        borderRadius: '5px',
        backgroundColor: '#d1d5db', // Gray
        color: '#222',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 4px 0 rgba(107,114,128,0.15)',
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Top} id="in" style={{ background: '#222' }} />
      <Handle type="source" position={Position.Right} id="out" style={{ background: '#222' }} />
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', fontSize: '20px' }}>
        <span role="img" aria-label="Processor" style={{ marginRight: '10px' }}>⚙️</span>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              fontWeight: 'bold',
              border: 'none',
              background: 'rgba(255,255,255,0.1)',
              color: '#222',
              fontSize: '1em',
              outline: 'none',
              borderRadius: '3px',
              padding: '2px 5px',
            }}
          />
        ) : (
          <div
            onDoubleClick={handleDoubleClick}
            style={{
              flex: 1,
              fontWeight: 'bold',
              cursor: 'text',
              fontSize: '1em',
            }}
          >
            {label}
          </div>
        )}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '0.9em', textAlign: 'center', fontStyle: 'italic' }}>
        Automated Processor
      </div>
    </div>
  );
};

export default ProcessorNode;
