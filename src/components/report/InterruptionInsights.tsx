'use client';

import { useEffect, useMemo, useState } from 'react';
import InterruptTimeline from '@/components/InterruptTimeline';
import { InterruptionStats, formatDurationCompact } from '@/lib/reportUtils';
import { Event } from '@/types';

interface InterruptionInsightsProps {
  stats: InterruptionStats;
  eventsForSelectedDate: Event[];
  selectedDateKey: string;
  showTimeline?: boolean;
}

const EmptyState = () => (
  <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
    割り込みの記録がありません。
  </div>
);

export default function InterruptionInsights({ stats, eventsForSelectedDate, selectedDateKey, showTimeline = true }: InterruptionInsightsProps) {
  const hasTimelineData = showTimeline && eventsForSelectedDate.some(event => event.type === 'interrupt');
  const [activeContributor, setActiveContributor] = useState<string | null>(null);

  useEffect(() => {
    setActiveContributor(stats.topContributors[0]?.label ?? null);
  }, [stats.topContributors]);

  const activeContributorDetails = useMemo(
    () => stats.topContributors.find(contributor => contributor.label === activeContributor) ?? null,
    [stats.topContributors, activeContributor],
  );

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
                {stats.topContributors.map(item => {
                  const isActive = item.label === activeContributor;
                  return (
                    <li key={item.label}>
                      <button
                        type="button"
                        onClick={() => setActiveContributor(item.label)}
                        className={`flex w-full items-center justify-between rounded-md px-2 py-1 transition ${
                          isActive
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-100'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span className="truncate text-left">{item.label}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDurationCompact(item.totalDuration)} / {item.count}件
                        </span>
                      </button>
                    </li>
                  );
                })}
                {stats.topContributors.length === 0 && <li className="text-xs text-gray-500">データがありません</li>}
              </ul>
              {activeContributorDetails && activeContributorDetails.types.length > 0 && (
                <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
                  <p className="mb-2 font-semibold text-gray-700 dark:text-gray-200">{activeContributorDetails.label} の内訳</p>
                  <ul className="space-y-1">
                    {activeContributorDetails.types.map(type => (
                      <li key={type.label} className="flex items-center justify-between">
                        <span className="truncate">{type.label}</span>
                        <span>{formatDurationCompact(type.totalDuration)} / {type.count}件</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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

      {hasTimelineData && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">時間帯別の割り込みタイムライン</h3>
          <InterruptTimeline events={eventsForSelectedDate} targetDate={selectedDateKey} />
        </div>
      )}
    </div>
  );
}
