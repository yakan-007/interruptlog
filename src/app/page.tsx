'use client';

import { useEffect, useState } from 'react';
import { Event } from '@/types';
import TaskManagementSection from '@/components/main/TaskManagementSection';
import EventHistorySection from '@/components/main/EventHistorySection';
import EventEditModal from '@/components/EventEditModal';
// Nowカードや操作バーは従来どおりの構成に戻す
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { 
  useActiveEvent, 
  useMyTasks, 
  useCategories, 
  useIsCategoryEnabled, 
  useIsHydrated,
  useStoreActions,
  useEvents 
} from '@/hooks/useStoreSelectors';

export default function LogPage() {
  // Use optimized selectors
  const activeEvent = useActiveEvent();
  const myTasks = useMyTasks();
  const events = useEvents();
  const categories = useCategories();
  const isCategoryEnabled = useIsCategoryEnabled();
  const isHydrated = useIsHydrated();
  const actions = useStoreActions();
  
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [editingMemoEventId, setEditingMemoEventId] = useState<string | null>(null);
  const [memoText, setMemoText] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState('');
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Use drag and drop hook
  const {
    draggingItemId: draggingTaskId,
    dragOverItemId: dragOverTaskId,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDragEnd,
    handleDrop,
  } = useDragAndDrop(myTasks, actions.reorderMyTasks);

  useEffect(() => {
    if (isHydrated && activeEvent) {
      document.title = `InterruptLog Slim - ${activeEvent.label ?? 'タスク'}`;
    } else {
      document.title = 'InterruptLog Slim';
    }
  }, [activeEvent, isHydrated]);

  const handleStartEvent = (label: string, taskId?: string) => {
    actions.startTask(label, taskId);
  };

  const handleDeleteTask = (taskId: string) => {
    const message = 'このタスクを削除しますか？';
    if (typeof window !== 'undefined' && !window.confirm(message)) {
      return;
    }
    actions.removeMyTask(taskId);
  };

  const handleToggleTaskCompletion = (taskId: string) => {
    actions.toggleMyTaskCompletion(taskId);
  };

  // Handle memo editing
  const handleStartEditMemo = (eventId: string, currentMemo?: string) => {
    setEditingMemoEventId(eventId);
    setMemoText(currentMemo || '');
  };

  const handleSaveMemo = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      actions.updateEvent({
        ...event,
        memo: memoText.trim() || undefined
      });
    }
    setEditingMemoEventId(null);
    setMemoText('');
  };

  const handleCancelEditMemo = () => {
    setEditingMemoEventId(null);
    setMemoText('');
  };

  // Handle task name editing
  const handleStartEditTask = (taskId: string, currentName: string) => {
    setEditingTaskId(taskId);
    setEditingTaskName(currentName);
  };

  const handleSaveTaskName = (taskId: string) => {
    const trimmedName = editingTaskName.trim();
    if (trimmedName && trimmedName !== '') {
      const task = myTasks.find(t => t.id === taskId);
      if (task) {
        actions.updateMyTask(taskId, trimmedName);
      }
    }
    setEditingTaskId(null);
    setEditingTaskName('');
  };

  const handleCancelEditTask = () => {
    setEditingTaskId(null);
    setEditingTaskName('');
  };

  // Handle event time editing
  const handleEditEventTime = (event: Event) => {
    setEditingEvent(event);
    setIsEditModalOpen(true);
  };

  const handleSaveEventTime = (eventId: string, newEndTime: number, gapActivityName?: string, newEventType?: Event['type'], newLabel?: string, newCategoryId?: string, interruptType?: string) => {
    actions.updateEventEndTime(eventId, newEndTime, gapActivityName, newEventType, newLabel, newCategoryId, interruptType);
    setIsEditModalOpen(false);
    setEditingEvent(null);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingEvent(null);
  };

  return (
    <div className="container mx-auto p-4 pb-16">
      <h1 className="text-2xl font-bold mb-4">InterruptLog</h1>

      <TaskManagementSection
        activeEvent={activeEvent}
        editingTaskId={editingTaskId}
        editingTaskName={editingTaskName}
        draggingTaskId={draggingTaskId}
        dragOverTaskId={dragOverTaskId}
        onStartEditTask={handleStartEditTask}
        onSaveTaskName={handleSaveTaskName}
        onCancelEditTask={handleCancelEditTask}
        onSetEditingTaskName={setEditingTaskName}
        onToggleCompletion={handleToggleTaskCompletion}
        onStartEvent={handleStartEvent}
        onDeleteTask={handleDeleteTask}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
      />

      <EventHistorySection
        events={events}
        showAllHistory={showAllHistory}
        setShowAllHistory={setShowAllHistory}
        editingMemoEventId={editingMemoEventId}
        memoText={memoText}
        onStartEditMemo={handleStartEditMemo}
        onSaveMemo={handleSaveMemo}
        onCancelEditMemo={handleCancelEditMemo}
        onSetMemoText={setMemoText}
        onEditEventTime={handleEditEventTime}
        categories={categories}
        isCategoryEnabled={isCategoryEnabled}
      />

      <EventEditModal
        event={editingEvent}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleSaveEventTime}
        nextEvent={editingEvent ? events[events.findIndex(e => e.id === editingEvent.id) + 1] : undefined}
      />

      {/* 画面下部の操作バーは元の構成に依存しているため、ここでは使わない */}
    </div>
  );
}
