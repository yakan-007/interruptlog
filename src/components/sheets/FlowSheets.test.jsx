import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createEmptyState } from '../../state';
import RepairOverlapsSheet from './RepairOverlapsSheet';
import ResolveEventSheet from './ResolveEventSheet';
import ResumeOrStopSheet from './ResumeOrStopSheet';
import WorkdayEndSheet from './WorkdayEndSheet';

afterEach(() => cleanup());

const start = Date.parse('2026-06-24T09:00:00+09:00');
const before = { id: 'before', type: 'task', label: '重複した作業', start, end: start + 60 * 60 * 1000 };
const after = { ...before, id: 'after', start: start + 30 * 60 * 1000 };
const preview = {
  candidate: { id: 'candidate', type: 'interrupt', label: '電話対応', start, end: start + 30 * 60 * 1000 },
  conflicts: [before],
  changes: [
    { sourceEventId: 'before', action: 'trim-start', before, after },
    { sourceEventId: 'add', action: 'insert', before: null, after: [{ ...after, id: 'split-1' }, { ...after, id: 'split-2' }] },
    { sourceEventId: 'remove', action: 'remove', before, after: null },
  ],
};

function taskState() {
  const state = createEmptyState();
  state.preferences.onboardingDone = true;
  state.tasks = [{
    id: 'task-1', name: '元のタスク', memo: '', isCompleted: false, order: 0,
    categoryId: 'cat-dev', sourceTaskId: null, interruptOriginId: null,
    planning: { plannedDurationMinutes: 0, dueAt: null }, createdAt: start, completedAt: null,
  }];
  return state;
}

describe('personal workflow sheets', () => {
  it('shows overlap changes, renders split previews, and confirms repair', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const onDefer = vi.fn();
    render(<RepairOverlapsSheet preview={preview} onApply={onApply} onDefer={onDefer} />);

    expect(screen.getByText('開始を短縮')).toBeTruthy();
    expect(screen.getByText('削除')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '整理して適用' }));
    expect(onApply).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: '後で確認' }));
    expect(onDefer).toHaveBeenCalledTimes(1);
  });

  it('confirms a pending record resolution with a custom action label', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const resolution = { preview, confirmLabel: '記録を追加' };
    render(<ResolveEventSheet resolution={resolution} onBack={vi.fn()} onConfirm={onConfirm} />);

    expect(screen.getByText('電話対応')).toBeTruthy();
    expect(screen.getByText('上書きで削除')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '記録を追加' }));
    expect(onConfirm).toHaveBeenCalledWith(resolution);
  });

  it('offers resume only when a paused personal task remains', async () => {
    const user = userEvent.setup();
    const actions = { stopInterrupt: vi.fn() };
    const state = taskState();
    state.running = { type: 'interrupt', taskId: null, preTaskId: 'task-1', start, label: null };
    render(<ResumeOrStopSheet state={state} actions={actions} onClose={vi.fn()} />);

    expect(screen.getByRole('button', { name: /再開 → 元のタスク/ })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '終了だけ' }));
    await user.click(screen.getByRole('button', { name: /再開 → 元のタスク/ }));
    expect(actions.stopInterrupt).toHaveBeenNthCalledWith(1, false);
    expect(actions.stopInterrupt).toHaveBeenNthCalledWith(2, true);
  });

  it('sets a first work schedule, validates it, and resets a daily override', async () => {
    const user = userEvent.setup();
    const actions = { setWorkSchedule: vi.fn(), setTodayWorkdayEnd: vi.fn(), clearTodayWorkdayEnd: vi.fn() };
    const state = taskState();
    const close = vi.fn();
    render(<WorkdayEndSheet state={state} actions={actions} onClose={close} />);

    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(screen.getByText('開始時刻より後の終了時刻を設定してください')).toBeTruthy();
    await user.type(screen.getByLabelText('開始時刻'), '09:00');
    await user.type(screen.getByLabelText('終了時刻'), '17:00');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(actions.setWorkSchedule).toHaveBeenCalledWith({ start: '09:00', end: '17:00' });

    cleanup();
    const configured = taskState();
    configured.preferences.workSchedule = { start: '09:00', end: '17:00' };
    configured.workdaySchedules = { '2026-06-24': { start: '09:00', end: '18:00' } };
    render(<WorkdayEndSheet state={configured} actions={actions} onClose={close} />);
    await user.click(screen.getByRole('button', { name: '標準に戻す' }));
    expect(actions.clearTodayWorkdayEnd).toHaveBeenCalledTimes(1);
  });
});
