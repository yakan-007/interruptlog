import { useMemo } from 'react';
import { fmtDurationShort } from '../../../lib/formatters';
import { buildWeeklyReview } from '../../../state';
import { t, tx } from '../../../i18n';
import TaskStat from '../TaskStat';

export function BreakdownCard({ currentStats, locale, recordedTotal, total }) {
  const resolvedRecordedTotal = recordedTotal ?? total;
  if (resolvedRecordedTotal <= 0) {
    return (
      <div className="il-card">
        <h3>{t(locale, 'report.breakdown')}</h3>
        <div className="il-report-emptytrend">
          {t(locale, 'report.noBreakdown')}
        </div>
      </div>
    );
  }

  return (
    <div className="il-card">
      <h3>{t(locale, 'report.breakdown')}</h3>
      <div className="il-hbar tall">
        <span style={{ width: `${currentStats.focus / total * 100}%`, background: 'var(--task)' }} />
        <span style={{ width: `${currentStats.interrupt / total * 100}%`, background: 'var(--interrupt)' }} />
        <span style={{ width: `${currentStats.break / total * 100}%`, background: 'var(--break)' }} />
      </div>
      <div className="il-hbar-legend">
        {[['focus', 'task', t(locale, 'common.task')], ['interrupt', 'interrupt', t(locale, 'common.interrupt')], ['break', 'break', t(locale, 'common.break')]].map(([statKey, colorKey, label]) => (
          <span key={statKey} className="l">
            <span className="sw" style={{ background: `var(--${colorKey})` }} />
            {label} {Math.round(currentStats[statKey] / total * 100)}%
          </span>
        ))}
      </div>
    </div>
  );
}

export function WorkdayCard({ workday, locale = 'ja-JP' }) {
  if (!workday) return null;
  const overtime = workday.overtime.task + workday.overtime.interrupt;
  const holiday = workday.holiday.task + workday.holiday.interrupt;
  return (
    <div className="il-card il-workday-card">
      <div className="il-card-intro">
        <h3>{t(locale, 'report.workday')}</h3>
        <div className="il-card-copy">{workday.schedule.start} – {workday.schedule.end}</div>
      </div>
      <WorkdayLine label={t(locale, 'report.withinWorkday')} task={workday.inside.task} interrupt={workday.inside.interrupt} locale={locale} />
      <WorkdayLine label={t(locale, 'report.overtime')} task={workday.overtime.task} interrupt={workday.overtime.interrupt} locale={locale} emphatic={overtime > 0} />
      {holiday > 0 && (
        <WorkdayLine label={t(locale, 'report.holidayWork')} task={workday.holiday.task} interrupt={workday.holiday.interrupt} locale={locale} emphatic />
      )}
    </div>
  );
}

function WorkdayLine({ label, task, interrupt, locale, emphatic = false }) {
  return (
    <div className={'il-workday-line' + (emphatic ? ' emphatic' : '')}>
      <span className="label">{label}</span>
      <span>{t(locale, 'common.task')} <strong className="il-mono">{fmtDurationShort(task, locale)}</strong></span>
      <span>{t(locale, 'common.interrupt')} <strong className="il-mono">{fmtDurationShort(interrupt, locale)}</strong></span>
    </div>
  );
}

export function HourlyInterruptsCard({
  hasInterruptTrend,
  hourly,
  locale,
  maxHourly,
  peakHour,
}) {
  if (!hasInterruptTrend) {
    return (
      <div className="il-card">
        <h3>{t(locale, 'report.hourlyInterrupts')}</h3>
        <div className="il-report-emptytrend">
          {t(locale, 'report.noInterruptTrend')}
        </div>
      </div>
    );
  }

  // Every hour is labelled while they fit; on long days every third one.
  const labelEvery = hourly.counts.length > 12 ? 3 : 1;
  return (
    <div className="il-card">
      <h3>{t(locale, 'report.hourlyInterrupts')}</h3>
      <div className="il-vchart">
        {hourly.counts.map((count, index) => {
          const hour = hourly.firstHour + index;
          const hot = hour === peakHour && count > 0;
          return (
            <div key={hour} aria-label={tx(locale, 'report.hourlyBar', { hour, count })}>
              <div className={'bar' + (hot ? ' hot' : '')} style={{ height: `calc((100% - 18px) * ${count / maxHourly})` }} />
              <div className={'lbl' + (hot ? ' hot' : '')}>{index % labelEvery === 0 ? hour : ''}</div>
            </div>
          );
        })}
      </div>
      <div className="il-report-meta">
        <span>{t(locale, 'report.peak')}: <strong className="peak">{tx(locale, 'report.peakHour', peakHour)}</strong> · {tx(locale, 'common.count', hourly.counts[peakHour - hourly.firstHour])}</span>
      </div>
    </div>
  );
}

