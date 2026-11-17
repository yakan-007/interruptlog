import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createEmptyState } from '../../state';
import { ERROR_CODES } from '../../domain/errors';
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

    expect(screen.queryByRole('button', { name: 'ドキュメント' })).toBeNull();
    await user.type(screen.getByRole('textbox', { name: 'タスク名' }), '手順を書く');
    await user.click(screen.getByRole('button', { name: 'ドキュメント' }));
    await user.click(screen.getByRole('button', { name: 'タスクを追加' }));

    expect(actions.createTask).toHaveBeenCalledWith(expect.objectContaining({ name: '手順を書く', categoryId: 'cat-doc' }));
    expect(screen.getByRole('textbox', { name: 'タスク名' }).value).toBe('');
  });

  it('keeps an error visible, allows starting during a pause, and opens the detailed entry sheet', async () => {
    const user = userEvent.setup();
    const actions = {
      createTask: vi.fn(() => ({ ok: false, errorCode: ERROR_CODES.CHECK_INPUT })),
      createTaskAndStart: vi.fn(() => ({ ok: true })),
      openSheet: vi.fn(),
    };
    render(<QuickAddCard state={stateForQuickAdd({ running: { type: 'interrupt' } })} actions={actions} />);

    await user.type(screen.getByRole('textbox', { name: 'タスク名' }), '失敗する入力');
    expect(screen.getByRole('button', { name: '追加して開始' }).disabled).toBe(false);
    await user.click(screen.getByRole('button', { name: 'タスクを追加' }));
    expect(screen.getByText('入力を確認してください')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '詳細を開く' }));

    expect(actions.openSheet).toHaveBeenCalledWith('addTask', expect.objectContaining({ draft: expect.objectContaining({ name: '失敗する入力' }) }));
  });

  it('handles a wheel gesture only when the category row can scroll', () => {
    const actions = { createTask: vi.fn(), createTaskAndStart: vi.fn(), openSheet: vi.fn() };
    const { container } = render(<QuickAddCard state={stateForQuickAdd()} actions={actions} />);
    fireEvent.focus(screen.getByRole('textbox', { name: 'タスク名' }));
    const row = container.querySelector('.il-quickdock-cats');
    Object.defineProperties(row, {
      scrollWidth: { configurable: true, value: 400 },
      clientWidth: { configurable: true, value: 200 },
      scrollLeft: { configurable: true, writable: true, value: 0 },
    });
    fireEvent.wheel(row, { deltaY: 80, cancelable: true });
    expect(row.scrollLeft).toBe(80);
  });

  it('starts a categorized pause independently of the task draft', async () => {
    const user = userEvent.setup();
    const actions = { createTask: vi.fn(), createTaskAndStart: vi.fn(), openSheet: vi.fn() };
    render(<QuickAddCard state={stateForQuickAdd()} actions={actions} />);

    await user.click(screen.getByRole('button', { name: '割り込みを記録' }));

    expect(actions.openSheet).toHaveBeenCalledWith('newPause');
  });

  it('adds with Enter and leaves pausing to the running bar while something runs', async () => {
    const user = userEvent.setup();
    const actions = { createTask: vi.fn(() => ({ ok: true })), createTaskAndStart: vi.fn(), openSheet: vi.fn() };
    render(<QuickAddCard state={stateForQuickAdd({ running: { type: 'task' } })} actions={actions} />);

    expect(screen.queryByRole('button', { name: '割り込みを記録' })).toBeNull();
    await user.type(screen.getByRole('textbox', { name: 'タスク名' }), 'Enterで追加{Enter}');

    expect(actions.createTask).toHaveBeenCalledWith(expect.objectContaining({ name: 'Enterで追加' }));
  });

  it('offers interruption and break when idle, break during a task, and neither during a pause', async () => {
    const user = userEvent.setup();
    const actions = { createTask: vi.fn(), createTaskAndStart: vi.fn(), openSheet: vi.fn() };
    const { rerender } = render(<QuickAddCard state={stateForQuickAdd()} actions={actions} />);

    expect(screen.getByRole('button', { name: '割り込みを記録' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '休憩を始める' }));
    expect(actions.openSheet).toHaveBeenCalledWith('newPause', { kind: 'break' });

    rerender(<QuickAddCard state={stateForQuickAdd({ running: { type: 'task' } })} actions={actions} />);
    expect(screen.queryByRole('button', { name: '割り込みを記録' })).toBeNull();
    expect(screen.getByRole('button', { name: '休憩を始める' })).toBeTruthy();

    rerender(<QuickAddCard state={stateForQuickAdd({ running: { type: 'break' } })} actions={actions} />);
    expect(screen.queryByRole('button', { name: '休憩を始める' })).toBeNull();
  });

  it('hides interruption and break while a task is being written', async () => {
    const user = userEvent.setup();
    const actions = { createTask: vi.fn(), createTaskAndStart: vi.fn(), openSheet: vi.fn() };
    render(<QuickAddCard state={stateForQuickAdd()} actions={actions} />);

    expect(screen.queryByRole('button', { name: '詳細を開く' })).toBeNull();
    await user.click(screen.getByRole('textbox', { name: 'タスク名' }));

    expect(screen.queryByRole('button', { name: '割り込みを記録' })).toBeNull();
    expect(screen.queryByRole('button', { name: '休憩を始める' })).toBeNull();
    expect(screen.getByRole('button', { name: '詳細を開く' })).toBeTruthy();
  });
});
