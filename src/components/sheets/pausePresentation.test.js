import { describe, expect, it } from 'vitest';
import { createEmptyState } from '../../state';
import { resolveInitialCategoryId } from './pausePresentation';

describe('pause presentation', () => {
  it('gives breaks no category and resolves interruptions from drafts', () => {
    const state = createEmptyState();
    state.running = { type: 'break', categoryId: 'break-lunch' };
    expect(resolveInitialCategoryId(state, { categoryId: 'int-call' })).toBe(null);

    state.running = { type: 'interrupt', draft: { categoryId: 'int-chat' } };
    expect(resolveInitialCategoryId(state)).toBe('int-chat');
    expect(resolveInitialCategoryId(state, { categoryId: 'break-rest' })).toBe('int-chat');
  });
});
