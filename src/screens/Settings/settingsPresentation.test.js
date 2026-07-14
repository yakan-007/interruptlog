import { describe, expect, it } from 'vitest';
import { getBackupStatus } from './settingsPresentation';

describe('getBackupStatus', () => {
  const now = Date.parse('2026-07-14T09:30:00+09:00');

  it('requests a backup when none has been exported', () => {
    expect(getBackupStatus(null, 'en-US', now)).toEqual({
      due: true,
      note: 'No backup has been exported yet',
    });
  });

  it('keeps a backup fresh for less than seven elapsed days', () => {
    const status = getBackupStatus(now - 6 * 86_400_000, 'en-US', now);

    expect(status.due).toBe(false);
    expect(status.note).toMatch(/^Last backup:/);
  });

  it('marks a backup due at the seven-day boundary', () => {
    expect(getBackupStatus(now - 7 * 86_400_000, 'ja-JP', now)).toEqual({
      due: true,
      note: '前回から7日。バックアップをおすすめします',
    });
  });
});
