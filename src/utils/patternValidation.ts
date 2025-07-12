// No imports needed

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
  
  // View Pattern connections
  {
    sourceNodeTypes: ['event'],
    targetNodeTypes: ['view'],
    pattern: ConnectionPattern.VIEW_PATTERN,
    description: 'Event can be displayed in a View'
  },

  // Automation Pattern connections
  {
    sourceNodeTypes: ['event'],
    targetNodeTypes: ['command'],
    pattern: ConnectionPattern.AUTOMATION_PATTERN,
    description: 'Event can automatically trigger a Command'
  },
];

/**
 * Type for simplified Node objects to make testing easier
 */
export type SimpleNode = {
  id: string;
  type?: string;
  [key: string]: any;
};

/**
 * Checks if a connection is valid according to the defined patterns
 */
export const isValidConnection = (
  sourceNode: SimpleNode | null,
  targetNode: SimpleNode | null
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
  sourceNode: SimpleNode | null,
  targetNode: SimpleNode | null
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
  sourceNode: SimpleNode | null,
  targetNode: SimpleNode | null
): React.CSSProperties => {
  const patternType = getConnectionPatternType(sourceNode, targetNode);
  
  // Command Pattern styling
  if (patternType === ConnectionPattern.COMMAND_PATTERN) {
    return {
      stroke: '#333',
      strokeWidth: 2,
    };
  }
  
  // View Pattern styling - dashed line to show data flow
  if (patternType === ConnectionPattern.VIEW_PATTERN) {
    return {
      stroke: '#22a355', // Green to match view node
      strokeWidth: 2,
      strokeDasharray: '5,5',
    };
  }
  
  // Automation Pattern styling - dotted line with orange/purple gradient
  if (patternType === ConnectionPattern.AUTOMATION_PATTERN) {
    return {
      stroke: '#8844cc', // Purple to match command node
      strokeWidth: 2,
      strokeDasharray: '2,2',
      opacity: 0.8,
    };
  }
  
  // Default styling
  return {
    stroke: '#999',
    strokeWidth: 1,
  };
};
