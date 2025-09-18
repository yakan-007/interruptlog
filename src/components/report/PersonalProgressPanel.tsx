'use client';

import { CompletedTaskSummary } from './types';

interface PersonalProgressPanelProps {
  dateLabel: string;
  totalFocusMinutes: number;
  focusSessionCount: number;
  averageSessionMinutes: number;
  longestSessionMinutes: number;
  focusStreakDays: number;
  completedTasks: CompletedTaskSummary[];
  progressHighlights: string[];
  dataInsights: string[];
}

export default function PersonalProgressPanel({
  dateLabel,
  totalFocusMinutes,
  focusSessionCount,
  averageSessionMinutes,
  longestSessionMinutes,
  focusStreakDays,
  completedTasks,
  progressHighlights,
  dataInsights,
}: PersonalProgressPanelProps) {
  const topTasks = completedTasks.slice(0, 5);

  return (
    <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-6 shadow-sm dark:border-blue-900/50 dark:bg-blue-900/10 print:border-gray-400 print:bg-white print:shadow-none">
      <header className="flex flex-col gap-1 border-b border-blue-100 pb-4 dark:border-blue-900/40 print:border-gray-300">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-500 dark:text-blue-300">
          PERSONAL PROGRESS
        </p>
        <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">{dateLabel}の積み上げノート</h2>
        <p className="text-sm text-blue-700 dark:text-blue-200">
          自分の頑張りを言葉で振り返れるようにまとめました。
        </p>
      </header>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ProgressMetric label="集中時間" value={formatMinutes(totalFocusMinutes)} detail={`${focusSessionCount}セッション`} />
        <ProgressMetric label="平均集中" value={formatMinutes(averageSessionMinutes)} detail="1セッションあたり" />
        <ProgressMetric label="最長集中" value={formatMinutes(longestSessionMinutes)} detail="今日のベスト" />
        <ProgressMetric label="連続稼働" value={`${focusStreakDays}日`} detail="前日からの継続" />
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">今日の積み上げメモ</h3>
          <ul className="mt-2 space-y-2 text-sm text-blue-800 dark:text-blue-100">
            {(progressHighlights.length > 0 ? progressHighlights : defaultHighlights({
              totalFocusMinutes,
              focusSessionCount,
              longestSessionMinutes,
            })).map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400 dark:bg-blue-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {topTasks.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">時間を投資したタスク</h3>
            <ul className="mt-2 space-y-2 text-sm text-blue-800 dark:text-blue-100">
              {topTasks.map(task => (
                <li key={task.id} className="flex items-center justify-between rounded-lg border border-blue-100 bg-white/70 px-3 py-2 text-blue-900 shadow-sm dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-100 print:border-gray-300 print:bg-white">
                  <div className="max-w-[70%] truncate font-medium">{task.name}</div>
                  <div className="text-xs font-mono text-blue-600 dark:text-blue-200">{formatMinutes(task.totalTimeMs / 60000)}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {dataInsights.length > 0 && (
        <div className="mt-6 border-t border-blue-100 pt-4 text-sm text-blue-800 dark:border-blue-900/40 dark:text-blue-100 print:border-gray-300">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">データからの気づき</h3>
          <ul className="mt-2 space-y-2">
            {dataInsights.slice(0, 3).map((insight, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400 dark:bg-blue-300" />
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function formatMinutes(minutes: number): string {
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}時間${mins}分`;
  }
  if (hours > 0) {
    return `${hours}時間`;
  }
  if (mins === 0) {
    return '0分';
  }
  return `${mins}分`;
}

function defaultHighlights({
  totalFocusMinutes,
  focusSessionCount,
  longestSessionMinutes,
}: {
  totalFocusMinutes: number;
  focusSessionCount: number;
  longestSessionMinutes: number;
}): string[] {
  const list: string[] = [];
  list.push(`集中時間の合計は${formatMinutes(totalFocusMinutes)}（${focusSessionCount}セッション）`);
  if (longestSessionMinutes > 0) {
    list.push(`最長集中は${formatMinutes(longestSessionMinutes)}でした`);
  }
  list.push('次の一歩を書き足して、明日の励みにしましょう。');
  return list;
}

function ProgressMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-white/70 p-4 text-blue-900 shadow-sm dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-50 print:border-gray-300 print:bg-white">
      <dt className="text-xs font-semibold uppercase tracking-wide text-blue-500 dark:text-blue-300">{label}</dt>
      <dd className="mt-2 text-2xl font-bold">{value}</dd>
      <p className="mt-1 text-xs text-blue-500 dark:text-blue-200">{detail}</p>
    </div>
  );
}
