'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Play, Trash2, GripVertical } from 'lucide-react';
import { Event, MyTask } from '@/types';
import TaskCardTimer from '@/components/TaskCardTimer';
import { useTypedI18n } from '@/hooks/useTypedI18n';
import { taskStyles, colors, iconSizes } from '@/styles/tailwind-classes';

interface TaskItemProps {
  task: MyTask;
  activeEvent?: Event;
  draggingTaskId: string | null;
  dragOverTaskId: string | null;
  onToggleCompletion: (taskId: string) => void;
  onStartEvent: (label: string, taskId?: string) => void;
  onDeleteTask: (taskId: string) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, targetTaskId: string) => void;
  onDragEnd: () => void;
}

const TaskItem: React.FC<TaskItemProps> = React.memo(({
  task,
  activeEvent,
  draggingTaskId,
  dragOverTaskId,
  onToggleCompletion,
  onStartEvent,
  onDeleteTask,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}) => {
  const t = useTypedI18n();

  const { isActive, isCurrentTaskRunning, isOtherEventRunning, isStartDisabled } = useMemo(() => {
    const isActive = activeEvent && 
      activeEvent.type === 'task' && 
      activeEvent.meta?.myTaskId === task.id && 
      !activeEvent.end;

    const isCurrentTaskRunning = activeEvent && 
      !activeEvent.end && 
      activeEvent.meta?.myTaskId === task.id;

    const isOtherEventRunning = activeEvent && 
      !activeEvent.end && 
      (activeEvent.type === 'interrupt' || activeEvent.type === 'break');

    const isStartDisabled = isCurrentTaskRunning || isOtherEventRunning;

    return { isActive, isCurrentTaskRunning, isOtherEventRunning, isStartDisabled };
  }, [activeEvent, task.id]);

  const cardClassName = useMemo(() => {
    let className = taskStyles.cardBase;
    
    if (isActive) {
      className += ` ${colors.activeTask}`;
    }
    
    if (draggingTaskId === task.id) {
      className += ` ${taskStyles.dragging}`;
    }
    
    if (dragOverTaskId === task.id && draggingTaskId !== task.id) {
      className += ` ${taskStyles.dragOver}`;
    }
    
    return className;
  }, [isActive, draggingTaskId, dragOverTaskId, task.id]);

  const labelClassName = useMemo(() => {
    return `${task.isCompleted ? 'line-through text-gray-500' : ''} ${taskStyles.taskLabel}`;
  }, [task.isCompleted]);

  return (
    <Card
      key={task.id}
      id={`task-card-${task.id}`}
      className={cardClassName}
      onDragOver={(e) => onDragOver(e, task.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, task.id)}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-center flex-grow mr-2">
        <div
          className={taskStyles.dragHandle}
          draggable="true"
          onDragStart={(e) => onDragStart(e, task.id)}
        >
          <GripVertical className={taskStyles.dragIcon} />
        </div>
        <Checkbox
          checked={task.isCompleted}
          onChange={() => onToggleCompletion(task.id)}
          className={taskStyles.checkbox}
          id={`task-${task.id}`}
        />
        <label
          htmlFor={`task-${task.id}`}
          className={labelClassName}
        >
          {task.name}
        </label>
      </div>
      <div className={taskStyles.actionButtons}>
        {isActive && activeEvent && activeEvent.start > 0 && (
          <TaskCardTimer startTime={activeEvent.start} myTaskId={task.id} />
        )}
        <div className={taskStyles.buttonContainer}>
          {!task.isCompleted && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStartEvent(task.name, task.id)}
              disabled={isStartDisabled}
              title={t('tasks.startTaskTitle')}
            >
              <Play className={iconSizes.sm} />
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDeleteTask(task.id)}
            title={t('tasks.deleteTaskTitle')}
          >
            <Trash2 className={iconSizes.sm} />
          </Button>
        </div>
      </div>
    </Card>
  );
});

TaskItem.displayName = 'TaskItem';

export default TaskItem; 