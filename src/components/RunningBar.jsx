import Icons from '../icons';
import { useTicker } from '../lib/ticker';
import { elapsedSince, formatElapsedClock } from '../lib/timer';
import { t } from '../i18n';

export default function RunningBar({ state, actions, raised = false, compact = false, locale = 'ja-JP' }) {
  const now = useTicker(1000);
  const running = state.running;
  const meta = state.runningTaskMeta;

  if (!running || !meta) return null;

  const category = running.type === 'task'
    ? state.categories.find((item) => item.id === meta.task?.categoryId)
    : null;
  const taskAccent = category?.color ?? 'var(--accent)';
  const elapsedMs = elapsedSince(running.start, now);
  const style = running.type === 'task'
    ? { '--runbar-accent': taskAccent, '--task-cat': taskAccent }
    : undefined;
  const openRunningDetails = () => {
    if (running.type === 'task' && meta.task) actions.openSheet('editTask', meta.task);
    else actions.openSheet('pause');
  };
  const stopEvent = (event) => event.stopPropagation();
  // ■ ends the pause the way the sheet's main button does: record it with what
  // was entered so far and go back to the task it interrupted, if any.
  const finishPause = () => {
    if (running.type === 'break') {
      actions.saveBreak({ label: t(locale, 'common.break'), resume: true });
      actions.showToast(t(locale, 'toasts.breakSaved'));
      return;
    }
    actions.saveInterrupt({ resume: true });
    actions.showToast(t(locale, 'toasts.interruptSaved'));
  };
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openRunningDetails();
    }
  };
  const label = meta.label ?? t(locale, meta.labelKey);

  return (
    <div
      className={'il-runbar ' + (meta.variant || 'task') + (raised ? ' raised' : '') + (compact ? ' compact' : '') + ' reopenable'}
      style={style}
      onClick={openRunningDetails}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={running.type === 'task' ? t(locale, 'sheets.taskEdit') : t(locale, 'sheets.pauseTitle')}
    >
      <div className="dot" />
      {/* The bar's color says task, interruption or break; only the name is written. */}
      <div className="label single">
        <div className="name">{label}</div>
      </div>
      <div className="time il-mono">{formatElapsedClock(elapsedMs)}</div>
      {running.type === 'task' ? (
        <div className="rb-actions">
          <button className="rb-btn" aria-label={t(locale, 'log.startPause')} onClick={(event) => { stopEvent(event); actions.openSheet('newPause'); }}>{Icons.bolt(16)}</button>
          <button className="rb-btn stop" aria-label={t(locale, 'log.stop')} onClick={(event) => { stopEvent(event); actions.openSheet('confirmStop'); }}>{Icons.stop(14)}</button>
        </div>
      ) : (
        <div className="rb-actions">
          <button className="rb-btn stop" aria-label={t(locale, running.type === 'break' ? 'log.endBreak' : 'log.endPause')} onClick={(event) => { stopEvent(event); finishPause(); }}>{Icons.stop(14)}</button>
        </div>
      )}
    </div>
  );
}
