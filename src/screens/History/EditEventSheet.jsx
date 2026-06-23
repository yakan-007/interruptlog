import { useState } from 'react';
import SheetShell from '../../components/sheets/SheetShell';
import Icons from '../../icons';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../lib/datetime';
import { interruptCategoryLabel, t, translateMessage, typeLabel, urgencyLabel } from '../../i18n';
import TaskTargetFields from './TaskTargetFields';
import { taskTargetForEvent } from './taskRecordHelpers';

export default function EditEventSheet({ event, state, actions, onClose }) {
  const [label, setLabel] = useState(event.label ?? '');
  const [memo, setMemo] = useState(event.memo ?? '');
  const [type, setType] = useState(event.type === 'unknown' ? 'break' : event.type);
  const [who, setWho] = useState(event.who ?? '');
  const [urgency, setUrgency] = useState(event.urgency ?? 'med');
  const [taskTarget, setTaskTarget] = useState(() => event.taskTarget ?? taskTargetForEvent(event, state));
  const [interruptCategoryId, setInterruptCategoryId] = useState(event.type === 'interrupt' ? event.categoryId ?? state.interruptCats[0]?.id ?? '' : state.interruptCats[0]?.id ?? '');
  const [error, setError] = useState('');
  const [startAt, setStartAt] = useState(toDateTimeLocalValue(event.start));
  const [endAt, setEndAt] = useState(toDateTimeLocalValue(event.end));
  const locale = state.preferences.locale;

  const handleTypeChange = (nextType) => {
    setError('');
    setType(nextType);
  };

  const buildDraft = () => ({
    id: event.id,
    type,
    label,
    memo,
    who,
    urgency,
    categoryId: type === 'interrupt' ? interruptCategoryId : taskTarget.categoryId ?? event.categoryId ?? null,
    taskTarget,
    start: fromDateTimeLocalValue(startAt),
    end: fromDateTimeLocalValue(endAt),
  });

  const handleSave = () => {
    const draft = buildDraft();
    if (draft.start == null || draft.end == null) {
      setError(t(locale, 'sheets.dateCheck'));
      return;
    }
    const previewResult = actions.previewTaskRecord(draft);
    if (previewResult.error) {
      setError(translateMessage(locale, previewResult.error ?? t(locale, 'errors.invalidWindow')));
      return;
    }

    if (previewResult.preview?.conflicts?.length) {
      actions.openSheet('resolveEvent', {
        mode: 'taskRecord',
        preview: previewResult.preview,
        record: draft,
        returnSheet: 'editEvent',
        returnArg: draft,
        confirmLabel: t(locale, 'sheets.save'),
        successMessage: t(locale, 'toasts.eventSaved'),
      });
      return;
    }

    const result = actions.saveTaskRecord(draft);
    if (result.ok) onClose();
    else setError(translateMessage(locale, result.error ?? t(locale, 'errors.invalidWindow')));
  };

  return (
    <SheetShell title={t(locale, 'sheets.editWorkRecord')} onClose={onClose} footer={
      <>
        <button className="btn danger" onClick={() => { actions.deleteEvent(event.id); onClose(); }}>{Icons.trash(14)} {t(locale, 'sheets.delete')}</button>
        <button className="btn tert" onClick={onClose}>{t(locale, 'sheets.cancel')}</button>
        <button className="btn primary" onClick={handleSave}>{t(locale, 'sheets.save')}</button>
      </>
    }>
      <div className="il-field">
        <label>{t(locale, 'sheets.type')}</label>
        <div className="il-seg full">
          {['task', 'interrupt', 'break'].map((value) => (
            <button key={value} type="button" className={type === value ? 'active' : ''} onClick={() => handleTypeChange(value)}>
              {typeLabel(locale, value)}
            </button>
          ))}
        </div>
      </div>

      {type === 'task' ? (
        <>
          <TaskTargetFields
            state={state}
            value={taskTarget}
            onChange={(next) => { setError(''); setTaskTarget(next); }}
            suggestedName={label}
            locale={locale}
          />
        </>
      ) : (
        <div className="il-field">
          <label>{type === 'interrupt' ? t(locale, 'sheets.subject') : t(locale, 'sheets.label')}</label>
          <input className="il-input" value={label} onChange={(current) => setLabel(current.target.value)} />
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
                onChange={(current) => setWho(current.target.value)}
              />
              {state.whoChips.map((item) => (
                <button key={item} type="button" className={'c' + (who === item ? ' sel' : '')} onClick={() => setWho(item)}>{item}</button>
              ))}
            </div>
          </div>

          <div className="il-field">
            <label>{t(locale, 'sheets.interruptCategory')}</label>
            <div className="il-chiprow">
              {state.interruptCats.map((category) => (
                <button key={category.id} type="button" className={'c' + (interruptCategoryId === category.id ? ' sel' : '')} onClick={() => setInterruptCategoryId(category.id)}>
                  {interruptCategoryLabel(locale, category)}
                </button>
              ))}
            </div>
          </div>

          <div className="il-field">
            <label>{t(locale, 'sheets.urgency')}</label>
            <div className="il-urg">
              {['low', 'med', 'high'].map((value) => (
                <button key={value} type="button" className={urgency === value ? `sel ${value}` : ''} onClick={() => setUrgency(value)}>{urgencyLabel(locale, value)}</button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="il-inline-fields">
        <div className="il-field">
          <label>{t(locale, 'sheets.start')}</label>
          <input className="il-input il-mono" type="datetime-local" value={startAt} onChange={(current) => setStartAt(current.target.value)} />
        </div>
        <div className="il-field">
          <label>{t(locale, 'sheets.end')}</label>
          <input className="il-input il-mono" type="datetime-local" value={endAt} onChange={(current) => setEndAt(current.target.value)} />
        </div>
      </div>

      <div className="il-field">
        <label>{t(locale, 'sheets.memo')}</label>
        <textarea className="il-textarea" value={memo} onChange={(current) => setMemo(current.target.value)} />
      </div>

      {error && <div className="il-inline-error">{error}</div>}
    </SheetShell>
  );
}
