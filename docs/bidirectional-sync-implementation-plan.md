# Bidirectional Synchronization Implementation Plan

## Overview

This document outlines the implementation plan for bidirectional synchronization between block titles in the UI and type names in the GraphQL schema editor. The goal is to ensure that changes made in either location are properly reflected in the other, while preventing infinite update loops.

## Core Strategy

We'll implement a combined approach using:

1. **Change Source Tracking**: Track where each change originates from (UI or schema editor)
2. **Equality Checks**: Only apply updates when values actually change
3. **Debouncing**: Prevent rapid successive updates

## Required Dependencies and Imports

Before implementing the changes, ensure these dependencies are available:

```typescript
// Required GraphQL imports for AST manipulation
import { parse, visit, print, Kind } from 'graphql';
import { debounce } from 'lodash'; // For debouncing schema updates

// Types for AST manipulation
import type {
  DocumentNode,
  ObjectTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  FieldDefinitionNode,
  InputValueDefinitionNode,
  TypeNode,
  NamedTypeNode,
  ListTypeNode,
  NonNullTypeNode
} from 'graphql';
```

**Note**: If `lodash` is not already installed, add it:
```bash
npm install lodash
npm install --save-dev @types/lodash
```

## Files and Components Overview

| File/Component | Change Type | Description | Unit Test File |
|---|---|---|---|
| `src/state/schemaState.tsx` | **Update** | Add change source tracking, schema preservation functions, and bidirectional sync logic | `src/state/__tests__/schemaState.test.tsx` |
| `src/utils/schemaUtils.ts` | **Update** | Add AST manipulation utilities, type name conversion functions, and schema parsing helpers | `src/utils/__tests__/schemaUtils.test.ts` |
| `src/utils/schemaPreservation.ts` | **Create** | New utility module for AST-based schema manipulation and type renaming | `src/utils/__tests__/schemaPreservation.test.ts` |
| `src/components/SchemaEditorModal.tsx` | **Update** | Integrate debounced schema updates and change source tracking | `src/components/__tests__/SchemaEditorModal.test.tsx` |
| `src/App.tsx` | **Update** | Update node label dispatch to work with change tracking system | `src/__tests__/App.test.tsx` |
| `src/hooks/useSchemaImportExport.ts` | **Update** | Ensure import/export works with new schema preservation approach | `src/hooks/__tests__/useSchemaImportExport.test.ts` |
| `src/types/schema.ts` | **Create** | New type definitions for change tracking, block info, and schema state | `src/types/__tests__/schema.test.ts` |
| `src/utils/stringUtils.ts` | **Create** | String similarity calculation and case conversion utilities | `src/utils/__tests__/stringUtils.test.ts` |

## File & Component Changes

### 1. `src/state/schemaState.tsx`

This is the central file for our changes, as it manages both the schema and block registry.

#### New State Variables

```typescript
// Track the source of changes to prevent loops
const [changeSource, setChangeSource] = useState<{
  type: 'ui' | 'schema' | null,
  id?: string // For tracking specific block changes
}>({ type: null });

// For debouncing schema updates
const [pendingSchemaUpdate, setPendingSchemaUpdate] = useState<string | null>(null);
```

#### Modified Functions

```typescript
// Update registerBlock to track UI-originated changes
const registerBlock = useCallback((block: BlockInfo) => {
  // Set change source to UI
  setChangeSource({ type: 'ui', id: block.id });
  
  setBlockRegistry(prev => {
    // Check if block already exists
    const existingBlock = prev.find(b => b.id === block.id);
    
    // Only update if title actually changed
    if (!existingBlock || existingBlock.title !== block.title) {
      // Update or add block
      const newRegistry = existingBlock 
        ? prev.map(b => b.id === block.id ? block : b)
        : [...prev, block];
        
      // Update schema preserving existing field definitions
      const newSchema = updateSchemaWithBlockChanges(schema, existingBlock, block);
      setSchema(newSchema);
      
      return newRegistry;
    }
    return prev;
  });
  
  // Reset change source after processing
  setTimeout(() => setChangeSource({ type: null }), 100);
}, [schema]);

// Add new function to update schema from editor
const updateSchemaFromEditor = useCallback((newSchemaCode: string) => {
  // Only process if change didn't come from UI
  if (changeSource.type !== 'ui') {
    setChangeSource({ type: 'schema' });
    
    try {
      // Parse schema and detect type changes
      const typeChanges = detectTypeChanges(schema, newSchemaCode);
      
      // Apply changes to block registry if needed
      if (typeChanges.length > 0) {
        setBlockRegistry(prev => {
          return prev.map(block => {
            const typeChange = typeChanges.find(c => 
              c.oldTypeName === toCamelCase(block.title)
            );
            
            if (typeChange) {
              // Convert type name back to title format
              const newTitle = fromCamelCase(typeChange.newTypeName);
              return { ...block, title: newTitle };
            }
            return block;
          });
        });
      }
      
      // Update schema
      setSchema(newSchemaCode);
    } catch (error) {
      console.error('Error processing schema changes:', error);
    }
    
    // Reset change source after processing
    setTimeout(() => setChangeSource({ type: null }), 100);
  }
}, [schema, changeSource]);

// Add debounced version of schema update
const debouncedSchemaUpdate = useMemo(() => 
  debounce((newSchema: string) => {
    updateSchemaFromEditor(newSchema);
  }, 500),
  [updateSchemaFromEditor]
);
```

