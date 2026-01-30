import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TemporalSovereign, isDateInWindow } from '../../services/temporalService';
import { TimeFocus } from '../../types';

describe('TemporalSovereign: Chronos Authority', () => {
  
  beforeEach(() => {
    // Lock system time to a stable point: 2024-06-15
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resolve "Logical Today" correctly when in the active year', () => {
    const today = TemporalSovereign.getLogicalToday(2024);
    expect(today.getFullYear()).toBe(2024);
    expect(today.getMonth()).toBe(5); // June
  });

  it('should resolve "Logical Today" to year-end when viewing historical context', () => {
    // When looking at 2023 in June 2024, "Today" for logic purposes is Dec 31, 2023
    const today = TemporalSovereign.getLogicalToday(2023);
    expect(today.getFullYear()).toBe(2023);
    expect(today.getMonth()).toBe(11); // December
    expect(today.getDate()).toBe(31);
  });

  describe('isDateInWindow Logic', () => {
    it('should correctly identify MTD (Month-to-Date) boundaries', () => {
        // System time is June 15
        expect(isDateInWindow('2024-06-01', TimeFocus.MTD)).toBe(true);
        expect(isDateInWindow('2024-06-15', TimeFocus.MTD)).toBe(true);
        expect(isDateInWindow('2024-06-16', TimeFocus.MTD)).toBe(false);
        expect(isDateInWindow('2024-05-31', TimeFocus.MTD)).toBe(false);
    });

    it('should handle QTD (Quarter-to-Date) spanning multiple months', () => {
        // Q2 starts April 1st
        expect(isDateInWindow('2024-04-01', TimeFocus.QTD)).toBe(true);
        expect(isDateInWindow('2024-05-15', TimeFocus.QTD)).toBe(true);
        expect(isDateInWindow('2024-03-31', TimeFocus.QTD)).toBe(false);
    });
  });
});