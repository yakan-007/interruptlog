import DayStepper from '../../components/DayStepper';
import Icons from '../../icons';
import { isSameHistoryDay, toHistoryDateInputValue } from '../../lib/history';
import { t, tx } from '../../i18n';

export default function HistoryToolbar({
  selectedDate,
  dateParts,
  now,
  summary,
  viewMode,
  onShift,
  onToday,
  onSelectDate,
  onSelectView,
  onAddMissed,
  locale = 'ja-JP',
}) {
  return (
    <>
      <div className="il-history-nav">
        <div className="il-history-dateblock">
          <div className="il-history-datebig il-mono">{dateParts.day}</div>
          <div className="il-history-datemeta">
            <div className="month">{dateParts.month}</div>
            <div className="year">{dateParts.year}</div>
            <div className="weekday">
              {dateParts.weekday}
              {/* "Today" is already the lit button; only other days get a label. */}
              {dateParts.relative && !isSameHistoryDay(selectedDate, now) && <span className="il-chip sm accent">{dateParts.relative}</span>}
            </div>
          </div>
        </div>

        <div className="il-history-navactions">
          <DayStepper
            dateValue={toHistoryDateInputValue(selectedDate)}
            isToday={isSameHistoryDay(selectedDate, now)}
            locale={locale}
            onShift={onShift}
            onToday={onToday}
            onPick={onSelectDate}
          />
          <button className="il-history-missedbtn" onClick={onAddMissed}>
            {Icons.plus(14)}
            <span>{t(locale, 'history.missedShort')}</span>
          </button>
        </div>
      </div>

      <div className="il-history-toolbar">
        <div className="il-seg" role="tablist" aria-label={t(locale, 'history.viewMode')}>
          <button className={viewMode === 'list' ? 'active' : ''} onClick={() => onSelectView('list')} aria-pressed={viewMode === 'list'}>{t(locale, 'history.list')}</button>
          <button className={viewMode === 'timeline' ? 'active' : ''} onClick={() => onSelectView('timeline')} aria-pressed={viewMode === 'timeline'}>{t(locale, 'history.timeline')}</button>
        </div>
        <div className="il-history-summary">{tx(locale, 'history.summary', { count: summary.count, total: summary.totalLabel })}</div>
      </div>
    </>
  );
}
