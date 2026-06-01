import Icons from '../../icons';
import { fmtDuration, useTicker } from '../../helpers';
import SheetShell from './SheetShell';

export default function ConfirmStopSheet({ state, actions, onClose }) {
  const now = useTicker(1000);
  const task = state.runningTaskMeta?.task ?? null;
  const elapsed = now - (state.running?.start ?? now);
  const category = task ? state.categories.find((item) => item.id === task.categoryId) : null;
  const taskAccent = category?.color ?? 'var(--accent)';

  return (
    <SheetShell title="セッションを停止" onClose={onClose} footer={
      <>
        <button className="btn tert" onClick={onClose}>戻る</button>
        <button className="btn task-primary" style={{ '--task-cat': taskAccent }} onClick={() => actions.stopTask(false)}>停止のみ</button>
        <button className="btn task-strong" style={{ '--task-cat': taskAccent }} onClick={() => actions.stopTask(true)}>{Icons.check(12)} 停止して完了</button>
      </>
    }>
      <div className="il-confirmstop-copy">
        <div className="title">{task?.name}</div>
        <div className="note">このセッションを区切ります。タスク自体は完了しません（チェックを別で入れてください）。</div>
      </div>
      <div className="il-confirmstop-stat">
        <span>このセッション</span>
        <span className="il-mono">{fmtDuration(elapsed, { showSec: true })}</span>
      </div>
    </SheetShell>
  );
}
