import React from 'react';
import { Handle, Position } from '@xyflow/react';

export interface ProcessorNodeProps {
  id: string;
  data: {
    label: string;
  };
}

const ProcessorNode: React.FC<ProcessorNodeProps> = ({ id, data }) => {
  return (
    <div className="processor-node node-block">
      <Handle type="target" position={Position.Top} id="in" />
      <div className="node-label">{data.label || 'Processor'}</div>
      {/* No outgoing handle; Processor is a sink */}
    </div>
  );
};

export default ProcessorNode;
