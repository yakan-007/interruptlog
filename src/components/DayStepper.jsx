import Icons from '../icons';
import { t } from '../i18n';

// Moving between days reads the same on History and Review: previous, today,
// next, and a calendar button that opens the native date picker.
export default function DayStepper({ dateValue, isToday, canGoNext = true, maxDate, locale, onShift, onToday, onPick }) {
  return (
    <div className="il-daystepper">
      <button type="button" className="il-iconbtn il-daystepper-btn" onClick={() => onShift(-1)} aria-label={t(locale, 'history.previous')}>{Icons.chevL(18)}</button>
      <button type="button" className={'il-daystepper-today' + (isToday ? ' active' : '')} onClick={onToday} aria-pressed={isToday}>{t(locale, 'history.today')}</button>
      <button type="button" className="il-iconbtn il-daystepper-btn" onClick={() => onShift(1)} disabled={!canGoNext} aria-label={t(locale, 'history.next')}>{Icons.chevR(18)}</button>
      <label className="il-iconbtn il-daystepper-btn il-daystepper-pick" aria-label={t(locale, 'history.pickDate')}>
        {Icons.calendar(18)}
        <input type="date" value={dateValue} max={maxDate} onChange={(event) => onPick(event.target.value)} />
      </label>
    </div>
  );
}
