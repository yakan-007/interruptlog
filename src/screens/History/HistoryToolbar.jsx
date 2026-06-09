import Icons from '../../icons';
import { isSameHistoryDay, toHistoryDateInputValue } from '../../history';

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
          <button className="il-iconbtn il-history-navbtn" onClick={() => onShift(-1)} aria-label="前日へ">{Icons.chevL(18)}</button>
          <button className={'il-history-todaybtn' + (isSameHistoryDay(selectedDate, now) ? ' active' : '')} onClick={onToday}>今日</button>
          <button className="il-iconbtn il-history-navbtn" onClick={() => onShift(1)} aria-label="翌日へ">{Icons.chevR(18)}</button>
          <label className="il-iconbtn il-history-navbtn il-history-datepick" aria-label="日付を選ぶ">
            {Icons.calendar(18)}
            <input
              type="date"
              value={toHistoryDateInputValue(selectedDate)}
              onChange={(event) => onSelectDate(event.target.value)}
            />
          </label>
          <button className="il-history-missedbtn" onClick={onAddMissed}>
            {Icons.plus(14)}
            <span>押し忘れ</span>
          </button>
        </div>
      </div>

      <div className="il-history-toolbar">
        <div className="il-seg" role="tablist" aria-label="履歴表示モード">
          <button className={viewMode === 'list' ? 'active' : ''} onClick={() => onSelectView('list')} aria-pressed={viewMode === 'list'}>リスト</button>
          <button className={viewMode === 'timeline' ? 'active' : ''} onClick={() => onSelectView('timeline')} aria-pressed={viewMode === 'timeline'}>タイムライン</button>
        </div>
        <div className="il-history-summary">{summary.count}件 / 合計 {summary.totalLabel}</div>
      </div>
    </>
  );
}
