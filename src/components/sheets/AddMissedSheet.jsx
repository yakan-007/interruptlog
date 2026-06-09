import { useState } from 'react';
import SheetShell from './SheetShell';

export default function AddMissedSheet({ state, actions, onClose, initialDraft }) {
  const [type, setType] = useState(initialDraft?.type ?? 'task');
  const [label, setLabel] = useState(initialDraft?.label ?? '');
  const [taskCategoryId, setTaskCategoryId] = useState(initialDraft?.taskCategoryId ?? state.categories[0]?.id ?? null);
  const [who, setWho] = useState(initialDraft?.who ?? '');
  const [saveWhoChip, setSaveWhoChip] = useState(Boolean(initialDraft?.saveWhoChip));
  const [urgency, setUrgency] = useState(initialDraft?.urgency ?? 'med');
  const [interruptCategoryId, setInterruptCategoryId] = useState(initialDraft?.interruptCategoryId ?? state.interruptCats[0]?.id ?? '');
  const [error, setError] = useState('');
  const [initial] = useState(() => new Date());
  const [startH, setStartH] = useState(initialDraft?.startH ?? String(initial.getHours()).padStart(2, '0'));
  const [startM, setStartM] = useState(initialDraft?.startM ?? String(initial.getMinutes()).padStart(2, '0'));
  const [endH, setEndH] = useState(initialDraft?.endH ?? String(initial.getHours()).padStart(2, '0'));
  const [endM, setEndM] = useState(initialDraft?.endM ?? String(Math.min(initial.getMinutes() + 30, 59)).padStart(2, '0'));
  const customWho = Boolean(who.trim()) && !state.whoChips.includes(who);

  const handleAdd = () => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    const start = new Date(base);
    const end = new Date(base);
    start.setHours(Number(startH), Number(startM), 0, 0);
    end.setHours(Number(endH), Number(endM), 0, 0);

    if (end <= start) {
      setError('終了は開始より後にしてください');
      return;
    }

    const draft = {
      type,
      label: label || (type === 'interrupt' && who ? `${who}から` : ''),
      start: start.getTime(),
      end: end.getTime(),
      ...(type === 'task' ? { categoryId: taskCategoryId } : {}),
      ...(type === 'interrupt' ? { who, urgency, categoryId: interruptCategoryId } : {}),
    };
    const previewResult = actions.previewAddMissedEvent(draft, { createGap: false });
    if (previewResult.error) {
      setError(previewResult.error ?? '入力を確認してください');
      return;
    }

    if (previewResult.preview?.conflicts?.length) {
      actions.openSheet('resolveEvent', {
        mode: 'add',
        preview: previewResult.preview,
        returnSheet: 'addMissed',
        returnArg: { type, label, taskCategoryId, who, saveWhoChip, urgency, interruptCategoryId, startH, startM, endH, endM },
        confirmLabel: '追加する',
        successMessage: 'イベントを追加しました',
      });
      return;
    }

    const result = actions.addMissedEvent(draft, { createGap: false, saveWhoChip });
    if (!result.ok) setError(result.error ?? '入力を確認してください');
  };

  return (
    <SheetShell title="過去のイベントを追加" onClose={onClose} footer={
      <>
        <button className="btn tert" onClick={onClose}>キャンセル</button>
        <button className="btn primary" onClick={handleAdd}>追加</button>
      </>
    }>
      <div className="il-field">
        <label>種別</label>
        <div className="il-seg full">
          <button className={type === 'task' ? 'active' : ''} onClick={() => setType('task')}>タスク</button>
          <button className={type === 'interrupt' ? 'active' : ''} onClick={() => setType('interrupt')}>割り込み</button>
          <button className={type === 'break' ? 'active' : ''} onClick={() => setType('break')}>休憩</button>
        </div>
      </div>
      <div className="il-field">
        <label>ラベル</label>
        <input className="il-input" placeholder="何をしていたか" value={label} onChange={(event) => setLabel(event.target.value)} />
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
                style={{ '--chip-cat': category.color }}
              >
                <span className="dot" style={{ background: category.color }} />
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
                placeholder="一時入力"
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
                <span>次回も使う発信者として保存</span>
              </label>
            )}
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
              <button className={urgency === 'low' ? 'sel low' : ''} onClick={() => setUrgency('low')}>低</button>
              <button className={urgency === 'med' ? 'sel med' : ''} onClick={() => setUrgency('med')}>中</button>
              <button className={urgency === 'high' ? 'sel high' : ''} onClick={() => setUrgency('high')}>高</button>
            </div>
          </div>
        </>
      )}

      <div className="il-inline-fields">
        <div className="il-field">
          <label>開始</label>
          <div className="il-hourinput-row labeled" aria-label={`開始 ${startH}:${startM}`}>
            <label className="il-timepart">
              <input className="il-input" value={startH} onChange={(event) => setStartH(event.target.value)} inputMode="numeric" />
              <span>時</span>
            </label>
            <label className="il-timepart">
              <input className="il-input" value={startM} onChange={(event) => setStartM(event.target.value)} inputMode="numeric" />
              <span>分</span>
            </label>
          </div>
        </div>
        <div className="il-field">
          <label>終了</label>
          <div className="il-hourinput-row labeled" aria-label={`終了 ${endH}:${endM}`}>
            <label className="il-timepart">
              <input className="il-input" value={endH} onChange={(event) => setEndH(event.target.value)} inputMode="numeric" />
              <span>時</span>
            </label>
            <label className="il-timepart">
              <input className="il-input" value={endM} onChange={(event) => setEndM(event.target.value)} inputMode="numeric" />
              <span>分</span>
            </label>
          </div>
        </div>
      </div>
      {error && <div className="il-inline-error">{error}</div>}
    </SheetShell>
  );
}
