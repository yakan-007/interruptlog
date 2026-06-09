import { useState } from 'react';
import Icons from '../../icons';
import { fmtDuration, useTicker } from '../../helpers';
import SheetShell from './SheetShell';

export default function InterruptSheet({ state, actions, onClose }) {
  const [who, setWho] = useState('');
  const [saveWhoChip, setSaveWhoChip] = useState(false);
  const [label, setLabel] = useState('');
  const [urgency, setUrgency] = useState('med');
  const [categoryId, setCategoryId] = useState(state.interruptCats[0]?.id ?? '');
  const [memo, setMemo] = useState('');
  const now = useTicker(1000);

  const runTask = state.tasks.find((task) => task.id === state.running?.preTaskId);
  const elapsed = Math.max(0, now - (state.running?.start ?? now));
  const customWho = Boolean(who.trim()) && !state.whoChips.includes(who);

  const save = (resume) => {
    actions.saveInterrupt({ who, saveWhoChip, label: label || (who ? `${who}から` : '割り込み'), urgency, categoryId, memo, resume });
  };

  return (
    <SheetShell title="割り込み記録" onClose={onClose} footer={
      <>
        <button className="btn tert" onClick={() => actions.cancelInterrupt()}>キャンセル</button>
        <button className="btn secondary" onClick={() => save(false)}>保存して終了</button>
        <button className="btn primary" onClick={() => save(true)}>保存して再開</button>
      </>
    }>
      {runTask && (
        <div className="il-sheet-infobox">
          <div className="dot muted" />
          <div className="meta">
            <span className="strong">中断中:</span> <span>{runTask.name}</span>
          </div>
          <div className="il-mono quiet">一時停止</div>
        </div>
      )}

      <div className="il-sheet-timer interrupt">
        <div className="eyebrow">割り込み中</div>
        <div className="value il-mono">{fmtDuration(elapsed, { showSec: true })}</div>
      </div>

      <div className="il-field">
        <label>発信者</label>
        <div className="il-chiprow">
          <input
            className="c il-chipinput"
            placeholder="一時入力"
            value={who && !state.whoChips.includes(who) ? who : ''}
            onChange={(event) => setWho(event.target.value)}
          />
          {state.whoChips.map((item) => (
            <button key={item} className={'c' + (who === item ? ' sel' : '')} onClick={() => setWho(item)}>
              {Icons.user(12)} {item}
            </button>
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
        <label>件名</label>
        <div className="il-chiprow">
          {state.subjectChips.map((item) => (
            <button key={item} className={'c' + (label === item ? ' sel' : '')} onClick={() => setLabel(item)}>{item}</button>
          ))}
        </div>
        <input
          className="il-input"
          placeholder="または自由記入"
          value={label && !state.subjectChips.includes(label) ? label : ''}
          onChange={(event) => setLabel(event.target.value)}
        />
      </div>

      <div className="il-field">
        <label>カテゴリ</label>
        <div className="il-chiprow">
          {state.interruptCats.map((category) => (
            <button key={category.id} className={'c' + (categoryId === category.id ? ' sel' : '')} onClick={() => setCategoryId(category.id)}>
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

      <div className="il-field">
        <label>メモ</label>
        <textarea className="il-textarea" placeholder="何の件だったか (後で編集OK)" value={memo} onChange={(event) => setMemo(event.target.value)} />
      </div>
    </SheetShell>
  );
}
