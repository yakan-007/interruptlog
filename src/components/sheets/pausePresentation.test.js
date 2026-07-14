import { describe, expect, it } from 'vitest';
import { createEmptyState } from '../../state';
import {
  getBreakTimerMeta,
  getBreakTone,
  pauseCategoryDetail,
  resolveInitialCategoryId,
  resolveInitialKind,
} from './pausePresentation';

describe('pause presentation', () => {
  it('resolves the active category from persisted running state and drafts', () => {
    const state = createEmptyState();
    state.running = { type: 'break', categoryId: 'break-lunch' };

    expect(resolveInitialCategoryId(state, { categoryId: 'int-call' })).toBe('break-lunch');
    expect(resolveInitialKind(state, 'break-lunch')).toBe('break');

    state.running = { type: 'interrupt', draft: { categoryId: 'int-chat' } };
    expect(resolveInitialCategoryId(state)).toBe('int-chat');
    expect(resolveInitialKind(state, 'int-chat')).toBe('interrupt');
  });

  it('describes break targets before and after the target time', () => {
    expect(getBreakTone(0, 0)).toBe('free');
    expect(getBreakTone(9 * 60_000, 10)).toBe('target');
    expect(getBreakTone(10 * 60_000, 10)).toBe('warn');
    expect(getBreakTone(12 * 60_000, 10)).toBe('late');
    expect(getBreakTimerMeta(9 * 60_000, 10, 'ja-JP')).toBe('目安 10分');
    expect(getBreakTimerMeta(10 * 60_000, 10, 'en-US')).toBe('Past target');
  });

  it('shows target details only for break categories', () => {
    expect(pauseCategoryDetail({ kind: 'interrupt' }, 'ja-JP')).toBe('');
    expect(pauseCategoryDetail({ kind: 'break', defaultDurationMinutes: 30 }, 'ja-JP')).toBe('目安 30分');
  });
});
