import React, { memo, useCallback } from 'react';

interface HistoryPanelProps {
  events: any[];
  currentEventIndex: number;
  onTimeTravel: (index: number) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  events,
  currentEventIndex,
  onTimeTravel,
}) => {
  const handlePrev = useCallback(() => {
    if (currentEventIndex > 0) {
      onTimeTravel(currentEventIndex - 1);
    }
  }, [currentEventIndex, onTimeTravel]);

  const handleNext = useCallback(() => {
    if (currentEventIndex < events.length - 1) {
      onTimeTravel(currentEventIndex + 1);
    }
  }, [currentEventIndex, events.length, onTimeTravel]);

  return (
    <div
      style={{
        width: '250px',
        height: '100%',
        backgroundColor: '#f8f8f8',
        borderLeft: '1px solid #eee',
        padding: '10px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <h3 style={{ marginTop: 0 }}>History</h3>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <button onClick={handlePrev} disabled={currentEventIndex <= 0}>
          Previous
        </button>
        <button onClick={handleNext} disabled={currentEventIndex >= events.length - 1}>
          Next
        </button>
      </div>
      <div style={{ flexGrow: 1, overflowY: 'auto' }}>
        {events.map((event, index) => (
          <div
            key={index}
            style={{
              padding: '5px',
              backgroundColor: index === currentEventIndex ? '#e0e0e0' : 'transparent',
              cursor: 'pointer',
              marginBottom: '5px',
              borderRadius: '3px',
            }}
            onClick={() => onTimeTravel(index)}
          >
            <strong>{event.type}</strong>: {JSON.stringify(event.payload)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default memo(HistoryPanel);
