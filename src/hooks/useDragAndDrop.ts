import { useState } from 'react';

export function useDragAndDrop<T extends { id: string }>(
  items: T[],
  onReorder: (itemId: string, newIndex: number) => void
) {
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, itemId: string) => {
    e.dataTransfer.setData('itemId', itemId);
    setDraggingItemId(itemId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, itemId: string) => {
    e.preventDefault();
    if (itemId !== draggingItemId) {
      setDragOverItemId(itemId);
    }
  };

  const handleDragLeave = () => {
    setDragOverItemId(null);
  };

  const handleDragEnd = () => {
    setDraggingItemId(null);
    setDragOverItemId(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetItemId: string) => {
    const draggedItemId = e.dataTransfer.getData('itemId');
    if (draggedItemId && draggedItemId !== targetItemId) {
      const targetIndex = items.findIndex((item) => item.id === targetItemId);
      onReorder(draggedItemId, targetIndex);
    }
    setDraggingItemId(null);
    setDragOverItemId(null);
  };

  return {
    draggingItemId,
    dragOverItemId,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDragEnd,
    handleDrop,
  };
}