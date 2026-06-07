import { fmtDuration, useTicker } from '../../helpers';
import SheetShell from './SheetShell';

export default function BreakSheet({ state, actions, onClose }) {
  const now = useTicker(1000);
  const presets = [5, 10, 15, 30, 45];

  const runTask = state.tasks.find((task) => task.id === state.running?.preTaskId);
  const elapsed = Math.max(0, now - (state.running?.start ?? now));
  const planned = state.running?.type === 'break' ? Math.max(0, state.running.plannedBreakDurationMinutes ?? 0) : 0;
  const plannedMs = planned * 60000;
  const overMs = plannedMs > 0 ? elapsed - plannedMs : 0;
  const tone = plannedMs <= 0 ? 'free' : overMs >= 120000 ? 'late' : overMs >= 0 ? 'warn' : 'target';
  const timerMeta = plannedMs <= 0
    ? '目安なし'
    : overMs >= 0
      ? (overMs < 60000 ? '予定を過ぎています' : `+${fmtDuration(overMs, { showSec: overMs < 60000 })}`)
      : `目安 ${planned}分`;

  return (
    <SheetShell title="休憩記録" onClose={onClose} footer={
      <>
        <button className="btn tert" onClick={() => actions.cancelInterrupt()}>キャンセル</button>
        <button className="btn secondary" onClick={() => actions.saveBreak({ breakDurationMinutes: planned, resume: false })}>保存して終了</button>
        <button className="btn primary" onClick={() => actions.saveBreak({ breakDurationMinutes: planned, resume: true })}>保存して再開</button>
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

      <div className={'il-sheet-timer break' + (plannedMs > 0 ? ' has-target' : '') + (tone === 'warn' ? ' warn' : '') + (tone === 'late' ? ' late' : '')}>
        <div className="eyebrow">休憩中</div>
        <div className="value il-mono">{fmtDuration(elapsed, { showSec: true })}</div>
        <div className="hint">{timerMeta}</div>
      </div>

      <div className="il-field">
        <label>戻る目安</label>
        <div className="il-sheet-copy">
          近い時間をひとつ選んでおくと、休憩をざっくり記録しやすくなります。0分なら目安なしです。
        </div>
        <div className="il-breakpreset-row">
          {presets.map((minutes) => (
            <button
              key={minutes}
              className={'il-breakpreset' + (planned === minutes ? ' active' : '')}
              onClick={() => actions.setBreakTarget(minutes)}
            >
              {minutes}分
            </button>
          ))}
        </div>
      </div>

      <div className="il-field">
        <label>分で調整</label>
        <div className="il-breakplan-row">
          <input className="il-input short" type="number" value={planned} onChange={(event) => actions.setBreakTarget(Number(event.target.value) || 0)} />
          <span className="suffix">分</span>
        </div>
      </div>
    </SheetShell>
  );
}
