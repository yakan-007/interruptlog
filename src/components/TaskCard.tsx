'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Trash2, Play, GripVertical, Check, X, NotebookPen } from 'lucide-react';
import { MyTask, Event, Category } from '@/types';
import TaskCardTimer from './TaskCardTimer';
import useEventsStore from '@/store/useEventsStore';
import { useFeatureFlags } from '@/hooks/useStoreSelectors';

interface TaskCardProps {
  task: MyTask;
  activeEvent?: Event;
  editingTaskId: string | null;
  editingTaskName: string;
  draggingTaskId: string | null;
  dragOverTaskId: string | null;
  onStartEditTask: (taskId: string, currentName: string) => void;
  onSaveTaskName: (taskId: string) => void;
  onCancelEditTask: () => void;
  onSetEditingTaskName: (name: string) => void;
  onToggleCompletion: (taskId: string) => void;
  onStartEvent: (label: string, taskId?: string) => void;
  onDeleteTask: (taskId: string) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, targetTaskId: string) => void;
  onDragEnd: () => void;
  onEditPlanning?: (taskId: string) => void;
}

export default function TaskCard({
  task,
  activeEvent,
  editingTaskId,
  editingTaskName,
  draggingTaskId,
  dragOverTaskId,
  onStartEditTask,
  onSaveTaskName,
  onCancelEditTask,
  onSetEditingTaskName,
  onToggleCompletion,
  onStartEvent,
  onDeleteTask,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onEditPlanning,
}: TaskCardProps) {
  const { categories, isCategoryEnabled } = useEventsStore((state) => ({
    categories: state.categories,
    isCategoryEnabled: state.isCategoryEnabled,
  }));
  const featureFlags = useFeatureFlags();

  const taskCategory = task.categoryId ? categories.find(cat => cat.id === task.categoryId) : null;

  const isActiveTask = activeEvent && 
    activeEvent.type === 'task' && 
    activeEvent.meta?.myTaskId === task.id && 
    !activeEvent.end;

  const isTaskDisabled = (activeEvent && 
    !activeEvent.end && 
    activeEvent.meta?.myTaskId === task.id) || 
    (activeEvent && 
    !activeEvent.end && 
    (activeEvent.type === 'interrupt' || activeEvent.type === 'break'));

  const planning = task.planning;
  const hasPlanningDetails = featureFlags.enableTaskPlanning && planning && (planning.plannedDurationMinutes || planning.dueAt);

  return (
    <Card
      id={`task-card-${task.id}`}
      className={`space-y-2 p-3 transition-all ${
        isActiveTask ? 'bg-green-100 dark:bg-green-800 border-green-400 dark:border-green-600' : ''
      } ${
        draggingTaskId === task.id ? 'opacity-75 shadow-2xl scale-105 transform' : ''
      } ${
        dragOverTaskId === task.id && draggingTaskId !== task.id ? 'border-2 border-blue-500 dark:border-blue-300 ring-2 ring-blue-300' : ''
      }`}
      onDragOver={e => onDragOver(e, task.id)}
      onDragLeave={onDragLeave}
      onDrop={e => onDrop(e, task.id)}
      onDragEnd={onDragEnd}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="cursor-grab p-1"
          draggable="true"
          onDragStart={e => onDragStart(e, task.id)}
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>
        <Checkbox
          checked={task.isCompleted}
          onChange={() => onToggleCompletion(task.id)}
          className="mr-1"
          id={`task-${task.id}`}
          disabled={isActiveTask}
          title={isActiveTask ? '進行中のタスクは完了できません。先に停止してください。' : undefined}
        />
        <div className="flex-1 min-w-[140px]">
          {editingTaskId === task.id ? (
            <Input
              type="text"
              value={editingTaskName}
              onChange={e => onSetEditingTaskName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  onSaveTaskName(task.id);
                } else if (e.key === 'Escape') {
                  onCancelEditTask();
                }
              }}
              onBlur={() => onSaveTaskName(task.id)}
              className="h-8"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2">
              {isCategoryEnabled && taskCategory && (
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: taskCategory.color }}
                  title={taskCategory.name}
                />
              )}
              <span
                className={`${task.isCompleted ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-100'} flex-1 cursor-pointer select-none`}
                onDoubleClick={() => !task.isCompleted && onStartEditTask(task.id, task.name)}
                title={!task.isCompleted ? 'Double-click to edit' : ''}
              >
                {task.name}
              </span>
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {featureFlags.enableTaskPlanning && onEditPlanning && (
            <Button
              size="icon"
              variant="ghost"
              type="button"
              onClick={() => onEditPlanning(task.id)}
              title="予定時間と期限を編集"
            >
              <NotebookPen className="h-4 w-4" />
            </Button>
          )}
          {isActiveTask && activeEvent?.start && (
            <TaskCardTimer startTime={activeEvent.start} myTaskId={task.id} />
          )}
          {!task.isCompleted && (
            <Button
              size="icon"
              variant="outline"
              onClick={() => onStartEvent(task.name, task.id)}
              disabled={isTaskDisabled}
              title="タスクを開始"
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="destructive"
            onClick={() => onDeleteTask(task.id)}
            title="タスクを削除"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {hasPlanningDetails && <PlanningSummary planning={planning} />}
    </Card>
  );
}

interface PlanningSummaryProps {
  planning?: MyTask['planning'];
}

function PlanningSummary({ planning }: PlanningSummaryProps) {
  if (!planning) return null;

  const chips: string[] = [];
  if (planning.plannedDurationMinutes) {
    chips.push(`予定 ${planning.plannedDurationMinutes}分`);
  }
  if (planning.dueAt) {
    chips.push(`期限 ${formatDueAt(planning.dueAt)}`);
  }

  if (chips.length === 0) return null;

  return (
    <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
      <div className="flex flex-wrap gap-2">
        {chips.map(item => (
          <span key={item} className="rounded-full bg-gray-200 px-2 py-1 text-[11px] font-medium dark:bg-gray-700">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function formatDueAt(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}
