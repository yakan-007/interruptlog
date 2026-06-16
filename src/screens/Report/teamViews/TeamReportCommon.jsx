import { fmtDurationShort } from '../../../lib/formatters';
import { t, tx } from '../../../i18n';
import StatCard from '../StatCard';

export function PresencePill({ label, value }) {
  return <span><strong>{label}</strong>{value}</span>;
}

export function SummaryStats({ summary, locale = 'ja-JP' }) {
  return (
    <div className="il-report-statgrid">
      <StatCard label={t(locale, 'team.focusTime')} color="var(--task)" value={summary.totals.task} />
      <StatCard label={t(locale, 'team.interruptTime')} color="var(--interrupt)" value={summary.totals.interrupt} />
      <StatCard label={t(locale, 'team.breakTime')} color="var(--break)" value={summary.totals.break} />
    </div>
  );
}

export function TeamSummaryCards({ summary, locale = 'ja-JP' }) {
  return (
    <>
      <div className="il-card">
        <h3>{t(locale, 'team.total')}</h3>
        <div className="il-report-taskstats">
          <TeamStat label={t(locale, 'team.totalRecords')} value={fmtDurationShort(summary.totals.total, locale)} />
          <TeamStat label={t(locale, 'team.interruptions')} value={tx(locale, 'common.count', summary.totals.interruptCount)} />
          <TeamStat label={t(locale, 'team.people')} value={tx(locale, 'common.people', summary.members.length)} />
        </div>
      </div>
      <MemberList members={summary.members} locale={locale} />
      {summary.senders.length > 0 && <SenderList senders={summary.senders} locale={locale} />}
    </>
  );
}

export function ArchiveBreakdown({ summary, locale = 'ja-JP' }) {
  return (
    <>
      <MemberList members={summary.members} locale={locale} />
      {summary.categories.length > 0 && <CategoryList categories={summary.categories} locale={locale} />}
      {summary.senders.length > 0 && <SenderList senders={summary.senders} locale={locale} />}
    </>
  );
}

function MemberList({ members, locale = 'ja-JP' }) {
  const maxTotal = Math.max(...members.map((member) => member.total), 1);
  return (
    <div className="il-card">
      <h3>{t(locale, 'team.byMember')}</h3>
      {members.map((member, index) => (
        <div key={member.member} className="il-report-row il-team-memberrow" style={{ borderTop: index > 0 ? '0.5px solid var(--hair)' : 'none' }}>
          <div className="avatar">{member.member[0]}</div>
          <div className="main">
            <div className="title">{member.member}</div>
            <div className="sub">{tx(locale, 'team.focusWithDuration', fmtDurationShort(member.task, locale))} · {tx(locale, 'team.interruptsWithCount', member.interruptCount)}</div>
          </div>
          <div className="spark">
            <div style={{ width: `${(member.total / maxTotal) * 100}%`, background: 'var(--task)' }} />
          </div>
          <div className="il-mono value">{fmtDurationShort(member.total, locale)}</div>
        </div>
      ))}
    </div>
  );
}

function CategoryList({ categories, locale = 'ja-JP' }) {
  const maxTotal = Math.max(...categories.map((category) => category.total), 1);
  return (
    <div className="il-card">
      <h3>{t(locale, 'team.byCategory')}</h3>
      {categories.slice(0, 8).map((category, index) => (
        <div key={category.category} className="il-report-row" style={{ borderTop: index > 0 ? '0.5px solid var(--hair)' : 'none' }}>
          <div className="main">
            <div className="title">{category.name}</div>
            <div className="sub">{tx(locale, 'team.focusWithDuration', fmtDurationShort(category.task, locale))} · {t(locale, 'team.interrupt')} {fmtDurationShort(category.interrupt, locale)}</div>
          </div>
          <div className="spark">
            <div style={{ width: `${(category.total / maxTotal) * 100}%`, background: 'var(--accent)' }} />
          </div>
          <div className="il-mono value">{fmtDurationShort(category.total, locale)}</div>
        </div>
      ))}
    </div>
  );
}

function SenderList({ senders, locale = 'ja-JP' }) {
  const maxSenderTime = Math.max(...senders.map((sender) => sender.time), 1);
  return (
    <div className="il-card">
      <h3>{t(locale, 'team.bySender')}</h3>
      {senders.map((sender, index) => (
        <div key={sender.who} className="il-report-row" style={{ borderTop: index > 0 ? '0.5px solid var(--hair)' : 'none' }}>
          <div className="avatar">{sender.who[0]}</div>
          <div className="main">
            <div className="title">{sender.who}</div>
            <div className="sub">{tx(locale, 'common.count', sender.count)}</div>
          </div>
          <div className="spark">
            <div style={{ width: `${(sender.time / maxSenderTime) * 100}%` }} />
          </div>
          <div className="il-mono value">{fmtDurationShort(sender.time, locale)}</div>
        </div>
      ))}
    </div>
  );
}

export function ArchivePeriodRow({ period, showBorder, locale = 'ja-JP' }) {
  return (
    <div className="il-report-row" style={{ borderTop: showBorder ? '0.5px solid var(--hair)' : 'none' }}>
      <div className="main">
        <div className="title">{period.period}</div>
        <div className="sub">{tx(locale, 'team.archivePeriodMeta', { people: period.members.length, rows: period.rowCount, interrupts: period.totals.interruptCount })}</div>
      </div>
      <div className="il-mono value">{fmtDurationShort(period.totals.total, locale)}</div>
    </div>
  );
}

export function CompareStat({ label, value, delta, color, locale = 'ja-JP' }) {
  return (
    <div className="il-card il-statcard">
      <div className="il-statcard-head">
        <span className="swatch" style={{ background: color }} />
        <span className="label">{label}</span>
      </div>
      <div className="il-stat">{fmtDurationShort(value, locale)}</div>
      <div className={'il-delta ' + (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat')}>{formatDelta(delta, locale)}</div>
    </div>
  );
}

export function TeamStat({ label, value }) {
  return (
    <div className="il-taskstat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

export function EmptyTeamCard({ title, copy }) {
  return (
    <div className="il-card">
      <h3>{title}</h3>
      <div className="il-report-exportcopy">{copy}</div>
    </div>
  );
}

function formatDelta(value, locale = 'ja-JP') {
  if (!value) return t(locale, 'team.deltaZero');
  return `${value > 0 ? '+' : '-'}${fmtDurationShort(Math.abs(value), locale)}`;
}
