import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn utility', () => {
  it('merges class names correctly', () => {
    const result = cn('text-red-500', 'bg-blue-500');
    expect(result).toBe('text-red-500 bg-blue-500');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const result = cn('base-class', isActive && 'active-class');
    expect(result).toBe('base-class active-class');
  });

  it('handles false conditional classes', () => {
    const isActive = false;
    const result = cn('base-class', isActive && 'active-class');
    expect(result).toBe('base-class');
  });

  it('merges tailwind classes correctly (override)', () => {
    const result = cn('p-4', 'p-8');
    expect(result).toBe('p-8'); // p-8 should override p-4
  });

  it('handles arrays of classes', () => {
    const result = cn(['text-sm', 'font-bold'], 'text-red-500');
    expect(result).toContain('font-bold');
    expect(result).toContain('text-red-500');
  });

  it('handles undefined and null values', () => {
    const result = cn('base-class', undefined, null, 'another-class');
    expect(result).toBe('base-class another-class');
  });

  it('handles empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });
});
