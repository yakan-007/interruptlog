import { useMemo } from 'react';
import { t, tx } from '../../i18n';
import { fmtDay, fmtDurationShort } from '../../lib/formatters';
import { useTicker } from '../../lib/ticker';
import { isWorkSchedule } from '../../lib/workday';
import { buildForecast } from '../../features/forecast/forecast';
import { partitionCompletedTasks, selectForgottenTimer, selectWorkdayStatus } from '../../state';
import QuickAddCard from './QuickAddCard';
import { ActiveTaskList, CompletedTaskSections } from './TaskLists';

export default function LogScreen({ state, actions }) {
  const now = useTicker(1000);
  const locale = state.preferences.locale;
  const categoriesById = useMemo(
    () => Object.fromEntries(state.categories.map((category) => [category.id, category])),
    [state.categories]
  );
  const completed = useMemo(
    () => partitionCompletedTasks(state.completedTasks, now),
    [state.completedTasks, now]
  );
  const workdayStatus = selectWorkdayStatus(state, now);
  // Recomputed once a minute; the timer ticks every second.
  const minute = Math.floor(now / 60000);
  const forecast = useMemo(
    () => buildForecast(state, minute * 60000),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `state` changes every render; these are what the forecast reads.
    [state.tasks, state.events, state.preferences, state.workdaySchedules, minute]
  );
  // Missed due dates are known without work hours, so they do not wait for the forecast.
  const overdueCount = state.activeTasks.filter((task) => task.planning?.dueAt != null && task.planning.dueAt <= now).length;
  const forgottenTimer = selectForgottenTimer(state, now);

  return (
    <div className="il-screen il-fade">
      <div className="il-topbar il-topbar-log">
        <div className="sub">{state.todayLabel}</div>
        <button className={'il-workday-status' + (workdayStatus?.afterEnd ? ' after' : '')} onClick={() => actions.openSheet('workdayEnd')}>
          {workdayStatus
            ? workdayStatus.afterEnd
              ? tx(locale, 'log.workdayAfterEnd', workdayStatus.schedule.end)
              : tx(locale, 'log.workdayUntil', { time: workdayStatus.schedule.end, remaining: fmtDurationShort(workdayStatus.remainingMs, locale) })
            : isWorkSchedule(state.preferences.workSchedule)
              ? t(locale, 'log.workdayOff')
              : t(locale, 'log.workdayUnset')}
        </button>
      </div>

      <div className={'il-body il-body-log' + (state.running ? ' has-runbar has-live-dock' : ' has-dock')}>
        {forgottenTimer && (
          <div className="il-forgotten-timer" role="status">
            <span>{tx(locale, 'log.forgottenTimer', fmtDurationShort(forgottenTimer.elapsedMs, locale))}</span>
            <button type="button" onClick={() => actions.openSheet('stopAt')}>{t(locale, 'log.forgottenTimerAction')}</button>
          </div>
        )}
        {overdueCount > 0 ? (
          <div className="il-workday-overflow">
            <span>{tx(locale, 'log.overdueCount', overdueCount)}</span>
            {forecast && (
              <button type="button" onClick={actions.pushOverdueDueDates}>{t(locale, 'log.pushOverdue')}</button>
            )}
          </div>
        ) : forecast?.firstLate && (
          <button type="button" className="il-workday-overflow" onClick={() => actions.openSheet('forecast')}>
            {tx(locale, 'log.forecastLate', {
              day: fmtDay(forecast.firstLate.dueAt, locale, now),
              duration: fmtDurationShort(forecast.firstLate.shortfallMs, locale),
            })}
          </button>
        )}
        <div className="il-section-h">
          <span>{t(locale, 'log.title')}</span>
          <span className="count">{state.activeTasks.length}</span>
        </div>

        <ActiveTaskList state={state} actions={actions} categoriesById={categoriesById} now={now} forecast={forecast} />
        <CompletedTaskSections state={state} actions={actions} categoriesById={categoriesById} completed={completed} now={now} />
        <div className="il-log-bottomspace" />
      </div>

      <QuickAddCard state={state} actions={actions} />
    </div>
  );
}
