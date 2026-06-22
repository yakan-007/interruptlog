import Icons from '../../icons';
import { fmtDuration, fmtDurationMin, fmtRel } from '../../lib/formatters';
import { categoryLabel, t } from '../../i18n';

export default function TaskCard({
  task,
  category,
  running,
  runningStart,
  priorSpent = 0,
  now,
  onStart,
  onStop,
  onComplete,
  onEdit,
  onCardPointerDown,
  dragState,
  onToggle,
  onRestart,
  completedNote,
  locale = 'ja-JP',
  floating = false,
}) {
  const taskAccent = category?.color ?? 'var(--accent)';
  const plannedMs = (task.planning?.plannedDurationMinutes ?? 0) * 60000;
  const liveSpent = running && runningStart ? Math.max(0, now - runningStart) : 0;
  const actualMs = priorSpent + liveSpent;
  const dueAt = task.planning?.dueAt;
  const hasDueAt = dueAt != null && dueAt > 0;
  const overdue = hasDueAt && dueAt < now;
  const actualSummary = plannedMs > 0 ? (
    <span className="meta-stat">
      <span className="muted">{t(locale, 'log.actual')}</span>
      <span className="il-mono strong">{fmtDurationMin(actualMs / 60000)}</span>
      <span className="muted">/ {t(locale, 'log.planned')}</span>
      <span className="il-mono">{fmtDurationMin(plannedMs / 60000)}</span>
    </span>
  ) : (
    <span className="meta-stat">
      <span className="muted">{t(locale, 'log.total')}</span>
      <span className="il-mono strong">{fmtDurationMin(actualMs / 60000)}</span>
    </span>
  );
  const cardStyle = {
    '--task-cat': taskAccent,
    '--drag-offset-y': `${Math.round(dragState?.offsetY ?? 0)}px`,
    '--drag-float-left': dragState?.left != null ? `${Math.round(dragState.left)}px` : undefined,
    '--drag-float-top': dragState?.top != null ? `${Math.round(dragState.top)}px` : undefined,
    '--drag-float-width': dragState?.width != null ? `${Math.round(dragState.width)}px` : undefined,
  };

  if (task.isCompleted) {
    return (
      <div className="il-taskcard completed" style={{ '--task-cat': taskAccent }}>
        <div className="cat-rail" style={{ background: category?.color }} />
        <button className="check" onClick={onToggle} aria-label="restore">{Icons.check(12)}</button>
        <div className="task-main">
          <div className="task-head">
            <div className="title">{task.name}</div>
            <span className="il-chip task-cat-label">{categoryLabel(locale, category)}</span>
          </div>
          <div className="il-meta">
            <span className="il-chip sm subtle">{completedNote || (task.completedAt ? `${t(locale, 'log.completed')} ${fmtRel(task.completedAt, locale, now)}` : t(locale, 'log.completed'))}</span>
            {task.interruptOriginId && <span className="il-chip sm interrupt-origin">{t(locale, 'log.interruptOrigin')}</span>}
            <span className="meta-stat">
              <span className="muted">{t(locale, 'log.total')}</span>
              <span className="il-mono strong">{fmtDurationMin(actualMs / 60000)}</span>
            </span>
          </div>
        </div>
        {onRestart && (
          <button className="il-task-action start icon-only" onClick={onRestart} aria-label={t(locale, 'log.restart')}>
            {Icons.play(13)}
          </button>
        )}
        {onEdit && <button className="il-ghostbtn" onClick={onEdit} aria-label="edit">{Icons.edit(15)}</button>}
      </div>
    );
  }

  return (
    <div
      className={
        'il-taskcard' +
        (!task.isCompleted ? ' draggable' : '') +
        (floating ? ' floating' : '') +
        (running ? ' running' : '') +
        (dragState?.isArming ? ' arming' : '') +
        (dragState?.isDragging ? (floating ? ' dragging' : ' drag-source') : '') +
        (dragState?.isDropBefore ? ' drop-before' : '') +
        (dragState?.isDropAfter ? ' drop-after' : '')
      }
      data-task-id={floating ? undefined : task.id}
      style={cardStyle}
      onPointerDown={floating ? undefined : onCardPointerDown}
    >
      <div className="cat-rail" style={{ background: category?.color }} />
      <button className="check" onClick={onComplete} aria-label="complete" />
      <div className="task-main">
        <div className="task-head">
          <div className="title">{task.name}</div>
        </div>
        <div className="il-meta">
          <span className="il-chip task-cat-label" style={{ color: category?.color }}>{categoryLabel(locale, category)}</span>
          {task.interruptOriginId && <span className="il-chip sm interrupt-origin">{t(locale, 'log.interruptOrigin')}</span>}
          {actualSummary}
          {running && (
            <span className="il-mono subtle">{fmtDuration(now - runningStart, { showSec: true, locale })}</span>
          )}
          {hasDueAt && (
            <>
              <span className="sep">•</span>
              <span className={overdue ? 'danger strong' : 'subtle'}>{fmtRel(dueAt, locale, now)}</span>
            </>
          )}
        </div>
      </div>
      <div className="task-actions">
        {running ? (
          <button className="il-task-action running icon-only" onClick={onStop} aria-label={t(locale, 'log.stop')}>
            {Icons.stop(13)}
          </button>
        ) : (
          <button className="il-task-action start icon-only" onClick={onStart} aria-label={t(locale, 'log.start')}>
            {Icons.play(13)}
          </button>
        )}
        <button className="il-ghostbtn" onClick={onEdit} aria-label="edit">{Icons.edit(15)}</button>
      </div>
    </div>
  );
}
