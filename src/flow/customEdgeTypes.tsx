import React from 'react';

// This function returns the edgeTypes object for React Flow
export function createCustomEdgeTypes() {
  return {
    'command-pattern': (props: any) => {
      const edgeStyle = { stroke: '#333', strokeWidth: 2 };
      if (props.data?.patternType) {
        if (props.data.patternType === 'command') {
          Object.assign(edgeStyle, { stroke: '#333', strokeWidth: 2 });
        } else if (props.data.patternType === 'view') {
          Object.assign(edgeStyle, { stroke: '#22a355', strokeWidth: 2, strokeDasharray: '5,5' });
        } else if (props.data.patternType === 'automation') {
          Object.assign(edgeStyle, { stroke: '#8844cc', strokeWidth: 2, strokeDasharray: '2,2', opacity: 0.8 });
        }
      }
      return (
        <g>
          <path
            className="react-flow__edge-path"
            d={props.pathPoints || `M${props.sourceX},${props.sourceY} L${props.targetX},${props.targetY}`}
            style={edgeStyle}
          />
          {props.data?.condition && (
            <text
              className="react-flow__edge-text"
              x={(props.sourceX + props.targetX) / 2}
              y={(props.sourceY + props.targetY) / 2 - 10}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fill: '#777', fontSize: '12px', background: '#f5f5f5' }}
            >
              ?
            </text>
          )}
        </g>
      );
    },
  };
}
