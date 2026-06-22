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

    expect(await screen.findByText('セッションを停止')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '停止のみ' }));

    await waitFor(() => {
      expect(screen.queryByText('セッションを停止')).toBeNull();
    });
  });

  it('records an interruption and resumes the running task without render errors', async () => {
    const user = userEvent.setup();
    await startTaskFromFreshApp(user);

    await user.click(screen.getByRole('button', { name: 'interrupt' }));

    expect(await screen.findByText('割り込み記録')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '保存して再開' }));

    await waitFor(() => {
      expect(screen.queryByText('割り込み記録')).toBeNull();
      expect(screen.getAllByRole('button', { name: '停止' }).length).toBeGreaterThan(0);
    });
  });

  it.each([
    ['interrupt', '割り込み記録'],
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
    expect(await screen.findByRole('heading', { name: 'イベント履歴' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '押し忘れ' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'レポート' }));
    expect(await screen.findByRole('heading', { name: '振り返り' })).toBeTruthy();
    expect(screen.getAllByText('集中時間').length).toBeGreaterThan(0);
    expect(screen.getByText('タスクとの関わり')).toBeTruthy();
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

    await user.click(await screen.findByRole('button', { name: 'レポート' }));
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
