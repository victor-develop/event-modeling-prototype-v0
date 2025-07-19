import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { SwimlaneNodeProps } from '../types/swimlaneTypes';
import { 
  ALLOWED_BLOCK_TYPES, 
  SWIMLANE_KIND_COLORS,
  SWIMLANE_KIND_LABELS 
} from '../types/swimlaneTypes';
import { BLOCK_KIND_BORDERS } from '../types/blockTypes';
import { createBlock, validateBlockInSwimlane } from '../utils/blockCreation';

const SwimlaneNode: React.FC<SwimlaneNodeProps> = ({
  id,
  data,
  dispatchAddBlock,
  dispatchUpdateNodeLabel,
  selected,
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

  // Get the allowed block types for this swimlane kind
  const swimlaneKind = data.kind as string | undefined;
  const allowedBlockTypes = swimlaneKind && ALLOWED_BLOCK_TYPES[swimlaneKind] ? ALLOWED_BLOCK_TYPES[swimlaneKind] : [];

  // Create a block of the specific type
  const createBlockInSwimlane = useCallback((blockType: string): void => {
    const parentNode = getNodes().find((node) => node.id === id);
    if (!parentNode) return;

    // Validate if this block type can be added to this swimlane kind
    const swimlaneKind = parentNode.data?.kind as string;
    const validationError = validateBlockInSwimlane(blockType.toLowerCase(), swimlaneKind);
    if (validationError) {
      console.warn(validationError);
      alert(validationError);
      return;
    }

    // Get existing blocks in this swimlane
    const existingBlocks = getNodes().filter((node) => node.parentId === id);
    
    // Use the shared block creation utility
    const newBlock = createBlock({
      blockType: blockType.toLowerCase(),
      parentId: id,
      parentPosition: parentNode.position,
      existingBlocks: existingBlocks
    });

    // The swimlane width update logic is handled in the appReducer (ADD_BLOCK case)
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

  // Focus effect styles - only border and subtle shadow, no overlay
  const focusStyles = selected ? {
    border: '2px solid #3182ce',
    boxShadow: '0 0 0 2px rgba(49, 130, 206, 0.3)',
    zIndex: 10
  } : {};
  
  // Base styles for the swimlane
  const baseStyles: React.CSSProperties = {
    width: '100%',
    height: '100%',
    border: '1px solid #ccc', // Default border, focus border is in focusStyles
    borderRadius: '5px',
    backgroundColor: swimlaneKind && SWIMLANE_KIND_COLORS[swimlaneKind] 
      ? SWIMLANE_KIND_COLORS[swimlaneKind] // Keep original background regardless of selection
      : 'rgba(200,200,255,0.2)',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column' as const,
    position: 'relative',
    transition: 'all 0.2s ease',
  };

  // Handle keyboard focus events
  const handleFocus = useCallback(() => {
    // This would be where we'd dispatch an action to select this swimlane
    // if we weren't already using the selected prop
  }, []);

  return (
    <div
      style={{
        ...baseStyles,
        ...focusStyles
      }}
      tabIndex={0} // Make the swimlane focusable with keyboard
      onFocus={handleFocus}
      aria-label={`${swimlaneKind || 'Unknown'} swimlane: ${label}`} // Accessibility label
    >
      {/* Add vertical drag handle for restricted vertical movement */}
      <div className="vertical-drag-handle" style={{
        position: 'absolute',
        left: '50%',
        top: '0px',
        transform: 'translateX(-50%)',
        width: '30px',
        height: '10px',
        background: selected ? '#3182ce' : '#888',
        borderBottomLeftRadius: '4px',
        borderBottomRightRadius: '4px',
        cursor: 'ns-resize',
        zIndex: 10,
        transition: 'background-color 0.2s ease',
      }} />
      
      <div style={{ 
        display: 'flex', 
        flexDirection: 'row' as const, 
        justifyContent: 'space-between' as const, 
        alignItems: 'center' as const,
        marginBottom: '10px',
        padding: '0px',
        backgroundColor: 'transparent',
        borderRadius: '4px',
        transition: 'all 0.2s ease',
      }}>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={onLabelChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{ 
              fontWeight: 'bold', 
              border: 'none', 
              background: 'transparent', 
              fontSize: '1em', 
              outline: 'none',
              flexGrow: 1
            }}
          />
        ) : (
          <div
            onDoubleClick={handleDoubleClick}
            style={{ 
              fontWeight: 'bold', 
              cursor: 'text', 
              fontSize: '1em',
              flexGrow: 1
            }}
          >
            {data.label || (swimlaneKind && SWIMLANE_KIND_LABELS[swimlaneKind] ? SWIMLANE_KIND_LABELS[swimlaneKind] : 'Swimlane')}
          </div>
        )}
        <div className="swimlane-kind-badge" style={{ 
          fontSize: '0.8em', 
          backgroundColor: 'rgba(255,255,255,0.6)', 
          padding: '2px 6px',
          borderRadius: '10px',
          border: 'none',
          transition: 'all 0.2s ease',
        }}>
          {swimlaneKind && SWIMLANE_KIND_LABELS[swimlaneKind] ? SWIMLANE_KIND_LABELS[swimlaneKind] : 'Generic'}
        </div>
      </div>
      
      <div className="block-creation-buttons" style={{ 
        display: 'flex', 
        justifyContent: 'center' as const, 
        gap: '10px',
        marginTop: '10px',
        padding: '0',
        backgroundColor: 'transparent',
        borderRadius: '4px',
        transition: 'all 0.2s ease',
      }}>
        {allowedBlockTypes.map((blockType) => {
          // Map from block type display name to kind value
          const blockKindValue = blockType.toLowerCase();
          // Get color for this block kind
          const buttonBorderColor = BLOCK_KIND_BORDERS[blockKindValue] || '#ddd';
          
          return (
            <button 
              key={blockType}
              onClick={() => createBlockInSwimlane(blockKindValue)}
              className="create-block-button"
              style={{ 
                padding: '5px 10px',
                background: '#f0f0f0',
                border: `1px solid ${buttonBorderColor}`,
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title={`Create ${blockType}`}
            >
              <span>+</span> {blockType}
            </button>
          );
        })}
      </div>
      
      <div style={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'row' as const, 
        flexWrap: 'nowrap' as const, 
        overflowX: 'auto' as const,
        overflowY: 'hidden' as const,
        minHeight: '100px',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: '3px',
        padding: '5px',
        gap: '10px', // Add spacing between blocks
        alignItems: 'flex-start' as const, // Align blocks at the top
        border: 'none',
        transition: 'all 0.2s ease',
      }}>
        {/* Blocks will render here */}
      </div>
      
      {/* Handles for connections */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{
          background: selected ? '#3182ce' : '#555',
          transition: 'background-color 0.2s ease',
        }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{
          background: selected ? '#3182ce' : '#555',
          transition: 'background-color 0.2s ease',
        }}
      />
    </div>
  );
};

export default memo(SwimlaneNode);
