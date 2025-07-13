import type { Node, Edge } from '@xyflow/react';

// Base node types with common properties
export interface BaseNodeData {
  label: string;
  description?: string;
  notes?: string;
  tags?: string[];
  [key: string]: unknown;
}

// Specific node data types
export interface TriggerNodeData extends BaseNodeData {
  triggerType?: 'user' | 'system' | 'external' | 'time' | 'api';
  actor?: string;
}

export interface CommandNodeData extends BaseNodeData {
  parameters: Record<string, string>;
  validation?: Record<string, string>;
  preconditions?: string[];
}

export interface EventNodeData extends BaseNodeData {
  payload: Record<string, any>;
  version?: string;
  timestamp?: string;
  isExternalEvent?: boolean;
}

export interface ViewNodeData extends BaseNodeData {
  sourceEvents: string[];
  viewType?: 'read' | 'projection' | 'dashboard' | 'report';
  refreshPattern?: 'real-time' | 'scheduled' | 'on-demand';
  permissions?: string[];
}

// Node types with specific data
export interface TriggerNode extends Node {
  type: 'trigger';
  data: TriggerNodeData;
}

export interface CommandNode extends Node {
  type: 'command';
  data: CommandNodeData;
}

export interface EventNode extends Node {
  type: 'event';
  data: EventNodeData;
}

export interface ViewNode extends Node {
  type: 'view';
  data: ViewNodeData;
}

// General Event Modeling node type
export type EventModelingNode = TriggerNode | CommandNode | EventNode | ViewNode;

// Edge data with pattern information
export interface EventModelingEdgeData {
  patternType?: string;
  condition?: string;
  notes?: string;
  isConditional?: boolean;
  [key: string]: unknown;
}

// Edge with pattern information
export interface EventModelingEdge extends Edge {
  data?: EventModelingEdgeData;
}
