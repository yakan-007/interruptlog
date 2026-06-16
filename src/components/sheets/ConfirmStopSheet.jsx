import Icons from '../../icons';
import { fmtDuration } from '../../lib/formatters';
import { useTicker } from '../../lib/ticker';
import { t } from '../../i18n';
import SheetShell from './SheetShell';

export default function ConfirmStopSheet({ state, actions, onClose }) {
  const now = useTicker(1000);
  const task = state.runningTaskMeta?.task ?? null;
  const elapsed = Math.max(0, now - (state.running?.start ?? now));
  const category = task ? state.categories.find((item) => item.id === task.categoryId) : null;
  const taskAccent = category?.color ?? 'var(--accent)';
  const locale = state.preferences.locale;

  return (
    <SheetShell title={t(locale, 'sheets.stopSession')} onClose={onClose} footer={
      <>
        <button className="btn tert" onClick={onClose}>{t(locale, 'sheets.back')}</button>
        <button className="btn task-primary" style={{ '--task-cat': taskAccent }} onClick={() => actions.stopTask(false)}>{t(locale, 'sheets.stopOnly')}</button>
        <button className="btn task-strong" style={{ '--task-cat': taskAccent }} onClick={() => actions.stopTask(true)}>{Icons.check(12)} {t(locale, 'sheets.stopAndComplete')}</button>
      </>
    }>
      <div className="il-confirmstop-copy">
        <div className="title">{task?.name}</div>
        <div className="note">{t(locale, 'sheets.stopCopy')}</div>
      </div>
      <div className="il-confirmstop-stat">
        <span>{t(locale, 'sheets.thisSession')}</span>
        <span className="il-mono">{fmtDuration(elapsed, { showSec: true, locale })}</span>
      </div>
    </SheetShell>
  );
}
