import { useEffect, useState } from 'react';
import Icons from '../../icons';
import { getTaskDuePresets } from '../../lib/formatters';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../lib/datetime';
import { categoryLabel, t, translateError } from '../../i18n';
import ConfirmFooter from './ConfirmFooter';
import SheetShell from './SheetShell';

export default function AddTaskSheet({ state, actions, onClose, editing, draft, onDraftChange, onAfterSubmit }) {
  const locale = state.preferences.locale;
  const duePresets = getTaskDuePresets(new Date(), locale, state.preferences.workSchedule);
  const [name, setName] = useState(editing?.name ?? draft?.name ?? '');
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? draft?.categoryId ?? state.categories[0]?.id ?? null);
  const [plannedDurationMinutes, setPlannedDurationMinutes] = useState(editing?.planning?.plannedDurationMinutes ?? draft?.plannedDurationMinutes ?? 0);
  const [dueAt, setDueAt] = useState(editing?.planning?.dueAt ?? draft?.dueAt ?? null);
  const [memo, setMemo] = useState(editing?.memo ?? draft?.memo ?? '');
  const presetDue = (value) => duePresets.some((option) => option.value != null && option.value === value);
  const [customDue, setCustomDue] = useState(() => dueAt != null && !presetDue(dueAt));
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (editing || !onDraftChange) return;
    onDraftChange({ name, categoryId, plannedDurationMinutes, dueAt, memo });
  }, [categoryId, dueAt, editing, memo, name, onDraftChange, plannedDurationMinutes]);

  const update = (setter) => (value) => {
    setError('');
    setter(value);
  };

  const submit = (mode) => {
    const payload = {
      id: editing?.id,
      name,
      categoryId,
      plannedDurationMinutes,
      dueAt,
      memo,
    };
    const result = editing
      ? actions.saveTask(payload)
      : mode === 'start'
        ? actions.createTaskAndStart(payload)
        : actions.createTask(payload);
    if (!result.ok) {
      setError(translateError(locale, result.errorCode));
      return;
    }
    setError('');
    if (!editing) onAfterSubmit?.({ name, categoryId, plannedDurationMinutes, dueAt, memo, taskId: result.taskId });
    onClose();
  };

  return (
    <SheetShell title={editing ? t(locale, 'sheets.taskEdit') : t(locale, 'sheets.taskAdd')} onClose={onClose} locale={locale} footer={confirmingDelete ? (
      <ConfirmFooter
        message={t(locale, 'sheets.deleteTaskConfirm')}
        backLabel={t(locale, 'sheets.back')}
        confirmLabel={t(locale, 'sheets.deleteAction')}
        onBack={() => setConfirmingDelete(false)}
        onConfirm={() => actions.deleteTask(editing.id)}
      />
    ) : (
      <>
        {editing && <button className="btn danger" onClick={() => setConfirmingDelete(true)}>{Icons.trash(14)} {t(locale, 'sheets.delete')}</button>}
        <button className="btn tert" onClick={onClose}>{t(locale, 'sheets.cancel')}</button>
        {editing ? (
          <button className="btn primary" onClick={() => submit('save')}>{t(locale, 'sheets.save')}</button>
        ) : (
          <>
            <button className="btn secondary" onClick={() => submit('create')}>{t(locale, 'sheets.add')}</button>
            <button className="btn primary" onClick={() => submit('start')}>{t(locale, 'sheets.addAndStart')}</button>
          </>
        )}
      </>
    )}>
      <div className="il-field">
        <label>{t(locale, 'sheets.taskName')}</label>
        <input className="il-input" placeholder={t(locale, 'sheets.taskPlaceholder')} value={name} onChange={(event) => update(setName)(event.target.value)} aria-label={t(locale, 'sheets.taskName')} autoFocus />
      </div>
      <div className="il-field">
        <label>{t(locale, 'sheets.category')}</label>
        <div className="il-chipgrid">
          {state.categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={'c' + (categoryId === category.id ? ' sel' : '')}
              aria-pressed={categoryId === category.id}
              onClick={() => update(setCategoryId)(category.id)}
            >
              <span className="dot" style={{ background: category.color }} />
              {categoryLabel(locale, category)}
            </button>
          ))}
        </div>
      </div>
      <div className="il-field">
        <label>{t(locale, 'sheets.plannedTime')}</label>
        <div className="il-sheet-planrow">
          <input
            className="il-input short"
            type="number"
            min="0"
            value={plannedDurationMinutes}
            onChange={(event) => update(setPlannedDurationMinutes)(Number(event.target.value) || 0)}
            aria-label={t(locale, 'sheets.plannedTime')}
          />
          <span className="suffix">{t(locale, 'sheets.minutes')}</span>
        </div>
        <div className="il-chipgrid">
          {[[t(locale, 'sheets.unset'), 0], ['15', 15], ['30', 30], ['60', 60], ['120', 120]].map(([label, minutes]) => (
            <button key={minutes} type="button" className={'c' + (plannedDurationMinutes === minutes ? ' sel' : '')} aria-pressed={plannedDurationMinutes === minutes} onClick={() => update(setPlannedDurationMinutes)(minutes)}>{label}</button>
          ))}
        </div>
      </div>
      <div className="il-field">
        <label>{t(locale, 'sheets.due')}</label>
        <div className="il-chipgrid">
          {duePresets.filter((option) => option.value != null).map((option) => {
            const selected = !customDue && dueAt === option.value;
            return (
              <button key={option.label} type="button" className={'c' + (selected ? ' sel' : '')} aria-pressed={selected} onClick={() => { setCustomDue(false); update(setDueAt)(option.value); }}>
                {option.label}
              </button>
            );
          })}
          <button type="button" className={'c' + (customDue ? ' sel' : '')} aria-pressed={customDue} onClick={() => { setError(''); setCustomDue(true); }}>
            {t(locale, 'sheets.dueCustom')}
          </button>
          <button type="button" className={'c' + (!customDue && dueAt == null ? ' sel' : '')} aria-pressed={!customDue && dueAt == null} onClick={() => { setCustomDue(false); update(setDueAt)(null); }}>
            {t(locale, 'sheets.dueNone')}
          </button>
        </div>
        {customDue && (
          <div className="il-sheet-dueinput">
            <input
              className="il-input"
              type="datetime-local"
              value={toDateTimeLocalValue(dueAt)}
              onChange={(event) => update(setDueAt)(fromDateTimeLocalValue(event.target.value))}
              aria-label={t(locale, 'sheets.dueDateTime')}
            />
          </div>
        )}
      </div>
      <div className="il-field">
        <label>{t(locale, 'sheets.memo')}</label>
        <textarea className="il-textarea" placeholder={t(locale, 'sheets.taskMemoPlaceholder')} value={memo} onChange={(event) => update(setMemo)(event.target.value)} aria-label={t(locale, 'sheets.memo')} />
      </div>
      {error && <div className="il-inline-error">{error}</div>}
    </SheetShell>
  );
}
