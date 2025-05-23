'use client';

import { useEffect } from 'react';
import useEventsStore from '@/store/useEventsStore';
import { useTaskManagement } from '@/hooks/useTaskManagement';
import TaskListSection from '@/components/TaskListSection';
import EventHistorySection from '@/components/EventHistorySection';
import { layout, typography } from '@/styles/tailwind-classes';

export default function LogPage() {
  const { events, currentEventId, isHydrated } = useEventsStore();
  const taskManagement = useTaskManagement();

  const activeEvent = currentEventId ? events.find((e) => e.id === currentEventId) : undefined;

  // ページタイトルの更新
  useEffect(() => {
    if (isHydrated && activeEvent) {
      document.title = `InterruptLog Slim - ${activeEvent.label ?? 'Task'}`;
    } else {
      document.title = 'InterruptLog Slim';
    }
  }, [activeEvent, isHydrated]);

  return (
    <div className={layout.container}>
      <h1 className={typography.title}>Log</h1>

      <TaskListSection
        sortedMyTasks={taskManagement.sortedMyTasks}
        activeEvent={activeEvent}
        newTaskName={taskManagement.newTaskName}
        setNewTaskName={taskManagement.setNewTaskName}
        draggingTaskId={taskManagement.draggingTaskId}
        dragOverTaskId={taskManagement.dragOverTaskId}
        onAddTask={taskManagement.handleAddNewTask}
        onToggleCompletion={taskManagement.handleToggleTaskCompletion}
        onStartEvent={taskManagement.handleStartEvent}
        onDeleteTask={taskManagement.handleDeleteTask}
        onDragStart={taskManagement.handleDragStart}
        onDragOver={taskManagement.handleDragOver}
        onDragLeave={taskManagement.handleDragLeave}
        onDrop={taskManagement.handleDrop}
        onDragEnd={taskManagement.handleDragEnd}
      />

      <EventHistorySection events={events} />
    </div>
  );
} 