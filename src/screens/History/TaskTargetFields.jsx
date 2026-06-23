import { categoryLabel, t } from '../../i18n';

export default function TaskTargetFields({ state, value, onChange, suggestedName = '', locale = 'ja-JP' }) {
  const activeTasks = state.tasks.filter((task) => !task.isCompleted);
  const completedTasks = state.tasks.filter((task) => task.isCompleted);
  const selectableTasks = [...activeTasks, ...completedTasks];
  const categoryId = value.categoryId ?? state.categories[0]?.id ?? null;

  const changeMode = (mode) => {
    if (mode === 'existing') {
      const fallback = activeTasks[0] ?? completedTasks[0];
      onChange({ mode, taskId: value.taskId ?? fallback?.id ?? null });
      return;
    }
    if (mode === 'new') {
      onChange({
        mode,
        name: value.name ?? suggestedName,
        categoryId,
        complete: Boolean(value.complete),
      });
      return;
    }
    onChange({ mode, categoryId });
  };

  return (
    <div className="il-field il-task-target-field">
      <label>{t(locale, 'sheets.workDestination')}</label>
      <div className="il-seg full">
        <button type="button" className={value.mode === 'existing' ? 'active' : ''} disabled={selectableTasks.length === 0} onClick={() => changeMode('existing')}>
          {t(locale, 'sheets.existingTask')}
        </button>
        <button type="button" className={value.mode === 'new' ? 'active' : ''} onClick={() => changeMode('new')}>
          {t(locale, 'sheets.createTaskFromRecord')}
        </button>
        <button type="button" className={value.mode === 'none' ? 'active' : ''} onClick={() => changeMode('none')}>
          {t(locale, 'sheets.noTask')}
        </button>
      </div>

      {value.mode === 'existing' && (
        <select
          className="il-input il-task-target-select"
          value={value.taskId ?? ''}
          onChange={(event) => onChange({ mode: 'existing', taskId: event.target.value || null })}
          aria-label={t(locale, 'sheets.existingTask')}
        >
          {activeTasks.length > 0 && (
            <optgroup label={t(locale, 'sheets.openTasks')}>
              {activeTasks.map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}
            </optgroup>
          )}
          {completedTasks.length > 0 && (
            <optgroup label={t(locale, 'sheets.completedTasks')}>
              {completedTasks.map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}
            </optgroup>
          )}
        </select>
      )}

      {value.mode === 'new' && (
        <>
          <input
            className="il-input"
            value={value.name ?? ''}
            placeholder={t(locale, 'sheets.taskPlaceholder')}
            onChange={(event) => onChange({ ...value, name: event.target.value })}
            aria-label={t(locale, 'sheets.taskName')}
          />
          <label className="il-inline-check il-task-target-complete">
            <input
              type="checkbox"
              checked={Boolean(value.complete)}
              onChange={(event) => onChange({ ...value, complete: event.target.checked })}
            />
            <span>{t(locale, 'sheets.completeWithRecord')}</span>
          </label>
        </>
      )}

      {value.mode !== 'existing' && (
        <div className="il-task-target-category">
          <span>{t(locale, 'sheets.category')}</span>
          <div className="il-chiprow">
            {state.categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={'c task-cat' + (categoryId === category.id ? ' sel' : '')}
                onClick={() => onChange({ ...value, categoryId: category.id })}
                style={{ '--chip-cat': category.color, borderLeft: `3px solid ${category.color}` }}
              >
                {categoryLabel(locale, category)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
