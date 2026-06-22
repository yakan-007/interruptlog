import { describe, expect, it } from 'vitest';
import { toDateTimeLocalValue } from './lib/datetime';
import { fmtDurationShort } from './lib/formatters';

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
});
