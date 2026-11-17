import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { LEGACY_STATE_KEYS, STATE_KEY } from './constants';
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

  it('starts fresh and removes the legacy localStorage key', async () => {
    localStorage.setItem(LEGACY_STATE_KEYS[0], JSON.stringify({
      ...createEmptyState(),
      preferences: { ...createEmptyState().preferences, onboardingDone: true },
    }));

    render(<App />);

    expect(await screen.findByRole('button', { name: 'はじめる' })).toBeTruthy();
    expect(localStorage.getItem(LEGACY_STATE_KEYS[0])).toBeNull();
  });

  it('keeps a recovery warning visible until browser storage succeeds again', async () => {
    const user = userEvent.setup();
    render(<App />);
    const startButton = await screen.findByRole('button', { name: 'はじめる' });
    const originalSetItem = Storage.prototype.setItem;
    let shouldFail = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(...args) {
      if (!shouldFail) return originalSetItem.apply(this, args);
      throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
    });

    await user.click(startButton);

    expect(await screen.findByText('このブラウザに保存できていません')).toBeTruthy();
    expect(screen.getByRole('button', { name: '再試行' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'JSON退避' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '履歴' }));
    expect(screen.getByText('このブラウザに保存できていません')).toBeTruthy();

    shouldFail = false;
    await user.click(screen.getByRole('button', { name: '再試行' }));
    await waitFor(() => expect(screen.queryByText('このブラウザに保存できていません')).toBeNull());
  });

  it('does not overwrite malformed saved data before explicit recovery confirmation', async () => {
    const user = userEvent.setup();
    const raw = '{"events":[broken';
    localStorage.setItem(STATE_KEY, raw);

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Saved data could not be read' })).toBeTruthy();
    expect(localStorage.getItem(STATE_KEY)).toBe(raw);
    expect(screen.queryByRole('button', { name: 'はじめる' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Download original data' }));
    const recoveryFile = URL.createObjectURL.mock.calls.at(-1)?.[0];
    expect(recoveryFile?.name).toMatch(/^interruptlog-recovery-raw-\d{4}-\d{2}-\d{2}\.txt$/);
    expect(await readFileText(recoveryFile)).toBe(raw);
    expect(localStorage.getItem(STATE_KEY)).toBe(raw);

    await user.click(screen.getByRole('button', { name: 'Start with fresh data' }));
    expect(screen.getByText('Reset the saved data?')).toBeTruthy();
    expect(localStorage.getItem(STATE_KEY)).toBe(raw);

    await user.click(screen.getByRole('button', { name: 'Delete and reset' }));
    expect(await screen.findByRole('button', { name: 'はじめる' })).toBeTruthy();
    await waitFor(() => expect(localStorage.getItem(STATE_KEY)).not.toBe(raw));
  });

  it('exports the displayed past day in both CSV formats and filenames', async () => {
    const user = userEvent.setup();
    const yesterday = new Date();
    yesterday.setHours(0, 0, 0, 0);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayStart = yesterday.getTime();
    const dateKey = localDateKey(dayStart);
    const state = createEmptyState();
    state.preferences.onboardingDone = true;
    state.events = [{
      id: 'past-event',
      type: 'task',
      label: 'CSV対象の前日作業',
      start: dayStart + (10 * 60 * 60 * 1000),
      end: dayStart + (11 * 60 * 60 * 1000),
    }];
    localStorage.setItem(STATE_KEY, JSON.stringify(state));

    render(<App />);
    await user.click(await screen.findByRole('button', { name: '振り返り' }));
    await user.click(await screen.findByRole('button', { name: '前日へ' }));

    await user.click(screen.getByRole('button', { name: 'CSV保存' }));
    const reportFile = URL.createObjectURL.mock.calls.at(-1)?.[0];
    expect(reportFile?.name).toBe(`interruptlog-report-day-${dateKey}.csv`);
    expect(await readFileText(reportFile)).toContain(`${dateKey},day`);
    expect(await readFileText(reportFile)).toContain('CSV対象の前日作業');

    await user.click(screen.getByRole('button', { name: '分析CSV保存' }));
    const analysisFile = URL.createObjectURL.mock.calls.at(-1)?.[0];
    expect(analysisFile?.name).toBe(`interruptlog-analysis-day-${dateKey}.csv`);
    expect(await readFileText(analysisFile)).toContain(`${dateKey},day`);
    expect(await readFileText(analysisFile)).toContain('CSV対象の前日作業');
  });

  it('starts a categorized pause even when no task card exists', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'はじめる' }));

    await user.click(screen.getAllByRole('button', { name: '割り込みを記録' })[0]);

    expect(await screen.findByText('割り込み・休憩')).toBeTruthy();
  });

  it('records an interruption and resumes the running task without render errors', async () => {
    const user = userEvent.setup();
    await startTaskFromFreshApp(user);

    await openPauseSheet(user);

    expect(await screen.findByText('割り込み・休憩')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '保存して再開' }));

    await waitFor(() => {
      expect(screen.queryByText('割り込み・休憩')).toBeNull();
      expect(screen.getAllByRole('button', { name: '停止' }).length).toBeGreaterThan(0);
    });
  });

  it.each([
    ['interrupt', '割り込みを終える', 'チャット'],
    ['break', '休憩を終える', '休憩'],
  ])('ends a %s from the bar and goes back to the task', async (pauseKind, endLabel, savedLabel) => {
    const user = userEvent.setup();
    await startTaskFromFreshApp(user);

    await openPauseSheet(user, pauseKind);
    if (pauseKind === 'interrupt') await user.click(screen.getByRole('button', { name: 'チャット' }));
    await user.click(screen.getByRole('button', { name: '閉じる' }));
    await user.click(await screen.findByRole('button', { name: endLabel }));

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(STATE_KEY));
      expect(saved.running?.type).toBe('task');
      expect(saved.events.find((event) => event.type === pauseKind)).toMatchObject({ label: savedLabel });
    });
  });

  it('starts a split-off interruption empty instead of reusing the previous one', async () => {
    const user = userEvent.setup();
    await startTaskFromFreshApp(user);

    await openPauseSheet(user);
    await user.click(screen.getByRole('button', { name: 'チャット' }));
    await user.type(screen.getByPlaceholderText('または自由記入'), '仕様確認');
    await user.click(screen.getByRole('button', { name: 'ここで区切って休憩に入る' }));
    await user.click(await screen.findByRole('button', { name: 'ここで区切って割り込みに移る' }));

    expect(await screen.findByText('割り込み中')).toBeTruthy();
    expect(screen.queryByDisplayValue('仕様確認')).toBeNull();
    expect(screen.getByRole('button', { name: '電話', pressed: true })).toBeTruthy();
  });

  it.each([
    ['interrupt', 'interrupt'],
    ['break', 'break'],
  ])('saves a %s and ends the running timer', async (pauseKind, eventType) => {
    const user = userEvent.setup();
    await startTaskFromFreshApp(user);

    await openPauseSheet(user, pauseKind);
    expect(await screen.findByText('割り込み・休憩')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '保存して終了' }));

    await waitFor(() => {
      expect(screen.queryByText('割り込み・休憩')).toBeNull();
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

  it('discards a typed interruption on undo', async () => {
    const user = userEvent.setup();
    await startTaskFromFreshApp(user);

    await openPauseSheet(user);
    await user.type(screen.getByPlaceholderText('または自由記入'), '仕様確認');
    expect(screen.getByDisplayValue('仕様確認')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '取り消し' }));
    expect(screen.getByText(/「スモークテストタスク」の作業になります/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '取り消す' }));

    await waitFor(() => {
      expect(screen.queryByText('割り込み・休憩')).toBeNull();
      expect(screen.getAllByRole('button', { name: '停止' }).length).toBeGreaterThan(0);
      const saved = JSON.parse(localStorage.getItem(STATE_KEY));
      expect(saved.events.some((event) => event.type === 'interrupt')).toBe(false);
    });
  });

  it.each([
    ['interrupt'],
    ['break'],
  ])('minimizes a %s sheet and only discards the pause after an explicit cancel', async (pauseKind) => {
    const user = userEvent.setup();
    await startTaskFromFreshApp(user);

    await openPauseSheet(user, pauseKind);
    expect(await screen.findByText('割り込み・休憩')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '閉じる' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '閉じる' })).toBeNull();
      expect(screen.getByRole('button', { name: pauseKind === 'break' ? '休憩を終える' : '割り込みを終える' })).toBeTruthy();
      const saved = JSON.parse(localStorage.getItem(STATE_KEY));
      expect(saved.running?.type).toBe(pauseKind);
      expect(Number.isFinite(saved.running?.start)).toBe(true);
    });

    await user.click(screen.getByRole('button', { name: '割り込み・休憩' }));
    await user.click(screen.getByRole('button', { name: '取り消し' }));
    await user.click(screen.getByRole('button', { name: '取り消す' }));

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(STATE_KEY));
      expect(saved.running?.type).toBe('task');
      expect(saved.events.some((event) => event.type === pauseKind)).toBe(false);
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
    expect(await screen.findByRole('heading', { name: '履歴' })).toBeTruthy();
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
    await user.click(await screen.findByRole('textbox', { name: 'タスク名' }));
    await user.click(await screen.findByRole('button', { name: '詳細を開く' }));

    expect(await screen.findByText('明日の終了まで')).toBeTruthy();
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

  it('reassigns a history record to a prepared task from the task-name picker', async () => {
    const user = userEvent.setup();
    const start = new Date();
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(10, 0, 0, 0);
    const state = createEmptyState();
    localStorage.setItem(STATE_KEY, JSON.stringify({
      ...state,
      preferences: { ...state.preferences, onboardingDone: true, historyView: 'list' },
      tasks: [
        { id: 'wrong', name: '別タスク', isCompleted: false, order: 0, categoryId: 'cat-dev', planning: { plannedDurationMinutes: 0, dueAt: null }, createdAt: start.getTime(), completedAt: null },
        { id: 'prepared', name: '資料作成', isCompleted: false, order: 1, categoryId: 'cat-doc', planning: { plannedDurationMinutes: 0, dueAt: null }, createdAt: start.getTime(), completedAt: null },
      ],
      events: [{ id: 'wrong-record', type: 'task', taskId: 'wrong', label: '別タスク', categoryId: 'cat-dev', start: start.getTime(), end: end.getTime() }],
    }));

    render(<App />);
    await user.click(await screen.findByRole('button', { name: '履歴' }));
    await user.click(await screen.findByRole('button', { name: /別タスク/ }));
    expect(await screen.findByText('記録を編集')).toBeTruthy();

    await user.selectOptions(screen.getByRole('combobox', { name: 'タスク名' }), 'prepared');
    await user.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(STATE_KEY));
      expect(saved.events).toEqual([expect.objectContaining({ taskId: 'prepared', label: '資料作成' })]);
    });
  });

  it('adds a missed personal event with a memo from history', async () => {
    const user = userEvent.setup();
    await onboardFreshApp(user);

    expect(screen.queryByRole('button', { name: '押し忘れを記録' })).toBeNull();

    await user.click(screen.getByRole('button', { name: '履歴' }));
    await user.click(await screen.findByRole('button', { name: '押し忘れ' }));

    await user.type(await screen.findByRole('textbox', { name: 'タスク名' }), 'あとから記録する作業');
    setTimeOfDay(screen.getByLabelText('開始'), '09:00');
    setTimeOfDay(screen.getByLabelText('終了'), '09:20');
    await user.type(screen.getByLabelText('メモ'), 'あとで見返す個人メモ');
    await user.click(screen.getByRole('button', { name: '追加' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '追加' })).toBeNull();
    });
    expect(screen.getByText('あとから記録する作業')).toBeTruthy();
    expect(screen.getByText('あとで見返す個人メモ')).toBeTruthy();
    const saved = JSON.parse(localStorage.getItem(STATE_KEY));
    expect(saved.tasks).toEqual([expect.objectContaining({ name: 'あとから記録する作業', isCompleted: true })]);
    expect(saved.events).toEqual([expect.objectContaining({ taskId: saved.tasks[0].id })]);
  });

  it('adds missed time to the selected history day instead of today', async () => {
    const user = userEvent.setup();
    await onboardFreshApp(user);

    await user.click(screen.getByRole('button', { name: '履歴' }));
    await user.click(await screen.findByRole('button', { name: '前日へ' }));
    await user.click(await screen.findByRole('button', { name: '押し忘れを記録' }));

    await user.type(await screen.findByRole('textbox', { name: 'タスク名' }), '昨日の作業');
    setTimeOfDay(screen.getByLabelText('開始'), '09:00');
    setTimeOfDay(screen.getByLabelText('終了'), '09:20');
    await user.click(screen.getByRole('button', { name: '追加' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '追加' })).toBeNull();
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

async function openPauseSheet(user, kind = 'interrupt') {
  if (kind === 'break') {
    await user.click(screen.getByRole('button', { name: '休憩を始める' }));
    expect(await screen.findByRole('button', { name: 'ここで区切って割り込みに移る' })).toBeTruthy();
    return;
  }
  await user.click(screen.getAllByRole('button', { name: '割り込みを記録' })[0]);
  expect(await screen.findByText('割り込み・休憩')).toBeTruthy();
}

async function onboardFreshApp(user) {
  const view = render(<App />);
  await user.click(await screen.findByRole('button', { name: 'はじめる' }));
  return view;
}

// Keeps the date a datetime-local field already holds and sets only the time.
function setTimeOfDay(input, time) {
  fireEvent.change(input, { target: { value: `${input.value.slice(0, 11)}${time}` } });
}

function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsText(file);
  });
}

function localDateKey(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
