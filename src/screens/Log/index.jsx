import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icons from '../../icons';
import { fmtDateHeader, useTicker } from '../../helpers';
import { partitionCompletedTasks, selectTaskPriorSpentMs } from '../../state';
import QuickAddCard from './QuickAddCard';
import TaskCard from './TaskCard';

const LONG_PRESS_MS = 220;
const PRESS_MOVE_TOLERANCE = 10;

function isInteractiveTarget(target) {
  return target instanceof Element && Boolean(target.closest('button, a, input, textarea, select, label'));
}

export default function LogScreen({ state, actions }) {
  const now = useTicker(1000);
  const [showArchive, setShowArchive] = useState(false);
  const [pressing, setPressing] = useState(null);
  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null);
  const listRef = useRef(null);
  const categoriesById = useMemo(
    () => Object.fromEntries(state.categories.map((category) => [category.id, category])),
    [state.categories]
  );
  const completed = useMemo(
    () => partitionCompletedTasks(state.completedTasks, now),
    [state.completedTasks, now]
  );
  const draggedTask = drag ? state.activeTasks.find((task) => task.id === drag.id) ?? null : null;
  const dragAccent = drag
    ? categoriesById[state.activeTasks.find((task) => task.id === drag.id)?.categoryId]?.color ?? 'var(--accent)'
    : undefined;

  const finishDrag = useCallback(() => {
    const current = dragRef.current;
    if (current?.overIndex != null) {
      actions.moveTaskToIndex(current.id, current.overIndex);
    }
    dragRef.current = null;
    setPressing(null);
    setDrag(null);
  }, [actions]);

  const updateDrag = useCallback((clientY) => {
    const current = dragRef.current;
    if (!current) return;

    const cards = [...(listRef.current?.querySelectorAll('.il-taskcard[data-task-id]') ?? [])];
    const otherRects = cards
      .filter((card) => card.dataset.taskId !== current.id)
      .map((card) => card.getBoundingClientRect());
    const overIndex = otherRects.reduce(
      (index, rect) => clientY > rect.top + rect.height / 2 ? index + 1 : index,
      0
    );
    const next = { ...current, y: clientY, overIndex };
    dragRef.current = next;
    setDrag(next);
  }, []);

  const startDrag = useCallback((taskId, index, clientY, rect) => {
    if (state.activeTasks.length < 2) return;
    const next = {
      id: taskId,
      fromIndex: index,
      overIndex: index,
      startY: clientY,
      y: clientY,
      height: rect?.height ?? 86,
      width: rect?.width ?? 320,
      left: rect?.left ?? 16,
      top: rect?.top ?? 0,
    };
    dragRef.current = next;
    setDrag(next);
  }, [state.activeTasks.length]);

  const armDrag = useCallback((event, taskId, index) => {
    if (state.activeTasks.length < 2) return;
    if (event.button != null && event.button !== 0) return;
    if (isInteractiveTarget(event.target)) return;
    setPressing({
      id: taskId,
      index,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    });
  }, [state.activeTasks.length]);

  useEffect(() => {
    if (!pressing || drag) return undefined;

    const timer = window.setTimeout(() => {
      const card = [...(listRef.current?.querySelectorAll('.il-taskcard[data-task-id]') ?? [])]
        .find((item) => item.dataset.taskId === pressing.id);
      card?.setPointerCapture?.(pressing.pointerId);
      startDrag(pressing.id, pressing.index, pressing.startY, card?.getBoundingClientRect());
      setPressing(null);
    }, LONG_PRESS_MS);

    return () => window.clearTimeout(timer);
  }, [drag, pressing, startDrag]);

  useEffect(() => {
    if (!pressing || drag) return undefined;

    const onPointerMove = (event) => {
      if (event.pointerId !== pressing.pointerId) return;
      const movedX = Math.abs(event.clientX - pressing.startX);
      const movedY = Math.abs(event.clientY - pressing.startY);
      if (movedX > PRESS_MOVE_TOLERANCE || movedY > PRESS_MOVE_TOLERANCE) {
        setPressing(null);
      }
    };
    const onPointerUp = (event) => {
      if (event.pointerId === pressing.pointerId) {
        setPressing(null);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [drag, pressing]);

  useEffect(() => {
    if (!drag) return undefined;

    const onPointerMove = (event) => {
      event.preventDefault();
      updateDrag(event.clientY);
    };
    const onPointerUp = () => {
      finishDrag();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [drag, finishDrag, updateDrag]);

  return (
    <div className="il-screen il-fade">
      <div className="il-topbar il-topbar-log">
        <div className="sub">{state.todayLabel}</div>
      </div>

      <div
        className={
          'il-body il-body-log' +
          (state.running?.type === 'task'
            ? ' has-runbar has-live-dock'
            : state.running
              ? ' has-runbar'
              : ' has-dock')
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
            {state.activeTasks.map((task, index) => {
              const isDragging = drag?.id === task.id;
              const dropIndex = drag?.overIndex;
              const isDropBefore = Boolean(drag && !isDragging && dropIndex === index);
              const isDropAfter = Boolean(drag && !isDragging && dropIndex === state.activeTasks.length && index === state.activeTasks.length - 1);
              return (
            <TaskCard
              key={task.id}
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
              onCardPointerDown={(event) => armDrag(event, task.id, index)}
              dragState={{
                isArming: pressing?.id === task.id,
                isDragging,
                offsetY: isDragging ? (drag?.y ?? 0) - (drag?.startY ?? 0) : 0,
                isDropBefore,
                isDropAfter,
              }}
            />
              );
            })}
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

      {(!state.running || state.running.type === 'task') && <QuickAddCard state={state} actions={actions} />}
    </div>
  );
}
