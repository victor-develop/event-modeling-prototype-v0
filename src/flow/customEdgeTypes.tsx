import { Position, getSmoothStepPath } from '@xyflow/react';

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
      
      // Get source and target positions
      const sourceX = props.sourceX;
      const sourceY = props.sourceY;
      const targetX = props.targetX;
      const targetY = props.targetY;
      
      // Determine source and target positions based on the node positions
      const sourcePosition = props.sourcePosition || Position.Right;
      const targetPosition = props.targetPosition || Position.Left;
      
      // Generate a smooth step path
      const [path] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 10, // Add a slight curve radius
      });
      
      return (
        <g>
          <path
            className="react-flow__edge-path"
            d={path}
            style={edgeStyle}
          />
          {props.data?.condition && (
            <text
              className="react-flow__edge-text"
              x={(sourceX + targetX) / 2}
              y={(sourceY + targetY) / 2 - 10}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fill: '#777', fontSize: '12px', background: '#f5f5f5' }}
            >
              {"?"}
            </text>
          )}
        </g>
      );
    },
  };
}
