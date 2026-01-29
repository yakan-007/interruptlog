'use client';

import { useMemo, useState } from 'react';
import useEventsStore from '@/store/useEventsStore';
import type { Granularity } from './utils/types';
import { buildRangeInfo, toDateKey } from './utils/range';
import { buildTaskRangeData, buildMonthlyTaskPoints, buildYearlyTaskPoints, buildWeeklyTaskPoints } from './utils/taskMetrics';
import { computeCategoryStats } from './utils/categoryMetrics';
import { buildWeeklyCategorySeries } from './utils/categoryTimeSeries';
import { buildDailyTaskDetails, buildDailyInterruptionDetails } from './utils/dayDetails';
import { buildTaskDailyChanges } from './utils/taskChanges';
import { buildHighlights } from './utils/highlights';
import { buildHourlyTrend, buildWeeklyActivityPoints } from './utils/timeSeries';
import { formatRangeLabel } from './utils/formatters';
import type { HighlightMetric } from './utils/types';
import { buildCsvContent, buildCsvFilename, buildExportRows } from './utils/export';
import { buildWeeklyProSummary } from './utils/proReports';
import { buildReportAnomalies } from './utils/anomalies';
import {
  computeSummaryMetrics,
  computeInterruptionStats,
  indexEventsByDate,
  collectEventsFromIndex,
  getEventsForDateKey,
  formatDurationCompact,
} from '@/lib/reportUtils';
import { getEventDisplayLabel } from '@/utils/eventUtils';
import HighlightsGrid from '@/components/report/HighlightsGrid';
import ExecutiveSummary from '@/components/report/ExecutiveSummary';
import {
  DayTrendChart,
  WeeklyActivityChart,
  WeeklyTaskFlowChart,
  MonthlyTaskFlowChart,
  YearlyTaskFlowChart,
  TaskAggregateSummary,
  WeeklyCategoryStackedChart,
} from '@/components/report/ReportCharts';
import CategoryOverview from '@/components/report/CategoryOverview';
import TaskDailyChanges from '@/components/report/TaskDailyChanges';
import SummaryCards from '@/components/report/SummaryCards';
import InterruptionInsights from '@/components/report/InterruptionInsights';
import DailyDetailTables from '@/components/report/DailyDetailTables';
import DailyTimeline from '@/components/report/DailyTimeline';
import ProExportDialog from '@/components/report/ProExportDialog';
import ProReportSection from '@/components/report/ProReportSection';

const GRANULARITY_OPTIONS: Granularity[] = ['day', 'week', 'month', 'year'];

const COMPARISON_LABELS: Record<Granularity, string> = {
  day: '昨日',
  week: '先週',
  month: '先月',
  year: '前年比',
};

const formatRangeDescription = (granularity: Granularity) => {
  switch (granularity) {
    case 'day':
      return '今日の稼働状況をコンパクトに把握できます。';
    case 'week':
      return '1週間の集中・割り込み状況を俯瞰し、改善余地を把握できます。';
    case 'month':
      return '日別の新規／完了バランスと未完了推移を整理します。';
    case 'year':
    default:
      return '月ごとの仕事量と未完了推移を年間でレビューします。';
  }
};

