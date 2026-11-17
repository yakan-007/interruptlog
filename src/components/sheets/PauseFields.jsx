import { t } from '../../i18n';

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
  memo,
  setMemo,
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
            placeholder={t(locale, 'sheets.newSender')}
            value={who && !state.whoChips.includes(who) ? who : ''}
            onChange={(event) => setWho(event.target.value)}
          />
          {state.whoChips.map((item) => (
            <button key={item} className={'c' + (who === item ? ' sel' : '')} onClick={() => setWho(item)}>
              {item}
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

      <div className="il-field">
        <label>{t(locale, 'sheets.memo')}</label>
        <textarea className="il-textarea" placeholder={t(locale, 'sheets.memoPlaceholder')} value={memo} onChange={(event) => setMemo(event.target.value)} />
      </div>
    </>
  );
}

export function BreakFields({ locale, memo, setMemo }) {
  return (
    <div className="il-field">
      <label>{t(locale, 'sheets.memo')}</label>
      <textarea className="il-textarea" placeholder={t(locale, 'sheets.breakMemoPlaceholder')} value={memo} onChange={(event) => setMemo(event.target.value)} />
    </div>
  );
}
