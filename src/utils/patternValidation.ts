import type { Node } from '@xyflow/react';

// Connection validation types
export const ConnectionPattern = {
  COMMAND_PATTERN: 'command_pattern', // Trigger -> Command -> Event
  VIEW_PATTERN: 'view_pattern', // Event -> View
  AUTOMATION_PATTERN: 'automation_pattern', // Event -> Command
  TRANSLATION_PATTERN: 'translation_pattern' // Event -> Command -> Event
} as const;

export type ConnectionPattern = typeof ConnectionPattern[keyof typeof ConnectionPattern];

export type ConnectionPatternValidation = {
  sourceNodeTypes: string[];
  targetNodeTypes: string[];
  pattern: ConnectionPattern;
  description: string;
};

// Define valid connection patterns
export const validConnectionPatterns: ConnectionPatternValidation[] = [
  // Command Pattern connections
  {
    sourceNodeTypes: ['trigger'],
    targetNodeTypes: ['command'],
    pattern: ConnectionPattern.COMMAND_PATTERN,
    description: 'Trigger can initiate a Command'
  },
  {
    sourceNodeTypes: ['command'],
    targetNodeTypes: ['event'],
    pattern: ConnectionPattern.COMMAND_PATTERN,
    description: 'Command can produce an Event'
  },
  
  // Will add more patterns in subsequent iterations
];

/**
 * Checks if a connection is valid according to the defined patterns
 */
export const isValidConnection = (
  sourceNode: Node | null,
  targetNode: Node | null
): { valid: boolean; message: string } => {
  if (!sourceNode || !targetNode) {
    return { valid: false, message: 'Source or target node not found' };
  }
  
  const sourceType = sourceNode.type;
  const targetType = targetNode.type;
  
  // Check against valid connection patterns
  const validPattern = validConnectionPatterns.find(
    pattern => 
      pattern.sourceNodeTypes.includes(sourceType || '') &&
      pattern.targetNodeTypes.includes(targetType || '')
  );
  
  if (validPattern) {
    return { valid: true, message: validPattern.description };
  }
  
  return { 
    valid: false, 
    message: `Invalid connection: ${sourceType} cannot connect to ${targetType}` 
  };
};

/**
 * Determines the pattern type of a connection
 */
export const getConnectionPatternType = (
  sourceNode: Node | null,
  targetNode: Node | null
): ConnectionPattern | null => {
  if (!sourceNode || !targetNode) {
    return null;
  }
  
  const sourceType = sourceNode.type;
  const targetType = targetNode.type;
  
  const matchingPattern = validConnectionPatterns.find(
    pattern => 
      pattern.sourceNodeTypes.includes(sourceType || '') &&
      pattern.targetNodeTypes.includes(targetType || '')
  );
  
  return matchingPattern ? matchingPattern.pattern : null;
};

/**
 * Get edge style based on the connection pattern
 */
export const getEdgeStyle = (
  sourceNode: Node | null,
  targetNode: Node | null
): React.CSSProperties => {
  const patternType = getConnectionPatternType(sourceNode, targetNode);
  
  // Command Pattern styling
  if (patternType === ConnectionPattern.COMMAND_PATTERN) {
    return {
      stroke: '#333',
      strokeWidth: 2,
    };
  }
  
  // Default styling
  return {
    stroke: '#999',
    strokeWidth: 1,
  };
};
