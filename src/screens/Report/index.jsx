import { useMemo, useState } from 'react';
import Icons from '../../icons';
import { useTicker } from '../../lib/ticker';
import { createReportSnapshot, selectReportInputs } from '../../state';
import { formatDate, t, tx } from '../../i18n';
import DayStepper from '../../components/DayStepper';
import { buildReportMetrics } from '../../features/report/buildReportMetrics';
import { buildDailyReport } from '../../features/report/dailyReport';
import { formatDailyReportText } from '../../features/report/dailyReportText';
import { buildWorkTable, formatWorkTableTsv } from '../../features/report/workTable';
import StatCard from './StatCard';
import {
  BreakdownCard,
  CategoryTimeCard,
  DailyReportPrintTemplate,
  DayActivityCard,
  HourlyInterruptsCard,
  MicroInterruptionsCard,
  SendersCard,
  TaskEngagementCard,
  TaskStatusCard,
  WeekdayTrendCard,
  WeeklyReviewCard,
  WorkdayCard,
} from './PersonalReportCards';
import { startOfDay } from '../../lib/day';

export default function ReportScreen({ state, actions }) {
  const [range, setRange] = useState('day');
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(Date.now()));
  const [detailsOpen, setDetailsOpen] = useState(false);
  const now = useTicker(1000);
  const todayStart = startOfDay(now);
  const selectedDayStart = Math.min(selectedDay, todayStart);
  const reportNow = range === 'day'
    ? selectedDayStart === todayStart ? now : endOfDay(selectedDayStart)
    : now;
  const reportSnapshot = useMemo(
    () => createReportSnapshot(state.events, reportNow),
    [state.events, reportNow]
  );
  const { bounds, currentStats, previousStats, compareLabel } = useMemo(
    () => selectReportInputs(state, range, reportNow, reportSnapshot),
    [state, range, reportNow, reportSnapshot]
  );

  const recordedTotal = currentStats.focus + currentStats.interrupt + currentStats.break;
  const total = recordedTotal || 1;
  const localizedCompareLabel = t(state.preferences.locale, `report.compareLabels.${range}`);
  const currentInterruptCount = countInterruptions(currentStats);
  const previousInterruptCount = countInterruptions(previousStats);
  const {
    hourly,
    maxHourly,
    dayStats,
    maxDay,
    senders,
    maxSenderTime,
    categoryList,
    totalCategoryTime,
    uniqueTaskIds,
    taskReportRows,
    completedTasks,
    incompleteTasks,
    completedInRange,
    taskRate,
    peakHour,
    hasInterruptTrend,
    taskEngagement,
    dayActivity,
    dailyReport,
    workday,
    microInterruptions,
  } = useMemo(
    () => buildReportMetrics(state, currentStats, bounds, reportNow, reportSnapshot),
    [bounds, currentStats, reportNow, reportSnapshot, state]
  );
  const canGoNextDay = selectedDayStart < todayStart;
  const setDateFromInput = (value) => {
    const parsed = parseDateInput(value);
    if (parsed != null) setSelectedDay(Math.min(parsed, todayStart));
  };

  return (
    <div className="il-screen il-fade">
      <div className="il-topbar">
        <div><h1>{t(state.preferences.locale, 'report.title')}</h1></div>
      </div>

      <>
          <div className="il-report-range">
            <div className="il-seg full">
              {['day', 'week', 'month', 'year'].map((key) => (
                <button key={key} className={range === key ? 'active' : ''} onClick={() => setRange(key)}>{t(state.preferences.locale, `report.ranges.${key}`)}</button>
              ))}
            </div>
          </div>

          {range === 'day' && (
            <div className="il-report-date-nav">
              <div className="il-report-date-label">{formatDate(selectedDayStart, state.preferences.locale, { month: 'long', day: 'numeric', weekday: 'short' })}</div>
              <DayStepper
                dateValue={toDateInputValue(selectedDayStart)}
                isToday={selectedDayStart === todayStart}
                canGoNext={canGoNextDay}
                maxDate={toDateInputValue(todayStart)}
                locale={state.preferences.locale}
                onShift={(delta) => setSelectedDay(Math.min(selectedDayStart + delta * DAY_MS, todayStart))}
                onToday={() => setSelectedDay(todayStart)}
                onPick={setDateFromInput}
              />
            </div>
          )}

          {range === 'day' && (
            <div className="il-report-print-row">
              <button
                className="btn secondary sm il-report-print-action"
                onClick={() => actions.copyDailyReport(formatDailyReportText(buildDailyReport(state, selectedDayStart, reportNow), state.preferences.locale))}
              >
                {Icons.copy(14)}
                {t(state.preferences.locale, 'report.copyDailyReport')}
              </button>
              <button className="btn secondary sm il-report-print-action" onClick={() => window.print()}>
                {Icons.print(14)}
                {t(state.preferences.locale, 'report.dailyOutput')}
              </button>
            </div>
          )}

          <div className="il-body il-body-report">
            {state.overlapRepair.warning && (
              <div className="il-warn">
                {Icons.alert(14)}
                <div>
                  <div className="title">{tx(state.preferences.locale, 'history.overlapTitle', state.overlapRepair.warning.conflicts.length)}</div>
                </div>
                <button className="btn secondary sm" onClick={() => actions.openOverlapRepair()}>{t(state.preferences.locale, 'history.repair')}</button>
              </div>
            )}

            <div className="il-report-statgrid">
              <StatCard locale={state.preferences.locale} label={t(state.preferences.locale, 'report.focus')} color="var(--task)" value={currentStats.focus} previousValue={previousStats.focus} deltaLabel={localizedCompareLabel || compareLabel} />
              <StatCard locale={state.preferences.locale} label={t(state.preferences.locale, 'report.interrupt')} color="var(--interrupt)" value={currentStats.interrupt} previousValue={previousStats.interrupt} deltaLabel={localizedCompareLabel || compareLabel} deltaInvert />
              <StatCard locale={state.preferences.locale} label={t(state.preferences.locale, 'report.interruptCount')} color="var(--interrupt)" value={currentInterruptCount} previousValue={previousInterruptCount} deltaLabel={localizedCompareLabel || compareLabel} deltaInvert kind="count" />
              <StatCard locale={state.preferences.locale} label={t(state.preferences.locale, 'report.break')} color="var(--break)" value={currentStats.break} previousValue={previousStats.break} deltaLabel={localizedCompareLabel || compareLabel} />
            </div>

            <WorkdayCard workday={workday} locale={state.preferences.locale} />

            {range === 'week' && <WeeklyReviewCard state={state} now={now} snapshot={reportSnapshot} />}

            <BreakdownCard currentStats={currentStats} locale={state.preferences.locale} recordedTotal={recordedTotal} total={total} />

            <TaskEngagementCard engagement={taskEngagement} locale={state.preferences.locale} />

            {range === 'day' && (
              <DayActivityCard activity={dayActivity} locale={state.preferences.locale} />
            )}

            <div className="il-report-detail-toggle">
              <button className="btn secondary fill" onClick={() => setDetailsOpen((current) => !current)} aria-expanded={detailsOpen}>
                {detailsOpen ? Icons.chevD(14) : Icons.chevR(14)}
                {detailsOpen ? t(state.preferences.locale, 'report.hideDetailAnalysis') : t(state.preferences.locale, 'report.showDetailAnalysis')}
              </button>
            </div>

            {detailsOpen && (
              <>
                <HourlyInterruptsCard
                  hasInterruptTrend={hasInterruptTrend}
                  hourly={hourly}
                  locale={state.preferences.locale}
                  maxHourly={maxHourly}
                  peakHour={peakHour}
                />

                <MicroInterruptionsCard stats={microInterruptions} locale={state.preferences.locale} />

                <WeekdayTrendCard dayStats={dayStats} locale={state.preferences.locale} maxDay={maxDay} />
                <SendersCard locale={state.preferences.locale} maxSenderTime={maxSenderTime} senders={senders} />
                <CategoryTimeCard categories={state.categories} categoryList={categoryList} locale={state.preferences.locale} totalCategoryTime={totalCategoryTime} />
                <TaskStatusCard
                  completedInRange={completedInRange}
                  completedTasks={completedTasks}
                  incompleteTasks={incompleteTasks}
                  locale={state.preferences.locale}
                  taskRate={taskRate}
                  taskReportRows={taskReportRows}
                  uniqueTaskIds={uniqueTaskIds}
                />
              </>
            )}

            <div className="il-report-export">
              <button
                className="btn secondary fill"
                onClick={() => {
                  const table = buildWorkTable(state, bounds.since, bounds.until, reportNow);
                  actions.copyWorkTable(formatWorkTableTsv(table), table.rows.length);
                }}
              >
                {Icons.copy(14)} {t(state.preferences.locale, 'report.copyWorkTable')}
              </button>
              <button className="btn secondary fill" onClick={() => actions.exportReportCsv(range, reportNow)}>{Icons.download(14)} {t(state.preferences.locale, 'report.csvSave')}</button>
              <button className="btn secondary fill" onClick={() => actions.exportAnalysisCsv(range, reportNow)}>{Icons.download(14)} {t(state.preferences.locale, 'report.analysisCsvSave')}</button>
            </div>

            {range === 'day' && (
              <DailyReportPrintTemplate report={dailyReport} profile={state.preferences.reportProfile} locale={state.preferences.locale} />
            )}
          </div>
      </>
    </div>
  );
}

const DAY_MS = 86400000;


function endOfDay(timestamp) {
  return startOfDay(timestamp) + DAY_MS - 1;
}

function countInterruptions(stats) {
  return stats.events.filter((event) => event.type === 'interrupt').length;
}

function toDateInputValue(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInput(value) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day).getTime();
}
