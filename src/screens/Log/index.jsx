import { Fragment, useMemo, useState } from 'react';
import Icons from '../../icons';
import { fmtDateHeader, useTicker } from '../../helpers';
import { partitionCompletedTasks, selectTaskPriorSpentMs } from '../../state';
import QuickAddCard from './QuickAddCard';
import TaskCard from './TaskCard';
import { useTaskDrag } from './useTaskDrag';

export default function LogScreen({ state, actions }) {
  const now = useTicker(1000);
  const [showArchive, setShowArchive] = useState(false);
  const categoriesById = useMemo(
    () => Object.fromEntries(state.categories.map((category) => [category.id, category])),
    [state.categories]
  );
  const completed = useMemo(
    () => partitionCompletedTasks(state.completedTasks, now),
    [state.completedTasks, now]
  );
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

  return (
    <div className="il-screen il-fade">
      <div className="il-topbar il-topbar-log">
        <div className="sub">{state.todayLabel}</div>
      </div>

      <div
        className={
          'il-body il-body-log' +
          (state.running ? ' has-runbar has-live-dock' : ' has-dock')
        }
      >
        <div className="il-section-h">
          <span>タスク</span>
          <span className="count">{state.activeTasks.length}</span>
        </div>

        {state.activeTasks.length === 0 ? (
          <div className="il-empty">
            <div className="t">今日のタスクはまだありません</div>
            <div className="s">下の入力から、軽くメモするように追加できます。</div>
            <button className="btn tert il-empty-action" onClick={() => actions.openSheet('addMissed')}>
              押し忘れを記録
            </button>
          </div>
        ) : (
          <div
            ref={listRef}
            className={drag ? 'il-tasklist dragging' : 'il-tasklist'}
            style={
              dragAccent || drag?.height
                ? {
                    '--drag-task-cat': dragAccent,
                    '--drag-gap': `${Math.max(72, Math.round(drag?.height ?? 86))}px`,
                  }
                : undefined
            }
          >
            {visibleActiveTasks.map((task, index) => (
              <Fragment key={task.id}>
                {drag?.overIndex === index && <TaskDropPlaceholder />}
                <TaskCard
                  task={task}
                  category={categoriesById[task.categoryId]}
                  running={state.running?.taskId === task.id && state.running?.type === 'task'}
                  runningStart={state.running?.start}
                  priorSpent={selectTaskPriorSpentMs(state, task.id)}
                  now={now}
                  onStart={() => actions.startTask(task.id)}
                  onStop={() => actions.openSheet('confirmStop')}
                  onComplete={() => actions.completeTask(task.id)}
                  onEdit={() => actions.openSheet('editTask', task)}
                  onCardPointerDown={(event) => armDrag(event, task.id, activeIndexById.get(task.id) ?? index)}
                  dragState={{
                    isArming: pressing?.id === task.id,
                  }}
                />
              </Fragment>
            ))}
            {drag?.overIndex === visibleActiveTasks.length && <TaskDropPlaceholder />}
          </div>
        )}

        {completed.today.length > 0 && (
          <>
            <div className="il-section-h">
              <span>今日完了</span>
              <span className="count">{completed.today.length}</span>
            </div>
            {completed.today.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                category={categoriesById[task.categoryId]}
                priorSpent={selectTaskPriorSpentMs(state, task.id)}
                now={now}
                completedNote={task.completedAt ? `完了 ${fmtDateHeader(task.completedAt)}` : '完了'}
                onToggle={() => actions.restoreTask(task.id)}
                onRestart={() => actions.restoreTaskAndStart(task.id)}
                onEdit={() => actions.openSheet('editTask', task)}
              />
            ))}
          </>
        )}

        {completed.archived.length > 0 && (
          <>
            <button className="il-archivehead" onClick={() => setShowArchive((current) => !current)} aria-expanded={showArchive}>
              <span className="label">完了アーカイブ</span>
              <span className="meta">
                <span className="count">{completed.archived.length}</span>
                <span className={'chev' + (showArchive ? ' open' : '')}>{Icons.chevD(16)}</span>
              </span>
            </button>
            {showArchive && (
              <div className="il-archivecopy">
                過去に完了したタスクです。メイン一覧からは外れますが、再開すると同じタスクとして時間を続けて記録できます。
              </div>
            )}
            {showArchive && completed.archived.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                category={categoriesById[task.categoryId]}
                priorSpent={selectTaskPriorSpentMs(state, task.id)}
                now={now}
                completedNote={task.completedAt ? `${fmtDateHeader(task.completedAt)}に完了` : '過去に完了'}
                onToggle={() => actions.restoreTask(task.id)}
                onRestart={() => actions.restoreTaskAndStart(task.id)}
                onEdit={() => actions.openSheet('editTask', task)}
              />
            ))}
          </>
        )}

        <div className="il-log-bottomspace" />
        {draggedTask && (
          <TaskCard
            key={`floating-${draggedTask.id}`}
            task={draggedTask}
            category={categoriesById[draggedTask.categoryId]}
            running={state.running?.taskId === draggedTask.id && state.running?.type === 'task'}
            runningStart={state.running?.start}
            priorSpent={selectTaskPriorSpentMs(state, draggedTask.id)}
            now={now}
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
      </div>

      <QuickAddCard state={state} actions={actions} />
    </div>
  );
}

function TaskDropPlaceholder() {
  return <div className="il-taskdrop-placeholder" aria-hidden="true" />;
}
