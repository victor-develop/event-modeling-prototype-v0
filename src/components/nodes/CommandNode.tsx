import React, { memo, useCallback } from 'react';
import { useNodeLabelEdit } from '../../hooks/useNodeLabelEdit';
import { Handle, Position } from '@xyflow/react';

interface CommandNodeProps {
  id: string;
  data: { 
    label: string;
    parameters?: Record<string, string>;
  };
  selected: boolean;
  onLabelChange: (nodeId: string, label: string) => void;
  onParametersChange?: (nodeId: string, parameters: Record<string, string>) => void;
  onRemove?: (nodeId: string) => void;
}

const CommandNode: React.FC<CommandNodeProps> = ({
  id,
  data,
  selected,
  onLabelChange,
  onParametersChange,
  onRemove,
}) => {
  const {
    label,
    isEditing,
    inputRef,
    handleLabelChange,
    handleDoubleClick,
    handleBlur,
    handleKeyDown
  } = useNodeLabelEdit({
    id,
    initialLabel: data.label,
    onLabelChange,
    nodeType: 'CommandNode'
  });

  const handleRemoveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(id);
    }
  }, [id, onRemove]);

  return (
    <div
      style={{
        padding: '10px',
        borderRadius: '5px',
        backgroundColor: '#3498db',
        color: 'white',
        border: `1px solid ${selected ? '#1a192b' : '#ddd'}`,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: selected ? '0 0 0 2px #1a192b' : 'none',
        position: 'relative',
      }}
    >
      {/* Close button */}
      <div 
        onClick={handleRemoveClick}
        style={{
          position: 'absolute',
          top: '2px',
          right: '2px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#666',
          border: '1px solid #ccc',
          zIndex: 10,
        }}
      >
        ×
      </div>
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: '10px',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          paddingBottom: '5px'
        }}
      >
        <div style={{ marginRight: '10px', fontSize: '20px' }}>
          ⚡ {/* Lightning bolt for Command */}
        </div>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={handleLabelChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{ 
              flex: 1,
              fontWeight: 'bold', 
              border: 'none', 
              background: 'rgba(255,255,255,0.1)', 
              color: 'white',
              fontSize: '1em', 
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
              fontSize: '1em' 
            }}
          >
            {data.label}
          </div>
        )}
      </div>
      
      {data.parameters && Object.keys(data.parameters).length > 0 && (
        <div style={{ flex: 1, fontSize: '0.9em' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Parameters:</div>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {Object.entries(data.parameters).map(([key, value]) => (
              <li key={key}>{key}: {value}</li>
            ))}
          </ul>
        </div>
      )}
      
      {(!data.parameters || Object.keys(data.parameters).length === 0) && (
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '0.9em',
          textAlign: 'center',
          fontStyle: 'italic'
        }}>
          Intent to change state
        </div>
      )}
      
      {/* Handle on both left and right */}
      <Handle type="target" position={Position.Left} style={{ background: 'white' }} />
      <Handle type="source" position={Position.Right} style={{ background: 'white' }} />
    </div>
  );
};

export default memo(CommandNode);
