import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HistoryPanel from '../../../src/components/HistoryPanel';

// Mock data for testing
const mockEvents = [
  {
    type: 'EventSourcing.ADD_COMMAND',
    payload: {
      id: 'cmd-1',
      label: 'Test Command',
      position: { x: 100, y: 100 }
    }
  },
  {
    type: 'EventSourcing.ADD_EVENT',
    payload: {
      id: 'evt-1',
      label: 'Test Event',
      position: { x: 200, y: 100 }
    }
  },
  {
    type: 'EventSourcing.NEW_CONNECTION',
    payload: {
      id: 'edge-1',
      source: 'cmd-1',
      target: 'evt-1',
      sourceHandle: 'right',
      targetHandle: 'left'
    }
  }
];

// Mock nodes and edges
const mockNodes = [
  { id: 'cmd-1', type: 'command', data: { label: 'Test Command' } },
  { id: 'evt-1', type: 'event', data: { label: 'Test Event' } }
];

const mockEdges = [
  { 
    id: 'edge-1', 
    source: 'cmd-1', 
    target: 'evt-1', 
    data: { patternType: 'command' } 
  }
];

describe('HistoryPanel Component', () => {
  it('renders without crashing', () => {
    const onTimeTravelMock = vi.fn();
    
    render(
      <HistoryPanel
        events={mockEvents}
        currentEventIndex={0}
        onTimeTravel={onTimeTravelMock}
        snapshotNodes={null}
        nodes={mockNodes}
        edges={mockEdges}
      />
    );
    
    expect(screen.getByText('Event Modeling')).toBeInTheDocument();
  });

  it('displays events in the history tab', () => {
    const onTimeTravelMock = vi.fn();
    
    render(
      <HistoryPanel
        events={mockEvents}
        currentEventIndex={0}
        onTimeTravel={onTimeTravelMock}
        snapshotNodes={null}
        nodes={mockNodes}
        edges={mockEdges}
      />
    );
    
    // Check if events are displayed
    expect(screen.getByText('ADD_COMMAND')).toBeInTheDocument();
    expect(screen.getByText('ADD_EVENT')).toBeInTheDocument();
    expect(screen.getByText('NEW_CONNECTION')).toBeInTheDocument();
  });

  it('toggles JSON details when Show JSON button is clicked', () => {
    const onTimeTravelMock = vi.fn();
    
    render(
      <HistoryPanel
        events={mockEvents}
        currentEventIndex={0}
        onTimeTravel={onTimeTravelMock}
        snapshotNodes={null}
        nodes={mockNodes}
        edges={mockEdges}
      />
    );
    
    // Initially, JSON details should not be visible
    expect(screen.queryByText(/"id": "cmd-1"/)).not.toBeInTheDocument();
    
    // Find and click the first "Show JSON" button
    const showJsonButtons = screen.getAllByText('Show JSON');
    fireEvent.click(showJsonButtons[0]);
    
    // Now JSON details should be visible
    expect(screen.getByText(/"id": "cmd-1"/)).toBeInTheDocument();
    expect(screen.getByText(/"label": "Test Command"/)).toBeInTheDocument();
    
    // Click again to hide JSON details
    const hideJsonButton = screen.getByText('Hide JSON');
    fireEvent.click(hideJsonButton);
    
    // JSON details should be hidden again
    expect(screen.queryByText(/"id": "cmd-1"/)).not.toBeInTheDocument();
  });

  it('prevents time travel when clicking JSON toggle button', () => {
    const onTimeTravelMock = vi.fn();
    
    render(
      <HistoryPanel
        events={mockEvents}
        currentEventIndex={0}
        onTimeTravel={onTimeTravelMock}
        snapshotNodes={null}
        nodes={mockNodes}
        edges={mockEdges}
      />
    );
    
    // Find and click the first "Show JSON" button
    const showJsonButtons = screen.getAllByText('Show JSON');
    fireEvent.click(showJsonButtons[0]);
    
    // The onTimeTravel should not be called
    expect(onTimeTravelMock).not.toHaveBeenCalled();
  });
});
