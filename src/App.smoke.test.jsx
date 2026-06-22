import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { STATE_KEY } from './constants';
import { createEmptyState } from './state';

describe('App smoke flow', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(window, 'print', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:interruptlog-export'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: vi.fn(() => true),
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback();
      return 0;
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('onboards, starts a task, and stops it without render errors', async () => {
    const user = userEvent.setup();
    await startTaskFromFreshApp(user);

    await user.click(screen.getAllByRole('button', { name: '停止' })[0]);

    expect(await screen.findByText('作業を停止')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '停止のみ' }));

    await waitFor(() => {
      expect(screen.queryByText('作業を停止')).toBeNull();
    });
  });

  it('records an interruption and resumes the running task without render errors', async () => {
    const user = userEvent.setup();
    await startTaskFromFreshApp(user);

    await user.click(screen.getByRole('button', { name: 'interrupt' }));

    expect(await screen.findByText('割り込み作業を記録')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '保存して再開' }));

    await waitFor(() => {
      expect(screen.queryByText('割り込み作業を記録')).toBeNull();
      expect(screen.getAllByRole('button', { name: '停止' }).length).toBeGreaterThan(0);
    });
  });

  it.each([
    ['interrupt', '割り込み作業を記録', 'interrupt'],
    ['break', '休憩記録', 'break'],
  ])('saves a %s and ends the running timer', async (pauseButton, sheetTitle, eventType) => {
    const user = userEvent.setup();
    await startTaskFromFreshApp(user);

    await user.click(screen.getByRole('button', { name: pauseButton }));
    expect(await screen.findByText(sheetTitle)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '保存して終了' }));

    await waitFor(() => {
      expect(screen.queryByText(sheetTitle)).toBeNull();
      expect(screen.queryAllByRole('button', { name: '停止' }).length).toBe(0);
      const saved = JSON.parse(localStorage.getItem(STATE_KEY));
      expect(saved.running).toBeNull();
      expect(saved.events.at(-1)?.type).toBe(eventType);
      expect(Number.isFinite(saved.events.at(-1)?.end)).toBe(true);
    });
  });

  it('stops and completes a task from the confirmation sheet', async () => {
    const user = userEvent.setup();
    await startTaskFromFreshApp(user);

    await user.click(screen.getAllByRole('button', { name: '停止' })[0]);
    expect(await screen.findByText('作業を停止')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '停止して完了' }));

    await waitFor(() => {
      expect(screen.queryByText('作業を停止')).toBeNull();
      expect(screen.getByText('今日完了')).toBeTruthy();
      const saved = JSON.parse(localStorage.getItem(STATE_KEY));
      expect(saved.running).toBeNull();
      expect(saved.tasks[0]?.isCompleted).toBe(true);
    });
  });

  it('turns an interruption into a follow-up task and returns to the paused task', async () => {
    const user = userEvent.setup();
    await startTaskFromFreshApp(user);

    await user.click(screen.getByRole('button', { name: 'interrupt' }));
    await user.type(screen.getByPlaceholderText('または自由記入'), '仕様確認');
    await user.click(screen.getByRole('button', { name: 'この件をタスクにする' }));

    expect(await screen.findByText('この件をタスクにする')).toBeTruthy();
    const taskName = screen.getAllByRole('textbox', { name: 'タスク名' }).at(-1);
    await user.clear(taskName);
    await user.type(taskName, '仕様を調査する');
    await user.click(screen.getByRole('button', { name: '作成して戻る' }));

    await waitFor(() => {
      expect(screen.queryByText('この件をタスクにする')).toBeNull();
      expect(screen.getByText('仕様を調査する')).toBeTruthy();
      expect(screen.getAllByText('割り込みから発生').length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: '停止' }).length).toBeGreaterThan(0);
    });
  });

  it('returns from follow-up task entry without saving the interruption', async () => {
    const user = userEvent.setup();
    await startTaskFromFreshApp(user);

    await user.click(screen.getByRole('button', { name: 'interrupt' }));
    await user.type(screen.getByPlaceholderText('または自由記入'), '仕様確認');
    await user.click(screen.getByRole('button', { name: 'この件をタスクにする' }));
    expect(await screen.findByText('この件をタスクにする')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '戻る' }));
    expect(await screen.findByText('割り込み作業を記録')).toBeTruthy();
    expect(screen.getByDisplayValue('仕様確認')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'キャンセル' }));

    await waitFor(() => {
      expect(screen.queryByText('割り込み作業を記録')).toBeNull();
      expect(screen.getAllByRole('button', { name: '停止' }).length).toBeGreaterThan(0);
      const saved = JSON.parse(localStorage.getItem(STATE_KEY));
      expect(saved.events.some((event) => event.type === 'interrupt')).toBe(false);
    });
  });

  it.each([
    ['interrupt', '割り込み作業を記録'],
    ['break', '休憩記録'],
  ])('closing a %s sheet discards the pause and resumes the task', async (pauseButton, sheetTitle) => {
    const user = userEvent.setup();
    await startTaskFromFreshApp(user);

    await user.click(screen.getByRole('button', { name: pauseButton }));
    expect(await screen.findByText(sheetTitle)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '閉じる' }));

    await waitFor(() => {
      expect(screen.queryByText(sheetTitle)).toBeNull();
      expect(screen.getAllByRole('button', { name: '停止' }).length).toBeGreaterThan(0);
      const saved = JSON.parse(localStorage.getItem(STATE_KEY));
      expect(saved.running?.type).toBe('task');
      expect(Number.isFinite(saved.running?.start)).toBe(true);
    });
  });

  it('opens running task details from the bottom timer', async () => {
    const user = userEvent.setup();
    await startTaskFromFreshApp(user);

    await user.click(screen.getByRole('button', { name: 'タスクを編集' }));

    expect(await screen.findByText('タスクを編集')).toBeTruthy();
    expect(screen.getByLabelText('メモ')).toBeTruthy();
  });

  it('renders history, report, and settings after a basic personal workflow', async () => {
    const user = userEvent.setup();
    await startTaskFromFreshApp(user);

    await user.click(screen.getByRole('button', { name: '履歴' }));
    expect(await screen.findByRole('heading', { name: '記録履歴' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '押し忘れ' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '振り返り' }));
    expect(await screen.findByRole('heading', { name: '振り返り' })).toBeTruthy();
    expect(screen.getAllByText('タスク作業時間').length).toBeGreaterThan(0);
    expect(screen.getByText('タスクごとの作業')).toBeTruthy();
    expect(screen.getByText('この日の記録')).toBeTruthy();
    expect(screen.getByRole('button', { name: '詳細分析を表示' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '日報出力' })).toBeTruthy();
    expect(screen.getByText('日報')).toBeTruthy();
    expect(screen.queryByText('時間帯別の割り込み')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'CSV保存' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'CSV エクスポート' })).toBeNull();
    expect(screen.queryByText('チーム')).toBeNull();
    await user.click(screen.getByRole('button', { name: '日報出力' }));
    expect(window.print).toHaveBeenCalledTimes(1);
    let downloadedAnchor = null;
    const appendChild = document.body.appendChild.bind(document.body);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node instanceof HTMLAnchorElement) downloadedAnchor = node;
      return appendChild(node);
    });
    await user.click(screen.getByRole('button', { name: 'CSV保存' }));
    await waitFor(() => {
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    });
    expect(navigator.share).not.toHaveBeenCalled();
    expect(downloadedAnchor?.download).toMatch(/^interruptlog-report-day-\d{4}-\d{2}-\d{2}\.csv$/);
    await user.click(screen.getByRole('button', { name: '週' }));
    expect(screen.queryByRole('button', { name: '日報出力' })).toBeNull();

    await user.click(screen.getByRole('button', { name: '設定' }));
    expect(await screen.findByRole('heading', { name: '設定' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: '言語' })).toBeTruthy();
    expect(screen.queryByText('チーム運用')).toBeNull();
    expect(screen.queryByText('チーム運用を使う')).toBeNull();
  });

  it('shows workday due shortcuts only after a standard work schedule is configured', async () => {
    const user = userEvent.setup();
    localStorage.setItem(STATE_KEY, JSON.stringify({
      ...createEmptyState(),
      preferences: {
        ...createEmptyState().preferences,
        onboardingDone: true,
        workSchedule: { start: '00:00', end: '23:59' },
      },
    }));

    render(<App />);
    await user.click(await screen.findByRole('button', { name: '詳細を開く' }));

    expect(await screen.findByText('今日の終了まで')).toBeTruthy();
    expect(screen.getByText('明日の終了まで')).toBeTruthy();
    expect(screen.getByText('今週末')).toBeTruthy();
    expect(screen.getByText('見積時間')).toBeTruthy();
  });

  it('makes no work hours an explicit setting and clears a configured schedule', async () => {
    const user = userEvent.setup();
    localStorage.setItem(STATE_KEY, JSON.stringify({
      ...createEmptyState(),
      preferences: {
        ...createEmptyState().preferences,
        onboardingDone: true,
        workSchedule: { start: '09:00', end: '17:00' },
      },
    }));

    render(<App />);
    await user.click(await screen.findByRole('button', { name: '設定' }));

    expect(screen.getByRole('button', { name: '基本の作業時間' }).className).toContain('on');
    expect(screen.getByLabelText('開始時刻')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '基本の作業時間' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '基本の作業時間' }).className).not.toContain('on');
      expect(screen.queryByLabelText('開始時刻')).toBeNull();
      expect(JSON.parse(localStorage.getItem(STATE_KEY)).preferences.workSchedule).toEqual({ start: null, end: null });
    });

    await user.click(screen.getByRole('button', { name: '基本の作業時間' }));
    expect(await screen.findByLabelText('開始時刻')).toBeTruthy();
  });

  it('keeps release screens personal even when old team preferences exist', async () => {
    const user = userEvent.setup();
    localStorage.setItem(STATE_KEY, JSON.stringify({
      ...createEmptyState(),
      preferences: {
        ...createEmptyState().preferences,
        onboardingDone: true,
        teamModeEnabled: true,
        memberName: '',
      },
    }));

    render(<App />);

    await user.click(await screen.findByRole('button', { name: '振り返り' }));
    expect(await screen.findByRole('heading', { name: '振り返り' })).toBeTruthy();
    expect(screen.queryByText('チーム')).toBeNull();
    expect(screen.queryByText('表示名が未設定です')).toBeNull();

    await user.click(screen.getByRole('button', { name: '設定' }));
    expect(await screen.findByRole('heading', { name: '設定' })).toBeTruthy();
    expect(screen.queryByText('チーム運用')).toBeNull();
    expect(screen.queryByText('チーム運用を使う')).toBeNull();
  });

  it('adds a missed personal event with a memo from history', async () => {
    const user = userEvent.setup();
    const view = await onboardFreshApp(user);

    expect(screen.queryByRole('button', { name: '押し忘れを記録' })).toBeNull();

    await user.click(screen.getByRole('button', { name: '履歴' }));
    await user.click(await screen.findByRole('button', { name: '押し忘れ' }));

    await user.type(await screen.findByPlaceholderText('何をしていたか'), 'あとから記録する作業');
    const timeInputs = view.container.querySelectorAll('.il-hourinput-row input');
    await replaceInputValue(user, timeInputs[0], '09');
    await replaceInputValue(user, timeInputs[1], '00');
    await replaceInputValue(user, timeInputs[2], '09');
    await replaceInputValue(user, timeInputs[3], '20');
    await user.type(screen.getByLabelText('メモ'), 'あとで見返す個人メモ');
    await user.click(screen.getByRole('button', { name: '追加' }));

    await waitFor(() => {
      expect(screen.queryByText('過去のイベントを追加')).toBeNull();
    });
    expect(screen.getByText('あとから記録する作業')).toBeTruthy();
    expect(screen.getByText('あとで見返す個人メモ')).toBeTruthy();
  });

  it('adds missed time to the selected history day instead of today', async () => {
    const user = userEvent.setup();
    const view = await onboardFreshApp(user);

    await user.click(screen.getByRole('button', { name: '履歴' }));
    await user.click(await screen.findByRole('button', { name: '前日へ' }));
    await user.click(await screen.findByRole('button', { name: '押し忘れを記録' }));

    await user.type(await screen.findByPlaceholderText('何をしていたか'), '昨日の作業');
    const timeInputs = view.container.querySelectorAll('.il-hourinput-row input');
    await replaceInputValue(user, timeInputs[0], '09');
    await replaceInputValue(user, timeInputs[1], '00');
    await replaceInputValue(user, timeInputs[2], '09');
    await replaceInputValue(user, timeInputs[3], '20');
    await user.click(screen.getByRole('button', { name: '追加' }));

    await waitFor(() => {
      expect(screen.queryByText('過去のイベントを追加')).toBeNull();
    });
    expect(screen.getByText('昨日の作業')).toBeTruthy();
  });
});

async function startTaskFromFreshApp(user) {
  await onboardFreshApp(user);

  const taskInput = await screen.findByRole('textbox', { name: 'タスク名' });
  await user.type(taskInput, 'スモークテストタスク');
  await user.click(screen.getByRole('button', { name: '追加して開始' }));

  await waitFor(() => {
    expect(screen.getAllByText('スモークテストタスク').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: '停止' }).length).toBeGreaterThan(0);
  });
}

async function onboardFreshApp(user) {
  const view = render(<App />);
  await user.click(await screen.findByRole('button', { name: 'はじめる' }));
  return view;
}

async function replaceInputValue(user, input, value) {
  await user.clear(input);
  await user.type(input, value);
}
