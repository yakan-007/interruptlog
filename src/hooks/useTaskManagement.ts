import { useState, useCallback, useMemo } from 'react';
import useEventsStore from '@/store/useEventsStore';

export const useTaskManagement = () => {
  const { myTasks, actions } = useEventsStore();
  const [newTaskName, setNewTaskName] = useState('');
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  const sortedMyTasks = useMemo(
    () => [...myTasks].sort((a, b) => a.order - b.order),
    [myTasks]
  );

  const handleAddNewTask = useCallback(() => {
    if (newTaskName.trim() !== '') {
      actions.addMyTask(newTaskName.trim());
      setNewTaskName('');
    }
  }, [newTaskName, actions]);

  const handleDeleteTask = useCallback((taskId: string) => {
    actions.removeMyTask(taskId);
  }, [actions]);

  const handleToggleTaskCompletion = useCallback((taskId: string) => {
    actions.toggleMyTaskCompletion(taskId);
  }, [actions]);

  const handleStartEvent = useCallback((label: string, taskId?: string) => {
    actions.startTask(label, taskId);
  }, [actions]);

  // ドラッグ&ドロップ関連のハンドラー
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    setDraggingTaskId(taskId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.preventDefault();
    if (taskId !== draggingTaskId) {
      setDragOverTaskId(taskId);
    }
  }, [draggingTaskId]);

  const handleDragLeave = useCallback(() => {
    setDragOverTaskId(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingTaskId(null);
    setDragOverTaskId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, targetTaskId: string) => {
    const draggedTaskId = e.dataTransfer.getData('taskId');
    if (draggedTaskId && draggedTaskId !== targetTaskId) {
      const targetIndex = sortedMyTasks.findIndex((t) => t.id === targetTaskId);
      actions.reorderMyTasks(draggedTaskId, targetIndex);
    }
    setDraggingTaskId(null);
    setDragOverTaskId(null);
  }, [sortedMyTasks, actions]);

  return {
    // データ
    myTasks,
    sortedMyTasks,
    newTaskName,
    setNewTaskName,
    draggingTaskId,
    dragOverTaskId,
    
    // アクション
    handleAddNewTask,
    handleDeleteTask,
    handleToggleTaskCompletion,
    handleStartEvent,
    
    // ドラッグ&ドロップ
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDragEnd,
    handleDrop,
  };
}; 