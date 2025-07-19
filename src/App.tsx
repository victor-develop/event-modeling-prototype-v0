import React, { useCallback, useReducer, useState, useMemo } from 'react';
import { ToastProvider, useToast } from './context/ToastContext';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  applyEdgeChanges, applyNodeChanges,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type NodeSelectionChange,
  MarkerType,
  // Removed unused import
  // type Edge as ReactFlowEdge
} from '@xyflow/react';
import { isValidConnection, getEdgeStyle, ConnectionPattern, getConnectionPatternType } from './utils/patternValidation';
// Import our enhanced types
import type {
  EventModelingNode,
  TriggerNodeData, CommandNodeData, EventNodeData, ViewNodeData
} from './types/nodeTypes';
import type { EventModelingEdge } from './types/edgeTypes';
import { EdgePriority } from './types/edgeTypes';
import { nanoid } from 'nanoid';
import { createBlock, validateBlockInSwimlane } from './utils/blockCreation';

import '@xyflow/react/dist/style.css';

import Topbar from './components/Topbar';
import SwimlaneNode from './components/SwimlaneNode';
import BlockNode from './components/BlockNode';
import HistoryPanel from './components/HistoryPanel';
import ValidationPanel from './components/ValidationPanel';
import WelcomeGuide from './components/WelcomeGuide';

// Import new node types
import TriggerNode from './components/nodes/TriggerNode';
import CommandNode from './components/nodes/CommandNode';
import EventNode from './components/nodes/EventNode';
import ViewNode from './components/nodes/ViewNode';
import UINode from './components/nodes/UINode';
import ProcessorNode from './components/nodes/ProcessorNode';
import { createCustomNodeTypes } from './flow/customNodeTypes.tsx';
import { createCustomEdgeTypes } from './flow/customEdgeTypes.tsx';

// --- Event Sourcing Setup ---
import type { AppState, IntentionEventType } from './state/eventSourcing';
import {
  EventTypes,
  TIME_TRAVELLABLE_EVENTS,
  initialState,
  applyEvents,
  reduceCanvas,
  appReducer,
} from './state/eventSourcing';

const nodeClassName = (node: any): string => node.type;

