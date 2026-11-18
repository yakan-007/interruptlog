import { Fragment, useState } from 'react';
import Icons from '../../icons';
import { t } from '../../i18n';
import { fmtDateHeader } from '../../lib/formatters';
import { getResumeTaskId, selectTaskPriorSpentMs } from '../../state';
import TaskCard from './TaskCard';
import { useTaskDrag } from './useTaskDrag';

export function ActiveTaskList({ state, actions, categoriesById, now }) {
  const {
    activeIndexById,
    armDrag,
    drag,
    draggedTask,
    dragAccent,
    listRef,
    pressing,
    visibleActiveTasks,
  } = useTaskDrag(state.activeTasks, categoriesById, actions);
  const locale = state.preferences.locale;
  const resumeTaskId = getResumeTaskId(state);

  if (state.activeTasks.length === 0) {
    return (
      <div className="il-empty">
        <div className="t">{t(locale, 'log.emptyTitle')}</div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={listRef}
        className={drag ? 'il-tasklist dragging' : 'il-tasklist'}
        style={dragAccent || drag?.height ? {
          '--drag-task-cat': dragAccent,
          '--drag-gap': `${Math.max(72, Math.round(drag?.height ?? 86))}px`,
        } : undefined}
      >
        {visibleActiveTasks.map((task, index) => (
          <Fragment key={task.id}>
            {drag?.overIndex === index && <TaskDropPlaceholder />}
            <TaskCard
              task={task}
              category={categoriesById[task.categoryId]}
              running={state.running?.taskId === task.id && state.running?.type === 'task'}
              runningStart={state.running?.start}
              waitingToResume={resumeTaskId === task.id}
              priorSpent={selectTaskPriorSpentMs(state, task.id)}
              now={now}
              locale={locale}
              onStart={() => actions.startTask(task.id)}
              onStop={() => actions.openSheet('confirmStop')}
              onComplete={() => actions.completeTask(task.id)}
              onEdit={() => actions.openSheet('editTask', task)}
              onDragPointerDown={(event) => armDrag(event, task.id, activeIndexById.get(task.id) ?? index)}
              onMoveToIndex={(targetIndex) => actions.moveTaskToIndex(task.id, targetIndex)}
              taskIndex={activeIndexById.get(task.id) ?? index}
              taskCount={state.activeTasks.length}
              dragState={{ isArming: pressing?.id === task.id }}
            />
          </Fragment>
        ))}
        {drag?.overIndex === visibleActiveTasks.length && <TaskDropPlaceholder />}
      </div>

      {draggedTask && (
        <TaskCard
          key={`floating-${draggedTask.id}`}
          task={draggedTask}
          category={categoriesById[draggedTask.categoryId]}
          running={state.running?.taskId === draggedTask.id && state.running?.type === 'task'}
          runningStart={state.running?.start}
          priorSpent={selectTaskPriorSpentMs(state, draggedTask.id)}
          now={now}
          locale={locale}
          floating
          dragState={{
            isDragging: true,
            offsetY: (drag?.y ?? 0) - (drag?.startY ?? 0),
            left: drag?.left,
            top: drag?.top,
            width: drag?.width,
          }}
        />
      )}
    </>
  );
}

export function CompletedTaskSections({ state, actions, categoriesById, completed, now }) {
  const [showArchive, setShowArchive] = useState(false);
  const locale = state.preferences.locale;

  return (
    <>
      {completed.today.length > 0 && (
        <>
          <div className="il-section-h">
            <span>{t(locale, 'log.completedToday')}</span>
            <span className="count">{completed.today.length}</span>
          </div>
          {completed.today.map((task) => (
            <CompletedTaskCard key={task.id} task={task} state={state} actions={actions} categoriesById={categoriesById} now={now} today />
          ))}
        </>
      )}

      {completed.archived.length > 0 && (
        <>
          <button className="il-archivehead" onClick={() => setShowArchive((current) => !current)} aria-expanded={showArchive}>
            <span className="label">{t(locale, 'log.completedArchive')}</span>
            <span className="meta">
              <span className="count">{completed.archived.length}</span>
              <span className={'chev' + (showArchive ? ' open' : '')}>{Icons.chevD(16)}</span>
            </span>
          </button>
          {showArchive && completed.archived.map((task) => (
            <CompletedTaskCard key={task.id} task={task} state={state} actions={actions} categoriesById={categoriesById} now={now} />
          ))}
        </>
      )}
    </>
  );
}

function CompletedTaskCard({ task, state, actions, categoriesById, now, today = false }) {
  const locale = state.preferences.locale;
  const completedNote = task.completedAt
    ? today
      ? `${t(locale, 'log.completed')} ${fmtDateHeader(task.completedAt, locale)}`
      : `${fmtDateHeader(task.completedAt, locale)} ${t(locale, 'log.completed')}`
    : t(locale, 'log.completed');

  return (
    <TaskCard
      task={task}
      category={categoriesById[task.categoryId]}
      priorSpent={selectTaskPriorSpentMs(state, task.id)}
      now={now}
      completedNote={completedNote}
      locale={locale}
      onToggle={() => actions.restoreTask(task.id)}
      onRestart={() => actions.restoreTaskAndStart(task.id)}
      onEdit={() => actions.openSheet('editTask', task)}
    />
  );
}

function TaskDropPlaceholder() {
  return <div className="il-taskdrop-placeholder" aria-hidden="true" />;
}
