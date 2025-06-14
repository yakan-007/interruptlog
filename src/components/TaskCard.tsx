'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Trash2, Play, GripVertical, Check, X } from 'lucide-react';
import { MyTask, Event } from '@/types';
import TaskCardTimer from './TaskCardTimer';

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
}: TaskCardProps) {
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

  return (
    <Card
      id={`task-card-${task.id}`}
      className={`flex items-center justify-between p-3 transition-all ${
        isActiveTask ? 'bg-green-100 dark:bg-green-800 border-green-400 dark:border-green-600' : ''
      } ${
        draggingTaskId === task.id ? 'opacity-75 shadow-2xl scale-105 transform' : ''
      } ${
        dragOverTaskId === task.id && draggingTaskId !== task.id ? 'border-2 border-blue-500 dark:border-blue-300 ring-2 ring-blue-300' : ''
      }`}
      onDragOver={(e) => onDragOver(e, task.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, task.id)}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-center flex-grow mr-2">
        <div
          className="cursor-grab p-1 mr-2"
          draggable="true"
          onDragStart={(e) => onDragStart(e, task.id)}
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>
        <Checkbox
          checked={task.isCompleted}
          onChange={() => onToggleCompletion(task.id)}
          className="mr-3"
          id={`task-${task.id}`}
        />
        {editingTaskId === task.id ? (
          <div className="flex-grow flex gap-2">
            <Input
              type="text"
              value={editingTaskName}
              onChange={(e) => onSetEditingTaskName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  onSaveTaskName(task.id);
                } else if (e.key === 'Escape') {
                  onCancelEditTask();
                }
              }}
              onBlur={() => onSaveTaskName(task.id)}
              className="flex-1 h-8"
              autoFocus
            />
          </div>
        ) : (
          <span
            className={`${task.isCompleted ? 'line-through text-gray-500' : ''} flex-grow cursor-pointer select-none`}
            onDoubleClick={() => !task.isCompleted && onStartEditTask(task.id, task.name)}
            title={!task.isCompleted ? "Double-click to edit" : ""}
          >
            {task.name}
          </span>
        )}
      </div>
      <div className="flex items-center">
        {isActiveTask && activeEvent?.start && (
          <TaskCardTimer startTime={activeEvent.start} myTaskId={task.id} />
        )}
        <div className="flex gap-2 ml-2">
          {!task.isCompleted && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStartEvent(task.name, task.id)}
              disabled={isTaskDisabled}
              title="Start this task"
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDeleteTask(task.id)}
            title="Delete this task"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}