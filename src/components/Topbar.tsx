import React, { memo } from 'react';

interface TopbarProps {
  onAddSwimlane: () => void;
  onAddTrigger: () => void;
  onAddCommand: () => void;
  onAddEvent: () => void;
  onAddView: () => void;
  onExportEvents: () => void;
  onImportEvents: () => void;
  onCompressSnapshot: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ 
  onAddSwimlane, 
  onAddTrigger,
  onAddCommand,
  onAddEvent,
  onAddView,
  onExportEvents, 
  onImportEvents, 
  onCompressSnapshot 
}) => {
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Layout</span>
          <button onClick={onAddSwimlane} style={{ marginRight: '5px' }}>
            Add Swimlane
          </button>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Building Blocks</span>
          <button onClick={onAddTrigger} style={{ marginRight: '5px', backgroundColor: '#3498db', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '3px' }}>
            Trigger
          </button>
          <button onClick={onAddCommand} style={{ marginRight: '5px', backgroundColor: '#9b59b6', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '3px' }}>
            Command
          </button>
          <button onClick={onAddEvent} style={{ marginRight: '5px', backgroundColor: '#f39c12', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '3px' }}>
            Event
          </button>
          <button onClick={onAddView} style={{ backgroundColor: '#2ecc71', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '3px' }}>
            View
          </button>
        </div>

        <div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Tools</span>
          <button onClick={onExportEvents} style={{ marginRight: '5px' }}>
            Export Events
          </button>
          <button onClick={onImportEvents} style={{ marginRight: '5px' }}>
            Import Events
          </button>
          <button onClick={onCompressSnapshot}>
            Compress Snapshot
          </button>
        </div>
      </div>
      <h2 style={{ margin: 0 }}>Event Modeling App</h2>
    </div>
  );
};

export default memo(Topbar);
