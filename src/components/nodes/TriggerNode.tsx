import React, { memo } from 'react';
import { useNodeLabelEdit } from '../../hooks/useNodeLabelEdit';
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
    nodeType: 'TriggerNode'
  });

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
