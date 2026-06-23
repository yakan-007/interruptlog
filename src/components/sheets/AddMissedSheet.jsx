import { useState } from 'react';
import { interruptCategoryLabel, t, translateMessage, typeLabel, urgencyLabel } from '../../i18n';
import { startOfHistoryDay } from '../../lib/history';
import SheetShell from './SheetShell';
import TaskTargetFields from '../../screens/History/TaskTargetFields';

export default function AddMissedSheet({ state, actions, onClose, initialDraft }) {
  const [type, setType] = useState(initialDraft?.type ?? 'task');
  const [label, setLabel] = useState(initialDraft?.label ?? '');
  const [taskTarget, setTaskTarget] = useState(initialDraft?.taskTarget ?? {
    mode: 'new',
    name: initialDraft?.label ?? '',
    categoryId: initialDraft?.taskCategoryId ?? state.categories[0]?.id ?? null,
    complete: true,
  });
  const [who, setWho] = useState(initialDraft?.who ?? '');
  const [saveWhoChip, setSaveWhoChip] = useState(Boolean(initialDraft?.saveWhoChip));
  const [urgency, setUrgency] = useState(initialDraft?.urgency ?? 'med');
  const [interruptCategoryId, setInterruptCategoryId] = useState(initialDraft?.interruptCategoryId ?? state.interruptCats[0]?.id ?? '');
  const [memo, setMemo] = useState(initialDraft?.memo ?? '');
  const [error, setError] = useState('');
  const [initial] = useState(() => new Date(initialDraft?.dayStart ?? Date.now()));
  const [dayStart] = useState(() => startOfHistoryDay(initialDraft?.dayStart ?? Date.now()));
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
      ...(type === 'task' ? { categoryId: taskTarget.categoryId, taskTarget } : {}),
      ...(type === 'interrupt' ? { who, urgency, categoryId: interruptCategoryId } : {}),
    };

    if (type === 'task') {
      const previewResult = actions.previewTaskRecord(draft);
      if (previewResult.error) {
        setError(translateMessage(locale, previewResult.error ?? t(locale, 'errors.checkInput')));
        return;
      }
      if (previewResult.preview?.conflicts?.length) {
        actions.openSheet('resolveEvent', {
          mode: 'taskRecord',
          preview: previewResult.preview,
          record: draft,
          returnSheet: 'addMissed',
          returnArg: { type, label, taskTarget, who, saveWhoChip, urgency, interruptCategoryId, memo, startH, startM, endH, endM, dayStart },
          confirmLabel: t(locale, 'sheets.add'),
          successMessage: t(locale, 'toasts.eventAdded'),
        });
        return;
      }
      const result = actions.saveTaskRecord(draft);
      if (result.ok) onClose();
      else setError(translateMessage(locale, result.error ?? t(locale, 'errors.checkInput')));
      return;
    }

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
        returnArg: { type, label, taskTarget, who, saveWhoChip, urgency, interruptCategoryId, memo, startH, startM, endH, endM, dayStart },
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
      {type === 'task' && (
        <>
          <TaskTargetFields
            state={state}
            value={taskTarget}
            onChange={(next) => { setError(''); setTaskTarget(next); }}
            suggestedName={label}
            locale={locale}
          />
        </>
      )}

      {type !== 'task' && (
        <div className="il-field">
          <label>{type === 'interrupt' ? t(locale, 'sheets.subject') : t(locale, 'sheets.label')}</label>
          <input className="il-input" placeholder={t(locale, 'sheets.labelPlaceholder')} value={label} onChange={(event) => setLabel(event.target.value)} />
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
            <label>{t(locale, 'sheets.interruptCategory')}</label>
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
