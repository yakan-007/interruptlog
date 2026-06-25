import { useMemo, useState } from 'react';
import Icons from '../../icons';
import { useTicker } from '../../lib/ticker';
import { createReportSnapshot, selectReportInputs } from '../../state';
import { t, tx } from '../../i18n';
import { buildReportMetrics } from './reportMetrics';
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
  UrgencyBreakdownCard,
  WeekdayTrendCard,
  WeeklyReviewCard,
  WorkdayCard,
} from './PersonalReportCards';

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

  const total = currentStats.focus + currentStats.interrupt + currentStats.break || 1;
  const deltaHours = (current, previous) => (current - previous) / 3600000;
  const localizedCompareLabel = t(state.preferences.locale, `report.compareLabels.${range}`);
  const {
    hourly,
    maxHourly,
    dayStats,
    maxDay,
    senders,
    maxSenderTime,
    urgencyStats,
    maxUrgencyTime,
    topUrgency,
    categoryList,
    totalCategoryTime,
    uniqueTaskIds,
    taskReportRows,
    completedTasks,
    incompleteTasks,
    completedInRange,
    taskRate,
    peakHour,
    quietHour,
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
        <div><div className="sub">{t(state.preferences.locale, 'report.eyebrow')}</div><h1>{t(state.preferences.locale, 'report.title')}</h1></div>
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
              <button className="il-iconbtn" aria-label={t(state.preferences.locale, 'report.previousDay')} onClick={() => setSelectedDay(selectedDayStart - DAY_MS)}>{Icons.chevL(17)}</button>
              <button className="btn secondary sm" onClick={() => setSelectedDay(todayStart)}>{t(state.preferences.locale, 'report.today')}</button>
              <button className="il-iconbtn" aria-label={t(state.preferences.locale, 'report.nextDay')} onClick={() => setSelectedDay(selectedDayStart + DAY_MS)} disabled={!canGoNextDay}>{Icons.chevR(17)}</button>
              <label className="il-report-date-input">
                <span>{Icons.calendar(14)}</span>
                <input
                  type="date"
                  value={toDateInputValue(selectedDayStart)}
                  max={toDateInputValue(todayStart)}
                  onChange={(event) => setDateFromInput(event.target.value)}
                  aria-label={t(state.preferences.locale, 'report.reportDate')}
                />
              </label>
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
                  <div className="copy">{t(state.preferences.locale, 'report.overlapReportCopy')}</div>
                </div>
                <button className="btn secondary sm" onClick={() => actions.openOverlapRepair()}>{t(state.preferences.locale, 'history.repair')}</button>
              </div>
            )}

            <div className="il-report-statgrid">
              <StatCard label={t(state.preferences.locale, 'report.focus')} color="var(--task)" value={currentStats.focus} delta={deltaHours(currentStats.focus, previousStats.focus)} deltaLabel={localizedCompareLabel || compareLabel} />
              <StatCard label={t(state.preferences.locale, 'report.interrupt')} color="var(--interrupt)" value={currentStats.interrupt} delta={deltaHours(currentStats.interrupt, previousStats.interrupt)} deltaLabel={localizedCompareLabel || compareLabel} deltaInvert />
              <StatCard label={t(state.preferences.locale, 'report.break')} color="var(--break)" value={currentStats.break} delta={deltaHours(currentStats.break, previousStats.break)} deltaLabel={localizedCompareLabel || compareLabel} />
            </div>

            {range === 'day' && <WorkdayCard workday={workday} locale={state.preferences.locale} />}

            {range === 'week' && <WeeklyReviewCard state={state} now={now} snapshot={reportSnapshot} />}

            <BreakdownCard currentStats={currentStats} locale={state.preferences.locale} total={total} />

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
                  quietHour={quietHour}
                />

                <MicroInterruptionsCard stats={microInterruptions} locale={state.preferences.locale} />

                {currentStats.interrupt > 0 && (
                  <UrgencyBreakdownCard
                    locale={state.preferences.locale}
                    maxUrgencyTime={maxUrgencyTime}
                    topUrgency={topUrgency}
                    urgencyStats={urgencyStats}
                  />
                )}

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
              <button className="btn secondary fill" onClick={() => actions.exportReportCsv(range)}>{Icons.download(14)} {t(state.preferences.locale, 'report.csvSave')}</button>
              <button className="btn secondary fill" onClick={() => actions.exportAnalysisCsv(range)}>{Icons.download(14)} {t(state.preferences.locale, 'report.analysisCsvSave')}</button>
              <div className="il-report-exportcopy">
                {t(state.preferences.locale, 'report.csvCopy')}
              </div>
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

function startOfDay(timestamp) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function endOfDay(timestamp) {
  return startOfDay(timestamp) + DAY_MS - 1;
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
