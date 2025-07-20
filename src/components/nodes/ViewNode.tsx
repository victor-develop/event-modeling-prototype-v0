import React, { memo, useCallback } from 'react';
import CloseButton from '../common/CloseButton';
import { useNodeLabelEdit } from '../../hooks/useNodeLabelEdit';
import { Handle, Position } from '@xyflow/react';

interface ViewNodeProps {
  id: string;
  data: { 
    label: string;
    sourceEvents?: string[];
  };
  selected: boolean;
  onLabelChange: (nodeId: string, label: string) => void;
  onSourcesChange?: (nodeId: string, sourceEvents: string[]) => void;
  onRemove?: (nodeId: string) => void;
}

const ViewNode: React.FC<ViewNodeProps> = ({
  id,
  data,
  selected,
  onLabelChange,
  onSourcesChange,
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
    nodeType: 'ViewNode'
  });

  // Handle remove button click
  const handleRemoveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(id);
    }
  }, [id, onRemove]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        border: `1px solid ${selected ? '#1a192b' : '#ddd'}`,
        borderRadius: '5px',
        backgroundColor: '#2ecc71', // Green for view
        color: 'white',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: selected ? '0 0 0 2px #1a192b' : 'none',
        position: 'relative',
      }}
    >
      {/* Close button */}
      <CloseButton onClick={handleRemoveClick} />
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
          👁️ {/* Eye icon for View */}
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
      
      {data.sourceEvents && data.sourceEvents.length > 0 && (
        <div style={{ flex: 1, fontSize: '0.9em' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Data sources:</div>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {data.sourceEvents.map((eventId, index) => (
              <li key={index}>{eventId}</li>
            ))}
          </ul>
        </div>
      )}
      
      {(!data.sourceEvents || data.sourceEvents.length === 0) && (
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
          Read model / Query
        </div>
      )}
      
      {/* Target handle on left - Views can be targets */}
      <Handle type="target" position={Position.Left} style={{ background: 'white' }} />
      {/* Source handle on right - Views can now be sources for UI and Processor */}
      <Handle type="source" position={Position.Right} style={{ background: 'white' }} />
    </div>
  );
};

export default memo(ViewNode);
