/**
 * Block types for Event Modeling app
 */

/**
 * Defines the kinds of blocks available in the Event Modeling application
 */
export const BlockKind = {
  TRIGGER: 'trigger',
  COMMAND: 'command',
  EVENT: 'event',
  VIEW: 'view'
} as const;

export type BlockKind = typeof BlockKind[keyof typeof BlockKind];

/**
 * Data structure for block nodes
 */
export type BlockNodeData = {
  id: string;
  label: string;
  kind: string;
  parentId?: string; // Reference to parent swimlane
  extent?: { width: number; height: number };
  details?: Record<string, unknown>; // For additional metadata
};

/**
 * Props for BlockNode component
 */
export interface BlockNodeProps {
  id: string;
  data: BlockNodeData;
  // Prop for dispatching events
  dispatchUpdateNodeLabel: (nodeId: string, label: string) => void;
}

/**
 * Returns background color for each block kind
 */
export const BLOCK_KIND_COLORS: Record<string, string> = {
  'trigger': 'rgba(210, 250, 210, 0.8)', // Light green
  'command': 'rgba(200, 230, 255, 0.8)', // Light blue
  'event': 'rgba(255, 240, 150, 0.8)', // Light yellow
  'view': 'rgba(240, 240, 240, 0.8)'  // Light gray
};

/**
 * Returns border color for each block kind
 */
export const BLOCK_KIND_BORDERS: Record<string, string> = {
  'trigger': '#27ae60', // Green
  'command': '#3498db', // Blue
  'event': '#f1c40f', // Yellow
  'view': '#95a5a6'  // Gray
};

/**
 * Returns icon for each block kind
 */
export const BLOCK_KIND_ICONS: Record<string, string> = {
  'trigger': '🔔', // Bell
  'command': '⚡', // Lightning
  'event': '📊', // Chart
  'view': '👁️' // Eye
};
