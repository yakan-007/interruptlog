import Icons from '../../icons';
import { t, urgencyLabel } from '../../i18n';

export function InterruptFields({
  state,
  locale,
  who,
  setWho,
  saveWhoChip,
  setSaveWhoChip,
  customWho,
  label,
  setLabel,
  urgency,
  setUrgency,
  memo,
  setMemo,
  createFollowup,
}) {
  const scrollChipRow = (event) => {
    const row = event.currentTarget;
    if (row.scrollWidth <= row.clientWidth) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    row.scrollLeft += event.deltaY;
    event.preventDefault();
  };

  return (
    <>
      <div className="il-field">
        <label>{t(locale, 'sheets.sender')}</label>
        <div className="il-chiprow" onWheel={scrollChipRow}>
          <input
            className="c il-chipinput"
            placeholder={t(locale, 'sheets.temporaryInput')}
            value={who && !state.whoChips.includes(who) ? who : ''}
            onChange={(event) => setWho(event.target.value)}
          />
          {state.whoChips.map((item) => (
            <button key={item} className={'c' + (who === item ? ' sel' : '')} onClick={() => setWho(item)}>
              {Icons.user(12)} {item}
            </button>
          ))}
        </div>
        {customWho && (
          <label className="il-inline-check">
            <input type="checkbox" checked={saveWhoChip} onChange={(event) => setSaveWhoChip(event.target.checked)} />
            <span>{t(locale, 'sheets.saveSender')}</span>
          </label>
        )}
      </div>

      <div className="il-field">
        <label>{t(locale, 'sheets.subject')}</label>
        <div className="il-chiprow" onWheel={scrollChipRow}>
          {state.subjectChips.map((item) => (
            <button key={item} className={'c' + (label === item ? ' sel' : '')} onClick={() => setLabel(item)}>{item}</button>
          ))}
        </div>
        <input
          className="il-input"
          placeholder={t(locale, 'sheets.subjectFree')}
          value={label && !state.subjectChips.includes(label) ? label : ''}
          onChange={(event) => setLabel(event.target.value)}
        />
      </div>

      <button className="il-followup-action" onClick={createFollowup}>
        {Icons.plus(14)} {t(locale, 'sheets.followupTask')}
      </button>

      <div className="il-field">
        <label>{t(locale, 'sheets.urgency')}</label>
        <div className="il-urg">
          <button className={urgency === 'low' ? 'sel low' : ''} onClick={() => setUrgency('low')}>{urgencyLabel(locale, 'low')}</button>
          <button className={urgency === 'med' ? 'sel med' : ''} onClick={() => setUrgency('med')}>{urgencyLabel(locale, 'med')}</button>
          <button className={urgency === 'high' ? 'sel high' : ''} onClick={() => setUrgency('high')}>{urgencyLabel(locale, 'high')}</button>
        </div>
      </div>

      <div className="il-field">
        <label>{t(locale, 'sheets.memo')}</label>
        <textarea className="il-textarea" placeholder={t(locale, 'sheets.memoPlaceholder')} value={memo} onChange={(event) => setMemo(event.target.value)} />
      </div>
    </>
  );
}

export function BreakFields({ actions, locale, planned, memo, setMemo }) {
  const presets = [5, 10, 15, 30, 45];
  return (
    <>
      <div className="il-field">
        <label>{t(locale, 'sheets.breakTarget')}</label>
        <div className="il-sheet-copy">
          {t(locale, 'sheets.breakTargetCopy')}
        </div>
        <div className="il-breakpreset-row">
          {presets.map((minutes) => (
            <button
              key={minutes}
              className={'il-breakpreset' + (planned === minutes ? ' active' : '')}
              onClick={() => actions.setBreakTarget(minutes)}
            >
              {minutes}{t(locale, 'sheets.minutes')}
            </button>
          ))}
        </div>
      </div>

      <div className="il-field">
        <label>{t(locale, 'sheets.adjustMinutes')}</label>
        <div className="il-breakplan-row">
          <input className="il-input short" type="number" value={planned} onChange={(event) => actions.setBreakTarget(Number(event.target.value) || 0)} />
          <span className="suffix">{t(locale, 'sheets.minutes')}</span>
        </div>
      </div>

      <div className="il-field">
        <label>{t(locale, 'sheets.memo')}</label>
        <textarea className="il-textarea" placeholder={t(locale, 'sheets.memoPlaceholder')} value={memo} onChange={(event) => setMemo(event.target.value)} />
      </div>
    </>
  );
}