// AppContent component contains the main application logic
const AppContent = () => {
  const { showToast } = useToast();
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [selectedSwimlaneId, setSelectedSwimlaneId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(() => {
    // Check if the user has seen the welcome guide before
    // Check if the user has seen the welcome guide before
    const hasSeenWelcomeGuide = localStorage.getItem('hasSeenWelcomeGuide');
    return hasSeenWelcomeGuide !== 'true';
  });
  
  // Extract nodes and edges from state for convenience
  const { nodes, edges, events, currentEventIndex } = state;
  
  // Handle closing the welcome guide
  const handleWelcomeGuideClose = useCallback(() => {
    setShowWelcomeGuide(false);
    localStorage.setItem('hasSeenWelcomeGuide', 'true');
  }, []);
  
  // Function to add a new swimlane with specified kind
  const addSwimlane = useCallback((kind: string) => {
    const id = nanoid();
    const newSwimlane = {
      id,
      type: 'swimlane',
      position: { x: 100, y: 100 + nodes.filter(n => n.type === 'swimlane').length * 200 },
      style: {
        width: 800,
        height: 150,
        backgroundColor: kind === 'event' ? '#fff8e1' : 
                        kind === 'command_view' ? '#e3f2fd' : 
                        kind === 'trigger' ? '#e8f5e9' : '#f5f5f5',
        border: '1px dashed #aaa',
        borderRadius: '5px',
        padding: '10px'  
      },
      data: { 
        label: `${kind.charAt(0).toUpperCase() + kind.slice(1).replace('_', ' & ')} Swimlane`,
        kind: kind // Store the kind in the swimlane data
      }
    };
    
    dispatch({
      type: EventTypes.ModelingEditor.ADD_SWIMLANE,
      payload: newSwimlane
    });
    
    // Automatically select the new swimlane
    setSelectedSwimlaneId(id);
  }, [nodes, dispatch]);
  
  // Dispatch functions for different node types
  const dispatchAddEvent = useCallback((node: any) => {
    dispatch({
      type: EventTypes.ModelingEditor.ADD_EVENT,
      payload: node
    });
  }, [dispatch]);
  
  const dispatchAddView = useCallback((node: any) => {
    dispatch({
      type: EventTypes.ModelingEditor.ADD_VIEW,
      payload: node
    });
  }, [dispatch]);
  
  const dispatchAddCommand = useCallback((node: any) => {
    dispatch({
      type: EventTypes.ModelingEditor.ADD_COMMAND,
      payload: node
    });
  }, [dispatch]);
  
  const dispatchAddTrigger = useCallback((node: any) => {
    dispatch({
      type: EventTypes.ModelingEditor.ADD_TRIGGER,
      payload: node
    });
  }, [dispatch]);
  
  // Dispatch functions for UI and Processor nodes
  const dispatchAddUI = useCallback((node: any) => {
    dispatch({
      type: EventTypes.ModelingEditor.ADD_UI,
      payload: node
    });
  }, [dispatch]);
  
  const dispatchAddProcessor = useCallback((node: any) => {
    dispatch({
      type: EventTypes.ModelingEditor.ADD_PROCESSOR,
      payload: node
    });
  }, [dispatch]);
  
  // Function to add a new Trigger node within selected swimlane
  const addTrigger = useCallback(() => {
    // Require a selected swimlane
    if (!selectedSwimlaneId) {
      console.warn('No swimlane selected. Please select a swimlane first.');
      showToast({
        message: 'Please select a swimlane first before adding a Trigger block.',
        type: 'warning',
        duration: 5000
      });
      return;
    }
    
    // Get the selected swimlane
    const swimlane = nodes.find(n => n.id === selectedSwimlaneId);
    if (!swimlane) {
      console.warn('Selected swimlane not found');
      return;
    }
    
    // Validate swimlane kind using the shared validation function
    const validationError = validateBlockInSwimlane('trigger', swimlane.data?.kind);
    if (validationError) {
      console.warn(validationError);
      showToast({
        message: validationError,
        type: 'error',
        duration: 5000
      });
      return;
    }
    
    // Find existing blocks in this swimlane to position horizontally
    const blocksInLane = nodes.filter(n => n.parentId === selectedSwimlaneId);
    
    // Use the shared block creation utility
    const newTrigger = createBlock({
      blockType: 'trigger',
      parentId: selectedSwimlaneId,
      parentPosition: swimlane.position,
      existingBlocks: blocksInLane
    });

    dispatchAddTrigger(newTrigger);
  }, [dispatchAddTrigger, selectedSwimlaneId, nodes]);
  
  // Function to add a new Command node within selected swimlane
  const addCommand = useCallback(() => {
    // Require a selected swimlane
    if (!selectedSwimlaneId) {
      console.warn('No swimlane selected. Please select a swimlane first.');
      showToast({
        message: 'Please select a swimlane first before adding a Command block.',
        type: 'warning',
        duration: 5000
      });
      return;
    }
    
    // Get the selected swimlane
    const swimlane = nodes.find(n => n.id === selectedSwimlaneId);
    if (!swimlane) {
      console.warn('Selected swimlane not found');
      return;
    }
    
    // Validate swimlane kind using the shared validation function
    const validationError = validateBlockInSwimlane('command', swimlane.data?.kind);
    if (validationError) {
      console.warn(validationError);
      showToast({
        message: validationError,
        type: 'error',
        duration: 5000
      });
      return;
    }
    
    // Find existing blocks in this swimlane to position horizontally
    const blocksInLane = nodes.filter(n => n.parentId === selectedSwimlaneId);
    
    // Use the shared block creation utility
    const newCommand = createBlock({
      blockType: 'command',
      parentId: selectedSwimlaneId,
      parentPosition: swimlane.position,
      existingBlocks: blocksInLane
    });

    dispatchAddCommand(newCommand);
  }, [dispatchAddCommand, selectedSwimlaneId, nodes]);

  // Function to add a new Event node within selected swimlane
  const addEvent = useCallback(() => {
    // Require a selected swimlane
    if (!selectedSwimlaneId) {
      console.warn('No swimlane selected. Please select a swimlane first.');
      showToast({
        message: 'Please select a swimlane first before adding an Event block.',
        type: 'warning',
        duration: 5000
      });
      return;
    }
    
    // Get the selected swimlane
    const swimlane = nodes.find(n => n.id === selectedSwimlaneId);
    if (!swimlane) {
      console.warn('Selected swimlane not found');
      return;
    }
    
    // Validate swimlane kind using the shared validation function
    const validationError = validateBlockInSwimlane('event', swimlane.data?.kind);
    if (validationError) {
      console.warn(validationError);
      showToast({
        message: validationError,
        type: 'error',
        duration: 5000
      });
      return;
    }
    
    // Find existing blocks in this swimlane to position horizontally
    const blocksInLane = nodes.filter(n => n.parentId === selectedSwimlaneId);
    
    // Use the shared block creation utility
    const newEvent = createBlock({
      blockType: 'event',
      parentId: selectedSwimlaneId,
      parentPosition: swimlane.position,
      existingBlocks: blocksInLane
    });

    dispatchAddEvent(newEvent);
  }, [dispatchAddEvent, selectedSwimlaneId, nodes]);

  // Function to add a new view node within selected swimlane
  const addView = useCallback(() => {
    // Require a selected swimlane
    if (!selectedSwimlaneId) {
      console.warn('No swimlane selected. Please select a swimlane first.');
      showToast({
        message: 'Please select a swimlane first before adding a View.',
        type: 'warning',
        duration: 5000
      });
      return;
    }
    
    // Get the selected swimlane
    const swimlane = nodes.find(n => n.id === selectedSwimlaneId);
    if (!swimlane) {
      console.warn('Selected swimlane not found');
      return;
    }
    
    // Validate swimlane kind using the shared validation function
    const validationError = validateBlockInSwimlane('view', swimlane.data?.kind);
    if (validationError) {
      console.warn(validationError);
      showToast({
        message: validationError,
        type: 'error',
        duration: 5000
      });
      return;
    }
    
    // Find existing blocks in this swimlane to position horizontally
    const blocksInLane = nodes.filter(n => n.parentId === selectedSwimlaneId);
    
    // Use the shared block creation utility
    const newView = createBlock({
      blockType: 'view',
      parentId: selectedSwimlaneId,
      parentPosition: swimlane.position,
      existingBlocks: blocksInLane
    });

    dispatchAddView(newView);
  }, [dispatchAddView, selectedSwimlaneId, nodes]);
  
  // Function to add a new UI node within selected swimlane
  const addUI = useCallback(() => {
    // Require a selected swimlane
    if (!selectedSwimlaneId) {
      console.warn('No swimlane selected. Please select a swimlane first.');
      showToast({
        message: 'Please select a swimlane first before adding a UI block.',
        type: 'warning',
        duration: 5000
      });
      return;
    }
    
    // Get the selected swimlane
    const swimlane = nodes.find(n => n.id === selectedSwimlaneId);
    if (!swimlane) {
      console.warn('Selected swimlane not found');
      return;
    }
    
    // Validate swimlane kind using the shared validation function
    const validationError = validateBlockInSwimlane('ui', swimlane.data?.kind);
    if (validationError) {
      console.warn(validationError);
      showToast({
        message: validationError,
        type: 'error',
        duration: 5000
      });
      return;
    }
    
    // Find existing blocks in this swimlane to position horizontally
    const blocksInLane = nodes.filter(n => n.parentId === selectedSwimlaneId);
    
    // Use the shared block creation utility
    const newUI = createBlock({
      blockType: 'ui',
      parentId: selectedSwimlaneId,
      parentPosition: swimlane.position,
      existingBlocks: blocksInLane
    });

    dispatchAddUI(newUI);
  }, [dispatchAddUI, selectedSwimlaneId, nodes]);
  
  // Function to add a new Processor node within selected swimlane
  const addProcessor = useCallback(() => {
    // Require a selected swimlane
    if (!selectedSwimlaneId) {
      console.warn('No swimlane selected. Please select a swimlane first.');
      showToast({
        message: 'Please select a swimlane first before adding a Processor block.',
        type: 'warning',
        duration: 5000
      });
      return;
    }
    
    // Get the selected swimlane
    const swimlane = nodes.find(n => n.id === selectedSwimlaneId);
    if (!swimlane) {
      console.warn('Selected swimlane not found');
      return;
    }
    
    // Validate swimlane kind using the shared validation function
    const validationError = validateBlockInSwimlane('processor', swimlane.data?.kind);
    if (validationError) {
      console.warn(validationError);
      showToast({
        message: validationError,
        type: 'error',
        duration: 5000
      });
      return;
    }
    
    // Find existing blocks in this swimlane to position horizontally
    const blocksInLane = nodes.filter(n => n.parentId === selectedSwimlaneId);
    
    // Use the shared block creation utility
    const newProcessor = createBlock({
      blockType: 'processor',
      parentId: selectedSwimlaneId,
      parentPosition: swimlane.position,
      existingBlocks: blocksInLane
    });

    dispatchAddProcessor(newProcessor);
  }, [dispatchAddProcessor, selectedSwimlaneId, nodes]);

  // Helper function to check if a node should have horizontal-only movement
  const shouldConstrainToHorizontalMovement = useCallback((nodeType?: string): boolean => {
    return nodeType === 'block' || 
           nodeType === 'trigger' || 
           nodeType === 'command' || 
           nodeType === 'event' || 
           nodeType === 'view' || 
           nodeType === 'UI' || 
           nodeType === 'Processor';
  }, []);

  // Handle node changes (position, selection, etc)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Filter changes to prevent certain movements
      const processedChanges = changes.filter(change => {
        // Only process position changes
        if (change.type === 'position') {
          // Get the node being changed
          const node = nodes.find(n => n.id === change.id);
          
          // Prevent swimlane movement completely
          if (node?.type === 'swimlane') {
            console.log('Preventing swimlane movement');
            // Filter out position changes for swimlanes
            return false;
          }
          
          // Constrain block nodes to horizontal movement only
          if (shouldConstrainToHorizontalMovement(node?.type) && 'position' in change && change.position) {
            console.log(`Constraining ${node?.type} to horizontal movement`);
            // Modify the change to preserve the original y-position
            change.position.y = node.position.y;
          }
        }
        
        // Keep all other changes
        return true;
      });

      // Check if this is a selection change
      const selectionChange = processedChanges.find(change => 
        change.type === 'select' && (change as NodeSelectionChange).selected === true
      ) as NodeSelectionChange | undefined;
      
      // If a node was selected, update the selectedSwimlaneId if it's a swimlane
      if (selectionChange) {
        const selectedNode = nodes.find(n => n.id === selectionChange.id);
        if (selectedNode && selectedNode.type === 'swimlane') {
          setSelectedSwimlaneId(selectedNode.id);
          setSelectedNodeId(selectedNode.id);
        } else if (selectedNode) {
          // For non-swimlane nodes, just track the selection
          setSelectedNodeId(selectedNode.id);
        }
      }
      
      // Only dispatch if there are changes to apply
      if (processedChanges.length > 0) {
        dispatch({
          type: EventTypes.ReactFlow.CHANGE_NODES,
          payload: processedChanges
        });
      }
    },
    [dispatch, nodes]
  );
  
  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      dispatch({
        type: EventTypes.ReactFlow.CHANGE_EDGES,
        payload: changes
      });
    },
    [dispatch]
  );
  
  // Handle node drag stop
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: any) => {
      // Get the original node from our state
      const originalNode = nodes.find(n => n.id === node.id);
      
      if (!originalNode) return;
      
      // Apply movement constraints
      let finalPosition = { ...node.position };
      
      // Prevent swimlane movement completely
      if (node.type === 'swimlane') {
        console.log('Preventing swimlane drag movement');
        finalPosition = { ...originalNode.position };
      } 
      // Constrain block nodes to horizontal movement only
      else if (shouldConstrainToHorizontalMovement(node.type)) {
        console.log(`Constraining ${node.type} to horizontal movement on drag stop`);
        finalPosition.y = originalNode.position.y;
      }
      
      // Dispatch the move event with constrained position
      dispatch({
        type: EventTypes.ModelingEditor.MOVE_NODE,
        payload: {
          nodeId: node.id,
          position: finalPosition
        }
      });
    },
    [dispatch, nodes]
  );
  
  // Handle connections between nodes
  const onConnect = useCallback(
    (connection: Connection) => {
      // Find the source and target nodes
      const sourceNode = nodes.find(node => node.id === connection.source);
      const targetNode = nodes.find(node => node.id === connection.target);
      
      // Validate the connection against event modeling patterns
      const validationResult = isValidConnection(sourceNode || null, targetNode || null);
      
      if (validationResult.valid) {
        // Enhance the connection with pattern type
        const patternType = getConnectionPatternType(sourceNode || null, targetNode || null);
        const enhancedConnection = {
          ...connection,
          data: {
            patternType,
            priority: EdgePriority.MEDIUM // Using MEDIUM instead of NORMAL which doesn't exist
          }
        };
        
        dispatch({
          type: EventTypes.ReactFlow.NEW_CONNECTION,
          payload: enhancedConnection
        });
      } else {
        console.warn('This connection is not allowed based on event modeling patterns.');  
        showToast({
          message: 'This connection is not allowed based on event modeling patterns.',
          type: 'error',
          duration: 5000
        });
        return;}
    },
    [dispatch, nodes]
  );
  
  // Functions for updating node properties
  // --- Memoized dispatchUpdate* functions for stable references ---
