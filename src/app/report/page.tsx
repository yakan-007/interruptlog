'use client';

import { useMemo, useState } from 'react';
import useEventsStore from '@/store/useEventsStore';
import type { Granularity } from './utils/types';
import { buildRangeInfo, toDateKey } from './utils/range';
import { buildTaskRangeData, buildMonthlyTaskPoints, buildYearlyTaskPoints, buildWeeklyTaskPoints } from './utils/taskMetrics';
import { computeCategoryStats } from './utils/categoryMetrics';
import { buildWeeklyCategorySeries } from './utils/categoryTimeSeries';
import { buildTaskDailyChanges } from './utils/taskChanges';
import { buildHighlights } from './utils/highlights';
import { buildHourlyTrend, buildHeatmapData, buildWeeklyActivityPoints } from './utils/timeSeries';
import { formatRangeLabel } from './utils/formatters';
import type { HighlightMetric } from './utils/types';
import {
  computeSummaryMetrics,
  computeInterruptionStats,
  filterEventsByDateRange,
} from '@/lib/reportUtils';
import HighlightsGrid from '@/components/report/HighlightsGrid';
import {
  DayTrendChart,
  HourlyHeatmap,
  WeeklyActivityChart,
  WeeklyTaskFlowChart,
  MonthlyTaskFlowChart,
  YearlyTaskFlowChart,
  TaskAggregateSummary,
  WeeklyCategoryStackedChart,
} from '@/components/report/ReportCharts';
import InterruptionSummaryCompact from '@/components/report/InterruptionSummaryCompact';
import CategoryOverview from '@/components/report/CategoryOverview';
import TaskDailyChanges from '@/components/report/TaskDailyChanges';

const GRANULARITY_OPTIONS: Granularity[] = ['day', 'week', 'month', 'year'];

const formatRangeDescription = (granularity: Granularity) => {
  switch (granularity) {
    case 'day':
      return '今日を主役に、週・月・年をワンタップで俯瞰できるダッシュボード。';
    case 'week':
      return '1週間の稼働と割り込みを俯瞰し、ペースを評価できます。';
    case 'month':
      return '日別の新規／完了フローから未完了タスクの変動を把握します。';
    case 'year':
    default:
      return '月ごとの仕事量と未完了タスクの推移を年間でチェック。';
  }
};

