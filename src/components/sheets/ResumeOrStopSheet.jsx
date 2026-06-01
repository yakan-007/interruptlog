import SheetShell from './SheetShell';

export default function ResumeOrStopSheet({ state, actions, onClose }) {
  const runTask = state.tasks.find((task) => task.id === state.running?.preTaskId);

  return (
    <SheetShell title={state.running?.type === 'interrupt' ? '割り込みを終了' : '休憩を終了'} onClose={onClose} footer={
      <>
        <button className="btn secondary" onClick={() => actions.stopInterrupt(false)}>終了だけ</button>
        <button className="btn primary" onClick={() => actions.stopInterrupt(true)} disabled={!runTask}>
          再開 {runTask && `→ ${runTask.name.slice(0, 10)}${runTask.name.length > 10 ? '…' : ''}`}
        </button>
      </>
    }>
      <div className="il-sheet-copy">
        {runTask ? (<><span className="strong">{runTask.name}</span> に戻りますか？</>) : '再開するタスクがありません。終了のみ可能です。'}
      </div>
    </SheetShell>
  );
}