#### Schema Preservation Implementation

**Core Principle**: When block titles change, we must preserve all existing field definitions, mutations, queries, and other schema details. Only the type names should be updated.

```typescript
// Main function to update schema while preserving field definitions
const updateSchemaWithBlockChanges = (
  currentSchema: string,
  oldBlock: BlockInfo | undefined,
  newBlock: BlockInfo
): string => {
  // If it's a new block, add it to the schema
  if (!oldBlock) {
    return addNewBlockToSchema(currentSchema, newBlock);
  }
  
  // If title changed, rename the type while preserving fields
  if (oldBlock.title !== newBlock.title) {
    return renameTypeInSchema(currentSchema, oldBlock, newBlock);
  }
  
  // No changes needed
  return currentSchema;
};

// Add a new block type to existing schema
const addNewBlockToSchema = (currentSchema: string, block: BlockInfo): string => {
  const typeName = toCamelCase(block.title);
  
  try {
    const ast = parse(currentSchema);
    const newDefinitions = [...ast.definitions];
    
    // Create appropriate type definition based on block type
    switch (block.type) {
      case 'command':
        // Add input type
        newDefinitions.push(createInputTypeDefinition(`${typeName}Input`, [
          createFieldDefinition('id', 'ID', true)
        ]));
        
        // Add result type
        newDefinitions.push(createObjectTypeDefinition(`${typeName}Result`, [
          createFieldDefinition('success', 'Boolean', true)
        ]));
        
        // Add mutation field to existing Mutation type
        addFieldToExistingType(newDefinitions, 'Mutation', 
          createFieldDefinition(typeName, `${typeName}Result`, true, [
            createArgumentDefinition('input', `${typeName}Input`, true)
          ])
        );
        break;
        
      case 'event':
        // Add event type
        newDefinitions.push(createObjectTypeDefinition(typeName, [
          createFieldDefinition('id', 'ID', true),
          createFieldDefinition('timestamp', 'String', true)
        ]));
        break;
        
      case 'view':
        // Add view type
        newDefinitions.push(createObjectTypeDefinition(typeName, [
          createFieldDefinition('id', 'ID', true)
        ]));
        
        // Add query field to existing Query type
        addFieldToExistingType(newDefinitions, 'Query',
          createFieldDefinition(toCamelCase(block.title), `[${typeName}]`, false)
        );
        break;
    }
    
    // Generate new schema from AST
    return print({
      kind: Kind.DOCUMENT,
      definitions: newDefinitions
    });
    
  } catch (error) {
    console.error('Error adding new block to schema:', error);
    // Fallback to simple generation if parsing fails
    return generateFallbackSchema(currentSchema, block);
  }
};

// Rename a type in the schema while preserving all field definitions
const renameTypeInSchema = (
  currentSchema: string,
  oldBlock: BlockInfo,
  newBlock: BlockInfo
): string => {
  const oldTypeName = toCamelCase(oldBlock.title);
  const newTypeName = toCamelCase(newBlock.title);
  
  if (oldTypeName === newTypeName) {
    return currentSchema; // No change needed
  }
  
  try {
    const ast = parse(currentSchema);
    
    // Transform AST to rename types
    const transformedAst = visit(ast, {
      // Rename type definitions
      ObjectTypeDefinition(node) {
        if (shouldRenameType(node.name.value, oldTypeName, oldBlock.type)) {
          return {
            ...node,
            name: {
              ...node.name,
              value: getNewTypeName(node.name.value, oldTypeName, newTypeName)
            }
          };
        }
        return node;
      },
      
      // Rename input type definitions
      InputObjectTypeDefinition(node) {
        if (shouldRenameType(node.name.value, oldTypeName, oldBlock.type)) {
          return {
            ...node,
            name: {
              ...node.name,
              value: getNewTypeName(node.name.value, oldTypeName, newTypeName)
            }
          };
        }
        return node;
      },
      
      // Update field types that reference the renamed type
      FieldDefinition(node) {
        const updatedType = updateTypeReferences(node.type, oldTypeName, newTypeName, oldBlock.type);
        if (updatedType !== node.type) {
          return {
            ...node,
            type: updatedType
          };
        }
        return node;
      },
      
      // Update argument types
      InputValueDefinition(node) {
        const updatedType = updateTypeReferences(node.type, oldTypeName, newTypeName, oldBlock.type);
        if (updatedType !== node.type) {
          return {
            ...node,
            type: updatedType
          };
        }
        return node;
      },
      
      // Update field names in Query/Mutation types for view/command blocks
      FieldDefinition(node, key, parent) {
        if (parent && 'name' in parent && 
            ((parent.name.value === 'Query' && oldBlock.type === 'view') ||
             (parent.name.value === 'Mutation' && oldBlock.type === 'command'))) {
          
          // Check if this field corresponds to our renamed block
          if (node.name.value === toCamelCase(oldBlock.title)) {
            return {
              ...node,
              name: {
                ...node.name,
                value: toCamelCase(newBlock.title)
              }
            };
          }
        }
        return node;
      }
    });
    
    // Generate new schema from transformed AST
    return print(transformedAst);
    
  } catch (error) {
    console.error('Error renaming type in schema:', error);
    // Fallback to string replacement if AST manipulation fails
    return performStringBasedRename(currentSchema, oldTypeName, newTypeName, oldBlock.type);
  }
};

// Helper functions for AST manipulation
const shouldRenameType = (typeName: string, oldTypeName: string, blockType: BlockType): boolean => {
  switch (blockType) {
    case 'command':
      return typeName === oldTypeName || 
             typeName === `${oldTypeName}Input` || 
             typeName === `${oldTypeName}Result`;
    case 'event':
    case 'view':
      return typeName === oldTypeName;
    default:
      return false;
  }
};

const getNewTypeName = (currentName: string, oldTypeName: string, newTypeName: string): string => {
  if (currentName === oldTypeName) {
    return newTypeName;
  }
  if (currentName === `${oldTypeName}Input`) {
    return `${newTypeName}Input`;
  }
  if (currentName === `${oldTypeName}Result`) {
    return `${newTypeName}Result`;
  }
  return currentName;
};

const updateTypeReferences = (
  typeNode: any,
  oldTypeName: string,
  newTypeName: string,
  blockType: BlockType
): any => {
  // Handle different type node structures (NamedType, ListType, NonNullType)
  if (typeNode.kind === 'NamedType') {
    if (shouldRenameType(typeNode.name.value, oldTypeName, blockType)) {
      return {
        ...typeNode,
        name: {
          ...typeNode.name,
          value: getNewTypeName(typeNode.name.value, oldTypeName, newTypeName)
        }
      };
    }
  } else if (typeNode.kind === 'ListType') {
    const updatedType = updateTypeReferences(typeNode.type, oldTypeName, newTypeName, blockType);
    if (updatedType !== typeNode.type) {
      return {
        ...typeNode,
        type: updatedType
      };
    }
  } else if (typeNode.kind === 'NonNullType') {
    const updatedType = updateTypeReferences(typeNode.type, oldTypeName, newTypeName, blockType);
    if (updatedType !== typeNode.type) {
      return {
        ...typeNode,
        type: updatedType
      };
    }
  }
  
  return typeNode;
};

// AST node creation helpers
const createObjectTypeDefinition = (name: string, fields: any[]): any => ({
  kind: 'ObjectTypeDefinition',
  name: { kind: 'Name', value: name },
  fields
});

const createInputTypeDefinition = (name: string, fields: any[]): any => ({
  kind: 'InputObjectTypeDefinition',
  name: { kind: 'Name', value: name },
  fields
});

const createFieldDefinition = (
  name: string, 
  typeName: string, 
  isRequired: boolean, 
  args?: any[]
): any => ({
  kind: 'FieldDefinition',
  name: { kind: 'Name', value: name },
  type: isRequired 
    ? { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: typeName } } }
    : { kind: 'NamedType', name: { kind: 'Name', value: typeName } },
  arguments: args || []
});

const createArgumentDefinition = (name: string, typeName: string, isRequired: boolean): any => ({
  kind: 'InputValueDefinition',
  name: { kind: 'Name', value: name },
  type: isRequired 
    ? { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: typeName } } }
    : { kind: 'NamedType', name: { kind: 'Name', value: typeName } }
});

const addFieldToExistingType = (definitions: any[], typeName: string, field: any): void => {
  const typeDefinition = definitions.find(def => 
    def.kind === 'ObjectTypeDefinition' && def.name.value === typeName
  );
  
  if (typeDefinition) {
    typeDefinition.fields = typeDefinition.fields || [];
    // Check if field already exists
    const existingField = typeDefinition.fields.find((f: any) => f.name.value === field.name.value);
    if (!existingField) {
      typeDefinition.fields.push(field);
    }
  }
};

// Fallback string-based rename for error cases
const performStringBasedRename = (
  schema: string,
  oldTypeName: string,
  newTypeName: string,
  blockType: BlockType
): string => {
  let updatedSchema = schema;
  
  switch (blockType) {
    case 'command':
      // Replace input type, result type, and mutation field
      updatedSchema = updatedSchema
        .replace(new RegExp(`\\b${oldTypeName}Input\\b`, 'g'), `${newTypeName}Input`)
        .replace(new RegExp(`\\b${oldTypeName}Result\\b`, 'g'), `${newTypeName}Result`)
        .replace(new RegExp(`\\b${toCamelCase(oldTypeName)}\\b`, 'g'), toCamelCase(newTypeName));
      break;
      
    case 'event':
    case 'view':
      // Replace type name and field references
      updatedSchema = updatedSchema
        .replace(new RegExp(`\\btype ${oldTypeName}\\b`, 'g'), `type ${newTypeName}`)
        .replace(new RegExp(`\\b${toCamelCase(oldTypeName)}\\b`, 'g'), toCamelCase(newTypeName));
      break;
  }
  
  return updatedSchema;
};

// Fallback schema generation for error cases
const generateFallbackSchema = (currentSchema: string, block: BlockInfo): string => {
  // If all else fails, append basic type definition
  const typeName = toCamelCase(block.title);
  
  switch (block.type) {
    case 'command':
      return currentSchema + `\n\ninput ${typeName}Input {\n  id: ID!\n}\n\ntype ${typeName}Result {\n  success: Boolean!\n}`;
    case 'event':
      return currentSchema + `\n\ntype ${typeName} {\n  id: ID!\n  timestamp: String!\n}`;
    case 'view':
      return currentSchema + `\n\ntype ${typeName} {\n  id: ID!\n}`;
    default:
      return currentSchema;
  }
};

#### New Schema Utility Functions

```typescript
// Helper to detect type name changes between schemas
const detectTypeChanges = (oldSchema: string, newSchema: string): Array<{
  oldTypeName: string;
  newTypeName: string;
}> => {
  const oldTypes = extractTypeNames(oldSchema);
  const newTypes = extractTypeNames(newSchema);
  
  const removedTypes = Object.keys(oldTypes).filter(t => !newTypes[t]);
  const addedTypes = Object.keys(newTypes).filter(t => !oldTypes[t]);
  
  // Simple heuristic: if we have one removed and one added type, it's likely a rename
  if (removedTypes.length === 1 && addedTypes.length === 1) {
    return [{ oldTypeName: removedTypes[0], newTypeName: addedTypes[0] }];
  }
  
  // For multiple changes, use similarity matching
  return findPotentialRenames(oldTypes, newTypes);
};

