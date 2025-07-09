import React, { memo } from 'react';

interface TopbarProps {
  onAddSwimlane: () => void;
  onExportEvents: () => void;
  onImportEvents: () => void;
  onCompressSnapshot: () => void; // New prop for compress snapshot
}

const Topbar: React.FC<TopbarProps> = ({ onAddSwimlane, onExportEvents, onImportEvents, onCompressSnapshot }) => {
  return (
    <div
      style={{
        padding: '10px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
      }}
    >
      <div>
        <button onClick={onAddSwimlane} style={{ marginRight: '10px' }}>
          Add Swimlane
        </button>
        <button onClick={onExportEvents} style={{ marginRight: '10px' }}>
          Export Events
        </button>
        <button onClick={onImportEvents} style={{ marginRight: '10px' }}>
          Import Events
        </button>
        <button onClick={onCompressSnapshot}>
          Compress Snapshot
        </button>
      </div>
      <h2 style={{ margin: 0 }}>Event Modeling App</h2>
    </div>
  );
};

export default memo(Topbar);
