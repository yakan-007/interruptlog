'use client';

import { useMemo, useState } from 'react';
import useEventsStore, { EventsState } from '@/store/useEventsStore';
import EventList from '@/components/EventList';
import StatBar from '@/components/StatBar';
import CompletedTasksList from '@/components/CompletedTasksList';
import SummaryCards from '@/components/report/SummaryCards';
import TrendChart from '@/components/report/TrendChart';
import InterruptionInsights from '@/components/report/InterruptionInsights';
import TaskHighlights from '@/components/report/TaskHighlights';
import {
  computeSummaryMetrics,
  computeDailyTrend,
  computeInterruptionStats,
  computeTaskHighlights,
  filterEventsByDateKey,
  shiftDateKey,
  formatDuration,
} from '@/lib/reportUtils';
import { DISPLAY_LIMITS } from '@/lib/constants';

const ReportPage = () => {
  const { events, myTasks, categories, isCategoryEnabled, isHydrated } = useEventsStore((state: EventsState) => ({
    events: state.events,
    myTasks: state.myTasks,
    categories: state.categories,
    isCategoryEnabled: state.isCategoryEnabled,
    isHydrated: state.isHydrated,
  }));

  // Initialize selectedDate to today
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString().split('T')[0];
  });

  const earliestEventDate = useMemo(() => {
    if (events.length === 0) return null;
    const sortedEvents = [...events].sort((a, b) => a.start - b.start);
    const earliestDate = new Date(sortedEvents[0].start);
    earliestDate.setHours(0, 0, 0, 0);
    return earliestDate.toISOString().split('T')[0];
  }, [events]);

  if (!isHydrated) {
    return <div className="p-4 text-center">レポートデータを読み込み中...</div>;
  }

  const selectedDateEvents = filterEventsByDateKey(events, selectedDate);
  const previousDateKey = shiftDateKey(selectedDate, -1);
  const previousDateEvents = filterEventsByDateKey(events, previousDateKey);

  const summaryMetrics = computeSummaryMetrics(selectedDateEvents, previousDateEvents);
  const trendData = computeDailyTrend(events, selectedDate);
  const interruptionStats = computeInterruptionStats(selectedDateEvents);
  const taskHighlights = computeTaskHighlights(selectedDateEvents, myTasks, 4);

  const lastEvents = [...selectedDateEvents]
    .sort((a, b) => b.start - a.start)
    .slice(0, DISPLAY_LIMITS.RECENT_EVENTS);

  const completedTasksWithSelectedDateActivity = myTasks.filter(task => {
    if (!task.isCompleted) return false;
    return selectedDateEvents.some(event => event.type === 'task' && event.meta?.myTaskId === task.id);
  });

  const categoryTimeData = isCategoryEnabled
    ? categories
        .map(category => {
          const time = selectedDateEvents
            .filter(event => event.end && event.categoryId === category.id)
            .reduce((total, event) => total + (event.end! - event.start), 0);
          return {
            id: category.id,
            name: category.name,
            color: category.color,
            time,
          };
        })
        .filter(item => item.time > 0)
    : [];

  const uncategorizedTime = isCategoryEnabled
    ? selectedDateEvents
        .filter(event => event.end && !event.categoryId)
        .reduce((total, event) => total + (event.end! - event.start), 0)
    : 0;

  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date.toDateString() === today.toDateString()) {
      return '本日';
    }
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
  };

  return (
    <div className="space-y-6 p-4 pb-16">
      <header className="space-y-3 text-center">
        <h1 className="text-2xl font-semibold">{formatDateForDisplay(selectedDate)}のレポート</h1>
        <div className="flex justify-center">
          <input
            type="date"
            value={selectedDate}
            onChange={event => setSelectedDate(event.target.value)}
            min={earliestEventDate || undefined}
            max={new Date().toISOString().split('T')[0]}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        {earliestEventDate && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            データ利用可能期間: {earliestEventDate} 〜 {new Date().toISOString().split('T')[0]}
          </p>
        )}
      </header>

      <SummaryCards items={summaryMetrics.items} />

      <TrendChart data={trendData} />

      <InterruptionInsights
        stats={interruptionStats}
        eventsForSelectedDate={selectedDateEvents}
        selectedDateKey={selectedDate}
      />

      <TaskHighlights items={taskHighlights} />

      {isCategoryEnabled && (categoryTimeData.length > 0 || uncategorizedTime > 0) && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">カテゴリ別時間配分</h2>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4">
              <StatBar
                data={[
                  ...categoryTimeData.map(item => ({ name: item.name, value: item.time, fill: item.color })),
                  ...(uncategorizedTime > 0
                    ? [
                        {
                          name: '未分類',
                          value: uncategorizedTime,
                          fill: '#9CA3AF',
                        },
                      ]
                    : []),
                ]}
              />
            </div>
            <div className="space-y-2">
              {categoryTimeData.map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-gray-700 dark:text-gray-200">{item.name}</span>
                  </div>
                  <span className="text-sm font-mono text-gray-600 dark:text-gray-300">{formatDuration(item.time)}</span>
                </div>
              ))}
              {uncategorizedTime > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full bg-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-200">未分類</span>
                  </div>
                  <span className="text-sm font-mono text-gray-600 dark:text-gray-300">{formatDuration(uncategorizedTime)}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          {formatDateForDisplay(selectedDate)}に完了したタスク
          {completedTasksWithSelectedDateActivity.length > 0 && (
            <span className="ml-2 text-xs font-normal text-green-600 dark:text-green-400">
              ({completedTasksWithSelectedDateActivity.length})
            </span>
          )}
        </h2>
        <CompletedTasksList completedTasks={completedTasksWithSelectedDateActivity} events={selectedDateEvents} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          {formatDateForDisplay(selectedDate)}の最新イベント
        </h2>
        {lastEvents.length > 0 ? (
          <EventList events={lastEvents} />
        ) : (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
            観測されたイベントがありません。
          </p>
        )}
      </section>
    </div>
  );
};

export default ReportPage;
