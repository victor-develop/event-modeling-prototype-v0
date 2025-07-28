import React, { useRef } from 'react';
import { GraphQLEditor } from 'graphql-editor';
import type { ExternalEditorAPI } from 'graphql-editor';
import { useSchemaState } from '../state/schemaState';
import { toCamelCase } from '../utils/stringUtils';

interface SchemaEditorModalProps {
  blockId: string;
  blockTitle: string;
  blockType: 'command' | 'event' | 'view';
  isOpen: boolean;
  onClose: () => void;
}

export const SchemaEditorModal: React.FC<SchemaEditorModalProps> = ({
  blockId,
  blockTitle,
  blockType,
  isOpen,
  onClose,
}) => {
  const { getSchema, setSchema } = useSchemaState();
  const editorRef = useRef<ExternalEditorAPI>(null);
  const schema = getSchema(blockId);
  
  const typeName = toCamelCase(blockTitle);
  
  // Generate default schema if empty
  const initialSchema = schema.code || generateDefaultSchema(typeName, blockType);
  
  if (!isOpen) return null;
  
  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        zIndex: 9999, // Ensure it's above everything else
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        // Close when clicking the backdrop
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '95%',
          height: '95%',
          backgroundColor: '#fff',
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the modal content
      >
        <div style={{ 
          padding: '15px 20px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid #eee',
          backgroundColor: '#f8f9fa'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>
            <span style={{ color: '#9b59b6', marginRight: '10px' }}>✏️</span>
            Edit Schema: {blockTitle}
          </h3>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '5px 15px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Close
          </button>
        </div>
        <div style={{ flex: 1 }}>
          <GraphQLEditor
            ref={editorRef}
            schema={{
              code: initialSchema,
              libraries: schema.libraries || '',
              source: 'outside',
            }}
            setSchema={(newSchema) => {
              setSchema(blockId, {
                code: newSchema.code,
                libraries: newSchema.libraries || '',
              });
            }}
            path={`${typeName}.graphql`}
            title={`${blockType}: ${blockTitle}`}
          />
        </div>
      </div>
    </div>
  );
};

// Helper function to generate default schema based on block type
function generateDefaultSchema(typeName: string, blockType: 'command' | 'event' | 'view'): string {
  switch (blockType) {
    case 'command':
      return `input ${typeName}Input {
  # Define command parameters here
  id: ID!
}

type ${typeName}Result {
  # Define command result here
  success: Boolean!
}`;
    case 'event':
      return `type ${typeName} {
  # Define event payload here
  id: ID!
  timestamp: String!
}`;
    case 'view':
      return `type ${typeName} {
  # Define view structure here
  id: ID!
}`;
    default:
      return '';
  }
}
