import { describe, expect, it } from 'vitest';
import { createEmptyState, setWorkScheduleInState } from '../../state';
import { buildDailyReport } from './dailyReport';
import { formatDailyReportText } from './dailyReportText';

const day = (date, hour = 0, minute = 0) => new Date(2026, 10, date, hour, minute).getTime();

function task(id, name, overrides = {}) {
  return {
    id,
    name,
    memo: '',
    isCompleted: false,
    order: 0,
    categoryId: 'cat-dev',
    planning: { plannedDurationMinutes: 0, dueAt: null },
    createdAt: day(1),
    completedAt: null,
    ...overrides,
  };
}

function sampleState(locale = 'ja-JP') {
  const base = setWorkScheduleInState(createEmptyState(), { start: '09:00', end: '18:00' });
  return {
    ...base,
    preferences: { ...base.preferences, locale, reportProfile: { affiliation: '開発チーム', name: '山田' } },
    tasks: [
      task('quote', 'A社 見積書', { isCompleted: true, completedAt: day(17, 15), planning: { plannedDurationMinutes: 120, dueAt: null } }),
      task('spec', 'B案件 仕様書', { planning: { plannedDurationMinutes: 360, dueAt: day(19, 18) } }),
      task('screen', 'C 画面改修', { planning: { plannedDurationMinutes: 0, dueAt: day(16, 18) } }),
    ],
    events: [
      { id: 'q0', type: 'task', taskId: 'quote', label: 'A社 見積書', categoryId: 'cat-dev', start: day(16, 9), end: day(16, 10) },
      { id: 'q1', type: 'task', taskId: 'quote', label: 'A社 見積書', categoryId: 'cat-dev', memo: '単価表の改定で再計算', start: day(17, 9), end: day(17, 11, 10) },
      { id: 's1', type: 'task', taskId: 'spec', label: 'B案件 仕様書', categoryId: 'cat-dev', start: day(17, 13), end: day(17, 14) },
      { id: 'r1', type: 'task', label: '問い合わせ対応', workDetail: '問い合わせ対応', categoryId: 'cat-adm', start: day(17, 14), end: day(17, 14, 30) },
      { id: 'i1', type: 'interrupt', label: '仕様の確認', who: '佐藤', categoryId: 'int-chat', memo: '画面遷移の認識違い', start: day(17, 11, 10), end: day(17, 11, 45) },
      { id: 'b1', type: 'break', label: '昼食', categoryId: 'break-lunch', start: day(17, 12), end: day(17, 12, 45) },
    ],
  };
}

describe('formatDailyReportText', () => {
  it('renders a plain-text report with notes under their rows and empty sections left out', () => {
    const text = formatDailyReportText(buildDailyReport(sampleState(), day(17), day(19)), 'ja-JP');

    expect(text).toBe([
      '【日報】 2026/11/17（火） 開発チーム 山田',
      '9:00〜18:00 ／ 記録 5h 0m（タスク 3h 40m・割り込み 1件 35m・休憩 45m）',
      '',
      '■ 完了',
      '・A社 見積書（開発） 2h 10m ／ 見積 2h 0m → 実績 3h 10m（+1h 10m）',
      '　└ 単価表の改定で再計算',
      '',
      '■ 進行中',
      '・B案件 仕様書（開発） 1h 0m ／ 見積 6h 0m → 累計 1h 0m ／ 期限 11/19',
      '',
      '■ 記録のみの作業',
      '・問い合わせ対応（雑務） 30m',
      '',
      '■ 割り込み 1件 35m',
      '・佐藤 1件 35m',
      '・仕様の確認（佐藤） 35m',
      '　└ 画面遷移の認識違い',
      '',
      '■ 残っているタスク',
      '・C 画面改修（開発） ／ 期限 11/16 超過',
    ].join('\n'));
  });

  it('keeps the header and totals for a day with no records', () => {
    const state = createEmptyState();
    const text = formatDailyReportText(buildDailyReport(state, day(17), day(19)), 'ja-JP');

    expect(text).toBe([
      '【日報】 2026/11/17（火）',
      '記録 0m（タスク 0m・割り込み 0件 0m・休憩 0m）',
    ].join('\n'));
  });

  it('uses English wording and punctuation for the English locale', () => {
    const text = formatDailyReportText(buildDailyReport(sampleState('en-US'), day(17), day(19)), 'en-US');

    expect(text).toContain('【Daily report】 Tue 11/17/2026');
    expect(text).toContain('■ Completed');
    expect(text).toContain('estimate 2h 0m → actual 3h 10m (+1h 10m)');
    expect(text).toContain('due 11/16 overdue');
  });
});
