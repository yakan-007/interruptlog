import SheetShell from './SheetShell';
import { t, tx } from '../../i18n';

export default function ResumeOrStopSheet({ state, actions, onClose }) {
  const runTask = state.tasks.find((task) => task.id === state.running?.preTaskId);
  const locale = state.preferences.locale;

  return (
    <SheetShell title={state.running?.type === 'interrupt' ? t(locale, 'sheets.endInterrupt') : t(locale, 'sheets.endBreak')} onClose={onClose} footer={
      <>
        <button className="btn secondary" onClick={() => actions.stopInterrupt(false)}>{t(locale, 'sheets.endOnly')}</button>
        <button className="btn primary" onClick={() => actions.stopInterrupt(true)} disabled={!runTask}>
          {t(locale, 'sheets.resume')} {runTask && `→ ${runTask.name.slice(0, 10)}${runTask.name.length > 10 ? '…' : ''}`}
        </button>
      </>
    }>
      <div className="il-sheet-copy">
        {runTask ? tx(locale, 'sheets.resumeQuestion', runTask.name) : t(locale, 'sheets.noResumeTask')}
      </div>
    </SheetShell>
  );
}
