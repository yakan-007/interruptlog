import { describe, expect, it } from 'vitest';
import { createEmptyState } from '../../state';
import { buildWorkTable, formatWorkTableTsv, WORK_TABLE_COLUMNS } from './workTable';

const at = (date, hour = 0, minute = 0) => new Date(2026, 10, date, hour, minute).getTime();

function sampleState(overrides = {}) {
  const base = createEmptyState();
  return {
    ...base,
    preferences: { ...base.preferences, locale: 'ja-JP', reportProfile: { affiliation: '開発チーム', name: '山田' } },
    tasks: [
      { id: 'quote', name: 'A社 見積書', memo: 'タスクのメモ', isCompleted: false, order: 0, categoryId: 'cat-dev', planning: { plannedDurationMinutes: 0, dueAt: null }, createdAt: at(1), completedAt: null },
    ],
    events: [
      { id: 'q1', type: 'task', taskId: 'quote', label: '旧名', categoryId: 'cat-dev', workDetail: '単価表の確認', memo: '改定あり', start: at(17, 9), end: at(17, 10, 30) },
      { id: 'i1', type: 'interrupt', label: '仕様の確認', who: '佐藤', categoryId: 'int-chat', memo: '画面遷移\tの認識違い\n要確認', start: at(17, 10, 30), end: at(17, 10, 45) },
      { id: 'r1', type: 'task', label: '問い合わせ対応', workDetail: '問い合わせ対応', categoryId: 'cat-adm', start: at(17, 11), end: at(17, 11, 20) },
      { id: 'b1', type: 'break', label: '', start: at(17, 12), end: at(17, 13) },
    ],
    ...overrides,
  };
}

describe('buildWorkTable', () => {
  it('writes one row per record in a fixed column order with Excel-friendly values', () => {
    const table = buildWorkTable(sampleState(), at(17), at(18), at(18));

    expect(table.header).toEqual(['日付', '所属', '名前', '開始', '終了', '分', '区分', 'カテゴリ', '内容', '発信者', 'メモ']);
    expect(table.header).toHaveLength(WORK_TABLE_COLUMNS.length);
    expect(table.rows).toEqual([
      ['2026/11/17', '開発チーム', '山田', '09:00', '10:30', 90, 'タスク', '開発', 'A社 見積書', '', '単価表の確認 / 改定あり'],
      ['2026/11/17', '開発チーム', '山田', '10:30', '10:45', 15, '割り込み', 'チャット', '仕様の確認', '佐藤', '画面遷移\tの認識違い\n要確認'],
      ['2026/11/17', '開発チーム', '山田', '11:00', '11:20', 20, 'タスク', '雑務', '問い合わせ対応', '', ''],
      ['2026/11/17', '開発チーム', '山田', '12:00', '13:00', 60, '休憩', '', '', '', ''],
    ]);
  });

  it('splits a record that crosses midnight into one row per day', () => {
    const state = sampleState({
      events: [{ id: 'late', type: 'task', taskId: 'quote', categoryId: 'cat-dev', start: at(17, 23, 30), end: at(18, 0, 45) }],
    });
    const rows = buildWorkTable(state, at(17), at(19), at(19)).rows;

    expect(rows.map((row) => [row[0], row[3], row[4], row[5]])).toEqual([
      ['2026/11/17', '23:30', '24:00', 30],
      ['2026/11/18', '00:00', '00:45', 45],
    ]);
  });

  it('clips to the range and counts a running record up to now', () => {
    const state = sampleState({
      events: [
        { id: 'before', type: 'task', taskId: 'quote', categoryId: 'cat-dev', start: at(16, 23), end: at(17, 1) },
        { id: 'running', type: 'task', taskId: 'quote', categoryId: 'cat-dev', start: at(17, 14), end: null },
      ],
    });
    const rows = buildWorkTable(state, at(17), at(18), at(17, 14, 25)).rows;

    expect(rows.map((row) => [row[3], row[4], row[5]])).toEqual([
      ['00:00', '01:00', 60],
      ['14:00', '14:25', 25],
    ]);
  });

  it('leaves the profile cells empty but keeps the columns when no profile is set', () => {
    const base = sampleState();
    const state = { ...base, preferences: { ...base.preferences, reportProfile: undefined } };
    const [row] = buildWorkTable(state, at(17), at(18), at(18)).rows;

    expect(row).toHaveLength(WORK_TABLE_COLUMNS.length);
    expect(row[1]).toBe('');
    expect(row[2]).toBe('');
  });
});

describe('formatWorkTableTsv', () => {
  it('puts the header first and keeps every record on one line', () => {
    const tsv = formatWorkTableTsv(buildWorkTable(sampleState(), at(17), at(18), at(18)));
    const lines = tsv.split('\n');

    expect(lines).toHaveLength(5);
    expect(lines[0]).toBe('日付\t所属\t名前\t開始\t終了\t分\t区分\tカテゴリ\t内容\t発信者\tメモ');
    expect(lines[2].split('\t')).toHaveLength(WORK_TABLE_COLUMNS.length);
    expect(lines[2]).toContain('画面遷移 の認識違い 要確認');
  });
});