// Helper to extract type names from schema
const extractTypeNames = (schemaString: string): Record<string, string> => {
  const typeMap: Record<string, string> = {};
  
  try {
    const ast = parse(schemaString);
    
    visit(ast, {
      ObjectTypeDefinition(node) {
        typeMap[node.name.value] = node.name.value;
      },
      InputObjectTypeDefinition(node) {
        typeMap[node.name.value] = node.name.value;
      }
    });
  } catch (error) {
    console.error('Error parsing schema:', error);
  }
  
  return typeMap;
};

// Helper to find potential renames using similarity
const findPotentialRenames = (
  oldTypes: Record<string, string>,
  newTypes: Record<string, string>
): Array<{ oldTypeName: string, newTypeName: string }> => {
  const removedTypes = Object.keys(oldTypes).filter(t => !newTypes[t]);
  const addedTypes = Object.keys(newTypes).filter(t => !oldTypes[t]);
  
  const potentialRenames: Array<{ oldTypeName: string, newTypeName: string, similarity: number }> = [];
  
  // For each removed type, find the most similar added type
  removedTypes.forEach(oldName => {
    let bestMatch = { oldName, newName: '', similarity: 0 };
    
    addedTypes.forEach(newName => {
      // Calculate string similarity (Levenshtein distance)
      const similarity = calculateStringSimilarity(oldName, newName);
      
      if (similarity > bestMatch.similarity) {
        bestMatch = { oldName, newName, similarity };
      }
    });
    
    if (bestMatch.similarity > 0.7) {
      potentialRenames.push({ 
        oldTypeName: bestMatch.oldName, 
        newTypeName: bestMatch.newName,
        similarity: bestMatch.similarity
      });
    }
  });
  
  // Return only high-confidence matches
  return potentialRenames
    .filter(match => match.similarity > 0.7)
    .map(({ oldTypeName, newTypeName }) => ({ oldTypeName, newTypeName }));
};

