import { useState } from 'react';
import Icons from '../../icons';
import { fmtDuration } from '../../lib/formatters';
import { useTicker } from '../../lib/ticker';
import { interruptCategoryLabel, t, urgencyLabel } from '../../i18n';
import SheetShell from './SheetShell';

export default function InterruptSheet({ state, actions, onClose }) {
  const [who, setWho] = useState('');
  const [saveWhoChip, setSaveWhoChip] = useState(false);
  const [label, setLabel] = useState('');
  const [urgency, setUrgency] = useState('med');
  const [categoryId, setCategoryId] = useState(state.interruptCats[0]?.id ?? '');
  const [memo, setMemo] = useState('');
  const now = useTicker(1000);
  const locale = state.preferences.locale;

  const runTask = state.tasks.find((task) => task.id === state.running?.preTaskId);
  const elapsed = Math.max(0, now - (state.running?.start ?? now));
  const customWho = Boolean(who.trim()) && !state.whoChips.includes(who);

  const save = (resume) => {
    actions.saveInterrupt({ who, saveWhoChip, label: label || (who ? (locale === 'ja-JP' ? `${who}から` : `From ${who}`) : t(locale, 'common.interrupt')), urgency, categoryId, memo, resume });
  };

  const scrollChipRow = (event) => {
    const row = event.currentTarget;
    if (row.scrollWidth <= row.clientWidth) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    row.scrollLeft += event.deltaY;
    event.preventDefault();
  };

  return (
    <SheetShell title={t(locale, 'sheets.interruptTitle')} onClose={onClose} footer={
      <>
        <button className="btn tert" onClick={() => actions.cancelInterrupt()}>{t(locale, 'sheets.cancel')}</button>
        <button className="btn secondary" onClick={() => save(false)}>{t(locale, 'sheets.saveAndEnd')}</button>
        <button className="btn primary" onClick={() => save(true)}>{t(locale, 'sheets.saveAndResume')}</button>
      </>
    }>
      {runTask && (
        <div className="il-sheet-infobox">
          <div className="dot muted" />
          <div className="meta">
            <span className="strong">{t(locale, 'sheets.pausedTask')}</span> <span>{runTask.name}</span>
          </div>
          <div className="il-mono quiet">{t(locale, 'sheets.paused')}</div>
        </div>
      )}

      <div className="il-sheet-timer interrupt">
        <div className="eyebrow">{t(locale, 'sheets.interrupting')}</div>
        <div className="value il-mono">{fmtDuration(elapsed, { showSec: true, locale })}</div>
      </div>

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

      <div className="il-field">
        <label>{t(locale, 'sheets.category')}</label>
        <div className="il-chiprow" onWheel={scrollChipRow}>
          {state.interruptCats.map((category) => (
            <button key={category.id} className={'c' + (categoryId === category.id ? ' sel' : '')} onClick={() => setCategoryId(category.id)}>
              {interruptCategoryLabel(locale, category)}
            </button>
          ))}
        </div>
      </div>

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
    </SheetShell>
  );
}
