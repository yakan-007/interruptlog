'use client';

import { useMemo, useState } from 'react';
import useEventsStore, { EventsState } from '@/store/useEventsStore';
import EventList from '@/components/EventList';
import CompletedTasksList from '@/components/CompletedTasksList';
import DailySummarySection from '@/components/report/DailySummarySection';
import ProgressCounters from '@/components/report/ProgressCounters';
import HighlightsSection from '@/components/report/HighlightsSection';
import TaskPlanTable from '@/components/report/TaskPlanTable';
import InterruptionSummaryCompact from '@/components/report/InterruptionSummaryCompact';
import DayTimeline from '@/components/report/DayTimeline';
import WeeklyFocusChart from '@/components/report/WeeklyFocusChart';
import {
  computeSummaryMetrics,
  computeInterruptionStats,
  filterEventsByDateKey,
  shiftDateKey,
  getDuration,
} from '@/lib/reportUtils';
import { DISPLAY_LIMITS } from '@/lib/constants';
import { useDueAlertSettings, useFeatureFlags } from '@/hooks/useStoreSelectors';
import { PlanningInsight } from '@/lib/planningInsights';
import { buildDailyReportData, buildWeeklyFocusData } from '@/lib/reportBuilder';
import { buildTimeline } from '@/lib/timelineBuilder';

const ReportPage = () => {
  const { events, myTasks, categories, isHydrated, uiSettings } = useEventsStore((state: EventsState) => ({
    events: state.events,
    myTasks: state.myTasks,
    categories: state.categories,
    isHydrated: state.isHydrated,
    uiSettings: state.uiSettings,
  }));
  const featureFlags = useFeatureFlags();
  const dueAlertSettings = useDueAlertSettings();

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
  const interruptionStats = computeInterruptionStats(selectedDateEvents);

  const planningInsights = useMemo(() => {
    if (!featureFlags.enableTaskPlanning) return [] as PlanningInsight[];

    const map = new Map<string, PlanningInsight>();

    selectedDateEvents
      .filter(event => event.type === 'task')
      .forEach(event => {
        const key = event.meta?.myTaskId ?? event.id;
        const snapshot = event.meta?.planningSnapshot;
        const label = event.label || 'タスク';
        const current = map.get(key) ?? {
          taskName: label,
          actualMinutes: 0,
          plannedMinutes: snapshot?.plannedDurationMinutes,
          dueAt: snapshot?.dueAt,
        };

        const durationMinutes = getDuration(event) / (1000 * 60);
        current.actualMinutes += durationMinutes;

        if (snapshot?.plannedDurationMinutes) {
          current.plannedMinutes = snapshot.plannedDurationMinutes;
        }
        if (snapshot?.dueAt) {
          current.dueAt = snapshot.dueAt;
        }
        map.set(key, current);
      });

    return Array.from(map.values()).map(item => ({
      ...item,
      varianceMinutes:
        item.plannedMinutes !== undefined ? item.actualMinutes - item.plannedMinutes : undefined,
    }));
  }, [featureFlags.enableTaskPlanning, selectedDateEvents]);

  const reportData = useMemo(
    () =>
      buildDailyReportData(events, myTasks, selectedDate, planningInsights, {
        warningMinutes: dueAlertSettings.warningMinutes,
        dangerMinutes: dueAlertSettings.dangerMinutes,
      }),
    [dueAlertSettings.dangerMinutes, dueAlertSettings.warningMinutes, events, myTasks, planningInsights, selectedDate],
  );

  const timelineData = useMemo(() => buildTimeline(selectedDateEvents, categories), [selectedDateEvents, categories]);

  const weeklyTrendData = useMemo(() => buildWeeklyFocusData(events, selectedDate), [events, selectedDate]);

  const lastEvents = [...selectedDateEvents]
    .sort((a, b) => b.start - a.start)
    .slice(0, DISPLAY_LIMITS.RECENT_EVENTS);

  const completedTasksWithSelectedDateActivity = myTasks.filter(task => {
    if (!task.isCompleted) return false;
    return selectedDateEvents.some(event => event.type === 'task' && event.meta?.myTaskId === task.id);
  });

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
        <h1 className="text-2xl font-semibold">{formatDateForDisplay(selectedDate)}の報告</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          本日の作業状況とポイントをまとめています。印刷してそのまま共有できます。
        </p>
        <div className="flex justify-center gap-3">
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

      <DailySummarySection summaryMetrics={summaryMetrics} />

      {uiSettings.showCounters && (
        <ProgressCounters
          summaryMetrics={summaryMetrics}
          completedTaskCount={completedTasksWithSelectedDateActivity.length}
          interruptionCount={interruptionStats.totalCount}
        />
      )}

      <HighlightsSection highlights={reportData.highlights} />

      {uiSettings.highlightTimeline && timelineData.segments.length > 0 && (
        <DayTimeline data={timelineData} />
      )}

      <WeeklyFocusChart data={weeklyTrendData} />

      {featureFlags.enableTaskPlanning && (
        <TaskPlanTable rows={reportData.topPlannedTasks} />
      )}

      <InterruptionSummaryCompact stats={interruptionStats} />

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
