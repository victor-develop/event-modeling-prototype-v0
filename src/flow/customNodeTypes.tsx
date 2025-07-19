import React from 'react';
import SwimlaneNode from '../components/SwimlaneNode';
import BlockNode from '../components/BlockNode';
import TriggerNode from '../components/nodes/TriggerNode';
import CommandNode from '../components/nodes/CommandNode';
import EventNode from '../components/nodes/EventNode';
import ViewNode from '../components/nodes/ViewNode';

// The dispatch* functions must be passed in from App for correct closure
export function createCustomNodeTypes({
  dispatch,
  dispatchUpdateNodeLabel,
  dispatchUpdateCommandParameters,
  dispatchUpdateEventPayload,
  dispatchUpdateViewSources
}: {
  dispatch: any,
  dispatchUpdateNodeLabel: (nodeId: string, label: string) => void,
  dispatchUpdateCommandParameters: (nodeId: string, parameters: Record<string, string>) => void,
  dispatchUpdateEventPayload: (nodeId: string, payload: Record<string, any>) => void,
  dispatchUpdateViewSources: (nodeId: string, sourceEvents: string[]) => void
}) {
  return {
    swimlane: (nodeProps: any) => (
      <SwimlaneNode
        {...nodeProps}
        dispatchAddBlock={(blockData: any) => {
          switch (blockData.type) {
            case 'trigger':
              dispatch({ type: 'ADD_TRIGGER', payload: blockData });
              break;
            case 'command':
              dispatch({ type: 'ADD_COMMAND', payload: blockData });
              break;
            case 'event':
              dispatch({ type: 'ADD_EVENT', payload: blockData });
              break;
            case 'view':
              dispatch({ type: 'ADD_VIEW', payload: blockData });
              break;
            default:
              console.error(`Unknown block type: ${blockData.type}`);
          }
        }}
        dispatchUpdateNodeLabel={dispatchUpdateNodeLabel}
      />
    ),
    block: (nodeProps: any) => <BlockNode {...nodeProps} onLabelChange={dispatchUpdateNodeLabel} />,
    trigger: (nodeProps: any) => <TriggerNode {...nodeProps} onLabelChange={dispatchUpdateNodeLabel} />,
    command: (nodeProps: any) => <CommandNode {...nodeProps} onLabelChange={dispatchUpdateNodeLabel} onParametersChange={dispatchUpdateCommandParameters} />,
    event: (nodeProps: any) => <EventNode {...nodeProps} onLabelChange={dispatchUpdateNodeLabel} onPayloadChange={dispatchUpdateEventPayload} />,
    view: (nodeProps: any) => <ViewNode {...nodeProps} onLabelChange={dispatchUpdateNodeLabel} onSourcesChange={dispatchUpdateViewSources} />,
  };
}
