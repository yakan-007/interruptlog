import { describe, expect, it } from 'vitest';
import { createEmptyState } from '../../state';
import { resolveInitialCategoryId } from './pausePresentation';

describe('pause presentation', () => {
  it('resolves the active category from persisted running state and drafts', () => {
    const state = createEmptyState();
    state.running = { type: 'break', categoryId: 'break-lunch' };
    expect(resolveInitialCategoryId(state, { categoryId: 'int-call' })).toBe('break-lunch');

    state.running = { type: 'interrupt', draft: { categoryId: 'int-chat' } };
    expect(resolveInitialCategoryId(state)).toBe('int-chat');
  });
});
