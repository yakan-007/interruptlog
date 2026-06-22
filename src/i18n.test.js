import { describe, expect, it } from 'vitest';
import {
  LOCALES,
  formatDateHeader,
  formatDuration,
  formatDurationShort,
  formatRelative,
  getDuePresets,
  categoryLabel,
  interruptCategoryLabel,
  t,
  tx,
} from './i18n';

function flattenKeys(value, prefix = '') {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => flattenKeys(child, prefix ? `${prefix}.${key}` : key));
}

describe('i18n', () => {
  it('keeps ja-JP and en-US dictionary keys in sync', () => {
    const jaKeys = flattenKeys(LOCALES['ja-JP'].text).sort();
    const enKeys = flattenKeys(LOCALES['en-US'].text).sort();

    expect(enKeys).toEqual(jaKeys);
  });

  it('formats durations and relative time by locale', () => {
    const now = Date.parse('2026-06-11T10:00:00+09:00');

    expect(formatDuration(90 * 60 * 1000, 'ja-JP')).toBe('1時間30分');
    expect(formatDuration(90 * 60 * 1000, 'en-US')).toBe('1h 30m');
    expect(formatDurationShort(23_000, 'ja-JP')).toBe('23秒');
    expect(formatDurationShort(23_000, 'en-US')).toBe('23s');
    expect(formatRelative(now - 5 * 60 * 1000, 'ja-JP', now)).toBe('5分前');
    expect(formatRelative(now - 5 * 60 * 1000, 'en-US', now)).toBe('5 minutes ago');
  });

  it('formats dates and due presets by locale without changing values', () => {
    const base = new Date('2026-06-11T10:00:00+09:00');
    const schedule = { start: '09:00', end: '17:00' };
    const jaPresets = getDuePresets(base, 'ja-JP', schedule);
    const enPresets = getDuePresets(base, 'en-US', schedule);

    expect(formatDateHeader(base.getTime(), 'ja-JP', base.getTime())).toBe('今日');
    expect(formatDateHeader(base.getTime(), 'en-US', base.getTime())).toBe('Today');
    expect(jaPresets.map((item) => item.value)).toEqual(enPresets.map((item) => item.value));
    expect(jaPresets.map((item) => item.label)).toEqual(['今日の終了まで', '明日の終了まで', '今週末', 'なし']);
    expect(enPresets.map((item) => item.label)).toEqual(['By end of day', 'Tomorrow EOD', 'This Friday', 'None']);
    expect(getDuePresets(base, 'ja-JP')).toEqual([{ label: 'なし', value: null }]);
  });

  it('resolves string and computed translations', () => {
    expect(t('en-US', 'team.focusWindow')).toBe('Focus window');
    expect(tx('ja-JP', 'common.rows', 3)).toBe('3行');
    expect(tx('en-US', 'team.archivePeriodMeta', { people: 2, rows: 10, interrupts: 4 })).toBe('2 people · 10 rows · 4 interruptions');
  });

  it('uses custom category names instead of overwriting them with default translations', () => {
    expect(categoryLabel('en-US', { id: 'cat-dev', name: '開発' })).toBe('Development');
    expect(interruptCategoryLabel('en-US', { id: 'int-call', name: '電話' })).toBe('Phone');
    expect(categoryLabel('en-US', { id: 'cat-dev', name: '実装' })).toBe('実装');
    expect(interruptCategoryLabel('en-US', { id: 'int-call', name: '顧客対応' })).toBe('顧客対応');
  });
});
