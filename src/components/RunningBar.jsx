import Icons from '../icons';
import { useTicker } from '../lib/ticker';
import { elapsedSince, formatElapsedClock } from '../lib/timer';
import { t, translateMessage } from '../i18n';

export default function RunningBar({ state, actions, raised = false, compact = false, locale = 'ja-JP' }) {
  const now = useTicker(1000);
  const running = state.running;
  const meta = state.runningTaskMeta;

  if (!running || !meta) return null;

  const category = running.type === 'task'
    ? state.categories.find((item) => item.id === meta.task?.categoryId)
    : null;
  const taskAccent = category?.color ?? 'var(--accent)';
  const breakTargetMinutes = running.type === 'break' ? Math.max(0, running.plannedBreakDurationMinutes ?? 0) : 0;
  const breakTargetMs = breakTargetMinutes * 60000;
  const elapsedMs = elapsedSince(running.start, now);
  const breakOverMs = breakTargetMs > 0 ? elapsedMs - breakTargetMs : 0;
  const breakTone = breakTargetMs <= 0 ? '' : breakOverMs >= 120000 ? ' late' : breakOverMs >= 0 ? ' warn' : ' target';
  const style = running.type === 'task'
    ? { '--runbar-accent': taskAccent, '--task-cat': taskAccent }
    : undefined;
  const openRunningDetails = () => {
    if (running.type === 'task' && meta.task) actions.openSheet('editTask', meta.task);
    else if (running.type === 'interrupt') actions.openSheet('interrupt');
    else if (running.type === 'break') actions.openSheet('break');
  };
  const stopEvent = (event) => event.stopPropagation();
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openRunningDetails();
    }
  };
  const label = translateMessage(locale, meta.label);
  const subLabel = translateMessage(locale, meta.subLabel);

  return (
    <div
      className={'il-runbar ' + (meta.variant || 'task') + (raised ? ' raised' : '') + (compact ? ' compact' : '') + (running.type === 'break' ? breakTone : '') + ' reopenable'}
      style={style}
      onClick={openRunningDetails}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={running.type === 'task' ? t(locale, 'sheets.taskEdit') : running.type === 'interrupt' ? t(locale, 'sheets.interruptTitle') : t(locale, 'sheets.breakTitle')}
    >
      <div className="dot" />
      <div className={'label' + (running.type === 'task' ? ' single' : '')}>
        {running.type !== 'task' && <div className="top">{subLabel}</div>}
        <div className="name">{label}</div>
      </div>
      <div className="time il-mono">{formatElapsedClock(elapsedMs)}</div>
      {running.type === 'task' ? (
        <div className="rb-actions">
          <button className="rb-btn" aria-label="interrupt" onClick={(event) => { stopEvent(event); actions.openSheet('interrupt'); }}>{Icons.bolt(16)}</button>
          <button className="rb-btn" aria-label="break" onClick={(event) => { stopEvent(event); actions.openSheet('break'); }}>{Icons.coffee(16)}</button>
          <button className="rb-btn stop" aria-label={t(locale, 'log.stop')} onClick={(event) => { stopEvent(event); actions.openSheet('confirmStop'); }}>{Icons.stop(14)}</button>
        </div>
      ) : (
        <button className="rb-btn stop" aria-label={t(locale, 'log.stop')} onClick={(event) => { stopEvent(event); actions.openSheet('resumeOrStop'); }}>{Icons.stop(14)}</button>
      )}
    </div>
  );
}
