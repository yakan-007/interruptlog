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
              {dateParts.relative && <span className="il-chip sm accent">{dateParts.relative}</span>}
            </div>
          </div>
        </div>

        <div className="il-history-navactions">
          <button className="il-iconbtn il-history-navbtn" onClick={() => onShift(-1)} aria-label={t(locale, 'history.previous')}>{Icons.chevL(18)}</button>
          <button className={'il-history-todaybtn' + (isSameHistoryDay(selectedDate, now) ? ' active' : '')} onClick={onToday}>{t(locale, 'history.today')}</button>
          <button className="il-iconbtn il-history-navbtn" onClick={() => onShift(1)} aria-label={t(locale, 'history.next')}>{Icons.chevR(18)}</button>
          <label className="il-iconbtn il-history-navbtn il-history-datepick" aria-label={t(locale, 'history.pickDate')}>
            {Icons.calendar(18)}
            <input
              type="date"
              value={toHistoryDateInputValue(selectedDate)}
              onChange={(event) => onSelectDate(event.target.value)}
            />
          </label>
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
