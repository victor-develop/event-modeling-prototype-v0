import { describe, it, expect } from 'vitest';
import {
  toCamelCase,
  fromCamelCase,
  levenshteinDistance,
  stringSimilarity,
  findMostSimilarString
} from '../../utils/stringUtils';

describe('String Utilities', () => {
  describe('toCamelCase', () => {
    it('should convert space-separated words to camelCase', () => {
      expect(toCamelCase('hello world')).toBe('helloWorld');
      expect(toCamelCase('User Profile')).toBe('userProfile');
      expect(toCamelCase('Order Item List')).toBe('orderItemList');
    });

    it('should handle already camelCase strings', () => {
      expect(toCamelCase('helloWorld')).toBe('helloWorld');
      expect(toCamelCase('userProfile')).toBe('userProfile');
    });

    it('should handle empty strings', () => {
      expect(toCamelCase('')).toBe('');
    });

    it('should handle single words', () => {
      expect(toCamelCase('Hello')).toBe('hello');
      expect(toCamelCase('USER')).toBe('uSER'); // This is expected behavior of the function
    });
  });

  describe('fromCamelCase', () => {
    it('should convert camelCase to space-separated words', () => {
      expect(fromCamelCase('helloWorld')).toBe('Hello World');
      expect(fromCamelCase('userProfile')).toBe('User Profile');
      expect(fromCamelCase('orderItemList')).toBe('Order Item List');
    });

    it('should handle already space-separated words', () => {
      expect(fromCamelCase('Hello')).toBe('Hello');
    });

    it('should handle empty strings', () => {
      expect(fromCamelCase('')).toBe('');
    });

    it('should handle strings with numbers', () => {
      expect(fromCamelCase('user123Profile')).toBe('User123 Profile');
      expect(fromCamelCase('item1Price')).toBe('Item1 Price');
    });
  });

  describe('levenshteinDistance', () => {
    it('should calculate the edit distance between two strings', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
      expect(levenshteinDistance('', 'abc')).toBe(3);
      expect(levenshteinDistance('abc', '')).toBe(3);
      expect(levenshteinDistance('', '')).toBe(0);
    });
  });

  describe('stringSimilarity', () => {
    it('should calculate similarity between identical strings as 1', () => {
      expect(stringSimilarity('hello', 'hello')).toBe(1);
      expect(stringSimilarity('', '')).toBe(1);
    });

    it('should calculate similarity between completely different strings as close to 0', () => {
      expect(stringSimilarity('abc', 'xyz')).toBeLessThan(0.1);
    });

    it('should calculate similarity between similar strings', () => {
      expect(stringSimilarity('user', 'users')).toBeGreaterThan(0.7);
      expect(stringSimilarity('profile', 'profiles')).toBeGreaterThan(0.7);
    });

    it('should handle empty strings', () => {
      expect(stringSimilarity('abc', '')).toBe(0);
      expect(stringSimilarity('', 'abc')).toBe(0);
    });
  });

  describe('findMostSimilarString', () => {
    it('should find the most similar string in an array', () => {
      const candidates = ['user', 'profile', 'settings', 'dashboard'];
      
      expect(findMostSimilarString('users', candidates)?.string).toBe('user');
      expect(findMostSimilarString('profiles', candidates)?.string).toBe('profile');
      expect(findMostSimilarString('setting', candidates)?.string).toBe('settings');
    });

    it('should return null if no string meets the threshold', () => {
      const candidates = ['user', 'profile', 'settings'];
      
      expect(findMostSimilarString('completely different', candidates, 0.7)).toBeNull();
    });

    it('should respect the provided threshold', () => {
      const candidates = ['user', 'profile', 'settings'];
      
      // With a high threshold, even similar strings might not match
      expect(findMostSimilarString('users', candidates, 0.9)).toBeNull();
      
      // With a low threshold, even dissimilar strings might match
      expect(findMostSimilarString('users', candidates, 0.5)?.string).toBe('user');
    });

    it('should handle empty candidates array', () => {
      expect(findMostSimilarString('test', [])).toBeNull();
    });
  });
});
