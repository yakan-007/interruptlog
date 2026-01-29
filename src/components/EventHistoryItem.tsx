'use client';

import React from 'react';
import { Event, Category, MyTask } from '@/types';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

interface EventHistoryItemProps {
  event: Event;
  onEditEvent: (event: Event) => void;
  formatEventTime: (timestamp: number) => string;
  categories?: Category[];
  isCategoryEnabled?: boolean;
  tasks: MyTask[];
}

const EVENT_TYPE_LABELS: Record<Event['type'], string> = {
  task: 'タスク',
  interrupt: '割り込み',
  break: '休憩',
};

export default function EventHistoryItem({
  event,
  onEditEvent,
  formatEventTime,
  categories = [],
  isCategoryEnabled = false,
  tasks,
}: EventHistoryItemProps) {
  const isUnknown = event.meta?.isUnknownActivity;
  const linkedTaskId = event.meta && 'myTaskId' in event.meta ? event.meta.myTaskId : undefined;
  const linkedTask = linkedTaskId ? tasks.find(task => task.id === linkedTaskId) : undefined;
  const linkedTaskName = linkedTask?.name?.trim();
  const rawLabel = event.label?.trim() ?? '';
  const displayLabel =
    event.type === 'task' && linkedTaskName && (!rawLabel || rawLabel === linkedTaskName)
      ? linkedTaskName
      : rawLabel || '無題のイベント';
  const showLinkedTaskTag = Boolean(
    event.type === 'task' &&
      linkedTaskName &&
      rawLabel &&
      rawLabel.length > 0 &&
      rawLabel !== linkedTaskName,
  );
  const category =
    event.categoryId && categories ? categories.find(cat => cat.id === event.categoryId) : undefined;

  return (
    <li
      className={`rounded-md border p-3 text-sm transition ${
        isUnknown
          ? 'border-amber-300 bg-amber-50/60 dark:border-amber-500/50 dark:bg-amber-500/10'
          : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {EVENT_TYPE_LABELS[event.type]}
            </span>
            {isUnknown && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-500/30 dark:text-amber-200">
                未分類の時間
              </span>
            )}
            {isCategoryEnabled && category && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
                {category.name}
              </span>
            )}
            {showLinkedTaskTag && linkedTaskName && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                タスク: {linkedTaskName}
              </span>
            )}
            <span className={`font-medium ${event.end ? '' : 'text-green-600 dark:text-green-400'}`}>{displayLabel}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({formatEventTime(event.start)}
              {event.end ? ` - ${formatEventTime(event.end)}` : ' - 実行中'})
            </span>
          </div>
          {event.type === 'interrupt' && (
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <div>発信: {event.who || '未入力'}</div>
              <div>割り込みカテゴリ: {event.interruptType || '未入力'}</div>
            </div>
          )}
          {event.memo && (
            <div className="text-sm text-slate-600 dark:text-slate-300">
              📝 {event.memo.length > 80 ? `${event.memo.slice(0, 80)}…` : event.memo}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onEditEvent(event)}
            title={event.end ? 'イベントを編集' : '実行中のイベントは停止後に編集できます'}
            disabled={!event.end}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}
