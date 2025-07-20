import { MarkerType } from '@xyflow/react';
import { ConnectionPattern } from './patternValidation';

/**
 * Centralized edge styling utility
 * This provides consistent edge styling across the application
 */

// Define the edge style type with marker end
export type EdgeStyle = {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  opacity?: number;
  markerEnd: any; // Using any to avoid TypeScript issues with MarkerEnd
};

// Default arrow marker that can be used across the application
export const DEFAULT_ARROW_MARKER = { type: MarkerType.ArrowClosed } as any;

/**
 * Get edge style based on the connection pattern
 * This is the single source of truth for edge styling
 */
export const getEdgeStyle = (patternType: ConnectionPattern | undefined): EdgeStyle => {
  // Command Pattern styling
  if (patternType === ConnectionPattern.COMMAND_PATTERN) {
    return {
      stroke: '#333',
      strokeWidth: 2,
      markerEnd: DEFAULT_ARROW_MARKER,
    };
  }
  
  // View Pattern styling - dashed line to show data flow
  if (patternType === ConnectionPattern.VIEW_PATTERN) {
    return {
      stroke: '#22a355', // Green to match view node
      strokeWidth: 2,
      strokeDasharray: '5,5',
      markerEnd: DEFAULT_ARROW_MARKER,
    };
  }
  
  // Automation Pattern styling - dotted line with purple
  if (patternType === ConnectionPattern.AUTOMATION_PATTERN) {
    return {
      stroke: '#8844cc', // Purple to match command node
      strokeWidth: 2,
      strokeDasharray: '2,2',
      opacity: 0.8,
      markerEnd: DEFAULT_ARROW_MARKER,
    };
  }
  
  // UI Pattern styling
  if (patternType === ConnectionPattern.UI_PATTERN) {
    return {
      stroke: '#ff9900', // Orange to match UI node
      strokeWidth: 2,
      markerEnd: DEFAULT_ARROW_MARKER,
    };
  }
  
  // Processor Pattern styling
  if (patternType === ConnectionPattern.PROCESSOR_PATTERN) {
    return {
      stroke: '#0088cc', // Blue to match processor node
      strokeWidth: 2,
      markerEnd: DEFAULT_ARROW_MARKER,
    };
  }
  
  // Default styling
  return {
    stroke: '#999',
    strokeWidth: 1,
    markerEnd: DEFAULT_ARROW_MARKER,
  };
};
