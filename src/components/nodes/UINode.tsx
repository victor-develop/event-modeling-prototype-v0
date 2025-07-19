import React from 'react';
import { Handle, Position } from '@xyflow/react';

export interface UINodeProps {
  id: string;
  data: {
    label: string;
  };
}

const UINode: React.FC<UINodeProps> = ({ id, data }) => {
  return (
    <div className="ui-node node-block">
      <Handle type="target" position={Position.Top} id="in" />
      <div className="node-label">{data.label || 'UI'}</div>
      {/* No outgoing handle; UI is a sink */}
    </div>
  );
};

export default UINode;
