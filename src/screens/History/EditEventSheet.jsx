import { useState } from 'react';
import SheetShell from '../../components/sheets/SheetShell';
import Icons from '../../icons';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../helpers';

export default function EditEventSheet({ event, state, actions, onClose }) {
  const [label, setLabel] = useState(event.label ?? '');
  const [memo, setMemo] = useState(event.memo ?? '');
  const [type, setType] = useState(event.type === 'unknown' ? 'break' : event.type);
  const [who, setWho] = useState(event.who ?? '');
  const [urgency, setUrgency] = useState(event.urgency ?? 'med');
  const [taskCategoryId, setTaskCategoryId] = useState(event.type === 'task' ? event.categoryId ?? state.categories[0]?.id ?? '' : state.categories[0]?.id ?? '');
  const [interruptCategoryId, setInterruptCategoryId] = useState(event.type === 'interrupt' ? event.categoryId ?? state.interruptCats[0]?.id ?? '' : state.interruptCats[0]?.id ?? '');
  const [error, setError] = useState('');
  const [startAt, setStartAt] = useState(toDateTimeLocalValue(event.start));
  const [endAt, setEndAt] = useState(toDateTimeLocalValue(event.end));

  const handleTypeChange = (nextType) => {
    setError('');
    setType(nextType);
  };

  const handleSave = () => {
    const start = fromDateTimeLocalValue(startAt);
    const end = fromDateTimeLocalValue(endAt);
    if (start == null || end == null) {
      setError('日時を確認してください');
      return;
    }
    const extra = {
      taskId: type === 'task' ? event.taskId ?? null : null,
      who: type === 'interrupt' ? who : '',
      urgency: type === 'interrupt' ? urgency : 'med',
      categoryId: type === 'task'
        ? taskCategoryId
        : type === 'interrupt'
          ? interruptCategoryId
          : null,
    };
    const draft = { ...event, type, label, memo, start, end, ...extra };
    const previewResult = actions.previewSaveEvent(draft);
    if (previewResult.error) {
      setError(previewResult.error ?? '終了は開始より後にしてください');
      return;
    }

    if (previewResult.preview?.conflicts?.length) {
      actions.openSheet('resolveEvent', {
        mode: 'edit',
        preview: previewResult.preview,
        returnSheet: 'editEvent',
        returnArg: draft,
        confirmLabel: '保存する',
        successMessage: 'イベントを保存しました',
      });
      return;
    }

    const result = actions.saveEvent(draft);
    if (result.ok) onClose();
    else setError(result.error ?? '終了は開始より後にしてください');
  };

  return (
    <SheetShell title="イベントを編集" onClose={onClose} footer={
      <>
        <button className="btn danger" onClick={() => { actions.deleteEvent(event.id); onClose(); }}>{Icons.trash(14)} 削除</button>
        <button className="btn tert" onClick={onClose}>キャンセル</button>
        <button className="btn primary" onClick={handleSave}>保存</button>
      </>
    }>
      <div className="il-field">
        <label>種別</label>
        <div className="il-seg full">
          {[['task', 'タスク'], ['interrupt', '割り込み'], ['break', '休憩']].map(([value, text]) => (
            <button key={value} className={type === value ? 'active' : ''} onClick={() => handleTypeChange(value)}>
              {text}
            </button>
          ))}
        </div>
      </div>

      <div className="il-field">
        <label>ラベル</label>
        <input className="il-input" value={label} onChange={(current) => setLabel(current.target.value)} />
      </div>

      {type === 'task' && (
        <div className="il-field">
          <label>カテゴリ</label>
          <div className="il-chiprow">
            {state.categories.map((category) => (
              <button
                key={category.id}
                className={'c task-cat' + (taskCategoryId === category.id ? ' sel' : '')}
                onClick={() => setTaskCategoryId(category.id)}
                style={{ '--chip-cat': category.color, borderLeft: `3px solid ${category.color}` }}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {type === 'interrupt' && (
        <>
          <div className="il-field">
            <label>発信者</label>
            <div className="il-chiprow">
              <input
                className="c il-chipinput compact"
                placeholder="+ 新規"
                value={who && !state.whoChips.includes(who) ? who : ''}
                onChange={(current) => setWho(current.target.value)}
              />
              {state.whoChips.map((item) => (
                <button key={item} className={'c' + (who === item ? ' sel' : '')} onClick={() => setWho(item)}>{item}</button>
              ))}
            </div>
          </div>

          <div className="il-field">
            <label>カテゴリ</label>
            <div className="il-chiprow">
              {state.interruptCats.map((category) => (
                <button key={category.id} className={'c' + (interruptCategoryId === category.id ? ' sel' : '')} onClick={() => setInterruptCategoryId(category.id)}>
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <div className="il-field">
            <label>緊急度</label>
            <div className="il-urg">
              {[['low', '低'], ['med', '中'], ['high', '高']].map(([value, text]) => (
                <button key={value} className={urgency === value ? `sel ${value}` : ''} onClick={() => setUrgency(value)}>{text}</button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="il-inline-fields">
        <div className="il-field">
          <label>開始</label>
          <input className="il-input il-mono" type="datetime-local" value={startAt} onChange={(current) => setStartAt(current.target.value)} />
        </div>
        <div className="il-field">
          <label>終了</label>
          <input className="il-input il-mono" type="datetime-local" value={endAt} onChange={(current) => setEndAt(current.target.value)} />
        </div>
      </div>

      <div className="il-field">
        <label>メモ</label>
        <textarea className="il-textarea" value={memo} onChange={(current) => setMemo(current.target.value)} />
      </div>

      {error && <div className="il-inline-error">{error}</div>}
    </SheetShell>
  );
}
