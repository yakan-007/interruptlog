import SheetShell from './SheetShell';
import { t, tx } from '../../i18n';

export default function ResumeOrStopSheet({ state, actions, onClose }) {
  const resumeTaskId = [...(state.running?.resumeStack ?? [])].reverse().find((context) => context.type === 'task')?.taskId
    ?? state.running?.preTaskId;
  const runTask = resumeTaskId ? state.tasks.find((task) => task.id === resumeTaskId) : null;
  const locale = state.preferences.locale;
  const resumeName = runTask?.name ?? null;

  return (
    <SheetShell title={state.running?.type === 'interrupt' ? t(locale, 'sheets.endInterrupt') : t(locale, 'sheets.endBreak')} onClose={onClose} footer={
      <>
        <button className="btn secondary" onClick={() => actions.stopInterrupt(false)}>{t(locale, 'sheets.endOnly')}</button>
        <button className="btn primary" onClick={() => actions.stopInterrupt(true)} disabled={!resumeName}>
          {t(locale, 'sheets.resume')} {resumeName && `→ ${resumeName.slice(0, 10)}${resumeName.length > 10 ? '…' : ''}`}
        </button>
      </>
    }>
      <div className="il-sheet-copy">
        {resumeName ? tx(locale, 'sheets.resumeQuestion', resumeName) : t(locale, 'sheets.noResumeTask')}
      </div>
    </SheetShell>
  );
}