export function MicroInterruptionsCard({ stats, locale = 'ja-JP' }) {
  if (!stats || stats.interruptCount === 0) return null;

  const maxBucketCount = Math.max(...stats.buckets.map((bucket) => bucket.count), 1);

  return (
    <div className="il-card">
      <h3>{t(locale, 'report.microInterruptions')}</h3>
      <div className="il-report-taskstats">
        <TaskStat label={t(locale, 'report.microCount')} value={tx(locale, 'common.count', stats.microCount)} accent />
        <TaskStat label={t(locale, 'report.microTotal')} value={fmtDurationShort(stats.microTotalMs, locale)} />
        <TaskStat label={t(locale, 'report.microMedian')} value={stats.microCount ? fmtDurationShort(stats.microMedianMs, locale) : '-'} />
        <TaskStat label={t(locale, 'report.chainCount')} value={tx(locale, 'common.count', stats.chainCount)} />
      </div>
      {/* The numbers and bars speak for themselves; only where short ones pile
          up is worth a sentence. */}
      {stats.microCount > 0 && (
        <div className="il-review-lines">
          <div>{tx(locale, 'report.microPeak', { hour: stats.peakHour, count: stats.peakHourCount })}</div>
        </div>
      )}
      <div className="il-bucket-report">
        {stats.buckets.map((bucket) => (
          <div key={bucket.label} className="il-bucket-report-row">
            <div className="main">
              <span className="il-chip sm">{bucket.label}</span>
              <span className="copy">{tx(locale, 'common.count', bucket.count)}</span>
            </div>
            <div className="meter">
              <div style={{ width: `${(bucket.count / maxBucketCount) * 100}%`, background: 'var(--interrupt)' }} />
            </div>
            <div className="value">
              <strong className="il-mono">{fmtDurationShort(bucket.time, locale)}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WeeklyReviewCard({ state, now, snapshot }) {
  const review = useMemo(() => buildWeeklyReview(state, now, snapshot), [state, now, snapshot]);
  return (
    <div className="il-card il-weekly-review">
      <h3>{t(state.preferences.locale, 'report.review')}</h3>
      <div className="il-report-taskstats">
        <TaskStat label={t(state.preferences.locale, 'report.focusRate')} value={`${review.focusRate}%`} accent />
        <TaskStat label={t(state.preferences.locale, 'report.peak')} value={`${review.peakHour}:00`} />
        <TaskStat label={t(state.preferences.locale, 'report.quietHour')} value={`${review.quietHour}:00`} />
      </div>
      <div className="il-review-lines">
        <div>{tx(state.preferences.locale, 'report.focusAndInterrupt', { focus: fmtDurationShort(review.focus, state.preferences.locale), interrupt: fmtDurationShort(review.interrupt, state.preferences.locale) })}</div>
        <div>{review.topSender ? (
          <>
            {t(state.preferences.locale, 'report.topSender')}: <span className="il-nowrap">{formatSenderCount(review.topSender, state.preferences.locale)}</span>
          </>
        ) : t(state.preferences.locale, 'report.noSender')}</div>
        <div>{review.categoryName ? `${t(state.preferences.locale, 'report.topCategory')}: ${review.categoryName}` : t(state.preferences.locale, 'report.noCategory')}</div>
      </div>
      <div className="il-report-emptytrend">{formatWeeklySuggestion(review.suggestion, state.preferences.locale)}</div>
    </div>
  );
}

export function WeekdayTrendCard({ dayStats, maxDay, locale = 'ja-JP' }) {
  const hasTrend = dayStats.some((day) => day.focus > 0 || day.interrupt > 0);
  if (!hasTrend) {
    return (
      <div className="il-card">
        <h3>{t(locale, 'report.weekdayTrend')}</h3>
        <div className="il-report-emptytrend">
          {t(locale, 'report.noWeekdayTrend')}
        </div>
      </div>
    );
  }

  return (
    <div className="il-card">
      <h3>{t(locale, 'report.weekdayTrend')}</h3>
      <div className="il-vchart">
        {dayStats.map((day, index) => (
          <div key={index} className="il-report-weekday">
            <div className="stack interrupt" style={{ height: `${(day.interrupt / maxDay) * 80}%` }} />
            <div className="stack task" style={{ height: `${(day.focus / maxDay) * 80}%` }} />
            <div className="lbl">{day.day}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatSenderCount(sender, locale) {
  const count = tx(locale, 'common.count', sender.count);
  return tx(locale, 'report.senderWithCount', { label: sender.label, count });
}

function formatWeeklySuggestion(suggestion, locale) {
  if (suggestion.kind === 'empty') return t(locale, 'report.weeklySuggestion.empty');
  return tx(locale, `report.weeklySuggestion.${suggestion.kind}`, suggestion.value);
}

export function SendersCard({ senders, maxSenderTime, locale = 'ja-JP' }) {
  if (senders.length === 0) return null;

  return (
    <div className="il-card">
      <h3>{t(locale, 'report.senders')}</h3>
      {senders.map((person, index) => (
        <div key={person.who} className="il-report-row" style={{ borderTop: index > 0 ? '0.5px solid var(--hair)' : 'none' }}>
          <div className="avatar">{person.who[0]}</div>
          <div className="main">
            <div className="title">{person.who}</div>
            <div className="sub">{tx(locale, 'common.count', person.count)}</div>
          </div>
          <div className="spark">
            <div style={{ width: `${(person.time / maxSenderTime) * 100}%` }} />
          </div>
          <div className="il-mono value">{fmtDurationShort(person.time, locale)}</div>
        </div>
      ))}
    </div>
  );
}
