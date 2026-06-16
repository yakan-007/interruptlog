import { useMemo, useRef, useState } from 'react';
import Icons from '../../icons';
import { fmtDurationShort } from '../../lib/formatters';
import { useTicker } from '../../lib/ticker';
import { t, tx } from '../../i18n';
import {
  buildHistoryTimelineModel,
  formatHistoryDateParts,
  fromHistoryDateInputValue,
  getHistoryDayItems,
  isSuspiciousHistoryEvent,
  shiftHistoryDay,
  startOfHistoryDay,
} from '../../lib/history';
import { selectHistoryDaySummary } from '../../state';
import HistoryHeader from './HistoryHeader';
import HistoryList from './HistoryList';
import HistoryTimeline from './HistoryTimeline';
import HistoryToolbar from './HistoryToolbar';
import useHistoryAutoScroll from './useHistoryAutoScroll';

export default function HistoryScreen({ state, actions }) {
  const [selectedDate, setSelectedDate] = useState(() => startOfHistoryDay(Date.now()));
  const bodyRef = useRef(null);
  const stickyRef = useRef(null);
  const timelineRef = useRef(null);
  const now = useTicker(1000);
  const viewMode = state.preferences.historyView === 'list' ? 'list' : 'timeline';

  const dayItems = useMemo(
    () => getHistoryDayItems(state.events, selectedDate, now),
    [state.events, selectedDate, now]
  );
  const summary = useMemo(() => {
    const base = selectHistoryDaySummary(dayItems);
    return { ...base, totalLabel: fmtDurationShort(base.totalMs, state.preferences.locale) };
  }, [dayItems, state.preferences.locale]);
  const anomalies = useMemo(
    () => dayItems.filter((event) => isSuspiciousHistoryEvent(event, {
      type: state.running?.type,
      taskId: state.running?.taskId,
      start: state.running?.start,
    }, now)),
    [dayItems, state.running, now]
  );
  const timeline = useMemo(
    () => buildHistoryTimelineModel(dayItems, selectedDate, now),
    [dayItems, selectedDate, now]
  );
  const dateParts = useMemo(
    () => formatHistoryDateParts(selectedDate, now),
    [selectedDate, now]
  );
  const isTodaySelected = startOfHistoryDay(selectedDate) === startOfHistoryDay(now);

  useHistoryAutoScroll({
    bodyRef,
    stickyRef,
    timelineRef,
    timeline,
    viewMode,
    isTodaySelected,
    selectedDate,
  });

  return (
    <div className="il-screen il-fade">
      <HistoryHeader locale={state.preferences.locale} />

      <div
        className={
          'il-body il-body-history' +
          (state.running ? ' has-runbar' : '') +
          (state.running?.type === 'task' ? ' runbar-task' : '')
        }
        ref={bodyRef}
      >
        <div className="il-history-sticky" ref={stickyRef}>
          <HistoryToolbar
            selectedDate={selectedDate}
            dateParts={dateParts}
            now={now}
            summary={summary}
            viewMode={viewMode}
            onShift={(delta) => setSelectedDate((current) => shiftHistoryDay(current, delta))}
            onToday={() => setSelectedDate(startOfHistoryDay(now))}
            onSelectDate={(value) => {
              const timestamp = fromHistoryDateInputValue(value);
              if (timestamp != null) setSelectedDate(timestamp);
            }}
            onSelectView={(value) => actions.setHistoryView(value)}
            onAddMissed={() => actions.openSheet('addMissed')}
            locale={state.preferences.locale}
          />
        </div>

        {anomalies.length > 0 && (
          <div className="il-history-warnwrap">
            <div className="il-warn">
              {Icons.alert(14)}
              <div>
                <div className="title">{tx(state.preferences.locale, 'history.anomaliesTitle', anomalies.length)}</div>
                <div className="copy">{t(state.preferences.locale, 'history.anomaliesCopy')}</div>
              </div>
            </div>
          </div>
        )}

        {state.overlapRepair.warning && (
          <div className="il-history-warnwrap">
            <div className="il-warn">
              {Icons.alert(14)}
              <div>
                <div className="title">{tx(state.preferences.locale, 'history.overlapTitle', state.overlapRepair.warning.conflicts.length)}</div>
                <div className="copy">{t(state.preferences.locale, 'history.overlapCopy')}</div>
              </div>
              <button className="btn secondary sm" onClick={() => actions.openOverlapRepair()}>{t(state.preferences.locale, 'history.repair')}</button>
            </div>
          </div>
        )}

        {dayItems.length === 0 && (
          <div className="il-empty">
            <div className="t">{t(state.preferences.locale, 'history.emptyTitle')}</div>
            <div className="s">{t(state.preferences.locale, 'history.emptyCopy')}</div>
            <button className="il-history-missedbtn il-empty-action" onClick={() => actions.openSheet('addMissed')}>
              {Icons.plus(14)}
              <span>{t(state.preferences.locale, 'history.addMissed')}</span>
            </button>
          </div>
        )}

        {dayItems.length > 0 && viewMode === 'list' && (
          <HistoryList
            items={dayItems}
            state={state}
            now={now}
            selectedDate={selectedDate}
            onEdit={(event) => actions.openSheet('editEvent', toEditableEvent(event, now))}
            locale={state.preferences.locale}
          />
        )}

        {dayItems.length > 0 && viewMode === 'timeline' && (
          <HistoryTimeline
            timeline={timeline}
            timelineRef={timelineRef}
            selectedDate={selectedDate}
            now={now}
            state={state}
            locale={state.preferences.locale}
            onEdit={(event) => actions.openSheet('editEvent', toEditableEvent(event, now))}
          />
        )}

        <div className={'il-history-bottomspace' + (state.running ? ' has-runbar' : '') + (state.running?.type === 'task' ? ' runbar-task' : '')} />
      </div>
    </div>
  );
}

function toEditableEvent(event, now) {
  return {
    id: event.id,
    type: event.type,
    taskId: event.taskId ?? null,
    label: event.label ?? '',
    memo: event.memo ?? '',
    who: event.who ?? '',
    urgency: event.urgency ?? 'med',
    categoryId: event.categoryId ?? '',
    start: event.start,
    end: event.end ?? now,
  };
}
