import React from 'react';

interface TopbarProps {
  onAddSwimlane: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ onAddSwimlane }) => {
  return (
    <div style={{
      width: '100%',
      height: '50px',
      backgroundColor: '#f0f0f0',
      borderBottom: '1px solid #ccc',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      boxSizing: 'border-box',
      justifyContent: 'space-between',
    }}>
      <div style={{ fontWeight: 'bold' }}>Event Modeling App</div>
      <button onClick={onAddSwimlane} style={{ padding: '8px 15px', cursor: 'pointer' }}>
        Add Swimlane
      </button>
    </div>
  );
};

export default Topbar;
