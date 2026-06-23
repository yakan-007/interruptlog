import { t } from '../../i18n';

export default function TaskTargetFields({ state, value, onChange, suggestedName = '', locale = 'ja-JP' }) {
  const activeTasks = state.tasks.filter((task) => !task.isCompleted);
  const currentTask = value.mode === 'existing'
    ? state.tasks.find((task) => task.id === value.taskId)
    : null;
  const selectedCompletedTask = currentTask?.isCompleted ? currentTask : null;
  const categoryId = value.categoryId ?? state.categories[0]?.id ?? null;
  const newTaskValue = '__new_task__';
  const selectValue = value.mode === 'existing' && currentTask ? currentTask.id : newTaskValue;

  const createNewTask = () => {
    onChange({
      mode: 'new',
      name: value.mode === 'new' ? value.name ?? '' : suggestedName,
      categoryId,
      // A task made while correcting history is an archive of this work, not
      // another item to add to today's queue.
      complete: true,
    });
  };

  return (
    <div className="il-field il-task-target-field">
      <label>{t(locale, 'sheets.taskName')}</label>
      <select
        className="il-input il-task-target-select"
        value={selectValue}
        onChange={(event) => {
          if (event.target.value === newTaskValue) createNewTask();
          else onChange({ mode: 'existing', taskId: event.target.value });
        }}
        aria-label={t(locale, 'sheets.taskName')}
      >
        <option value={newTaskValue}>{t(locale, 'sheets.createTaskFromRecord')}</option>
        {activeTasks.length > 0 && (
          <optgroup label={t(locale, 'sheets.openTasks')}>
            {activeTasks.map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}
          </optgroup>
        )}
        {selectedCompletedTask && (
          <optgroup label={t(locale, 'sheets.completedTasks')}>
            <option value={selectedCompletedTask.id}>{selectedCompletedTask.name}</option>
          </optgroup>
        )}
      </select>

      {value.mode === 'new' && (
        <input
          className="il-input"
          value={value.name ?? ''}
          placeholder={t(locale, 'sheets.taskPlaceholder')}
          onChange={(event) => onChange({ ...value, name: event.target.value, categoryId, complete: true })}
          aria-label={t(locale, 'sheets.taskName')}
          autoFocus
        />
      )}
    </div>
  );
}
