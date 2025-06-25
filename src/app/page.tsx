'use client';

import { useEffect, useState } from 'react';
import useEventsStore from '@/store/useEventsStore';
import { Event } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle } from 'lucide-react';
import TaskCard from '@/components/TaskCard';
import EventHistoryItem from '@/components/EventHistoryItem';
import EventEditModal from '@/components/EventEditModal';
import { formatEventTime } from '@/lib/timeUtils';
import { YESTERDAY_EVENTS_LIMIT } from '@/lib/constants';

export default function LogPage() {
  const { events, currentEventId, myTasks, categories, isCategoryEnabled, isHydrated, actions } = useEventsStore();
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskCategoryId, setNewTaskCategoryId] = useState<string>('');
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [editingMemoEventId, setEditingMemoEventId] = useState<string | null>(null);
  const [memoText, setMemoText] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState('');
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const activeEvent = currentEventId ? events.find((e) => e.id === currentEventId) : undefined;
  
  // Find the last completed event
  const lastCompletedEvent = [...events]
    .reverse()
    .find(event => event.end !== undefined);

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

  const handleAddNewTask = () => {
    if (newTaskName.trim() !== '') {
      const categoryId = newTaskCategoryId && newTaskCategoryId !== 'none' ? newTaskCategoryId : undefined;
      actions.addMyTask(newTaskName.trim(), categoryId);
      setNewTaskName('');
      setNewTaskCategoryId('');
    }
  };

  const handleDeleteTask = (taskId: string) => {
    actions.removeMyTask(taskId);
  };

  const handleToggleTaskCompletion = (taskId: string) => {
    actions.toggleMyTaskCompletion(taskId);
  };

  const sortedMyTasks = [...myTasks].sort((a, b) => a.order - b.order);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    setDraggingTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.preventDefault();
    if (taskId !== draggingTaskId) {
      setDragOverTaskId(taskId);
    }
  };

  const handleDragLeave = () => {
    setDragOverTaskId(null);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverTaskId(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetTaskId: string) => {
    const draggedTaskId = e.dataTransfer.getData('taskId');
    if (draggedTaskId && draggedTaskId !== targetTaskId) {
      const targetIndex = sortedMyTasks.findIndex((t) => t.id === targetTaskId);
      actions.reorderMyTasks(draggedTaskId, targetIndex);
    }
    setDraggingTaskId(null);
    setDragOverTaskId(null);
  };

  // Filter events for display: today's events + last 5 from yesterday
  const getFilteredEvents = () => {
    if (showAllHistory) {
      return events;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayEvents = events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= today;
    });
    
    const yesterdayEvents = events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= yesterday && eventDate < today;
    });
    
    // Get last events from yesterday
    const last5YesterdayEvents = yesterdayEvents.slice(-YESTERDAY_EVENTS_LIMIT);
    
    // Combine and sort by start time
    return [...last5YesterdayEvents, ...todayEvents].sort((a, b) => a.start - b.start);
  };

  const filteredEvents = getFilteredEvents();

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

  const handleSaveEventTime = (eventId: string, newEndTime: number, gapActivityName?: string, newEventType?: Event['type'], newLabel?: string, newCategoryId?: string) => {
    actions.updateEventEndTime(eventId, newEndTime, gapActivityName, newEventType, newLabel, newCategoryId);
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

      {/* My Tasks Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">マイタスク</h2>
        <div className="flex gap-2 mb-4">
          <Input
            type="text"
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddNewTask();
              }
            }}
            placeholder="新しいタスク名"
            className="flex-grow"
          />
          {isCategoryEnabled && (
            <Select value={newTaskCategoryId} onValueChange={setNewTaskCategoryId}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="カテゴリ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">カテゴリなし</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={handleAddNewTask} variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" /> タスクを追加
          </Button>
        </div>
        <div className="space-y-2">
          {sortedMyTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
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
          ))}
          {myTasks.length === 0 && <p className="text-gray-500">タスクがまだありません。追加してください！</p>}
        </div>
      </div>

      {/* Event History Section */}
      <div>
        <h2 className="text-xl font-semibold mb-2">イベント履歴</h2>
        {filteredEvents.length > 0 ? (
          <ul className="space-y-2">
            {filteredEvents
              .slice()
              .reverse()
              .map((event) => (
                <EventHistoryItem
                  key={event.id}
                  event={event}
                  editingMemoEventId={editingMemoEventId}
                  memoText={memoText}
                  onStartEditMemo={handleStartEditMemo}
                  onSaveMemo={handleSaveMemo}
                  onCancelEditMemo={handleCancelEditMemo}
                  onSetMemoText={setMemoText}
                  formatEventTime={formatEventTime}
                  onEditEventTime={handleEditEventTime}
                  canEditTime={event.id === lastCompletedEvent?.id}
                  categories={categories}
                  isCategoryEnabled={isCategoryEnabled}
                />
              ))}
          </ul>
        ) : (
          <p className="text-gray-500">まだイベントが記録されていません。</p>
        )}
        
        {/* Show more button */}
        {!showAllHistory && events.length > filteredEvents.length && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={() => setShowAllHistory(true)}
              className="text-sm"
            >
              すべての履歴を表示（残り{events.length - filteredEvents.length}件）
            </Button>
          </div>
        )}
        
        {showAllHistory && events.length > 0 && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={() => setShowAllHistory(false)}
              className="text-sm"
            >
              表示を減らす
            </Button>
          </div>
        )}
      </div>

      {/* Event Edit Modal */}
      <EventEditModal
        event={editingEvent}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleSaveEventTime}
        nextEvent={editingEvent ? events[events.findIndex(e => e.id === editingEvent.id) + 1] : undefined}
      />
    </div>
  );
} 