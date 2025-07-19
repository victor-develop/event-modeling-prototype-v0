import React, { useState, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';

export interface UINodeProps {
  id: string;
  data: {
    label: string;
  };
}

const UINode: React.FC<UINodeProps> = ({ id, data }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label || 'UI');
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
        border: '1px solid #7c3aed',
        borderRadius: '5px',
        backgroundColor: '#a78bfa', // Purple
        color: 'white',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 4px rgba(124,58,237,0.15)',
      }}
    >
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: '10px',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          paddingBottom: '5px'
        }}
      >
        <div style={{ marginRight: '10px', fontSize: '16px' }}>
          🖥️
        </div>
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
              color: 'white',
              fontSize: '0.9em', 
              outline: 'none',
              borderRadius: '3px',
              padding: '2px 5px'
            }}
          />
        ) : (
          <div
            onDoubleClick={handleDoubleClick}
            style={{ 
              flex: 1,
              fontWeight: 'bold', 
              cursor: 'text', 
              fontSize: '0.9em' 
            }}
          >
            {label}
          </div>
        )}
      </div>
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.7)',
        fontSize: '0.8em',
        textAlign: 'center',
        fontStyle: 'italic'
      }}>
        User Interface
      </div>
      
      {/* Handle placement matching Trigger node */}
      <Handle type="target" position={Position.Left} id="in" style={{ background: 'white' }} />
      <Handle type="source" position={Position.Right} id="out" style={{ background: 'white' }} />
    </div>
  );
};

export default UINode;
