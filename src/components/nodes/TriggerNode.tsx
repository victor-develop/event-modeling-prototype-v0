import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';

interface TriggerNodeProps {
  id: string;
  data: { 
    label: string;
    triggerType: 'ui' | 'api' | 'automated';
  };
  selected: boolean;
  onLabelChange: (nodeId: string, label: string) => void;
}

const TriggerNode: React.FC<TriggerNodeProps> = ({
  id,
  data,
  selected,
  onLabelChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only update local label state when data.label changes from outside
  // This prevents overriding our local edits when we're updating the label
  useEffect(() => {
    console.log('TriggerNode useEffect data.label changed', { dataLabel: data.label, currentLabel: label });
    setLabel(data.label);
  }, [data.label]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleLabelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('TriggerNode onLabelChange BEFORE', { id, currentLabel: label, newValue: e.target.value });
    setLabel(e.target.value);
    console.log('TriggerNode onLabelChange AFTER', { id, updatedLabel: e.target.value });
  }, [id, label]);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    console.log('TriggerNode handleBlur BEFORE', { id, label, dataLabel: data.label, isEditing });
    setIsEditing(false);
    // Always update the label when editing is complete
    console.log('TriggerNode calling onLabelChange on blur', { id, label });
    onLabelChange(id, label);
    console.log('TriggerNode handleBlur AFTER', { id, label, dataLabel: data.label });
  }, [id, label, data.label, onLabelChange, isEditing]);

  const handleKeyDown = useCallback((evt: React.KeyboardEvent<HTMLInputElement>) => {
    if (evt.key === 'Enter') {
      console.log('TriggerNode handleKeyDown Enter BEFORE', { id, label, dataLabel: data.label, isEditing });
      setIsEditing(false);
      // Always update the label when pressing Enter
      console.log('TriggerNode calling onLabelChange on Enter', { id, label });
      onLabelChange(id, label);
      console.log('TriggerNode handleKeyDown Enter AFTER', { id, label, dataLabel: data.label });
    }
  }, [id, label, data.label, onLabelChange, isEditing]);

  const getTriggerIcon = () => {
    switch (data.triggerType) {
      case 'ui':
        return '🖥️'; // Computer icon for UI
      case 'api':
        return '🔌'; // Plug icon for API
      case 'automated':
        return '🤖'; // Robot icon for automated process
      default:
        return '🖥️';
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        border: `1px solid ${selected ? '#1a192b' : '#ddd'}`,
        borderRadius: '5px',
        backgroundColor: 'white',
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
          borderBottom: '1px solid #eee',
          paddingBottom: '5px'
        }}
      >
        <div style={{ marginRight: '10px', fontSize: '20px' }}>
          {getTriggerIcon()}
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
              background: 'transparent', 
              fontSize: '1em', 
              outline: 'none' 
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
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#888',
        fontSize: '0.9em',
        textAlign: 'center',
        fontStyle: 'italic'
      }}>
        {data.triggerType === 'ui' ? 'User Interface' : 
         data.triggerType === 'api' ? 'API Endpoint' : 'Automated Process'}
      </div>
      
      {/* Source handle on the right - Triggers can only be sources */}
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default memo(TriggerNode);
