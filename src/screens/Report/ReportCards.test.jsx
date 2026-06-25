import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  BreakdownCard,
  CategoryTimeCard,
  DailyReportPrintTemplate,
  DayActivityCard,
  HourlyInterruptsCard,
  MicroInterruptionsCard,
  SendersCard,
  TaskEngagementCard,
  TaskStatusCard,
  UrgencyBreakdownCard,
  WeekdayTrendCard,
  WorkdayCard,
} from './PersonalReportCards';

afterEach(() => cleanup());

const hour = 60 * 60 * 1000;
const day = Date.parse('2026-06-24T00:00:00+09:00');

const engagement = {
  rows: [{
    id: 'task-1',
    name: '設計レビュー',
    categoryColor: 'teal',
    rangeTime: hour,
    allTime: 2 * hour,
    sessionCount: 2,
    workDayCount: 1,
    isCompleted: false,
    plannedMs: 90 * 60 * 1000,
    estimateDiffMs: -30 * 60 * 1000,
    daily: [{ dayStart: day, durationMs: hour }],
    sessions: [
      { id: 'session-1', clippedStart: day + 9 * hour, clippedEnd: day + 9.5 * hour, durationMs: 30 * 60 * 1000, workDetail: '設計確認' },
      { id: 'session-2', clippedStart: day + 10 * hour, clippedEnd: day + 10.5 * hour, durationMs: 30 * 60 * 1000, workDetail: '' },
    ],
  }],
};

describe('personal report cards', () => {
  it('renders the overview and detailed analysis cards with personal data', () => {
    render(
      <>
        <BreakdownCard currentStats={{ focus: hour, interrupt: 30 * 60 * 1000, break: 30 * 60 * 1000 }} total={2 * hour} locale="ja-JP" />
        <WorkdayCard locale="ja-JP" workday={{
          schedule: { start: '09:00', end: '17:00' },
          inside: { task: hour, interrupt: 30 * 60 * 1000 },
          beforeStart: { task: 0, interrupt: 0 },
          afterEnd: { task: 0, interrupt: 0 },
          reactive: { total: 30 * 60 * 1000, direct: 10 * 60 * 1000, followup: 20 * 60 * 1000 },
        }} />
        <HourlyInterruptsCard hasInterruptTrend hourly={[0, 30 * 60 * 1000]} maxHourly={30 * 60 * 1000} peakHour={1} quietHour={0} locale="ja-JP" />
        <MicroInterruptionsCard locale="ja-JP" stats={{
          interruptCount: 3,
          totalMs: 50_000,
          microCount: 3,
          microTotalMs: 50_000,
          microMedianMs: 20_000,
          microCountShare: 1,
          microTimeShare: 1,
          peakHour: 10,
          peakHourCount: 3,
          chainCount: 1,
          chainRate: 1 / 3,
          returnedCount: 1,
          returnedRate: 1 / 3,
          buckets: [
            { label: '0-10s', count: 0, time: 0 },
            { label: '10-30s', count: 3, time: 50_000 },
            { label: '30s-1m', count: 0, time: 0 },
            { label: '1-5m', count: 0, time: 0 },
            { label: '5m+', count: 0, time: 0 },
          ],
        }} />
        <UrgencyBreakdownCard locale="ja-JP" maxUrgencyTime={hour} topUrgency={{ key: 'high', time: hour }} urgencyStats={[
          { key: 'low', time: 10 * 60 * 1000, count: 1, color: 'blue' },
          { key: 'med', time: 20 * 60 * 1000, count: 1, color: 'orange' },
          { key: 'high', time: hour, count: 2, color: 'red' },
        ]} />
        <WeekdayTrendCard locale="ja-JP" maxDay={hour} dayStats={[{ day: '月', focus: hour, interrupt: 30 * 60 * 1000 }]} />
        <SendersCard locale="ja-JP" maxSenderTime={hour} senders={[{ who: '田中', count: 2, time: hour }]} />
        <CategoryTimeCard locale="ja-JP" categories={[{ id: 'cat-dev', name: '開発', color: 'teal' }]} categoryList={[{ id: 'cat-dev', time: hour }]} totalCategoryTime={hour} />
        <TaskStatusCard
          completedInRange={1}
          completedTasks={[{ id: 'done', name: '完了タスク', categoryColor: 'teal', categoryName: '開発', time: hour, completedInRange: true, completedAt: day }]}
          incompleteTasks={[{ id: 'open', name: '未完了タスク', categoryColor: 'teal', categoryName: '開発', time: hour }]}
          taskRate={50}
          taskReportRows={[{ id: 'done' }]}
          uniqueTaskIds={['done', 'open']}
          locale="ja-JP"
        />
      </>,
    );

    expect(screen.getByText('時間の内訳')).toBeTruthy();
    expect(screen.getByText('基本の作業時間')).toBeTruthy();
    expect(screen.getByText('時間帯別の割り込み作業')).toBeTruthy();
    expect(screen.getByText('短時間割り込み')).toBeTruthy();
    expect(screen.getByText('緊急度別の割り込み作業')).toBeTruthy();
    expect(screen.getByText('主な発信者')).toBeTruthy();
    expect(screen.getByText('完了タスク')).toBeTruthy();
  });

  it('reveals task sessions and renders activity plus the print-only report content', async () => {
    const user = userEvent.setup();
    render(
      <>
        <TaskEngagementCard engagement={engagement} locale="ja-JP" />
        <DayActivityCard locale="ja-JP" activity={{
          touchedTasks: [{ id: 'task-1', name: '設計レビュー', categoryColor: 'teal', categoryName: '開発', time: hour }],
          interruptions: [{ id: 'int-1', label: '電話', who: '田中', categoryName: '電話', durationMs: 10 * 60 * 1000 }],
          recordOnlyWork: [{ id: 'record-1', name: 'メモ作成', categoryColor: 'teal', categoryName: '開発', time: 10 * 60 * 1000 }],
          memos: [{ id: 'memo-1', label: '設計レビュー', memo: '論点を整理した' }],
        }} />
        <DailyReportPrintTemplate locale="ja-JP" profile={{ affiliation: '開発部', name: '山田 太郎' }} report={{
          date: day,
          range: { since: day, until: day + 12 * hour },
          totals: { recorded: 2 * hour, focus: hour, interrupt: 30 * 60 * 1000, break: 30 * 60 * 1000 },
          completedTasks: [{ id: 'done', name: '完了タスク', categoryName: '開発', time: hour }],
          incompleteTasks: [{ id: 'open', name: '未完了タスク', categoryName: '開発', time: hour }],
          taskRows: engagement.rows,
          recordOnlyWork: [{ id: 'record-1', name: 'メモ作成', categoryName: '開発', time: 10 * 60 * 1000 }],
          interruptions: [{ id: 'int-1', label: '電話', who: '田中', categoryName: '電話', durationMs: 10 * 60 * 1000 }],
          memos: [{ id: 'memo-1', label: '設計レビュー', memo: '論点を整理した' }],
        }} />
      </>,
    );

    await user.click(screen.getByRole('button', { name: /設計レビュー/ }));
    expect(screen.getByText('日別作業量')).toBeTruthy();
    expect(screen.getByText('設計確認')).toBeTruthy();
    expect(screen.getAllByText('論点を整理した')).toHaveLength(2);
    expect(screen.getByLabelText('日報')).toBeTruthy();
    expect(screen.getByText('開発部 · 山田 太郎')).toBeTruthy();
  });
});