const ReportPage = () => {
  const { events, taskLedger, categories, isHydrated } = useEventsStore(state => ({
    events: state.events,
    taskLedger: state.taskLedger,
    categories: state.categories,
    isHydrated: state.isHydrated,
  }));

  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));

  const [granularity, setGranularity] = useState<Granularity>('day');

  const earliestEventDate = useMemo(() => {
    if (events.length === 0) return null;
    const earliest = events.reduce((min, event) => (event.start < min ? event.start : min), events[0].start);
    return toDateKey(new Date(earliest));
  }, [events]);

  const rangeInfo = useMemo(() => buildRangeInfo(selectedDate, granularity), [selectedDate, granularity]);
  const { current: currentRange, previous: previousRange } = rangeInfo;

  const currentEvents = useMemo(
    () => filterEventsByDateRange(events, currentRange.startKey, currentRange.endKey),
    [events, currentRange.startKey, currentRange.endKey],
  );

  const previousEvents = useMemo(
    () => filterEventsByDateRange(events, previousRange.startKey, previousRange.endKey),
    [events, previousRange.startKey, previousRange.endKey],
  );

  const summaryMetrics = useMemo(
    () => computeSummaryMetrics(currentEvents, previousEvents),
    [currentEvents, previousEvents],
  );

  const interruptionStats = useMemo(() => computeInterruptionStats(currentEvents), [currentEvents]);

  const taskRangeData = useMemo(
    () => buildTaskRangeData(taskLedger, currentRange, previousRange),
    [taskLedger, currentRange, previousRange],
  );

  const highlightMetrics: HighlightMetric[] = useMemo(
    () =>
      buildHighlights({
        summaryMetrics,
        taskRanges: taskRangeData,
        granularity,
        interruptionStats,
      }),
    [summaryMetrics, taskRangeData, granularity, interruptionStats],
  );

  const categoryStats = useMemo(
    () => computeCategoryStats(taskLedger, categories, currentRange, currentEvents, taskRangeData.current),
    [taskLedger, categories, currentRange, currentEvents, taskRangeData],
  );

  const taskDailyChanges = useMemo(
    () =>
      granularity === 'day'
        ? buildTaskDailyChanges(taskLedger, categories, currentRange, events)
        : null,
    [granularity, taskLedger, categories, currentRange, events],
  );

  const hourlyTrend = useMemo(
    () => (granularity === 'day' ? buildHourlyTrend(currentEvents) : []),
    [granularity, currentEvents],
  );

  const heatmapData = useMemo(
    () => (granularity === 'day' ? buildHeatmapData(events, selectedDate) : []),
    [granularity, events, selectedDate],
  );

  const weeklyActivity = useMemo(
    () => (granularity === 'week' ? buildWeeklyActivityPoints(currentEvents, currentRange) : []),
    [granularity, currentEvents, currentRange],
  );

  const weeklyTaskFlow = useMemo(
    () => (granularity === 'week' ? buildWeeklyTaskPoints(taskRangeData.current.daily) : []),
    [granularity, taskRangeData],
  );

  const weeklyCategorySeries = useMemo(
    () => (granularity === 'week' ? buildWeeklyCategorySeries(events, taskLedger, categories, currentRange) : null),
    [granularity, events, taskLedger, categories, currentRange],
  );

  const monthlyTaskFlow = useMemo(
    () => (granularity === 'month' ? buildMonthlyTaskPoints(taskRangeData.current.daily) : []),
    [granularity, taskRangeData],
  );

  const yearlyTaskFlow = useMemo(
    () =>
      granularity === 'year'
        ? buildYearlyTaskPoints(taskRangeData.current, currentRange.start.getFullYear())
        : [],
    [granularity, taskRangeData, currentRange.start],
  );

  const rangeLabel = useMemo(() => formatRangeLabel(selectedDate, granularity), [selectedDate, granularity]);

  if (!isHydrated) {
    return <div className="p-4 text-center">レポートデータを読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-50 px-4 pb-16 pt-10 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 print:bg-white print:px-0 print:pb-0 print:pt-0">
      <div className="mx-auto max-w-6xl space-y-8 print:max-w-none">
        <header className="rounded-3xl border border-white/60 bg-white/80 px-6 py-8 shadow-lg shadow-rose-100/40 backdrop-blur-sm transition-colors dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none print:border-0 print:bg-white print:p-0 print:shadow-none">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-600 dark:bg-rose-500/20 dark:text-rose-200 print:hidden">
                Activity Studio Report
              </span>
              <div className="space-y-1">
                <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{rangeLabel}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">{formatRangeDescription(granularity)}</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 md:items-end">
              <div className="flex flex-wrap items-center gap-3 print:hidden">
                <div className="inline-flex rounded-full bg-white/80 p-1 shadow-sm ring-1 ring-rose-100 dark:bg-slate-800 dark:ring-slate-700">
                  {GRANULARITY_OPTIONS.map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setGranularity(option)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                        granularity === option
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-200/60 dark:bg-rose-500'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {option === 'day' && '今日'}
                      {option === 'week' && '週'}
                      {option === 'month' && '月'}
                      {option === 'year' && '年'}
                    </button>
                  ))}
                </div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={event => setSelectedDate(event.target.value)}
                  min={earliestEventDate || undefined}
                  max={new Date().toISOString().split('T')[0]}
                  className="rounded-lg border border-transparent bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm ring-1 ring-rose-100 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-300 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
                />
              </div>
              {earliestEventDate && (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  データ利用可能期間: {earliestEventDate} 〜 {new Date().toISOString().split('T')[0]}
                </p>
              )}
            </div>
          </div>
        </header>

        <HighlightsGrid metrics={highlightMetrics} />

        {granularity === 'day' && (
          <div className="space-y-6">
            <DayTrendChart data={hourlyTrend} />
            <HourlyHeatmap data={heatmapData} />
            {taskDailyChanges && (
              <TaskDailyChanges
                created={taskDailyChanges.created}
                completed={taskDailyChanges.completed}
                label={rangeLabel}
              />
            )}
          </div>
        )}

        {granularity === 'week' && (
          <div className="space-y-6">
            <WeeklyActivityChart data={weeklyActivity} />
            <WeeklyTaskFlowChart data={weeklyTaskFlow} />
            {weeklyCategorySeries && <WeeklyCategoryStackedChart series={weeklyCategorySeries} />}
          </div>
        )}

        {granularity === 'month' && (
          <div className="space-y-6">
            <MonthlyTaskFlowChart data={monthlyTaskFlow} />
            <TaskAggregateSummary totals={taskRangeData.current.totals} label="月間" />
          </div>
        )}

        {granularity === 'year' && (
          <div className="space-y-6">
            <YearlyTaskFlowChart data={yearlyTaskFlow} />
            <TaskAggregateSummary totals={taskRangeData.current.totals} label="年間" />
          </div>
        )}

        {granularity !== 'day' && granularity !== 'year' && (
          <InterruptionSummaryCompact stats={interruptionStats} />
        )}

        <CategoryOverview stats={categoryStats} />
      </div>
    </div>
  );
};

export default ReportPage;
