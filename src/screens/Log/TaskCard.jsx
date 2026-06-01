import Icons from '../../icons';
import { fmtDuration, fmtDurationMin, fmtRel } from '../../helpers';

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
  floating = false,
}) {
  const taskAccent = category?.color ?? 'var(--accent)';
  const plannedMs = (task.planning?.plannedDurationMinutes ?? 0) * 60000;
  const liveSpent = running && runningStart ? (now - runningStart) : 0;
  const actualMs = priorSpent + liveSpent;
  const dueAt = task.planning?.dueAt;
  const hasDueAt = dueAt != null && dueAt > 0;
  const overdue = hasDueAt && dueAt < now;
  const actualSummary = plannedMs > 0 ? (
    <span>
      <span className="il-mono strong">{fmtDurationMin(actualMs / 60000)}</span>
      <span className="muted"> / </span>
      <span className="il-mono">{fmtDurationMin(plannedMs / 60000)}</span>
    </span>
  ) : (
    <span>
      <span className="il-mono strong">{fmtDurationMin(actualMs / 60000)}</span>
      <span className="muted"> 累計</span>
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
            <span className="il-chip sm">{category?.name}</span>
          </div>
          <div className="il-meta">
            <span className="il-chip sm subtle">{completedNote || (task.completedAt ? `完了 ${fmtRel(task.completedAt)}` : '完了')}</span>
            <span>
              <span className="il-mono strong">{fmtDurationMin(actualMs / 60000)}</span>
              <span className="muted"> 累計</span>
            </span>
          </div>
        </div>
        {onRestart && (
          <button className="il-task-action start icon-only" onClick={onRestart} aria-label="再開">
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
          <span className="il-chip sm" style={{ color: category?.color }}>{category?.name}</span>
          {actualSummary}
          {running && (
            <span className="il-mono subtle">{fmtDuration(now - runningStart, { showSec: true })}</span>
          )}
          {hasDueAt && (
            <>
              <span className="sep">•</span>
              <span className={overdue ? 'danger strong' : 'subtle'}>{fmtRel(dueAt)}</span>
            </>
          )}
        </div>
      </div>
      <div className="task-actions">
        {running ? (
          <button className="il-task-action running icon-only" onClick={onStop} aria-label="停止">
            {Icons.stop(13)}
          </button>
        ) : (
          <button className="il-task-action start icon-only" onClick={onStart} aria-label="開始">
            {Icons.play(13)}
          </button>
        )}
        <button className="il-ghostbtn" onClick={onEdit} aria-label="edit">{Icons.edit(15)}</button>
      </div>
    </div>
  );
}
