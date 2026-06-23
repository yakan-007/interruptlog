import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createEmptyState } from '../../state';
import QuickAddCard from './QuickAddCard';

afterEach(() => cleanup());

function stateForQuickAdd(overrides = {}) {
  const state = createEmptyState();
  state.preferences = { ...state.preferences, onboardingDone: true };
  return { ...state, ...overrides };
}

describe('quick task entry', () => {
  it('creates a task with the selected category and resets the input', async () => {
    const user = userEvent.setup();
    const actions = {
      createTask: vi.fn(() => ({ ok: true })),
      createTaskAndStart: vi.fn(() => ({ ok: true })),
      openSheet: vi.fn(),
    };
    render(<QuickAddCard state={stateForQuickAdd()} actions={actions} />);

    await user.click(screen.getByRole('button', { name: 'ドキュメント' }));
    await user.type(screen.getByRole('textbox', { name: 'タスク名' }), '手順を書く');
    await user.click(screen.getByRole('button', { name: 'タスクを追加' }));

    expect(actions.createTask).toHaveBeenCalledWith(expect.objectContaining({ name: '手順を書く', categoryId: 'cat-doc' }));
    expect(screen.getByRole('textbox', { name: 'タスク名' }).value).toBe('');
  });

  it('keeps an error visible, respects pauses, and opens the detailed entry sheet', async () => {
    const user = userEvent.setup();
    const actions = {
      createTask: vi.fn(() => ({ ok: false, error: '入力を確認してください' })),
      createTaskAndStart: vi.fn(() => ({ ok: true })),
      openSheet: vi.fn(),
    };
    render(<QuickAddCard state={stateForQuickAdd({ running: { type: 'interrupt' } })} actions={actions} />);

    await user.type(screen.getByRole('textbox', { name: 'タスク名' }), '失敗する入力');
    expect(screen.getByRole('button', { name: '追加して開始' }).disabled).toBe(true);
    await user.click(screen.getByRole('button', { name: 'タスクを追加' }));
    expect(screen.getByText('入力を確認してください')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '詳細を開く' }));

    expect(actions.openSheet).toHaveBeenCalledWith('addTask', expect.objectContaining({ draft: expect.objectContaining({ name: '失敗する入力' }) }));
  });

  it('handles a wheel gesture only when the category row can scroll', () => {
    const actions = { createTask: vi.fn(), createTaskAndStart: vi.fn(), openSheet: vi.fn() };
    const { container } = render(<QuickAddCard state={stateForQuickAdd()} actions={actions} />);
    const row = container.querySelector('.il-quickdock-cats');
    Object.defineProperties(row, {
      scrollWidth: { configurable: true, value: 400 },
      clientWidth: { configurable: true, value: 200 },
      scrollLeft: { configurable: true, writable: true, value: 0 },
    });
    fireEvent.wheel(row, { deltaY: 80, cancelable: true });
    expect(row.scrollLeft).toBe(80);
  });
});
