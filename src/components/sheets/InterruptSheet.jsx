import { useEffect, useState } from 'react';
import Icons from '../../icons';
import { useTicker } from '../../lib/ticker';
import { elapsedSince } from '../../lib/timer';
import { interruptCategoryLabel, t, urgencyLabel } from '../../i18n';
import SheetShell from './SheetShell';
import TimerPanel from './TimerPanel';

export default function InterruptSheet({ state, actions, onClose, onDraftChange, initialDraft }) {
  const [who, setWho] = useState(initialDraft?.who ?? '');
  const [saveWhoChip, setSaveWhoChip] = useState(initialDraft?.saveWhoChip ?? false);
  const [label, setLabel] = useState(initialDraft?.label ?? '');
  const [urgency, setUrgency] = useState(initialDraft?.urgency ?? 'med');
  const [categoryId, setCategoryId] = useState(initialDraft?.categoryId ?? state.interruptCats[0]?.id ?? '');
  const [memo, setMemo] = useState(initialDraft?.memo ?? '');
  const now = useTicker(1000);
  const locale = state.preferences.locale;

  const runTask = state.tasks.find((task) => task.id === state.running?.preTaskId);
  const elapsed = elapsedSince(state.running?.start ?? now, now);
  const customWho = Boolean(who.trim()) && !state.whoChips.includes(who);

  useEffect(() => {
    onDraftChange?.({ who, saveWhoChip, label, urgency, categoryId, memo });
  }, [categoryId, label, memo, onDraftChange, saveWhoChip, urgency, who]);

  const save = (resume) => {
    actions.saveInterrupt({ who, saveWhoChip, label: label || (who ? (locale === 'ja-JP' ? `${who}から` : `From ${who}`) : t(locale, 'common.interrupt')), urgency, categoryId, memo, resume });
  };

  const createFollowup = () => {
    actions.openSheet('interruptFollowup', { who, saveWhoChip, label, urgency, categoryId, memo });
  };

  const switchActivity = (nextSheet) => {
    onDraftChange?.({ who, saveWhoChip, label, urgency, categoryId, memo });
    actions.openSheet(nextSheet);
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

      <TimerPanel
        className="il-sheet-timer interrupt"
        elapsed={elapsed}
        eyebrow={t(locale, 'sheets.interrupting')}
        locale={locale}
      />

      <div className="il-activity-switch">
        <span>{t(locale, 'sheets.switchActivity')}</span>
        <div className="il-activity-switch-actions">
          <button className="il-activity-switch-btn interrupt" onClick={() => switchActivity('newInterrupt')}>
            {Icons.bolt(14)} {t(locale, 'sheets.startAnotherInterrupt')}
          </button>
          <button className="il-activity-switch-btn break" onClick={() => switchActivity('newBreak')}>
            {Icons.coffee(14)} {t(locale, 'sheets.startBreak')}
          </button>
        </div>
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

      <button className="il-followup-action" onClick={createFollowup}>
        {Icons.plus(14)} {t(locale, 'sheets.followupTask')}
      </button>

      <div className="il-field">
        <label>{t(locale, 'sheets.interruptCategory')}</label>
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
