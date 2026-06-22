import { useEffect, useState } from 'react';
import Icons from '../../icons';
import { getTaskDuePresets } from '../../lib/formatters';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../lib/datetime';
import { categoryLabel, t, translateMessage } from '../../i18n';
import SheetShell from './SheetShell';

export default function AddTaskSheet({ state, actions, onClose, editing, draft, onDraftChange, onAfterSubmit, followup = false, interruptData, onBackToInterrupt }) {
  const locale = state.preferences.locale;
  const duePresets = getTaskDuePresets(new Date(), locale, state.preferences.workSchedule);
  const [name, setName] = useState(editing?.name ?? draft?.name ?? '');
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? draft?.categoryId ?? state.categories[0]?.id ?? null);
  const [plannedDurationMinutes, setPlannedDurationMinutes] = useState(editing?.planning?.plannedDurationMinutes ?? draft?.plannedDurationMinutes ?? 0);
  const [dueAt, setDueAt] = useState(editing?.planning?.dueAt ?? draft?.dueAt ?? null);
  const [memo, setMemo] = useState(editing?.memo ?? draft?.memo ?? '');
  const [error, setError] = useState('');
  const selectedCategory = state.categories.find((category) => category.id === categoryId) ?? null;
  const taskAccent = selectedCategory?.color ?? 'var(--accent)';
  const isPaused = state.running?.type === 'interrupt' || state.running?.type === 'break';

  useEffect(() => {
    if (editing || followup || !onDraftChange) return;
    onDraftChange({ name, categoryId, plannedDurationMinutes, dueAt, memo });
  }, [categoryId, dueAt, editing, followup, memo, name, onDraftChange, plannedDurationMinutes]);

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
    const result = followup
      ? actions.createInterruptFollowupTask(interruptData, payload)
      : editing
      ? actions.saveTask(payload)
      : mode === 'start'
        ? actions.createTaskAndStart(payload)
        : actions.createTask(payload);
    if (!result.ok) {
      setError(translateMessage(locale, result.error ?? t(locale, 'errors.checkInput')));
      return;
    }
    setError('');
    if (!editing && !followup) onAfterSubmit?.({ name, categoryId, plannedDurationMinutes, dueAt, memo });
    onClose();
  };

  return (
    <SheetShell title={followup ? t(locale, 'sheets.followupTaskTitle') : editing ? t(locale, 'sheets.taskEdit') : t(locale, 'sheets.taskDetails')} onClose={followup ? onBackToInterrupt : onClose} footer={
      <>
        {editing && <button className="btn danger" onClick={() => actions.deleteTask(editing.id)}>{Icons.trash(14)} {t(locale, 'sheets.delete')}</button>}
        <button className="btn tert" onClick={followup ? onBackToInterrupt : onClose}>{followup ? t(locale, 'sheets.back') : t(locale, 'sheets.cancel')}</button>
        {followup ? (
          <button className="btn task-primary" style={{ '--task-cat': taskAccent }} onClick={() => submit('create')}>{t(locale, 'sheets.createAndResume')}</button>
        ) : editing ? (
          <button className="btn task-primary" style={{ '--task-cat': taskAccent }} onClick={() => submit('save')}>{t(locale, 'sheets.save')}</button>
        ) : (
          <>
            <button className="btn secondary" onClick={() => submit('create')}>{t(locale, 'sheets.add')}</button>
            <button className="btn task-primary" style={{ '--task-cat': taskAccent }} onClick={() => submit('start')} disabled={isPaused}>{Icons.play(12)} {t(locale, 'sheets.addAndStart')}</button>
          </>
        )}
      </>
    }>
      <div className="il-field">
        <label>{t(locale, 'sheets.taskName')}</label>
        <input className="il-input" placeholder={t(locale, 'sheets.taskPlaceholder')} value={name} onChange={(event) => update(setName)(event.target.value)} aria-label={t(locale, 'sheets.taskName')} autoFocus />
      </div>
      {followup && <div className="il-sheet-copy il-followup-copy">{t(locale, 'sheets.followupTaskCopy')}</div>}
      <div className="il-field">
        <label>{t(locale, 'sheets.category')}</label>
        <div className="il-chiprow">
          {state.categories.map((category) => (
            <button
              key={category.id}
              className={'c task-cat' + (categoryId === category.id ? ' sel' : '')}
              onClick={() => update(setCategoryId)(category.id)}
              style={{ '--chip-cat': category.color, borderLeft: `3px solid ${category.color}` }}
            >
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
            value={plannedDurationMinutes}
            onChange={(event) => update(setPlannedDurationMinutes)(Number(event.target.value) || 0)}
          />
          <span className="suffix">{t(locale, 'sheets.minutes')}</span>
          <div className="spacer" />
          {[[t(locale, 'sheets.unset'), 0], ['15', 15], ['30', 30], ['60', 60], ['120', 120]].map(([label, minutes]) => (
            <button key={minutes} className="btn sm secondary" onClick={() => update(setPlannedDurationMinutes)(minutes)}>{label}</button>
          ))}
        </div>
      </div>
      <div className="il-field">
        <label>{t(locale, 'sheets.due')}</label>
        <div className="il-sheet-presetrow">
          {duePresets.map((option) => (
            <button key={option.label} className={'btn sm ' + (dueAt === option.value ? 'primary' : 'secondary')} onClick={() => update(setDueAt)(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
        <input
          className="il-input"
          type="datetime-local"
          value={toDateTimeLocalValue(dueAt)}
          onChange={(event) => update(setDueAt)(fromDateTimeLocalValue(event.target.value))}
          aria-label={t(locale, 'sheets.dueDateTime')}
        />
      </div>
      <div className="il-field">
        <label>{t(locale, 'sheets.memo')}</label>
        <textarea className="il-textarea" placeholder={t(locale, 'sheets.memoPlaceholder')} value={memo} onChange={(event) => update(setMemo)(event.target.value)} aria-label={t(locale, 'sheets.memo')} />
      </div>
      {error && <div className="il-inline-error">{error}</div>}
    </SheetShell>
  );
}
