'use client';

import { useMemo } from 'react';
import { SummaryMetrics, InterruptionStats } from '@/lib/reportUtils';
import { CompletedTaskSummary } from './types';

interface ManagementSummaryProps {
  dateLabel: string;
  summaryMetrics: SummaryMetrics;
  totalFocusMinutes: number;
  totalInterruptMinutes: number;
  breakMinutes: number;
  interruptionStats: InterruptionStats;
  highlights: string[];
  completedTasks: CompletedTaskSummary[];
}

export default function ManagementSummary({
  dateLabel,
  summaryMetrics,
  totalFocusMinutes,
  totalInterruptMinutes,
  breakMinutes,
  interruptionStats,
  highlights,
  completedTasks,
}: ManagementSummaryProps) {
  const generatedAtLabel = useMemo(() => formatGeneratedAtLabel(), []);

  const focusItem = summaryMetrics.items.find(item => item.key === 'task');
  const interruptItem = summaryMetrics.items.find(item => item.key === 'interrupt');
  const breakItem = summaryMetrics.items.find(item => item.key === 'break');

  const topCompletedTasks = completedTasks.slice(0, 3);
  const topContributor = interruptionStats.topContributors[0];

  const managementNotes = buildManagementNotes({
    highlights,
    topCompletedTasks,
    topContributor,
    interruptionCount: interruptionStats.totalCount,
  });

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900 print:border-gray-400 print:bg-white print:shadow-none">
      <header className="flex flex-col gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          MANAGEMENT SNAPSHOT
        </p>
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{dateLabel}の報告サマリー</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              上司・チーム向けに重要な指標を一枚で把握できます。
            </p>
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500">作成時点: {generatedAtLabel}</p>
        </div>
      </header>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="集中時間"
          value={formatMinutes(totalFocusMinutes)}
          detail={`前日比 ${formatDelta(focusItem?.deltaDuration ?? 0)}`}
        />
        <MetricCard
          title="完了タスク"
          value={`${completedTasks.length}件`}
          detail={
            topCompletedTasks.length > 0
              ? `${topCompletedTasks.map(task => task.name).join(' / ')}`
              : '主要タスクなし'
          }
        />
        <MetricCard
          title="割り込み対応"
          value={`${interruptionStats.totalCount}件`}
          detail={`前日比 ${formatDelta(interruptItem?.deltaDuration ?? 0)} / 合計 ${formatMinutes(totalInterruptMinutes)}${
            topContributor ? ` / 最多: ${topContributor.label}` : ''
          }`}
        />
        <MetricCard
          title="休憩"
          value={formatMinutes(breakMinutes)}
          detail={`前日比 ${formatDelta(breakItem?.deltaDuration ?? 0)}`}
        />
      </dl>

      {managementNotes.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">トピック</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
            {managementNotes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  if (rounded <= 0) return '0分';
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}時間${mins}分`;
  }
  if (hours > 0) {
    return `${hours}時間`;
  }
  return `${mins}分`;
}

function formatDelta(deltaMs: number): string {
  const minutes = Math.round(deltaMs / 60000);
  if (minutes === 0) return '±0分';
  return minutes > 0 ? `+${minutes}分` : `${minutes}分`;
}

function formatGeneratedAtLabel(): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

function buildManagementNotes({
  highlights,
  topCompletedTasks,
  topContributor,
  interruptionCount,
}: {
  highlights: string[];
  topCompletedTasks: CompletedTaskSummary[];
  topContributor: InterruptionStats['topContributors'][number] | undefined;
  interruptionCount: number;
}): string[] {
  const notes: string[] = [];

  if (topCompletedTasks.length > 0) {
    const taskLine = topCompletedTasks
      .map(task => `${task.name}（${formatMinutes(task.totalTimeMs / 60000)}）`)
      .join(' / ');
    notes.push(`主要タスク: ${taskLine}`);
  }

  if (interruptionCount > 0 && topContributor) {
    notes.push(`割り込み最多: ${topContributor.label}（${topContributor.count}件）`);
  }

  highlights.slice(0, 3).forEach(item => {
    if (!notes.includes(item)) {
      notes.push(item);
    }
  });

  return notes.slice(0, 5);
}

function MetricCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50 print:border-gray-300 print:bg-white">
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</dt>
      <dd className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">{value}</dd>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{detail}</p>
    </div>
  );
}