// String similarity calculation (simplified)
const calculateStringSimilarity = (str1: string, str2: string): number => {
  // Simple implementation - in production, use a proper Levenshtein distance algorithm
  // or another string similarity metric
  
  // For now, a simple character-based comparison
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1.0;
  
  // Count matching characters
  let matches = 0;
  for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
    if (str1[i] === str2[i]) matches++;
  }
  
  return matches / maxLength;
};

// Convert camelCase to Title Case
const fromCamelCase = (camelCase: string): string => {
  return camelCase
    // Insert space before uppercase letters
    .replace(/([A-Z])/g, ' $1')
    // Capitalize first letter
    .replace(/^./, str => str.toUpperCase())
    .trim();
};
```

#### Updated Context Provider

```typescript
// Add new values to context
const schemaContextValue = useMemo(() => ({
  schema,
  setSchema,
  blockRegistry,
  registerBlock,
  unregisterBlock,
  updateSchemaFromEditor,
  debouncedSchemaUpdate,
  changeSource
}), [schema, blockRegistry, registerBlock, unregisterBlock, updateSchemaFromEditor, debouncedSchemaUpdate, changeSource]);
```

### 2. `src/components/SchemaEditorModal.tsx`

Update the SchemaEditorModal to use our new schema update functions.

```typescript
// Inside SchemaEditorModal component
const { schema, blockRegistry, updateSchemaFromEditor, debouncedSchemaUpdate } = useSchemaState();

