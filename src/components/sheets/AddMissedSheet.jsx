import { useState } from 'react';
import { categoryLabel, interruptCategoryLabel, t, translateMessage, typeLabel, urgencyLabel } from '../../i18n';
import SheetShell from './SheetShell';

export default function AddMissedSheet({ state, actions, onClose, initialDraft }) {
  const [type, setType] = useState(initialDraft?.type ?? 'task');
  const [label, setLabel] = useState(initialDraft?.label ?? '');
  const [taskCategoryId, setTaskCategoryId] = useState(initialDraft?.taskCategoryId ?? state.categories[0]?.id ?? null);
  const [who, setWho] = useState(initialDraft?.who ?? '');
  const [saveWhoChip, setSaveWhoChip] = useState(Boolean(initialDraft?.saveWhoChip));
  const [urgency, setUrgency] = useState(initialDraft?.urgency ?? 'med');
  const [interruptCategoryId, setInterruptCategoryId] = useState(initialDraft?.interruptCategoryId ?? state.interruptCats[0]?.id ?? '');
  const [memo, setMemo] = useState(initialDraft?.memo ?? '');
  const [error, setError] = useState('');
  const [initial] = useState(() => new Date(initialDraft?.dayStart ?? Date.now()));
  const [dayStart] = useState(() => startOfDay(initialDraft?.dayStart ?? Date.now()));
  const [startH, setStartH] = useState(initialDraft?.startH ?? String(initial.getHours()).padStart(2, '0'));
  const [startM, setStartM] = useState(initialDraft?.startM ?? String(initial.getMinutes()).padStart(2, '0'));
  const [endH, setEndH] = useState(initialDraft?.endH ?? String(initial.getHours()).padStart(2, '0'));
  const [endM, setEndM] = useState(initialDraft?.endM ?? String(Math.min(initial.getMinutes() + 30, 59)).padStart(2, '0'));
  const customWho = Boolean(who.trim()) && !state.whoChips.includes(who);
  const locale = state.preferences.locale;

  const handleAdd = () => {
    const base = new Date(dayStart);
    const start = new Date(base);
    const end = new Date(base);
    start.setHours(Number(startH), Number(startM), 0, 0);
    end.setHours(Number(endH), Number(endM), 0, 0);

    if (end <= start) {
      setError(t(locale, 'errors.invalidWindow'));
      return;
    }

    const draft = {
      type,
      label: label || (type === 'interrupt' && who ? (locale === 'ja-JP' ? `${who}から` : `From ${who}`) : ''),
      start: start.getTime(),
      end: end.getTime(),
      memo,
      ...(type === 'task' ? { categoryId: taskCategoryId } : {}),
      ...(type === 'interrupt' ? { who, urgency, categoryId: interruptCategoryId } : {}),
    };
    const previewResult = actions.previewAddMissedEvent(draft, { createGap: false });
    if (previewResult.error) {
      setError(translateMessage(locale, previewResult.error ?? t(locale, 'errors.checkInput')));
      return;
    }

    if (previewResult.preview?.conflicts?.length) {
      actions.openSheet('resolveEvent', {
        mode: 'add',
        preview: previewResult.preview,
        returnSheet: 'addMissed',
        returnArg: { type, label, taskCategoryId, who, saveWhoChip, urgency, interruptCategoryId, memo, startH, startM, endH, endM, dayStart },
        confirmLabel: t(locale, 'sheets.add'),
        successMessage: t(locale, 'toasts.eventAdded'),
      });
      return;
    }

    const result = actions.addMissedEvent(draft, { createGap: false, saveWhoChip });
    if (!result.ok) setError(translateMessage(locale, result.error ?? t(locale, 'errors.checkInput')));
  };

  return (
    <SheetShell title={t(locale, 'sheets.addMissedTitle')} onClose={onClose} footer={
      <>
        <button className="btn tert" onClick={onClose}>{t(locale, 'sheets.cancel')}</button>
        <button className="btn primary" onClick={handleAdd}>{t(locale, 'sheets.add')}</button>
      </>
    }>
      <div className="il-field">
        <label>{t(locale, 'sheets.type')}</label>
        <div className="il-seg full">
          <button className={type === 'task' ? 'active' : ''} onClick={() => setType('task')}>{typeLabel(locale, 'task')}</button>
          <button className={type === 'interrupt' ? 'active' : ''} onClick={() => setType('interrupt')}>{typeLabel(locale, 'interrupt')}</button>
          <button className={type === 'break' ? 'active' : ''} onClick={() => setType('break')}>{typeLabel(locale, 'break')}</button>
        </div>
      </div>
      <div className="il-field">
        <label>{t(locale, 'sheets.label')}</label>
        <input className="il-input" placeholder={t(locale, 'sheets.labelPlaceholder')} value={label} onChange={(event) => setLabel(event.target.value)} />
      </div>

      {type === 'task' && (
        <div className="il-field">
          <label>{t(locale, 'sheets.category')}</label>
          <div className="il-chiprow">
            {state.categories.map((category) => (
              <button
                key={category.id}
                className={'c task-cat' + (taskCategoryId === category.id ? ' sel' : '')}
                onClick={() => setTaskCategoryId(category.id)}
                style={{ '--chip-cat': category.color }}
              >
                <span className="dot" style={{ background: category.color }} />
                {categoryLabel(locale, category)}
              </button>
            ))}
          </div>
        </div>
      )}

      {type === 'interrupt' && (
        <>
          <div className="il-field">
            <label>{t(locale, 'sheets.sender')}</label>
            <div className="il-chiprow">
              <input
                className="c il-chipinput compact"
                placeholder={t(locale, 'sheets.temporaryInput')}
                value={who && !state.whoChips.includes(who) ? who : ''}
                onChange={(event) => setWho(event.target.value)}
              />
              {state.whoChips.map((item) => (
                <button key={item} className={'c' + (who === item ? ' sel' : '')} onClick={() => setWho(item)}>{item}</button>
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
            <label>{t(locale, 'sheets.category')}</label>
            <div className="il-chiprow">
              {state.interruptCats.map((category) => (
                <button key={category.id} className={'c' + (interruptCategoryId === category.id ? ' sel' : '')} onClick={() => setInterruptCategoryId(category.id)}>
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
        </>
      )}

      <div className="il-inline-fields">
        <div className="il-field">
          <label>{t(locale, 'sheets.start')}</label>
          <div className="il-hourinput-row labeled" aria-label={`${t(locale, 'sheets.start')} ${startH}:${startM}`}>
            <label className="il-timepart">
              <input className="il-input" value={startH} onChange={(event) => setStartH(event.target.value)} inputMode="numeric" />
              <span>{t(locale, 'sheets.hour')}</span>
            </label>
            <label className="il-timepart">
              <input className="il-input" value={startM} onChange={(event) => setStartM(event.target.value)} inputMode="numeric" />
              <span>{t(locale, 'sheets.minute')}</span>
            </label>
          </div>
        </div>
        <div className="il-field">
          <label>{t(locale, 'sheets.end')}</label>
          <div className="il-hourinput-row labeled" aria-label={`${t(locale, 'sheets.end')} ${endH}:${endM}`}>
            <label className="il-timepart">
              <input className="il-input" value={endH} onChange={(event) => setEndH(event.target.value)} inputMode="numeric" />
              <span>{t(locale, 'sheets.hour')}</span>
            </label>
            <label className="il-timepart">
              <input className="il-input" value={endM} onChange={(event) => setEndM(event.target.value)} inputMode="numeric" />
              <span>{t(locale, 'sheets.minute')}</span>
            </label>
          </div>
        </div>
      </div>
      <div className="il-field">
        <label>{t(locale, 'sheets.memo')}</label>
        <textarea className="il-textarea" placeholder={t(locale, 'sheets.memoPlaceholder')} value={memo} onChange={(event) => setMemo(event.target.value)} aria-label={t(locale, 'sheets.memo')} />
      </div>
      {error && <div className="il-inline-error">{error}</div>}
    </SheetShell>
  );
}

function startOfDay(timestamp) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}
