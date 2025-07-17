import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
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
}

const ViewNode: React.FC<ViewNodeProps> = ({
  id,
  data,
  selected,
  onLabelChange,
  onSourcesChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only update local label state when data.label changes from outside
  // This prevents overriding our local edits when we're updating the label
  useEffect(() => {
    console.log('ViewNode useEffect data.label changed', { dataLabel: data.label, currentLabel: label });
    setLabel(data.label);
  }, [data.label]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleLabelChange = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    console.log('ViewNode onLabelChange BEFORE', { id, currentLabel: label, newValue: evt.target.value });
    setLabel(evt.target.value);
    console.log('ViewNode onLabelChange AFTER', { id, updatedLabel: evt.target.value });
  }, [id, label]);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    console.log('ViewNode handleBlur BEFORE', { id, label, dataLabel: data.label, isEditing });
    setIsEditing(false);
    // Always update the label when editing is complete
    console.log('ViewNode calling onLabelChange on blur', { id, label });
    onLabelChange(id, label);
    console.log('ViewNode handleBlur AFTER', { id, label, dataLabel: data.label });
  }, [id, label, data.label, onLabelChange, isEditing]);

  const handleKeyDown = useCallback((evt: React.KeyboardEvent<HTMLInputElement>) => {
    if (evt.key === 'Enter') {
      console.log('ViewNode handleKeyDown Enter BEFORE', { id, label, dataLabel: data.label, isEditing });
      setIsEditing(false);
      // Always update the label when pressing Enter
      console.log('ViewNode calling onLabelChange on Enter', { id, label });
      onLabelChange(id, label);
      console.log('ViewNode handleKeyDown Enter AFTER', { id, label, dataLabel: data.label });
    }
  }, [id, label, data.label, onLabelChange, isEditing]);

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
      
      {/* Only target handle on left - Views can only be targets */}
      <Handle type="target" position={Position.Left} style={{ background: 'white' }} />
    </div>
  );
};

export default memo(ViewNode);