const ReportPage = () => {
  const { events, taskLedger, categories, interruptCategorySettings, proAccess, isHydrated } = useEventsStore(state => ({
    events: state.events,
    taskLedger: state.taskLedger,
    categories: state.categories,
    interruptCategorySettings: state.interruptCategorySettings,
    proAccess: state.proAccess,
    isHydrated: state.isHydrated,
  }));

  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));

  const [granularity, setGranularity] = useState<Granularity>('day');
  const [isProExportOpen, setIsProExportOpen] = useState(false);

  const earliestEventDate = useMemo(() => {
    if (events.length === 0) return null;
    const earliest = events.reduce((min, event) => (event.start < min ? event.start : min), events[0].start);
    return toDateKey(new Date(earliest));
  }, [events]);

  const rangeInfo = useMemo(() => buildRangeInfo(selectedDate, granularity), [selectedDate, granularity]);
  const { current: currentRange, previous: previousRange } = rangeInfo;

  const eventsIndex = useMemo(() => indexEventsByDate(events), [events]);

  const currentEvents = useMemo(
    () => collectEventsFromIndex(eventsIndex, currentRange),
    [eventsIndex, currentRange],
  );

  const previousEvents = useMemo(
    () => collectEventsFromIndex(eventsIndex, previousRange),
    [eventsIndex, previousRange],
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

  const eventsForSelectedDay = useMemo(
    () => (granularity === 'day' ? getEventsForDateKey(eventsIndex, currentRange.startKey) : []),
    [granularity, eventsIndex, currentRange.startKey],
  );

  const taskDailyChanges = useMemo(
    () =>
      granularity === 'day'
        ? buildTaskDailyChanges(taskLedger, categories, currentRange, eventsForSelectedDay)
        : null,
    [granularity, taskLedger, categories, currentRange, eventsForSelectedDay],
  );

  const dailyTaskDetails = useMemo(
    () => (granularity === 'day' ? buildDailyTaskDetails(eventsForSelectedDay, taskLedger) : []),
    [granularity, eventsForSelectedDay, taskLedger],
  );

  const dailyInterruptionDetails = useMemo(
    () => (granularity === 'day' ? buildDailyInterruptionDetails(eventsForSelectedDay) : []),
    [granularity, eventsForSelectedDay],
  );

  const hourlyTrend = useMemo(
    () => (granularity === 'day' ? buildHourlyTrend(currentEvents) : []),
    [granularity, currentEvents],
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
    () => (granularity === 'week' ? buildWeeklyCategorySeries(currentEvents, taskLedger, categories, currentRange) : null),
    [granularity, currentEvents, taskLedger, categories, currentRange],
  );

  const weeklyProSummary = useMemo(
    () => (granularity === 'week' ? buildWeeklyProSummary(currentEvents, currentRange) : undefined),
    [granularity, currentEvents, currentRange],
  );

  const anomalies = useMemo(() => buildReportAnomalies(currentEvents), [currentEvents]);

  const exportEvents = useMemo(
    () => buildExportRows(events, currentRange, categories, taskLedger),
    [events, currentRange, categories, taskLedger],
  );

  const handleExportCsv = () => {
    if (exportEvents.length === 0) return;
    const csv = buildCsvContent(exportEvents);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildCsvFilename(selectedDate, granularity);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleProExport = () => {
    if (!proAccess) {
      window.alert('この機能はProで利用できます。');
      return;
    }
    setIsProExportOpen(true);
  };

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
  const comparisonLabel = COMPARISON_LABELS[granularity];

  if (!isHydrated) {
    return <div className="p-4 text-center">レポートデータを読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-16 pt-10 dark:bg-slate-950 print:bg-white print:px-0 print:pt-0">
      <div className="mx-auto max-w-6xl space-y-8 print:max-w-none">
        <header className="rounded-3xl border border-slate-200 bg-white/95 px-6 py-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 print:border-0 print:bg-white print:p-0 print:shadow-none">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold tracking-wide text-rose-600 dark:bg-rose-500/20 dark:text-rose-200 print:hidden">
                報告ダイジェスト
              </span>
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{rangeLabel}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{formatRangeDescription(granularity)}</p>
            </div>
          </div>
          {anomalies.length > 0 && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm dark:border-amber-800/60 dark:bg-amber-900/30 dark:text-amber-100">
              <div className="font-semibold">データ確認: 長時間/未来イベントがあります</div>
              <p className="text-xs text-amber-700 dark:text-amber-200">
                履歴の時計アイコンから開始/終了を調整してください（一覧は上位5件まで表示）。
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                {anomalies.map(item => (
                  <li key={item.event.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <span className="truncate">
                      {getEventDisplayLabel(item.event)}
                    </span>
                    <span className="text-amber-700 dark:text-amber-200">
                      {new Date(item.event.start).toLocaleString()} 〜 {item.event.end ? new Date(item.event.end).toLocaleString() : '実行中'} / {formatDurationCompact(item.duration)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-col items-center gap-3 md:items-end">
            <div className="flex flex-wrap items-center gap-3 print:hidden">
              <div className="inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                {GRANULARITY_OPTIONS.map(option => {
                  const isActive = granularity === option;
                    const label =
                      option === 'day'
                        ? '日次'
                        : option === 'week'
                        ? '週次'
                        : option === 'month'
                        ? '月次'
                        : '年次';
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setGranularity(option)}
                        aria-pressed={isActive}
                        aria-label={`${label}レポートを表示`}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
                          isActive
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-300/40 dark:bg-rose-500'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="date"
                  aria-label="参照日"
                  value={selectedDate}
                  onChange={event => setSelectedDate(event.target.value)}
                  min={earliestEventDate || undefined}
                  max={new Date().toISOString().split('T')[0]}
                  className="rounded-lg border border-transparent bg-white/95 px-3 py-2 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
                />
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="rounded-lg border border-transparent bg-white/95 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:ring-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
                >
                  CSVを保存
                </button>
                <button
                  type="button"
                  onClick={handleProExport}
                  className={`rounded-lg border border-transparent px-3 py-2 text-sm font-medium shadow-sm ring-1 transition focus:outline-none focus:ring-2 focus:ring-rose-400 ${
                    proAccess
                      ? 'bg-amber-50 text-amber-900 ring-amber-200 hover:ring-amber-300 dark:bg-amber-500/20 dark:text-amber-100 dark:ring-amber-500/40'
                      : 'bg-white/90 text-slate-400 ring-slate-200 hover:ring-slate-300 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700'
                  }`}
                >
                  詳細エクスポート
                  <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-500/40 dark:text-amber-100">
                    Pro
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-lg border border-transparent bg-white/95 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:ring-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
                >
                  PDFで保存
                </button>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Pro: 任意期間の詳細エクスポートが利用できます。
              </p>
              {earliestEventDate && (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  データ利用可能期間: {earliestEventDate} 〜 {new Date().toISOString().split('T')[0]}
                </p>
              )}
            </div>
          </div>
        </header>

        <div className="space-y-6">
          <ExecutiveSummary
            rangeLabel={rangeLabel}
            granularity={granularity}
            comparisonLabel={comparisonLabel}
            summaryMetrics={summaryMetrics}
            taskTotals={taskRangeData.current.totals}
            previousTaskTotals={taskRangeData.previous.totals}
            categoryStats={categoryStats}
            interruptionStats={interruptionStats}
          />
          <SummaryCards items={summaryMetrics.items} comparisonLabel={comparisonLabel} />
          <HighlightsGrid metrics={highlightMetrics} />
        </div>

        {granularity === 'day' && (
          <div className="space-y-6">
            <DailyTimeline
              events={eventsForSelectedDay}
              dateKey={currentRange.startKey}
              categories={categories}
              taskLedger={taskLedger}
              interruptCategorySettings={interruptCategorySettings}
            />
            <ProReportSection
              granularity="day"
              proAccess={proAccess}
              taskDetails={dailyTaskDetails}
              interruptionDetails={dailyInterruptionDetails}
            />
            <DailyDetailTables
              taskDetails={dailyTaskDetails}
              interruptionDetails={dailyInterruptionDetails}
            />
            {taskDailyChanges && (
              <TaskDailyChanges
                created={taskDailyChanges.created}
                completed={taskDailyChanges.completed}
                label={rangeLabel}
              />
            )}
            <DayTrendChart data={hourlyTrend} />
            <InterruptionInsights
              stats={interruptionStats}
              eventsForSelectedDate={eventsForSelectedDay}
              selectedDateKey={currentRange.startKey}
              showTimeline
            />
          </div>
        )}

        {granularity === 'week' && (
          <div className="space-y-6">
            <WeeklyActivityChart data={weeklyActivity} />
            <WeeklyTaskFlowChart data={weeklyTaskFlow} />
            {weeklyCategorySeries && <WeeklyCategoryStackedChart series={weeklyCategorySeries} />}
            <ProReportSection
              granularity="week"
              proAccess={proAccess}
              taskDetails={[]}
              interruptionDetails={[]}
              weeklySummary={weeklyProSummary}
            />
            <InterruptionInsights
              stats={interruptionStats}
              eventsForSelectedDate={[]}
              selectedDateKey={currentRange.startKey}
              showTimeline={false}
            />
          </div>
        )}

        {granularity === 'month' && (
          <div className="space-y-6">
            <MonthlyTaskFlowChart data={monthlyTaskFlow} />
            <TaskAggregateSummary totals={taskRangeData.current.totals} label="月間" />
            <CategoryOverview stats={categoryStats} />
            <InterruptionInsights
              stats={interruptionStats}
              eventsForSelectedDate={[]}
              selectedDateKey={currentRange.startKey}
              showTimeline={false}
            />
          </div>
        )}

        {granularity === 'year' && (
          <div className="space-y-6">
            <YearlyTaskFlowChart data={yearlyTaskFlow} />
            <TaskAggregateSummary totals={taskRangeData.current.totals} label="年間" />
            <CategoryOverview stats={categoryStats} />
            <InterruptionInsights
              stats={interruptionStats}
              eventsForSelectedDate={[]}
              selectedDateKey={currentRange.startKey}
              showTimeline={false}
            />
          </div>
        )}

        <ProExportDialog
          open={isProExportOpen}
          onOpenChange={setIsProExportOpen}
          defaultStartKey={currentRange.startKey}
          defaultEndKey={currentRange.endKey}
          events={events}
          categories={categories}
          taskLedger={taskLedger}
        />
      </div>
    </div>
  );
};

export default ReportPage;
