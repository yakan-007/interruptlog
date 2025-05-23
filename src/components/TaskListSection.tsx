'use client';

import React from 'react';
import { Event, MyTask } from '@/types';
import TaskInput from './TaskInput';
import TaskItem from './TaskItem';
import { useI18n } from '@/locales/client';
import { layout, typography } from '@/styles/tailwind-classes';

interface TaskListSectionProps {
  sortedMyTasks: MyTask[];
  activeEvent?: Event;
  newTaskName: string;
  setNewTaskName: (name: string) => void;
  draggingTaskId: string | null;
  dragOverTaskId: string | null;
  onAddTask: () => void;
  onToggleCompletion: (taskId: string) => void;
  onStartEvent: (label: string, taskId?: string) => void;
  onDeleteTask: (taskId: string) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, targetTaskId: string) => void;
  onDragEnd: () => void;
}

const TaskListSection: React.FC<TaskListSectionProps> = ({
  sortedMyTasks,
  activeEvent,
  newTaskName,
  setNewTaskName,
  draggingTaskId,
  dragOverTaskId,
  onAddTask,
  onToggleCompletion,
  onStartEvent,
  onDeleteTask,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}) => {
  const t = useI18n() as any;

  return (
    <div className={layout.section}>
      <h2 className={typography.sectionTitle}>{t('tasks.myTasks')}</h2>
      <TaskInput
        newTaskName={newTaskName}
        setNewTaskName={setNewTaskName}
        onAddTask={onAddTask}
      />
      <div className={layout.spaceY2}>
        {sortedMyTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            activeEvent={activeEvent}
            draggingTaskId={draggingTaskId}
            dragOverTaskId={dragOverTaskId}
            onToggleCompletion={onToggleCompletion}
            onStartEvent={onStartEvent}
            onDeleteTask={onDeleteTask}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
          />
        ))}
        {sortedMyTasks.length === 0 && (
          <p className={typography.textGray}>{t('tasks.noTasksMessage')}</p>
        )}
      </div>
    </div>
  );
};

export default TaskListSection; 