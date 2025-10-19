'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Trash2, Play, GripVertical, NotebookPen, Clock, CalendarClock } from 'lucide-react';
import { MyTask, Event, Category, DueAlertSettings } from '@/types';
import TaskCardTimer from './TaskCardTimer';
import useEventsStore from '@/store/useEventsStore';
import { useEvents, useFeatureFlags } from '@/hooks/useStoreSelectors';
import { cn } from '@/lib/utils';

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
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>, targetTaskId: string) => void;
  onDragEnd?: () => void;
  onEditPlanning?: (taskId: string) => void;
  isDragDisabled?: boolean;
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
  isDragDisabled,
}: TaskCardProps) {
  const { categories, isCategoryEnabled } = useEventsStore(state => ({
    categories: state.categories,
    isCategoryEnabled: state.isCategoryEnabled,
  }));
  const featureFlags = useFeatureFlags();
  const dueAlertSettings = useEventsStore(state => state.dueAlertSettings);
  const events = useEvents();

  const taskCategory = task.categoryId ? categories.find(cat => cat.id === task.categoryId) : null;

  const isActiveTask =
    activeEvent && activeEvent.type === 'task' && activeEvent.meta?.myTaskId === task.id && !activeEvent.end;

  const hasRunningEvent = Boolean(activeEvent && !activeEvent.end);

  const canStartEvent = (() => {
    if (!hasRunningEvent) {
      return true;
    }
    if (!activeEvent) {
      return true;
    }
    if (activeEvent.type === 'interrupt' || activeEvent.type === 'break') {
      return false;
    }
    return activeEvent.meta?.myTaskId !== task.id;
  })();

  const planning = task.planning;
  const hasPlanningDetails = featureFlags.enableTaskPlanning && planning && (planning.plannedDurationMinutes || planning.dueAt);

  const totalDurationMs = useMemo(() => {
    return events
      .filter(event => event.type === 'task' && event.meta?.myTaskId === task.id && event.end)
      .reduce((total, event) => total + (event.end! - event.start), 0);
  }, [events, task.id]);
  const runningDurationMs =
    activeEvent && activeEvent.type === 'task' && activeEvent.meta?.myTaskId === task.id && !activeEvent.end
      ? Date.now() - activeEvent.start
      : 0;
  const actualMinutes = (totalDurationMs + runningDurationMs) / 60000;

  const dragEnabled = !isDragDisabled;

  return (
    <Card
      id={`task-card-${task.id}`}
      className={cn(
        'space-y-2 p-3 transition-all',
        isActiveTask && 'border-green-400 bg-green-100 dark:border-green-600 dark:bg-green-800',
        dragEnabled && draggingTaskId === task.id && 'scale-105 transform opacity-75 shadow-2xl',
        dragEnabled && dragOverTaskId === task.id && draggingTaskId !== task.id &&
          'border-2 border-blue-500 ring-2 ring-blue-300 dark:border-blue-300'
      )}
      onDragOver={dragEnabled && onDragOver ? event => onDragOver(event, task.id) : undefined}
      onDragLeave={dragEnabled ? onDragLeave : undefined}
      onDrop={dragEnabled && onDrop ? event => onDrop(event, task.id) : undefined}
      onDragEnd={dragEnabled ? onDragEnd : undefined}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={cn('p-1', dragEnabled ? 'cursor-grab' : 'cursor-default opacity-40')}
          draggable={dragEnabled}
          onDragStart={dragEnabled && onDragStart ? event => onDragStart(event, task.id) : undefined}
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>
        <Checkbox
          checked={task.isCompleted}
          onChange={() => onToggleCompletion(task.id)}
          className="mr-1"
          id={`task-${task.id}`}
              disabled={false}
        />
        <div className="min-w-[140px] flex-1">
          {editingTaskId === task.id ? (
            <Input
              type="text"
              value={editingTaskName}
              onChange={event => onSetEditingTaskName(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  onSaveTaskName(task.id);
                } else if (event.key === 'Escape') {
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
                className={cn(
                  'flex-1 cursor-pointer select-none',
                  task.isCompleted ? 'text-gray-500 line-through' : 'text-gray-800 dark:text-gray-100'
                )}
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
          {isActiveTask && activeEvent?.start && <TaskCardTimer startTime={activeEvent.start} myTaskId={task.id} />}
          {!task.isCompleted && (
            <Button
              size="icon"
              variant="outline"
              onClick={() => onStartEvent(task.name, task.id)}
              disabled={!canStartEvent}
              title="タスクを開始"
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDeleteTask(task.id)}
            title="タスクを削除"
            className="text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {hasPlanningDetails && (
        <PlanningSummary
          planning={planning}
          actualMinutes={actualMinutes}
          dueAlertSettings={dueAlertSettings}
        />
      )}
    </Card>
  );
}

interface PlanningSummaryProps {
  planning?: MyTask['planning'];
  actualMinutes: number;
  dueAlertSettings: DueAlertSettings;
}

type ChipTone = 'neutral' | 'warning' | 'danger';

const chipToneClasses: Record<ChipTone, string> = {
  neutral: 'border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/70 dark:bg-amber-900/30 dark:text-amber-200',
  danger: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800/70 dark:bg-red-900/30 dark:text-red-200',
};

function PlanningSummary({ planning, actualMinutes, dueAlertSettings }: PlanningSummaryProps) {
  if (!planning) return null;

  const now = Date.now();
  const plannedMinutes = planning.plannedDurationMinutes ?? undefined;
  const dueAt = planning.dueAt ?? undefined;

  const plannedStatus = getPlannedStatus(actualMinutes, plannedMinutes);
  const dueStatus = getDueStatus(dueAt, now, dueAlertSettings);

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <StatusChip tone={plannedStatus.tone} icon={Clock} label="予定" value={plannedStatus.label} hint={plannedStatus.hint} />
        <StatusChip tone={dueStatus.tone} icon={CalendarClock} label="期限" value={dueStatus.label} hint={dueStatus.hint} />
      </div>
      {plannedMinutes && (
        <div className="text-[11px] text-gray-500 dark:text-gray-400">
          実績 {Math.round(actualMinutes)}分 / 予定 {Math.round(plannedMinutes)}分（{formatDiff(actualMinutes - plannedMinutes)}）
        </div>
      )}
    </div>
  );
}

interface StatusChipProps {
  tone: ChipTone;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}

function StatusChip({ tone, icon: Icon, label, value, hint }: StatusChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors',
        chipToneClasses[tone]
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="flex items-center gap-1">
        <span>{label}</span>
        <span>{value}</span>
      </span>
      {hint && <span className="text-[10px] opacity-80">{hint}</span>}
    </span>
  );
}

function getPlannedStatus(actualMinutes: number, plannedMinutes?: number): { tone: ChipTone; label: string; hint?: string } {
  if (!plannedMinutes || plannedMinutes <= 0) {
    return { tone: 'neutral', label: '—' };
  }

  const diff = actualMinutes - plannedMinutes;
  const diffLabel = formatDiff(diff);
  const ratio = actualMinutes / plannedMinutes;

  if (diff > 5) {
    return { tone: 'danger', label: `${Math.round(plannedMinutes)}分`, hint: `+${Math.round(diff)}分` };
  }
  if (ratio >= 0.8) {
    return { tone: 'warning', label: `${Math.round(plannedMinutes)}分`, hint: diffLabel };
  }
  return { tone: 'neutral', label: `${Math.round(plannedMinutes)}分`, hint: diffLabel };
}

function getDueStatus(
  dueAt: number | undefined,
  now: number,
  settings: DueAlertSettings
): { tone: ChipTone; label: string; hint?: string } {
  if (!dueAt) {
    return { tone: 'neutral', label: '—' };
  }

  const diffMinutes = (dueAt - now) / 60000;
  const formattedTime = formatDueAt(dueAt);

  if (diffMinutes < 0) {
    return { tone: 'danger', label: formattedTime, hint: `超過 ${Math.abs(Math.round(diffMinutes))}分` };
  }
  if (diffMinutes <= settings.dangerMinutes) {
    return { tone: 'danger', label: formattedTime, hint: `残り ${Math.round(diffMinutes)}分` };
  }
  if (diffMinutes <= settings.warningMinutes) {
    return { tone: 'warning', label: formattedTime, hint: `残り ${Math.round(diffMinutes)}分` };
  }
  return { tone: 'neutral', label: formattedTime, hint: `残り ${Math.round(diffMinutes)}分` };
}

function formatDiff(diffMinutes: number): string {
  if (Math.abs(diffMinutes) < 1) {
    return '±0分';
  }
  return diffMinutes > 0 ? `+${Math.round(diffMinutes)}分` : `${Math.round(diffMinutes)}分`;
}

function formatDueAt(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}
