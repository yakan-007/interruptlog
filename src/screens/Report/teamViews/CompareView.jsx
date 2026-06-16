import { t, tx } from '../../../i18n';
import { ArchiveBreakdown, CompareStat, EmptyTeamCard, TeamStat } from './TeamReportCommon';

export function CompareView({ entries, grain, comparison, onGrainChange, locale = 'ja-JP' }) {
  const hasCurrent = Boolean(comparison.current.period);
  return (
    <>
      <div className="il-report-submode">
        <div className="il-seg full">
          <button className={grain === 'month' ? 'active' : ''} onClick={() => onGrainChange('month')}>{t(locale, 'team.monthly')}</button>
          <button className={grain === 'year' ? 'active' : ''} onClick={() => onGrainChange('year')}>{t(locale, 'team.yearly')}</button>
        </div>
      </div>
      {entries.length === 0 || !hasCurrent ? (
        <EmptyTeamCard title={t(locale, 'team.compareEmptyTitle')} copy={t(locale, 'team.compareEmptyCopy')} />
      ) : (
        <>
          <div className="il-card">
            <h3>{t(locale, 'team.comparePeriod')}</h3>
            <div className="il-report-taskstats">
              <TeamStat label={t(locale, 'team.latest')} value={comparison.current.period || '-'} />
              <TeamStat label={t(locale, 'team.previous')} value={comparison.previous.period || '-'} />
              <TeamStat label={t(locale, 'team.rowCount')} value={tx(locale, 'common.rows', comparison.current.rowCount)} />
            </div>
          </div>
          <div className="il-report-statgrid">
            <CompareStat label={t(locale, 'team.focus')} value={comparison.current.totals.task} delta={comparison.deltas.task} color="var(--task)" locale={locale} />
            <CompareStat label={t(locale, 'team.interrupt')} value={comparison.current.totals.interrupt} delta={comparison.deltas.interrupt} color="var(--interrupt)" locale={locale} />
            <CompareStat label={t(locale, 'team.break')} value={comparison.current.totals.break} delta={comparison.deltas.break} color="var(--break)" locale={locale} />
          </div>
          <ArchiveBreakdown summary={comparison.current} locale={locale} />
        </>
      )}
    </>
  );
}
