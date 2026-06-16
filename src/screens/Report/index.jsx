import { useMemo, useState } from 'react';
import { FEATURES } from '../../features';
import Icons from '../../icons';
import { useTicker } from '../../lib/ticker';
import { selectReportInputs } from '../../state';
import { t, tx } from '../../i18n';
import { buildReportMetrics } from './reportMetrics';
import StatCard from './StatCard';
import TeamReport from './TeamReport';
import {
  BreakdownCard,
  CategoryTimeCard,
  HourlyInterruptsCard,
  SendersCard,
  TaskStatusCard,
  UrgencyBreakdownCard,
  WeekdayTrendCard,
  WeeklyReviewCard,
} from './PersonalReportCards';

export default function ReportScreen({ state, actions }) {
  const [mode, setMode] = useState('personal');
  const [range, setRange] = useState('day');
  const teamModeEnabled = FEATURES.teamUi && state.preferences.teamModeEnabled;
  const now = useTicker(1000);
  const { bounds, currentStats, previousStats, compareLabel } = useMemo(
    () => selectReportInputs(state, range, now),
    [state, range, now]
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
  } = useMemo(
    () => buildReportMetrics(state, currentStats, bounds, now),
    [bounds, currentStats, now, state]
  );

  return (
    <div className="il-screen il-fade">
      <div className="il-topbar">
        <div><div className="sub">{t(state.preferences.locale, 'report.eyebrow')}</div><h1>{t(state.preferences.locale, 'report.title')}</h1></div>
        <div className="actions">
          {mode === 'personal' && (
            <button className="il-iconbtn" aria-label={t(state.preferences.locale, 'report.csvExport')} onClick={() => actions.exportReportCsv(range)}>{Icons.download(18)}</button>
          )}
        </div>
      </div>

      {teamModeEnabled && (
        <div className="il-report-mode">
          <div className="il-seg full">
            <button className={mode === 'personal' ? 'active' : ''} onClick={() => setMode('personal')}>{t(state.preferences.locale, 'report.personal')}</button>
            <button className={mode === 'team' ? 'active' : ''} onClick={() => setMode('team')}>{t(state.preferences.locale, 'report.team')}</button>
          </div>
        </div>
      )}

      {teamModeEnabled && mode === 'team' ? <TeamReport state={state} actions={actions} /> : (
        <>
          <div className="il-report-range">
            <div className="il-seg full">
              {['day', 'week', 'month', 'year'].map((key) => (
                <button key={key} className={range === key ? 'active' : ''} onClick={() => setRange(key)}>{t(state.preferences.locale, `report.ranges.${key}`)}</button>
              ))}
            </div>
          </div>

          <div className="il-body il-body-report">
            {teamModeEnabled && !state.preferences.memberName && (
              <div className="il-warn">
                {Icons.alert(14)}
                <div>
                  <div className="title">{t(state.preferences.locale, 'report.memberMissingTitle')}</div>
                  <div className="copy">{t(state.preferences.locale, 'report.memberMissingCopy')}</div>
                </div>
              </div>
            )}

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

            {range === 'week' && <WeeklyReviewCard state={state} now={now} />}

            <BreakdownCard currentStats={currentStats} locale={state.preferences.locale} total={total} />

            <HourlyInterruptsCard
              hasInterruptTrend={hasInterruptTrend}
              hourly={hourly}
              locale={state.preferences.locale}
              maxHourly={maxHourly}
              peakHour={peakHour}
              quietHour={quietHour}
            />

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

            <div className="il-report-export">
              <button className="btn secondary fill" onClick={() => actions.exportReportCsv(range)}>{Icons.download(14)} {t(state.preferences.locale, 'report.csvExport')}</button>
              <div className="il-report-exportcopy">
                {t(state.preferences.locale, 'report.csvCopy')}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
