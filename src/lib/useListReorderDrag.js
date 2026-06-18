import { useCallback, useEffect, useRef, useState } from 'react';

export function useListReorderDrag({ onMove }) {
  const dragRef = useRef(null);
  const [drag, setDrag] = useState(null);

  const updateDrag = useCallback((clientX, clientY) => {
    const current = dragRef.current;
    if (!current) return;
    const row = document
      .elementFromPoint(clientX, clientY)
      ?.closest('[data-reorder-id][data-reorder-index]');
    if (!row || row.dataset.reorderId === current.id) return;
    const targetIndex = Number(row.dataset.reorderIndex);
    if (!Number.isFinite(targetIndex)) return;
    const rect = row.getBoundingClientRect();
    let overIndex = clientY > rect.top + rect.height / 2 ? targetIndex + 1 : targetIndex;
    if (current.fromIndex < overIndex) overIndex -= 1;
    overIndex = Math.max(0, overIndex);
    if (current.overIndex === overIndex && current.y === clientY) return;
    const next = { ...current, y: clientY, overIndex };
    dragRef.current = next;
    setDrag(next);
  }, []);

  const finishDrag = useCallback(() => {
    const current = dragRef.current;
    if (current?.overIndex != null) onMove(current.id, current.overIndex);
    dragRef.current = null;
    setDrag(null);
  }, [onMove]);

  const getHandleProps = useCallback((id, index) => ({
    onPointerDown(event) {
      if (event.button != null && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const next = {
        id,
        fromIndex: index,
        overIndex: index,
        pointerId: event.pointerId,
        y: event.clientY,
      };
      dragRef.current = next;
      setDrag(next);
    },
  }), []);

  const getRowProps = useCallback((id, index) => ({
    'data-reorder-id': id,
    'data-reorder-index': index,
    onPointerMove(event) {
      if (!dragRef.current) return;
      updateDrag(event.clientX, event.clientY);
    },
  }), [updateDrag]);

  const getDropPosition = useCallback((id, index, itemCount) => {
    if (!drag || drag.id === id || itemCount < 2) return null;
    const visibleIndex = index > drag.fromIndex ? index - 1 : index;
    const visibleLength = itemCount - 1;
    if (drag.overIndex === visibleIndex) return 'before';
    if (drag.overIndex === visibleLength && visibleIndex === visibleLength - 1) return 'after';
    return null;
  }, [drag]);

  useEffect(() => {
    if (!drag) return undefined;
    const onPointerMove = (event) => {
      if (event.pointerId !== dragRef.current?.pointerId) return;
      event.preventDefault();
      updateDrag(event.clientX, event.clientY);
    };
    const onPointerUp = (event) => {
      if (event.pointerId === dragRef.current?.pointerId) finishDrag();
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
    drag,
    getDropPosition,
    getHandleProps,
    getRowProps,
  };
}
