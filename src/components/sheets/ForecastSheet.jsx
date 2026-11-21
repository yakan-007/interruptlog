import { useState } from 'react';
import { buildForecast } from '../../features/forecast/forecast';
import { t, tx } from '../../i18n';
import { fmtDay, fmtDue, fmtDurationShort } from '../../lib/formatters';
import SheetShell from './SheetShell';

const MIN_PROFILE_DAYS = 5;
const MIN_PACE_TASKS = 3;

// Every estimated task with the day it should be done if work goes on as
// usual, against its due date, plus what that "usual" was computed from.
export default function ForecastSheet({ state, onClose }) {
  const locale = state.preferences.locale;
  // Computed once per opening: a list that reorders while it is being read
  // would be harder to follow than one that is a minute old.
  const [now] = useState(() => Date.now());
  const [forecast] = useState(() => buildForecast(state, now));
  const tasksById = new Map(state.tasks.map((task) => [task.id, task]));
  const duration = (ms) => fmtDurationShort(ms, locale);

  return (
    <SheetShell title={t(locale, 'sheets.forecastTitle')} onClose={onClose} locale={locale}>
      {forecast && (
        <>
          <div className="il-forecast-basis">
            <div>
              {forecast.profile.corrected
                ? tx(locale, 'sheets.forecastFocus', {
                  work: duration(forecast.profile.perDay.workMs),
                  interrupt: duration(forecast.profile.perDay.interruptMs),
                  count: Math.round(forecast.profile.perDay.interruptCount * 10) / 10,
                  pause: duration(forecast.profile.perDay.breakMs),
                  focus: duration(forecast.profile.perDay.focusMs),
                })
                : tx(locale, 'sheets.forecastNoProfile', { days: forecast.profile.sampleDays, needed: MIN_PROFILE_DAYS })}
            </div>
            <div>
              {forecast.pace.corrected
                ? tx(locale, 'sheets.forecastPace', Math.round(forecast.pace.ratio * 10) / 10)
                : tx(locale, 'sheets.forecastNoPace', { count: forecast.pace.samples, needed: MIN_PACE_TASKS })}
            </div>
          </div>

          <div className="il-forecast-list">
            {forecast.items.map((item) => (
              <div key={item.taskId} className={'il-forecast-row' + (item.late ? ' late' : '') + (item.overdue ? ' overdue' : '') + (item.overrun ? ' overrun' : '')}>
                <div className="name">{tasksById.get(item.taskId)?.name}</div>
                <div className="target">
                  {item.overrun
                    ? t(locale, 'log.overrun')
                    : item.finishAt == null ? t(locale, 'sheets.forecastBeyond') : tx(locale, 'log.target', fmtDay(item.finishAt, locale, now))}
                </div>
                {item.dueAt != null && (
                  <div className="due">
                    {tx(locale, item.overdue ? 'log.overdue' : 'log.due', fmtDue(item.dueAt, locale, now))}
                    {item.late && <strong> · {tx(locale, 'log.shortfall', duration(item.shortfallMs))}</strong>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {forecast.unestimatedCount > 0 && (
            <div className="il-forecast-note">{tx(locale, 'sheets.forecastUnestimated', forecast.unestimatedCount)}</div>
          )}
        </>
      )}
    </SheetShell>
  );
}
