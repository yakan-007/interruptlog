import { useMemo } from 'react';
import { t, tx } from '../../i18n';
import { fmtDurationShort } from '../../lib/formatters';
import { useTicker } from '../../lib/ticker';
import { partitionCompletedTasks, selectWorkdayStatus } from '../../state';
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

  return (
    <div className="il-screen il-fade">
      <div className="il-topbar il-topbar-log">
        <div className="sub">{state.todayLabel}</div>
        <button className={'il-workday-status' + (workdayStatus?.afterEnd ? ' after' : '')} onClick={() => actions.openSheet('workdayEnd')}>
          {workdayStatus
            ? workdayStatus.afterEnd
              ? tx(locale, 'log.workdayAfterEnd', workdayStatus.schedule.end)
              : tx(locale, 'log.workdayUntil', { time: workdayStatus.schedule.end, remaining: fmtDurationShort(workdayStatus.remainingMs, locale) })
            : t(locale, 'log.workdayUnset')}
        </button>
      </div>

      <div className={'il-body il-body-log' + (state.running ? ' has-runbar has-live-dock' : ' has-dock')}>
        {workdayStatus?.overflowMs > 0 && (
          <div className="il-workday-overflow">{tx(locale, 'log.workdayOverflow', fmtDurationShort(workdayStatus.overflowMs, locale))}</div>
        )}
        <div className="il-section-h">
          <span>{t(locale, 'log.title')}</span>
          <span className="count">{state.activeTasks.length}</span>
        </div>

        <ActiveTaskList state={state} actions={actions} categoriesById={categoriesById} now={now} />
        <CompletedTaskSections state={state} actions={actions} categoriesById={categoriesById} completed={completed} now={now} />
        <div className="il-log-bottomspace" />
      </div>

      <QuickAddCard state={state} actions={actions} />
    </div>
  );
}