// Update the GraphQLEditor component
<GraphQLEditor
  schema={{
    code: schema,
    libraries: "",
    source: "outside"
  }}
  setSchema={(newSchema) => {
    // Use debounced update to prevent rapid changes
    debouncedSchemaUpdate(newSchema.code);
  }}
  onContentChange={(event) => {
    // This fires on every keystroke
    // We'll use the debounced version for actual updates
  }}
  // ... other props
/>
```

### 3. `src/App.tsx`

Update the node update functions to work with our change tracking system.

```typescript
// Inside App component
const { changeSource, registerBlock } = useSchemaState();

// Update the dispatchUpdateNodeLabel function
const dispatchUpdateNodeLabel = useCallback((nodeId: string, label: string) => {
  // Find the node
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return;
  
  // Update the node
  const updatedNode = {
    ...node,
    data: {
      ...node.data,
      label
    }
  };
  
  // Update nodes state
  setNodes(nds => nds.map(n => n.id === nodeId ? updatedNode : n));
  
  // Register the updated block with schema state
  // The change source is already tracked in registerBlock
  registerBlock({
    id: nodeId,
    title: label,
    type: node.type as BlockType
  });
}, [nodes, setNodes, registerBlock]);
```

### 4. `src/utils/schemaUtils.ts`

Add utility functions for schema parsing and type name conversion.

```typescript
import { parse, visit, Kind } from 'graphql';

/**
 * Converts a string from Title Case or space-separated to camelCase
 */
export const toCamelCase = (str: string): string => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
      index === 0 ? word.toLowerCase() : word.toUpperCase()
    )
    .replace(/\s+/g, '');
};

/**
 * Converts a string from camelCase to Title Case
 */
