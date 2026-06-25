import { describe, expect, it } from 'vitest';
import { toDateTimeLocalValue } from './lib/datetime';
import { fmtDurationShort } from './lib/formatters';
import { elapsedSince, formatElapsedClock } from './lib/timer';

describe('duration helpers', () => {
  it('shows seconds for sub-minute durations', () => {
    expect(fmtDurationShort(0)).toBe('0秒');
    expect(fmtDurationShort(23_400)).toBe('23秒');
    expect(fmtDurationShort(59_600)).toBe('1m');
  });

  it('keeps the compact hour and minute format', () => {
    expect(fmtDurationShort(80 * 60_000)).toBe('1h 20m');
  });

  it('does not turn an unset timestamp into a 1970 date input value', () => {
    expect(toDateTimeLocalValue(0)).toBe('');
    expect(toDateTimeLocalValue(null)).toBe('');
  });

  it('can keep seconds for editing short history records', () => {
    const timestamp = new Date(2026, 5, 25, 9, 10, 7, 999).getTime();

    expect(toDateTimeLocalValue(timestamp)).toBe('2026-06-25T09:10');
    expect(toDateTimeLocalValue(timestamp, { includeSeconds: true })).toBe('2026-06-25T09:10:07');
  });

  it('keeps every timer elapsed value non-negative and consistently formatted', () => {
    expect(elapsedSince(2_000, 1_000)).toBe(0);
    expect(formatElapsedClock(elapsedSince(1_000, 3_500))).toBe('00:00:03');
  });
});
