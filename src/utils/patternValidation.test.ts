import { describe, it, expect } from 'vitest';
import { isValidConnection, getConnectionPatternType, ConnectionPattern } from './patternValidation';

describe('Pattern Validation', () => {
  describe('isValidConnection', () => {
    it('should allow Trigger -> Command connections', () => {
      const sourceNode = { id: '1', type: 'trigger' };
      const targetNode = { id: '2', type: 'command' };
      
      const result = isValidConnection(sourceNode, targetNode);
      
      expect(result.valid).toBe(true);
      expect(result.message).toBe('Trigger can initiate a Command');
    });
    
    it('should allow Command -> Event connections', () => {
      const sourceNode = { id: '1', type: 'command' };
      const targetNode = { id: '2', type: 'event' };
      
      const result = isValidConnection(sourceNode, targetNode);
      
      expect(result.valid).toBe(true);
      expect(result.message).toBe('Command can produce an Event');
    });
    
    it('should not allow Trigger -> Event connections', () => {
      const sourceNode = { id: '1', type: 'trigger' };
      const targetNode = { id: '2', type: 'event' };
      
      const result = isValidConnection(sourceNode, targetNode);
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid connection');
    });
    
    it('should not allow Event -> Trigger connections', () => {
      const sourceNode = { id: '1', type: 'event' };
      const targetNode = { id: '2', type: 'trigger' };
      
      const result = isValidConnection(sourceNode, targetNode);
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid connection');
    });
    
    it('should handle null nodes', () => {
      expect(isValidConnection(null, { id: '2', type: 'command' }).valid).toBe(false);
      expect(isValidConnection({ id: '1', type: 'trigger' }, null).valid).toBe(false);
      expect(isValidConnection(null, null).valid).toBe(false);
    });
  });
  
  describe('getConnectionPatternType', () => {
    it('should identify Command Pattern connections', () => {
      // Trigger -> Command
      const pattern1 = getConnectionPatternType(
        { id: '1', type: 'trigger' },
        { id: '2', type: 'command' }
      );
      expect(pattern1).toBe(ConnectionPattern.COMMAND_PATTERN);
      
      // Command -> Event
      const pattern2 = getConnectionPatternType(
        { id: '2', type: 'command' },
        { id: '3', type: 'event' }
      );
      expect(pattern2).toBe(ConnectionPattern.COMMAND_PATTERN);
    });
    
    it('should return null for invalid connections', () => {
      // Trigger -> Event (invalid)
      const pattern = getConnectionPatternType(
        { id: '1', type: 'trigger' },
        { id: '3', type: 'event' }
      );
      expect(pattern).toBeNull();
    });
  });
});