export const fromCamelCase = (camelCase: string): string => {
  return camelCase
    // Insert space before uppercase letters
    .replace(/([A-Z])/g, ' $1')
    // Capitalize first letter
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

/**
 * Extracts type names from a GraphQL schema string
 */
export const extractTypeNames = (schemaString: string): Record<string, string> => {
  const typeMap: Record<string, string> = {};
  
  try {
    const ast = parse(schemaString);
    
    visit(ast, {
      ObjectTypeDefinition(node) {
        typeMap[node.name.value] = node.name.value;
      },
      InputObjectTypeDefinition(node) {
        typeMap[node.name.value] = node.name.value;
      }
    });
  } catch (error) {
    console.error('Error parsing schema:', error);
  }
  
  return typeMap;
};

/**
 * Calculates string similarity between two strings
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export const calculateStringSimilarity = (str1: string, str2: string): number => {
  // Implementation of Levenshtein distance algorithm
  // ...implementation details...
  
  // Simplified version for now
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1.0;
  
  let matches = 0;
  for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
    if (str1[i] === str2[i]) matches++;
  }
  
  return matches / maxLength;
};
```

### 5. `src/utils/schemaPreservation.ts` (New File)

Create a dedicated module for AST-based schema manipulation and type renaming.

```typescript
import { parse, visit, print, Kind } from 'graphql';
import type {
  DocumentNode,
  ObjectTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  FieldDefinitionNode,
  TypeNode
} from 'graphql';
import { BlockInfo, BlockType } from '../types/schema';
import { toCamelCase } from './schemaUtils';

/**
 * Main function to update schema while preserving field definitions
 */
export const updateSchemaWithBlockChanges = (
  currentSchema: string,
  oldBlock: BlockInfo | undefined,
  newBlock: BlockInfo
): string => {
  // Implementation as detailed in the main plan
  // ...
};

/**
 * Add a new block type to existing schema
 */
export const addNewBlockToSchema = (currentSchema: string, block: BlockInfo): string => {
  // Implementation as detailed in the main plan
  // ...
};

/**
 * Rename a type in the schema while preserving all field definitions
 */
export const renameTypeInSchema = (
  currentSchema: string,
  oldBlock: BlockInfo,
  newBlock: BlockInfo
): string => {
  // Implementation as detailed in the main plan
  // ...
};

// Additional helper functions as detailed in the main plan
// ...
```

### 6. `src/types/schema.ts` (New File)

Create type definitions for the schema synchronization system.

```typescript
export type BlockType = 'command' | 'event' | 'view';

export interface BlockInfo {
  id: string;
  title: string;
  type: BlockType;
}

export interface ChangeSource {
  type: 'ui' | 'schema' | null;
  id?: string; // For tracking specific block changes
}

export interface TypeChange {
  oldTypeName: string;
  newTypeName: string;
  similarity?: number;
}

export interface SchemaState {
  schema: string;
  blockRegistry: BlockInfo[];
  changeSource: ChangeSource;
}

export interface SchemaPreservationOptions {
  preserveComments?: boolean;
  preserveDirectives?: boolean;
  fallbackToStringReplacement?: boolean;
}
```

### 7. `src/utils/stringUtils.ts` (New File)

Create utilities for string similarity calculation and case conversion.

```typescript
/**
 * Calculate Levenshtein distance between two strings
 */
export const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = [];
  
  // Initialize matrix
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

/**
 * Calculate similarity ratio between two strings (0-1)
 */
export const calculateSimilarity = (str1: string, str2: string): number => {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1.0;
  
  const distance = levenshteinDistance(str1, str2);
  return 1 - (distance / maxLength);
};

/**
 * Find potential renames using similarity matching
 */
export const findPotentialRenames = (
  oldTypes: Record<string, string>,
  newTypes: Record<string, string>,
  similarityThreshold: number = 0.7
): Array<{ oldTypeName: string, newTypeName: string, similarity: number }> => {
  const removedTypes = Object.keys(oldTypes).filter(t => !newTypes[t]);
  const addedTypes = Object.keys(newTypes).filter(t => !oldTypes[t]);
  
  const potentialRenames: Array<{ oldTypeName: string, newTypeName: string, similarity: number }> = [];
  
  removedTypes.forEach(oldName => {
    let bestMatch = { oldName, newName: '', similarity: 0 };
    
    addedTypes.forEach(newName => {
      const similarity = calculateSimilarity(oldName, newName);
      
      if (similarity > bestMatch.similarity) {
        bestMatch = { oldName, newName, similarity };
      }
    });
    
    if (bestMatch.similarity > similarityThreshold) {
      potentialRenames.push({ 
        oldTypeName: bestMatch.oldName, 
        newTypeName: bestMatch.newName,
        similarity: bestMatch.similarity
      });
    }
  });
  
  return potentialRenames;
};
```

## Call Chain Visualization

### Block Title Update Flow (Schema Preservation)

```
User changes block title in UI
↓
dispatchUpdateNodeLabel(nodeId, newTitle) in App.tsx
↓
setNodes(updatedNodes) in App.tsx
↓
registerBlock({id, title, type}) in App.tsx
↓
setChangeSource({ type: 'ui', id }) in schemaState.tsx
↓
setBlockRegistry(updatedRegistry) in schemaState.tsx
↓
updateSchemaWithBlockChanges(currentSchema, oldBlock, newBlock) in schemaState.tsx
  ↓
  if (newBlock): addNewBlockToSchema(currentSchema, newBlock)
    ↓
    parse(currentSchema) → AST
    ↓
    Create new type definitions based on block.type
    ↓
    Add fields to existing Query/Mutation types
    ↓
    print(newAST) → updated schema string
  ↓
  if (title changed): renameTypeInSchema(currentSchema, oldBlock, newBlock)
    ↓
    parse(currentSchema) → AST
    ↓
    visit(AST) to rename type definitions and references
    ↓
    Update ObjectTypeDefinition names
    ↓
    Update InputObjectTypeDefinition names
    ↓
    Update FieldDefinition type references
    ↓
    Update Query/Mutation field names
    ↓
    print(transformedAST) → updated schema string
↓
setSchema(preservedFieldsSchema) in schemaState.tsx
↓
setTimeout(() => setChangeSource({ type: null }), 100) in schemaState.tsx
```

### Schema Edit Flow

```
User edits schema in GraphQL Editor
↓
GraphQLEditor onContentChange event in SchemaEditorModal.tsx
↓
debouncedSchemaUpdate(newSchemaCode) in SchemaEditorModal.tsx
↓
updateSchemaFromEditor(newSchemaCode) in schemaState.tsx (after debounce delay)
↓
setChangeSource({ type: 'schema' }) in schemaState.tsx
↓
detectTypeChanges(oldSchema, newSchema) in schemaState.tsx
↓
If type changes detected:
  ↓
  setBlockRegistry(updatedRegistry) in schemaState.tsx
  ↓
  Each block with renamed type gets updated title
↓
setSchema(newSchemaCode) in schemaState.tsx
↓
setTimeout(() => setChangeSource({ type: null }), 100) in schemaState.tsx
```

## Unit Testing Strategy

### 1. `src/state/__tests__/schemaState.test.tsx`

**Test Coverage**:
- Change source tracking prevents infinite loops
- Block registration updates schema correctly
- Schema updates from editor detect type changes
- Debounced updates work properly
- Error handling for invalid schemas

**Key Test Cases**:
```typescript
describe('SchemaState', () => {
  it('should track change source to prevent infinite loops', () => {
    // Test that UI changes don't trigger schema-to-UI updates
  });
  
  it('should preserve field definitions when renaming types', () => {
    // Test that custom fields are not lost during type renames
  });
  
  it('should handle multiple simultaneous block changes', () => {
    // Test complex scenarios with multiple type changes
  });
  
  it('should fallback gracefully on schema parsing errors', () => {
    // Test error handling and fallback mechanisms
  });
});
```

### 2. `src/utils/__tests__/schemaUtils.test.ts`

**Test Coverage**:
- Type name extraction from GraphQL schemas
- Case conversion functions (camelCase ↔ Title Case)
- String similarity calculations
- Schema parsing error handling

**Key Test Cases**:
```typescript
describe('SchemaUtils', () => {
  it('should extract type names from valid GraphQL schema', () => {
    // Test parsing of complex schemas with various type definitions
  });
  
  it('should convert between camelCase and Title Case correctly', () => {
    // Test bidirectional case conversion
  });
  
  it('should calculate string similarity accurately', () => {
    // Test similarity algorithm with various string pairs
  });
});
```

### 3. `src/utils/__tests__/schemaPreservation.test.ts`

**Test Coverage**:
- AST-based type renaming preserves field definitions
- New block addition to existing schemas
- Complex type reference updates
- Fallback mechanisms for AST manipulation failures

**Key Test Cases**:
```typescript
describe('SchemaPreservation', () => {
  it('should rename types while preserving all field definitions', () => {
    // Test that custom fields, descriptions, directives are preserved
  });
  
  it('should add new block types without affecting existing types', () => {
    // Test adding command/event/view types to existing schema
  });
  
  it('should update type references in Query/Mutation fields', () => {
    // Test that field types are updated when referenced types are renamed
  });
  
  it('should fallback to string replacement when AST manipulation fails', () => {
    // Test fallback mechanisms for malformed schemas
  });
});
```

### 4. `src/components/__tests__/SchemaEditorModal.test.tsx`

**Test Coverage**:
- Debounced schema updates work correctly
- Change source tracking integration
- Modal behavior and user interactions
- Error handling in the UI

**Key Test Cases**:
```typescript
describe('SchemaEditorModal', () => {
  it('should debounce schema updates to prevent excessive parsing', () => {
    // Test that rapid typing doesn't cause performance issues
  });
  
  it('should integrate with change source tracking', () => {
    // Test that schema changes are properly tracked
  });
  
  it('should handle schema parsing errors gracefully', () => {
    // Test UI behavior when schema has syntax errors
  });
});
```

### 5. `src/__tests__/App.test.tsx`

**Test Coverage**:
- Node label updates trigger schema changes
- Integration with change tracking system
- Block registration and unregistration
- Import/export functionality

**Key Test Cases**:
```typescript
describe('App Integration', () => {
  it('should update schema when block titles change', () => {
    // Test end-to-end flow from UI to schema
  });
  
  it('should update block titles when schema types change', () => {
    // Test end-to-end flow from schema to UI
  });
  
  it('should prevent infinite update loops', () => {
    // Test that bidirectional updates don't cause loops
  });
});
```

### 6. `src/hooks/__tests__/useSchemaImportExport.test.ts`

**Test Coverage**:
- Import/export with schema preservation
- Backward compatibility with old formats
- Error handling for corrupted import data

**Key Test Cases**:
```typescript
describe('useSchemaImportExport', () => {
  it('should export schema data with block registry', () => {
    // Test that all necessary data is included in exports
  });
  
  it('should import and restore schema state correctly', () => {
    // Test that imported data restores the application state
  });
  
  it('should handle legacy import formats', () => {
    // Test backward compatibility
  });
});
```

### 7. `src/types/__tests__/schema.test.ts`

**Test Coverage**:
- Type definitions are correctly structured
- Interface compatibility
- Type guards and validation functions

**Key Test Cases**:
```typescript
describe('Schema Types', () => {
  it('should validate BlockInfo structure', () => {
    // Test type validation and constraints
  });
  
  it('should validate ChangeSource tracking', () => {
    // Test change source type definitions
  });
});
```

### 8. `src/utils/__tests__/stringUtils.test.ts`

**Test Coverage**:
- Levenshtein distance calculation
- Similarity ratio calculations
- Potential rename detection
- Edge cases and performance

**Key Test Cases**:
```typescript
describe('StringUtils', () => {
  it('should calculate Levenshtein distance correctly', () => {
    // Test distance algorithm with various string pairs
  });
  
  it('should find potential renames with high accuracy', () => {
    // Test rename detection algorithm
  });
  
  it('should handle edge cases (empty strings, identical strings)', () => {
    // Test boundary conditions
  });
});
```

### Testing Setup Requirements

**Dependencies**:
```json
{
  "devDependencies": {
    "@testing-library/react": "^13.0.0",
    "@testing-library/jest-dom": "^5.16.0",
    "@testing-library/user-event": "^14.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  }
}
```

**Test Configuration** (`jest.config.js`):
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## Implementation Order

1. **Create new utility files** (`schemaPreservation.ts`, `stringUtils.ts`, `types/schema.ts`)
2. **Update utility functions** in `schemaUtils.ts`
3. **Update schema state** in `schemaState.tsx` with change tracking and schema parsing
4. **Modify schema editor modal** in `SchemaEditorModal.tsx` to use debounced schema updates
5. **Update main app** in `App.tsx` to work with the change tracking system
6. **Update import/export hook** in `useSchemaImportExport.ts`
7. **Write comprehensive unit tests** for all modified and new files
8. **Integration testing** to verify end-to-end functionality

## Testing Plan

1. **UI to Schema Flow**:
   - Change a block title in the UI
   - Verify the schema is updated with the new type name
   - Verify no infinite loop occurs

2. **Schema to UI Flow**:
   - Edit a type name in the schema editor
   - Verify the corresponding block title is updated
   - Verify no infinite loop occurs

3. **Multiple Changes**:
   - Make multiple type name changes in the schema
   - Verify the correct blocks are updated
   - Verify similarity matching works correctly

4. **Edge Cases**:
   - Test with invalid schema syntax
   - Test with duplicate type names
   - Test with very similar type names

## Key Benefits of This Approach

### 1. **Field Preservation**
- **AST-Based Manipulation**: Uses GraphQL's AST parsing to precisely rename types while preserving all field definitions, descriptions, directives, and other schema details
- **Surgical Updates**: Only modifies the specific type names that need to change, leaving everything else untouched
- **Fallback Protection**: Multiple fallback mechanisms ensure schema integrity even if AST manipulation fails

### 2. **Infinite Loop Prevention**
- **Change Source Tracking**: Every update is tagged with its origin to prevent circular updates
- **Equality Checks**: Updates only proceed when values actually differ
- **Debouncing**: Prevents rapid successive updates that could cause performance issues

### 3. **Robust Error Handling**
- **Graceful Degradation**: If AST manipulation fails, falls back to string-based replacement
- **Schema Validation**: Parsing errors are caught and handled without breaking the application
- **Logging**: Comprehensive error logging for debugging

### 4. **Type Safety**
- **TypeScript Integration**: Full type safety for all AST manipulation operations
- **Block Type Awareness**: Different handling for command, event, and view blocks
- **Consistent Naming**: Automatic conversion between title case and camelCase

## Important Considerations

### 1. **Performance Impact**
- **AST Parsing Cost**: Parsing and manipulating GraphQL AST has computational overhead
- **Debouncing Strategy**: 500ms debounce balances responsiveness with performance
- **Large Schema Handling**: Consider performance implications for very large schemas

### 2. **Schema Complexity**
- **Custom Directives**: The implementation preserves custom directives but may need testing
- **Complex Type References**: Nested type references (unions, interfaces) are handled but should be tested
- **Schema Extensions**: Schema extensions and custom scalars are preserved

### 3. **User Experience**
- **Immediate Feedback**: UI updates happen immediately, schema updates are debounced
- **Error Recovery**: Users can continue working even if schema parsing temporarily fails
- **Consistency Guarantee**: The system ensures UI and schema always eventually converge

### 4. **Development Workflow**
- **Testing Requirements**: Comprehensive testing needed for all block types and edge cases
- **Migration Path**: Existing schemas will work without modification
- **Debugging Tools**: Rich logging helps diagnose synchronization issues

## Conclusion

This implementation plan provides a robust solution for bidirectional synchronization between block titles and GraphQL type names. By using AST-based schema manipulation and change source tracking, we achieve:

- **Complete field preservation** - User-defined schema fields are never lost
- **Infinite loop prevention** - Sophisticated tracking prevents circular updates
- **Graceful error handling** - Multiple fallback mechanisms ensure reliability
- **Type safety** - Full TypeScript integration for maintainable code

The approach balances automation with user control, ensuring the system remains predictable and helpful while preserving the detailed work users put into their GraphQL schemas.
