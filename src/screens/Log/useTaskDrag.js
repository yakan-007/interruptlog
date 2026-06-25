import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const LONG_PRESS_MS = 220;
const PRESS_MOVE_TOLERANCE = 10;

export function useTaskDrag(activeTasks, categoriesById, actions) {
  const [pressing, setPressing] = useState(null);
  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null);
  const listRef = useRef(null);
  const activeIndexById = useMemo(
    () => new Map(activeTasks.map((task, index) => [task.id, index])),
    [activeTasks]
  );
  const draggedTask = drag ? activeTasks.find((task) => task.id === drag.id) ?? null : null;
  const visibleActiveTasks = drag
    ? activeTasks.filter((task) => task.id !== drag.id)
    : activeTasks;
  const dragAccent = drag
    ? categoriesById[activeTasks.find((task) => task.id === drag.id)?.categoryId]?.color ?? 'var(--accent)'
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

  const startDrag = useCallback((taskId, index, pointerId, clientY, rect) => {
    if (activeTasks.length < 2) return;
    const next = {
      id: taskId,
      fromIndex: index,
      overIndex: index,
      pointerId,
      startY: clientY,
      y: clientY,
      height: rect?.height ?? 86,
      width: rect?.width ?? 320,
      left: rect?.left ?? 16,
      top: rect?.top ?? 0,
    };
    dragRef.current = next;
    setDrag(next);
  }, [activeTasks.length]);

  const armDrag = useCallback((event, taskId, index) => {
    if (activeTasks.length < 2) return;
    if (event.button != null && event.button !== 0) return;
    event.preventDefault();
    setPressing({
      id: taskId,
      index,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    });
  }, [activeTasks.length]);

  useEffect(() => {
    if (!pressing || drag) return undefined;

    const timer = window.setTimeout(() => {
      const card = [...(listRef.current?.querySelectorAll('.il-taskcard[data-task-id]') ?? [])]
        .find((item) => item.dataset.taskId === pressing.id);
      card?.setPointerCapture?.(pressing.pointerId);
      startDrag(pressing.id, pressing.index, pressing.pointerId, pressing.startY, card?.getBoundingClientRect());
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
      if (event.pointerId !== drag.pointerId) return;
      event.preventDefault();
      updateDrag(event.clientY);
    };
    const onPointerUp = (event) => {
      if (event.pointerId !== drag.pointerId) return;
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

  return {
    activeIndexById,
    armDrag,
    drag,
    draggedTask,
    dragAccent,
    listRef,
    pressing,
    visibleActiveTasks,
  };
}
