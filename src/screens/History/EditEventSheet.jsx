import { useState } from 'react';
import ConfirmFooter from '../../components/sheets/ConfirmFooter';
import SheetShell from '../../components/sheets/SheetShell';
import Icons from '../../icons';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../lib/datetime';
import { interruptCategoryLabel, t, translateError, typeLabel } from '../../i18n';
import TaskTargetFields from './TaskTargetFields';
import { taskTargetForEvent } from './taskRecordHelpers';

export default function EditEventSheet({ event, state, actions, onClose }) {
  const interruptCategories = state.interruptCats;
  const [label, setLabel] = useState(event.label ?? '');
  const [memo, setMemo] = useState(event.memo ?? '');
  const [type, setType] = useState(event.type === 'unknown' ? 'break' : event.type);
  const [who, setWho] = useState(event.who ?? '');
  const [saveWhoChip, setSaveWhoChip] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [taskTarget, setTaskTarget] = useState(() => event.taskTarget ?? taskTargetForEvent(event, state));
  const [interruptCategoryId, setInterruptCategoryId] = useState(event.type === 'interrupt' ? event.categoryId ?? interruptCategories[0]?.id ?? '' : interruptCategories[0]?.id ?? '');
  const [error, setError] = useState('');
  const [startAt, setStartAt] = useState(toDateTimeLocalValue(event.start, { includeSeconds: true }));
  const [endAt, setEndAt] = useState(toDateTimeLocalValue(event.end, { includeSeconds: true }));
  const locale = state.preferences.locale;
  const customWho = type === 'interrupt' && Boolean(who.trim()) && !state.whoChips.includes(who.trim());

  const rememberSender = () => {
    if (customWho && saveWhoChip) actions.saveChips('who', [...state.whoChips, who.trim()]);
  };

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
    if (previewResult.errorCode) {
      setError(translateError(locale, previewResult.errorCode, 'errors.invalidWindow'));
      return;
    }

    if (previewResult.preview?.conflicts?.length) {
      actions.openSheet('resolveEvent', {
        mode: 'taskRecord',
        preview: previewResult.preview,
        record: draft,
        onConfirmed: rememberSender,
        returnSheet: 'editEvent',
        returnArg: draft,
        confirmLabel: t(locale, 'sheets.save'),
        successMessage: t(locale, 'toasts.eventSaved'),
      });
      return;
    }

    const result = actions.saveTaskRecord(draft);
    if (result.ok) {
      rememberSender();
      onClose();
      actions.showToast(t(locale, 'toasts.eventSaved'));
    } else setError(translateError(locale, result.errorCode, 'errors.invalidWindow'));
  };

  return (
    <SheetShell title={t(locale, 'sheets.editRecord')} onClose={onClose} locale={locale} footer={confirmingDelete ? (
      <ConfirmFooter
        message={t(locale, 'sheets.deleteRecordConfirm')}
        backLabel={t(locale, 'sheets.back')}
        confirmLabel={t(locale, 'sheets.deleteAction')}
        onBack={() => setConfirmingDelete(false)}
        onConfirm={() => { actions.deleteEvent(event.id); onClose(); actions.showToast(t(locale, 'toasts.eventDeleted')); }}
      />
    ) : (
      <>
        <button className="btn danger" onClick={() => setConfirmingDelete(true)}>{Icons.trash(14)} {t(locale, 'sheets.delete')}</button>
        <button className="btn tert" onClick={onClose}>{t(locale, 'sheets.cancel')}</button>
        <button className="btn primary" onClick={handleSave}>{t(locale, 'sheets.save')}</button>
      </>
    )}>
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
      ) : type === 'interrupt' ? (
        <>
          <div className="il-field">
            <label>{t(locale, 'sheets.pauseCategory')}</label>
            <div className="il-chipgrid">
              {interruptCategories.map((category) => (
                <button key={category.id} type="button" className={'c' + (interruptCategoryId === category.id ? ' sel' : '')} aria-pressed={interruptCategoryId === category.id} onClick={() => setInterruptCategoryId(category.id)}>
                  {interruptCategoryLabel(locale, category)}
                </button>
              ))}
            </div>
          </div>
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
            {customWho && (
              <label className="il-inline-check">
                <input type="checkbox" checked={saveWhoChip} onChange={(current) => setSaveWhoChip(current.target.checked)} />
                <span>{t(locale, 'sheets.saveSender')}</span>
              </label>
            )}
          </div>

          <div className="il-field">
            <label>{t(locale, 'sheets.subject')}</label>
            <input className="il-input" placeholder={t(locale, 'sheets.subjectPlaceholder')} value={label} onChange={(current) => setLabel(current.target.value)} />
          </div>
        </>
      ) : (
        <div className="il-field">
          <label>{t(locale, 'sheets.label')}</label>
          <input className="il-input" value={label} onChange={(current) => setLabel(current.target.value)} />
        </div>
      )}

      <div className="il-inline-fields">
        <div className="il-field">
          <label>{t(locale, 'sheets.start')}</label>
          <input className="il-input il-mono" type="datetime-local" step="1" value={startAt} onChange={(current) => setStartAt(current.target.value)} />
        </div>
        <div className="il-field">
          <label>{t(locale, 'sheets.end')}</label>
          <input className="il-input il-mono" type="datetime-local" step="1" value={endAt} onChange={(current) => setEndAt(current.target.value)} />
        </div>
      </div>

      <div className="il-field">
        <label>{t(locale, 'sheets.memo')}</label>
        <textarea className="il-textarea" placeholder={t(locale, memoPlaceholderKey(type))} value={memo} onChange={(current) => setMemo(current.target.value)} />
      </div>

      {error && <div className="il-inline-error">{error}</div>}
    </SheetShell>
  );
}

function memoPlaceholderKey(type) {
  if (type === 'interrupt') return 'sheets.memoPlaceholder';
  if (type === 'break') return 'sheets.breakMemoPlaceholder';
  return 'sheets.taskMemoPlaceholder';
}
