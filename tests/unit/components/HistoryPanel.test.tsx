import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
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
  { id: 'cmd-1', type: 'command', data: { label: 'Test Command' }, position: { x: 100, y: 100 } },
  { id: 'evt-1', type: 'event', data: { label: 'Test Event' }, position: { x: 200, y: 100 } }
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

  it('toggles JSON details when detail toggle button is clicked', () => {
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
    
    // Find and click the first detail toggle button (which has a '+' symbol)
    const showDetailsButtons = screen.getAllByTitle('Show details');
    fireEvent.click(showDetailsButtons[0]);
    
    // Now JSON details should be visible
    expect(screen.getByText(/"id": "cmd-1"/)).toBeInTheDocument();
    expect(screen.getByText(/"label": "Test Command"/)).toBeInTheDocument();
    
    // Click again to hide JSON details
    const hideDetailsButton = screen.getByTitle('Hide details');
    fireEvent.click(hideDetailsButton);
    
    // JSON details should be hidden again
    expect(screen.queryByText(/"id": "cmd-1"/)).not.toBeInTheDocument();
  });

  it('prevents time travel when clicking detail toggle button', () => {
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
    
    // Find and click the first detail toggle button (which has a '+' symbol)
    const showDetailsButtons = screen.getAllByTitle('Show details');
    fireEvent.click(showDetailsButtons[0]);
    
    // The onTimeTravel should not be called
    expect(onTimeTravelMock).not.toHaveBeenCalled();
  });
});
