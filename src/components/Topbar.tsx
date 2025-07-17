import React, { memo } from 'react';

interface TopbarProps {
  onAddSwimlane: (kind: string) => void;
  onAddTrigger: () => void;
  onAddCommand: () => void;
  onAddEvent: () => void;
  onAddView: () => void;
  onExportEvents: () => void;
  onImportEvents: () => void;
  onCompressSnapshot: () => void;
  onImportModelState?: () => void; // Optional new prop for direct model state import
}

const Topbar: React.FC<TopbarProps> = ({ 
  onAddSwimlane, 
  onAddTrigger,
  onAddCommand,
  onAddEvent,
  onAddView,
  onExportEvents, 
  onImportEvents, 
  onCompressSnapshot,
  onImportModelState
}) => {
  // State for selected swimlane kind
  const [selectedSwimlaneKind, setSelectedSwimlaneKind] = React.useState<string>('event');
  
  // Handle swimlane kind change
  const handleSwimlaneKindChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSwimlaneKind(e.target.value);
  };
  
  // Handle add swimlane button click
  const handleAddSwimlane = () => {
    onAddSwimlane(selectedSwimlaneKind);
  };
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <select 
              value={selectedSwimlaneKind} 
              onChange={handleSwimlaneKindChange}
              style={{ padding: '3px', borderRadius: '3px' }}
            >
              <option value="event">Event Lane</option>
              <option value="command_view">Command & View Lane</option>
              <option value="trigger">Trigger Lane</option>
            </select>
            <button onClick={handleAddSwimlane} style={{ marginRight: '5px' }}>
              Add Swimlane
            </button>
          </div>
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
          <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Model Tools</span>
          <button onClick={onExportEvents} style={{ marginRight: '5px' }}>
            Export Model
          </button>
          <button onClick={onImportEvents} style={{ marginRight: '5px' }}>
            Import Model
          </button>
          <button onClick={onCompressSnapshot} style={{ marginRight: '5px' }}>
            Compress Snapshot
          </button>
          {onImportModelState && (
            <button onClick={onImportModelState} title="For advanced use cases">
              Import JSON State
            </button>
          )}
        </div>
      </div>
      <h2 style={{ margin: 0 }}>Event Modeling App</h2>
    </div>
  );
};

export default memo(Topbar);
