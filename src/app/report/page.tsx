'use client';

import { useMemo, useState } from 'react';
import useEventsStore, { EventsState } from '@/store/useEventsStore';
import EventList from '@/components/EventList';
import CompletedTasksList from '@/components/CompletedTasksList';
import DailySummarySection from '@/components/report/DailySummarySection';
import ProgressCounters from '@/components/report/ProgressCounters';
import HighlightsSection from '@/components/report/HighlightsSection';
import ManagementSummary from '@/components/report/ManagementSummary';
import PersonalProgressPanel from '@/components/report/PersonalProgressPanel';
import TaskPlanTable from '@/components/report/TaskPlanTable';
import InterruptionSummaryCompact from '@/components/report/InterruptionSummaryCompact';
import DayTimeline from '@/components/report/DayTimeline';
import WeeklyFocusChart from '@/components/report/WeeklyFocusChart';
import { CompletedTaskSummary } from '@/components/report/types';
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
import { FeatureFlags, DueAlertSettings } from '@/types';

const formatMinutesNarrative = (minutes: number): string => {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return '0分';
  }
  const totalMinutes = Math.round(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}時間${mins}分`;
  }
  if (hours > 0) {
    return `${hours}時間`;
  }
  return `${Math.max(mins, 1)}分`;
};

const formatDateForDisplay = (dateString: string): string => {
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

  if (!isHydrated) {
    return <div className="p-4 text-center">レポートデータを読み込み中...</div>;
  }

  return (
    <ReportContent
      events={events}
      myTasks={myTasks}
      categories={categories}
      uiSettings={uiSettings}
      featureFlags={featureFlags}
      dueAlertSettings={dueAlertSettings}
      selectedDate={selectedDate}
      onSelectedDateChange={setSelectedDate}
    />
  );
};

interface ReportContentProps {
  events: EventsState['events'];
  myTasks: EventsState['myTasks'];
  categories: EventsState['categories'];
  uiSettings: EventsState['uiSettings'];
  featureFlags: FeatureFlags;
  dueAlertSettings: DueAlertSettings;
  selectedDate: string;
  onSelectedDateChange: (value: string) => void;
}

const ReportContent = ({
  events,
  myTasks,
  categories,
  uiSettings,
  featureFlags,
  dueAlertSettings,
  selectedDate,
  onSelectedDateChange,
}: ReportContentProps) => {
  const earliestEventDate = useMemo(() => {
    if (events.length === 0) return null;
    const sortedEvents = [...events].sort((a, b) => a.start - b.start);
    const earliestDate = new Date(sortedEvents[0].start);
    earliestDate.setHours(0, 0, 0, 0);
    return earliestDate.toISOString().split('T')[0];
  }, [events]);

  const selectedDateEvents = useMemo(
    () => filterEventsByDateKey(events, selectedDate),
    [events, selectedDate],
  );
  const previousDateKey = shiftDateKey(selectedDate, -1);
  const previousDateEvents = useMemo(
    () => filterEventsByDateKey(events, previousDateKey),
    [events, previousDateKey],
  );

  const summaryMetrics = useMemo(
    () => computeSummaryMetrics(selectedDateEvents, previousDateEvents),
    [selectedDateEvents, previousDateEvents],
  );
  const interruptionStats = useMemo(
    () => computeInterruptionStats(selectedDateEvents),
    [selectedDateEvents],
  );

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

  const timelineData = useMemo(
    () => buildTimeline(selectedDateEvents, categories),
    [selectedDateEvents, categories],
  );

  const weeklyTrendData = useMemo(
    () => buildWeeklyFocusData(events, selectedDate),
    [events, selectedDate],
  );

  const lastEvents = useMemo(
    () =>
      [...selectedDateEvents]
        .sort((a, b) => b.start - a.start)
        .slice(0, DISPLAY_LIMITS.RECENT_EVENTS),
    [selectedDateEvents],
  );

  const completedTasksWithSelectedDateActivity = useMemo(
    () =>
      myTasks.filter(task => {
        if (!task.isCompleted) return false;
        return selectedDateEvents.some(event => event.type === 'task' && event.meta?.myTaskId === task.id);
      }),
    [myTasks, selectedDateEvents],
  );

  const completedTaskSummaries = useMemo<CompletedTaskSummary[]>(() => {
    return completedTasksWithSelectedDateActivity
      .map(task => {
        const taskEvents = selectedDateEvents.filter(
          event => event.type === 'task' && event.meta?.myTaskId === task.id && event.end,
        );
        const totalTimeMs = taskEvents.reduce((sum, event) => sum + getDuration(event), 0);
        return {
          id: task.id,
          name: task.name,
          totalTimeMs,
          sessionsCount: taskEvents.length,
        };
      })
      .sort((a, b) => b.totalTimeMs - a.totalTimeMs);
  }, [completedTasksWithSelectedDateActivity, selectedDateEvents]);

  const focusSessionMetrics = useMemo(() => {
    const focusEvents = selectedDateEvents.filter(event => event.type === 'task' && event.end);

    if (focusEvents.length === 0) {
      return { focusSessionCount: 0, averageFocusMinutes: 0, longestSessionMinutes: 0 };
    }

    const durations = focusEvents.map(event => getDuration(event));
    const totalMs = durations.reduce((sum, duration) => sum + duration, 0);
    const longestMs = Math.max(...durations);

    return {
      focusSessionCount: focusEvents.length,
      averageFocusMinutes: totalMs / focusEvents.length / (1000 * 60),
      longestSessionMinutes: longestMs / (1000 * 60),
    };
  }, [selectedDateEvents]);

  const { focusSessionCount, averageFocusMinutes, longestSessionMinutes } = focusSessionMetrics;

  const focusStreakDays = useMemo(() => {
    let streak = 0;
    let counting = false;

    for (let index = weeklyTrendData.length - 1; index >= 0; index -= 1) {
      const day = weeklyTrendData[index];

      if (day.dateKey > selectedDate) {
        continue;
      }

      if (!counting) {
        if (day.dateKey !== selectedDate) {
          continue;
        }
        counting = true;
        if (day.focusMinutes <= 0) {
          return 0;
        }
        streak = 1;
        continue;
      }

      if (day.focusMinutes > 0) {
        streak += 1;
      } else {
        break;
      }
    }

    return streak;
  }, [weeklyTrendData, selectedDate]);

  const managementHighlights = useMemo(() => {
    const notes = [...reportData.highlights];
    if (interruptionStats.peakHourLabel) {
      notes.push(`割り込みのピークは${interruptionStats.peakHourLabel}です。`);
    }
    return notes;
  }, [reportData.highlights, interruptionStats.peakHourLabel]);

  const progressHighlights = useMemo(() => {
    const lines: string[] = [];
    lines.push(`集中時間: ${formatMinutesNarrative(reportData.totalFocusMinutes)}（${focusSessionCount}セッション）`);
    if (longestSessionMinutes > 0) {
      lines.push(`最長集中は${formatMinutesNarrative(longestSessionMinutes)}でした`);
    }
    if (completedTaskSummaries.length > 0) {
      const taskNames = completedTaskSummaries.slice(0, 3).map(task => task.name);
      lines.push(`完了タスク: ${taskNames.join('、')}`);
    }
    if (focusStreakDays > 1) {
      lines.push(`${focusStreakDays}日連続で積み上げ中`);
    }
    return lines;
  }, [
    reportData.totalFocusMinutes,
    focusSessionCount,
    longestSessionMinutes,
    completedTaskSummaries,
    focusStreakDays,
  ]);

  const selectedDateLabel = formatDateForDisplay(selectedDate);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-16 print:max-w-none print:p-8 print:bg-white print:text-black">
      <header className="space-y-3 text-center print:text-left">
        <h1 className="text-2xl font-semibold">{selectedDateLabel}のレポート</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          マネジメントに伝える要約と、自分の積み上げを同じページで確認できます。
        </p>
        <div className="flex justify-center gap-3 print:hidden">
          <input
            type="date"
            value={selectedDate}
            onChange={event => onSelectedDateChange(event.target.value)}
            min={earliestEventDate || undefined}
            max={new Date().toISOString().split('T')[0]}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <p className="hidden text-xs text-gray-500 dark:text-gray-400 print:block">
          印刷ビューではインタラクティブな要素を自動的に省いて整理しています。
        </p>
        {earliestEventDate && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            データ利用可能期間: {earliestEventDate} 〜 {new Date().toISOString().split('T')[0]}
          </p>
        )}
      </header>

      <ManagementSummary
        dateLabel={selectedDateLabel}
        summaryMetrics={summaryMetrics}
        totalFocusMinutes={reportData.totalFocusMinutes}
        totalInterruptMinutes={reportData.totalInterruptMinutes}
        breakMinutes={reportData.breakMinutes}
        interruptionStats={interruptionStats}
        highlights={managementHighlights}
        completedTasks={completedTaskSummaries}
      />

      <DailySummarySection summaryMetrics={summaryMetrics} />

      {uiSettings.showCounters && (
        <ProgressCounters
          summaryMetrics={summaryMetrics}
          completedTaskCount={completedTaskSummaries.length}
          interruptionCount={interruptionStats.totalCount}
        />
      )}

      <HighlightsSection highlights={reportData.highlights} />

      {uiSettings.showPersonalProgress && (
        <PersonalProgressPanel
          dateLabel={selectedDateLabel}
          totalFocusMinutes={reportData.totalFocusMinutes}
          focusSessionCount={focusSessionCount}
          averageSessionMinutes={averageFocusMinutes}
          longestSessionMinutes={longestSessionMinutes}
          focusStreakDays={focusStreakDays}
          completedTasks={completedTaskSummaries}
          progressHighlights={progressHighlights}
          dataInsights={managementHighlights}
        />
      )}

      {uiSettings.highlightTimeline && timelineData.segments.length > 0 && (
        <DayTimeline data={timelineData} />
      )}

      <WeeklyFocusChart data={weeklyTrendData} />

      {featureFlags.enableTaskPlanning && <TaskPlanTable rows={reportData.topPlannedTasks} />}

      <InterruptionSummaryCompact stats={interruptionStats} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          {selectedDateLabel}に完了したタスク
          {completedTaskSummaries.length > 0 && (
            <span className="ml-2 text-xs font-normal text-green-600 dark:text-green-400">
              ({completedTaskSummaries.length})
            </span>
          )}
        </h2>
        <CompletedTasksList tasks={completedTaskSummaries} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          {selectedDateLabel}の最新イベント
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
