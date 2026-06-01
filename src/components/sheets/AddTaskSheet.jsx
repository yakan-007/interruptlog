import { useEffect, useState } from 'react';
import Icons from '../../icons';
import { fromDateTimeLocalValue, getTaskDuePresets, toDateTimeLocalValue } from '../../helpers';
import SheetShell from './SheetShell';

export default function AddTaskSheet({ state, actions, onClose, editing, draft, onDraftChange, onAfterSubmit }) {
  const duePresets = getTaskDuePresets();
  const [name, setName] = useState(editing?.name ?? draft?.name ?? '');
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? draft?.categoryId ?? state.categories[0]?.id ?? null);
  const [plannedDurationMinutes, setPlannedDurationMinutes] = useState(editing?.planning?.plannedDurationMinutes ?? draft?.plannedDurationMinutes ?? 0);
  const [dueAt, setDueAt] = useState(editing?.planning?.dueAt ?? draft?.dueAt ?? null);
  const [error, setError] = useState('');
  const selectedCategory = state.categories.find((category) => category.id === categoryId) ?? null;
  const taskAccent = selectedCategory?.color ?? 'var(--accent)';

  useEffect(() => {
    if (editing || !onDraftChange) return;
    onDraftChange({ name, categoryId, plannedDurationMinutes, dueAt });
  }, [categoryId, dueAt, editing, name, onDraftChange, plannedDurationMinutes]);

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
    };
    const result = editing
      ? actions.saveTask(payload)
      : mode === 'start'
        ? actions.createTaskAndStart(payload)
        : actions.createTask(payload);
    if (!result.ok) {
      setError(result.error ?? '入力を確認してください');
      return;
    }
    setError('');
    if (!editing) {
      onAfterSubmit?.({ name, categoryId, plannedDurationMinutes, dueAt });
      onClose();
    }
  };

  return (
    <SheetShell title={editing ? 'タスクを編集' : '詳細追加'} onClose={onClose} footer={
      <>
        {editing && <button className="btn danger" onClick={() => actions.deleteTask(editing.id)}>{Icons.trash(14)} 削除</button>}
        <button className="btn tert" onClick={onClose}>キャンセル</button>
        {editing ? (
          <button className="btn task-primary" style={{ '--task-cat': taskAccent }} onClick={() => submit('save')}>保存</button>
        ) : (
          <>
            <button className="btn secondary" onClick={() => submit('create')}>追加</button>
            <button className="btn task-primary" style={{ '--task-cat': taskAccent }} onClick={() => submit('start')}>{Icons.play(12)} 追加して開始</button>
          </>
        )}
      </>
    }>
      <div className="il-field">
        <label>タスク名</label>
        <input className="il-input" placeholder="例: 見積APIの修正" value={name} onChange={(event) => update(setName)(event.target.value)} autoFocus />
      </div>
      <div className="il-field">
        <label>カテゴリ</label>
        <div className="il-chiprow">
          {state.categories.map((category) => (
            <button
              key={category.id}
              className={'c task-cat' + (categoryId === category.id ? ' sel' : '')}
              onClick={() => update(setCategoryId)(category.id)}
              style={{ '--chip-cat': category.color, borderLeft: `3px solid ${category.color}` }}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
      <div className="il-field">
        <label>予定時間</label>
        <div className="il-sheet-planrow">
          <input
            className="il-input short"
            type="number"
            value={plannedDurationMinutes}
            onChange={(event) => update(setPlannedDurationMinutes)(Number(event.target.value) || 0)}
          />
          <span className="suffix">分</span>
          <div className="spacer" />
          {[['未定', 0], ['15', 15], ['30', 30], ['60', 60], ['120', 120]].map(([label, minutes]) => (
            <button key={minutes} className="btn sm secondary" onClick={() => update(setPlannedDurationMinutes)(minutes)}>{label}</button>
          ))}
        </div>
      </div>
      <div className="il-field">
        <label>期限</label>
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
          aria-label="期限日時"
        />
      </div>
      {error && <div className="il-inline-error">{error}</div>}
    </SheetShell>
  );
}
