'use client';

import type { DailyInterruptionDetailRow, DailyTaskDetailRow } from '@/app/report/utils/dayDetails';
import type { WeeklyProSummary } from '@/app/report/utils/proReports';
import { formatDurationCompact } from '@/lib/reportUtils';
import { formatDayLabel } from '@/app/report/utils/taskMetrics';
import ProGate from '@/components/ProGate';

interface ProReportSectionProps {
  granularity: 'day' | 'week';
  proAccess: boolean;
  taskDetails: DailyTaskDetailRow[];
  interruptionDetails: DailyInterruptionDetailRow[];
  weeklySummary?: WeeklyProSummary;
}

export default function ProReportSection({
  granularity,
  proAccess,
  taskDetails,
  interruptionDetails,
  weeklySummary,
}: ProReportSectionProps) {
  if (granularity === 'day') {
    const topTasks = taskDetails.slice(0, 5);
    const topInterrupts = interruptionDetails.slice(0, 5);

    return (
      <ProGate proAccess={proAccess} lockedTitle="Proランキング（タスク/割り込み）">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">タスクランキング（時間）</h3>
          {topTasks.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">対象タスクがありません。</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {topTasks.map(item => (
                <li key={item.id} className="flex items-center justify-between">
                  <span className="truncate text-slate-700 dark:text-slate-200">{item.name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDurationCompact(item.totalDurationMs)} / {item.eventCount}回
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">割り込みランキング（発信者）</h3>
          {topInterrupts.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">割り込みがありません。</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {topInterrupts.map(item => (
                <li key={item.label} className="flex items-center justify-between">
                  <span className="truncate text-slate-700 dark:text-slate-200">{item.label}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDurationCompact(item.totalDurationMs)} / {item.count}回
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      </ProGate>
    );
  }

  return (
    <ProGate proAccess={proAccess} lockedTitle="Pro週次まとめ">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">週次まとめ（Pro）</h3>
        <div className="mt-4 grid gap-3 text-sm text-slate-700 dark:text-slate-200 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <div className="text-xs text-slate-500">最も集中できた日</div>
            {weeklySummary?.topFocusDay ? (
              <div className="mt-1 font-semibold">
                {formatDayLabel(weeklySummary.topFocusDay.dateKey)} / {formatDurationCompact(weeklySummary.topFocusDay.durationMs)}
              </div>
            ) : (
              <div className="mt-1 text-xs text-slate-400">データなし</div>
            )}
          </div>
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <div className="text-xs text-slate-500">割り込みが多かった日</div>
            {weeklySummary?.mostInterruptDay ? (
              <div className="mt-1 font-semibold">
                {formatDayLabel(weeklySummary.mostInterruptDay.dateKey)} / {weeklySummary.mostInterruptDay.count}回
              </div>
            ) : (
              <div className="mt-1 text-xs text-slate-400">データなし</div>
            )}
          </div>
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <div className="text-xs text-slate-500">最長集中セッション</div>
            {weeklySummary?.longestFocus ? (
              <div className="mt-1 font-semibold">
                {weeklySummary.longestFocus.label} / {formatDurationCompact(weeklySummary.longestFocus.durationMs)}
              </div>
            ) : (
              <div className="mt-1 text-xs text-slate-400">データなし</div>
            )}
          </div>
        </div>
      </div>
    </ProGate>
  );
}
