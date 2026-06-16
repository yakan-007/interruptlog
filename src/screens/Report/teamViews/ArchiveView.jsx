import { t } from '../../../i18n';
import { ArchiveBreakdown, ArchivePeriodRow, EmptyTeamCard, SummaryStats } from './TeamReportCommon';

export function ArchiveView({ entries, grain, periods, onGrainChange, locale = 'ja-JP' }) {
  const latest = periods[0] ?? null;
  return (
    <>
      <div className="il-report-submode">
        <div className="il-seg full">
          <button className={grain === 'month' ? 'active' : ''} onClick={() => onGrainChange('month')}>{t(locale, 'team.monthly')}</button>
          <button className={grain === 'year' ? 'active' : ''} onClick={() => onGrainChange('year')}>{t(locale, 'team.yearly')}</button>
        </div>
      </div>
      {entries.length === 0 ? (
        <EmptyTeamCard title={t(locale, 'team.archiveEmptyTitle')} copy={t(locale, 'team.archiveEmptyCopy')} />
      ) : (
        <>
          {latest && <SummaryStats summary={latest} locale={locale} />}
          <div className="il-card">
            <h3>{grain === 'month' ? t(locale, 'team.monthlyArchive') : t(locale, 'team.yearlyArchive')}</h3>
            {periods.slice(0, 12).map((period, index) => (
              <ArchivePeriodRow key={period.period} period={period} showBorder={index > 0} locale={locale} />
            ))}
          </div>
          {latest && <ArchiveBreakdown summary={latest} locale={locale} />}
        </>
      )}
    </>
  );
}
