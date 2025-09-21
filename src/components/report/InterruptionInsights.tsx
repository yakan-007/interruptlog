'use client';

import InterruptTimeline from '@/components/InterruptTimeline';
import { InterruptionStats, formatDurationCompact } from '@/lib/reportUtils';
import { Event } from '@/types';

interface InterruptionInsightsProps {
  stats: InterruptionStats;
  eventsForSelectedDate: Event[];
  selectedDateKey: string;
}

const EmptyState = () => (
  <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
    割り込みの記録がありません。
  </div>
);

export default function InterruptionInsights({ stats, eventsForSelectedDate, selectedDateKey }: InterruptionInsightsProps) {
  const showTimeline = eventsForSelectedDate.some(event => event.type === 'interrupt');

  return (
    <div className="w-full space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">割り込みインサイト</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">最も影響の大きかった発信元や種類を表示します</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">合計</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {formatDurationCompact(stats.totalDuration)} / {stats.totalCount}件
            </p>
          </div>
        </div>

        {stats.totalCount === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">トップ発信者</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-200">
                {stats.topContributors.map(item => (
                  <li key={item.label} className="flex items-center justify-between">
                    <span className="truncate">{item.label}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDurationCompact(item.totalDuration)} / {item.count}件
                    </span>
                  </li>
                ))}
                {stats.topContributors.length === 0 && <li className="text-xs text-gray-500">データがありません</li>}
              </ul>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">トップ種類</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-200">
                {stats.topTypes.map(item => (
                  <li key={item.label} className="flex items-center justify-between">
                    <span className="truncate">{item.label}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDurationCompact(item.totalDuration)} / {item.count}件
                    </span>
                  </li>
                ))}
                {stats.topTypes.length === 0 && <li className="text-xs text-gray-500">データがありません</li>}
              </ul>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">その他の指標</h4>
              <dl className="mt-3 space-y-3 text-sm text-gray-700 dark:text-gray-200">
                <div className="flex items-center justify-between">
                  <dt>平均対応時間</dt>
                  <dd className="text-xs text-gray-500 dark:text-gray-400">{formatDurationCompact(stats.averageDuration)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>ピーク時間帯</dt>
                  <dd className="text-xs text-gray-500 dark:text-gray-400">{stats.peakHourLabel ?? '—'}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>

      {showTimeline && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">時間帯別の割り込みタイムライン</h3>
          <InterruptTimeline events={eventsForSelectedDate} targetDate={selectedDateKey} />
        </div>
      )}
    </div>
  );
}