const dispatchUpdateNodeLabel = useCallback(
  (nodeId: string, label: string) => {
    dispatch({
      type: EventTypes.ModelingEditor.UPDATE_NODE_LABEL,
      payload: { nodeId, label }
    });
  },
  [dispatch]
);

const dispatchUpdateCommandParameters = useCallback(
  (nodeId: string, parameters: Record<string, string>) => {
    dispatch({
      type: EventTypes.ModelingEditor.UPDATE_COMMAND_PARAMETERS,
      payload: { nodeId, parameters }
    });
  },
  [dispatch]
);

const dispatchUpdateEventPayload = useCallback(
  (nodeId: string, payload: Record<string, any>) => {
    dispatch({
      type: EventTypes.ModelingEditor.UPDATE_EVENT_PAYLOAD,
      payload: { nodeId, payload }
    });
  },
  [dispatch]
);

const dispatchUpdateViewSources = useCallback(
  (nodeId: string, sourceEvents: string[]) => {
    dispatch({
      type: EventTypes.ModelingEditor.UPDATE_VIEW_SOURCES,
      payload: { nodeId, sourceEvents }
    });
  },
  [dispatch]
);
// --- End memoized dispatchUpdate* functions ---
  
  // Time travel functionality
  const onTimeTravel = useCallback(
    (index: number) => {
      dispatch({
        type: EventTypes.EventSourcing.TIME_TRAVEL,
        payload: { index }
      });
    },
    [dispatch]
  );
  
  // Export events to JSON
  const onExportEvents = useCallback(() => {
    const modelState = {
      nodes,
      edges,
      events,
      currentEventIndex
    };
    
    const dataStr = JSON.stringify(modelState, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'event-model.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [nodes, edges, events, currentEventIndex]);
  
  // Import events from JSON
  const onImportEvents = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsedContent = JSON.parse(content);
          
          // Check if this is a legacy format (just events array)
          if (Array.isArray(parsedContent)) {
            dispatch({
              type: EventTypes.EventSourcing.LOAD_EVENTS,
              payload: parsedContent
            });
            showToast({
              message: 'Legacy event format imported successfully!',
              type: 'success',
              duration: 5000
            });
          } 
          // Check if this is our enhanced format with nodes, edges, events
          else if (parsedContent.nodes && parsedContent.edges && parsedContent.events) {
            dispatch({
              type: EventTypes.EventSourcing.LOAD_EVENTS,
              payload: parsedContent.events
            });
            showToast({
              message: 'Model imported successfully!',
              type: 'success',
              duration: 5000
            });
          } else {
            showToast({
              message: 'Unknown file format. Please use a valid event model file.',
              type: 'error',
              duration: 5000
            });
          }
        } catch (err) {
          console.error('Error parsing JSON:', err);
          alert('Error parsing JSON file. Please ensure it is a valid JSON file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [dispatch]);
  
  // Create a snapshot to compress history
  const onCompressSnapshot = useCallback(() => {
    if (currentEventIndex < 0) {
      showToast({
        message: 'No events to compress.',
        type: 'warning',
        duration: 5000
      });
      return;
    }
    
    dispatch({
      type: EventTypes.EventSourcing.CREATE_SNAPSHOT,
      payload: {
        snapshotNodes: nodes,
        snapshotEdges: edges,
        snapshotIndex: currentEventIndex
      }
    });
    
    showToast({
      message: 'History compressed successfully! Previous events have been consolidated into a snapshot.',
      type: 'success',
      duration: 5000
    });
  }, [dispatch, nodes, edges, currentEventIndex]);
  
  // Import direct model state (advanced feature)
  const importModelState = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsedContent = JSON.parse(content);
          
          // Direct model state import - for advanced use cases
          if (parsedContent.nodes && parsedContent.edges) {
            // Create synthetic events from the model state
            const syntheticEvents: IntentionEventType[] = [];
            
            // Add swimlanes first
            parsedContent.nodes
              .filter((n: any) => n.type === 'swimlane')
              .forEach((node: any) => {
                syntheticEvents.push({
                  type: EventTypes.ModelingEditor.ADD_SWIMLANE,
                  payload: node
                });
              });
            
            // Then add blocks
            parsedContent.nodes
              .filter((n: any) => n.type !== 'swimlane')
              .forEach((node: any) => {
                let eventType;
                switch (node.type) {
                  case 'trigger':
                    eventType = EventTypes.ModelingEditor.ADD_TRIGGER;
                    break;
                  case 'command':
                    eventType = EventTypes.ModelingEditor.ADD_COMMAND;
                    break;
                  case 'event':
                    eventType = EventTypes.ModelingEditor.ADD_EVENT;
                    break;
                  case 'view':
                    eventType = EventTypes.ModelingEditor.ADD_VIEW;
                    break;
                  default:
                    eventType = EventTypes.ModelingEditor.ADD_BLOCK;
                }
                
                syntheticEvents.push({
                  type: eventType,
                  payload: node
                });
              });
            
            // Finally add connections
            parsedContent.edges.forEach((edge: any) => {
              syntheticEvents.push({
                type: EventTypes.ReactFlow.NEW_CONNECTION,
                payload: {
                  source: edge.source,
                  target: edge.target,
                  sourceHandle: edge.sourceHandle,
                  targetHandle: edge.targetHandle
                }
              });
            });
            
            // Load the synthetic events
            dispatch({
              type: EventTypes.EventSourcing.LOAD_EVENTS,
              payload: syntheticEvents
            });
            
            showToast({
              message: 'Model state imported successfully!',
              type: 'success',
              duration: 5000
            });
          } else {
            showToast({
              message: 'Invalid model state format. Please use a valid JSON export.',
              type: 'error',
              duration: 5000
            });
          }
        } catch (err) {
          console.error('Error parsing JSON:', err);
          alert('Error parsing JSON file. Please ensure it is a valid JSON file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [dispatch]);

  // --- Memoize customNodeTypes with stable dispatchUpdate* dependencies ---
const customNodeTypes = useMemo(() => createCustomNodeTypes({
  dispatch,
  dispatchUpdateNodeLabel,
  dispatchUpdateCommandParameters,
  dispatchUpdateEventPayload,
  dispatchUpdateViewSources
}), [dispatch, dispatchUpdateNodeLabel, dispatchUpdateCommandParameters, dispatchUpdateEventPayload, dispatchUpdateViewSources]);

// Define custom edge types with appropriate styling and enhanced edge data
const edgeTypes = useMemo(() => createCustomEdgeTypes(), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar
        onAddSwimlane={addSwimlane}
        onAddTrigger={addTrigger}
        onAddCommand={addCommand}
        onAddEvent={addEvent}
        onAddView={addView}
        onAddUI={addUI}
        onAddProcessor={addProcessor}
        onExportEvents={onExportEvents}
        onImportEvents={onImportEvents}
        onCompressSnapshot={onCompressSnapshot}
        onImportModelState={importModelState}
        selectedSwimlaneId={selectedSwimlaneId}
        nodes={nodes}
      />
      
      {/* Welcome Guide for new users */}
      {showWelcomeGuide && <WelcomeGuide onClose={handleWelcomeGuideClose} />}
      <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          defaultEdgeOptions={{
            animated: false,
            markerEnd: { type: MarkerType.ArrowClosed },
            type: 'command-pattern'
          }}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          onEdgesChange={onEdgesChange}
          edgeTypes={edgeTypes} /* This ensures edgeTypes is used */
          onConnect={onConnect}
          fitView
          attributionPosition="top-right"
          nodeTypes={customNodeTypes}
          style={{ flexGrow: 1 }}
        >
          <MiniMap zoomable pannable nodeClassName={nodeClassName} />
          <Controls />
          <Background />
          {/* Add ValidationPanel to provide model correctness guidance */}
          <ValidationPanel 
            nodes={nodes} 
            edges={edges}
            onNodeSelect={(nodeId) => {
              // Clear any selected edge
              setSelectedEdgeId(null);
              
              // Select the node and scroll to it
              setSelectedNodeId(nodeId);
              
              // Highlight the selected node
              const updatedNodes = nodes.map(n => ({
                ...n,
                selected: n.id === nodeId
              }));
              
              dispatch({
                type: EventTypes.ReactFlow.CHANGE_NODES,
                payload: updatedNodes.map(node => ({
                  id: node.id,
                  type: 'select',
                  selected: node.id === nodeId
                }))
              });
            }}
            onEdgeSelect={(edgeId) => {
              // Clear any selected node
              setSelectedNodeId(null);
              
              // Select the edge
              setSelectedEdgeId(edgeId);
              
              // Highlight the selected edge
              dispatch({
                type: EventTypes.ReactFlow.CHANGE_EDGES,
                payload: edges.map(e => ({
                  id: e.id,
                  type: 'select',
                  selected: e.id === edgeId
                }))
              });
            }}
          />
        </ReactFlow>
        <HistoryPanel
          events={events}
          currentEventIndex={currentEventIndex}
          onTimeTravel={onTimeTravel}
          snapshotNodes={state.snapshotNodes}
          nodes={nodes}
          edges={edges}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
        />
      </div>
    </div>
  );
};

// Replace alert() calls with showToast() for better UX in React
const App = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;
