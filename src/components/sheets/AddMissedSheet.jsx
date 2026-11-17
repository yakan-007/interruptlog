import { useState } from 'react';
import { interruptCategoryLabel, t, translateError, tx, typeLabel } from '../../i18n';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../lib/datetime';
import SheetShell from './SheetShell';
import TaskTargetFields from '../../screens/History/TaskTargetFields';

export default function AddMissedSheet({ state, actions, onClose, initialDraft }) {
  const interruptCategories = state.interruptCats;
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
  const [interruptCategoryId, setInterruptCategoryId] = useState(initialDraft?.interruptCategoryId ?? interruptCategories[0]?.id ?? state.interruptCats[0]?.id ?? '');
  const [memo, setMemo] = useState(initialDraft?.memo ?? '');
  const [error, setError] = useState('');
  const [startAt, setStartAt] = useState(() => toDateTimeLocalValue(initialDraft?.start ?? Date.now() - 30 * 60000));
  const [endAt, setEndAt] = useState(() => toDateTimeLocalValue(initialDraft?.end ?? Date.now()));
  const customWho = Boolean(who.trim()) && !state.whoChips.includes(who);
  const locale = state.preferences.locale;

  const handleAdd = () => {
    const start = fromDateTimeLocalValue(startAt);
    const end = fromDateTimeLocalValue(endAt);
    if (start == null || end == null) {
      setError(t(locale, 'sheets.dateCheck'));
      return;
    }
    if (end <= start) {
      setError(t(locale, 'errors.invalidWindow'));
      return;
    }

    const draft = {
      type,
      label: label || (type === 'interrupt' && who ? tx(locale, 'common.fromSender', who) : ''),
      start,
      end,
      memo,
      ...(type === 'task' ? { categoryId: taskTarget.categoryId, taskTarget } : {}),
      ...(type === 'interrupt' ? { who, categoryId: interruptCategoryId } : {}),
    };

    if (type === 'task') {
      const previewResult = actions.previewTaskRecord(draft);
      if (previewResult.errorCode) {
        setError(translateError(locale, previewResult.errorCode));
        return;
      }
      if (previewResult.preview?.conflicts?.length) {
        actions.openSheet('resolveEvent', {
          mode: 'taskRecord',
          preview: previewResult.preview,
          record: draft,
          returnSheet: 'addMissed',
          returnArg: { type, label, taskTarget, who, saveWhoChip, interruptCategoryId, memo, start, end },
          confirmLabel: t(locale, 'sheets.add'),
          successMessage: t(locale, 'toasts.eventAdded'),
        });
        return;
      }
      const result = actions.saveTaskRecord(draft);
      if (result.ok) {
        onClose();
        actions.showToast(t(locale, 'toasts.eventAdded'));
      } else setError(translateError(locale, result.errorCode));
      return;
    }

    const previewResult = actions.previewAddMissedEvent(draft, { createGap: false });
    if (previewResult.errorCode) {
      setError(translateError(locale, previewResult.errorCode));
      return;
    }

    if (previewResult.preview?.conflicts?.length) {
      actions.openSheet('resolveEvent', {
        mode: 'add',
        preview: previewResult.preview,
        returnSheet: 'addMissed',
        returnArg: { type, label, taskTarget, who, saveWhoChip, interruptCategoryId, memo, start, end },
        confirmLabel: t(locale, 'sheets.add'),
        successMessage: t(locale, 'toasts.eventAdded'),
      });
      return;
    }

    actions.addMissedEvent(draft, { createGap: false, saveWhoChip });
  };

  return (
    <SheetShell title={t(locale, 'sheets.addMissedTitle')} onClose={onClose} locale={locale} footer={
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
                placeholder={t(locale, 'sheets.newSender')}
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
              {interruptCategories.map((category) => (
                <button key={category.id} className={'c' + (interruptCategoryId === category.id ? ' sel' : '')} onClick={() => setInterruptCategoryId(category.id)}>
                  {interruptCategoryLabel(locale, category)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="il-inline-fields">
        <div className="il-field">
          <label htmlFor="il-missed-start">{t(locale, 'sheets.start')}</label>
          <input id="il-missed-start" className="il-input il-mono" type="datetime-local" value={startAt} onChange={(event) => { setStartAt(event.target.value); setError(''); }} />
        </div>
        <div className="il-field">
          <label htmlFor="il-missed-end">{t(locale, 'sheets.end')}</label>
          <input id="il-missed-end" className="il-input il-mono" type="datetime-local" value={endAt} onChange={(event) => { setEndAt(event.target.value); setError(''); }} />
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
