import { useState } from 'react';
import SheetShell from './SheetShell';

export default function AddMissedSheet({ actions, onClose, initialDraft }) {
  const [type, setType] = useState(initialDraft?.type ?? 'task');
  const [label, setLabel] = useState(initialDraft?.label ?? '');
  const [error, setError] = useState('');
  const [initial] = useState(() => new Date());
  const [startH, setStartH] = useState(initialDraft?.startH ?? String(initial.getHours()).padStart(2, '0'));
  const [startM, setStartM] = useState(initialDraft?.startM ?? String(initial.getMinutes()).padStart(2, '0'));
  const [endH, setEndH] = useState(initialDraft?.endH ?? String(initial.getHours()).padStart(2, '0'));
  const [endM, setEndM] = useState(initialDraft?.endM ?? String(Math.min(initial.getMinutes() + 30, 59)).padStart(2, '0'));
  const [createGap, setCreateGap] = useState(Boolean(initialDraft?.createGap));

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

    const draft = { type, label, start: start.getTime(), end: end.getTime() };
    const previewResult = actions.previewAddMissedEvent(draft, { createGap });
    if (previewResult.error) {
      setError(previewResult.error ?? '入力を確認してください');
      return;
    }

    if (previewResult.preview?.conflicts?.length) {
      actions.openSheet('resolveEvent', {
        mode: 'add',
        preview: previewResult.preview,
        returnSheet: 'addMissed',
        returnArg: { type, label, startH, startM, endH, endM, createGap },
        confirmLabel: '追加する',
        successMessage: 'イベントを追加しました',
      });
      return;
    }

    const result = actions.addMissedEvent(draft, { createGap });
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
          <button className={type === 'unknown' ? 'active' : ''} onClick={() => setType('unknown')}>未分類</button>
        </div>
      </div>
      <div className="il-field">
        <label>ラベル</label>
        <input className="il-input" placeholder="何をしていたか" value={label} onChange={(event) => setLabel(event.target.value)} />
      </div>
      <div className="il-inline-fields">
        <div className="il-field">
          <label>開始</label>
          <div className="il-hourinput-row">
            <input className="il-input" value={startH} onChange={(event) => setStartH(event.target.value)} />
            <input className="il-input" value={startM} onChange={(event) => setStartM(event.target.value)} />
          </div>
        </div>
        <div className="il-field">
          <label>終了</label>
          <div className="il-hourinput-row">
            <input className="il-input" value={endH} onChange={(event) => setEndH(event.target.value)} />
            <input className="il-input" value={endM} onChange={(event) => setEndM(event.target.value)} />
          </div>
        </div>
      </div>
      <div className="il-setrow il-sheet-toggle-row">
        <div className="tg">
          <div className="t">空いた時間を未分類として補う</div>
          <div className="s">実際に空白がある場合だけ未分類時間を自動作成します</div>
        </div>
        <button className={'il-toggle' + (createGap ? ' on' : '')} onClick={() => setCreateGap(!createGap)} aria-label="ギャップ記録を切り替え" />
      </div>
      {error && <div className="il-inline-error">{error}</div>}
    </SheetShell>
  );
}
