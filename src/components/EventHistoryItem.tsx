'use client';

import React from 'react';
import { Event, Category, MyTask } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Pencil } from 'lucide-react';
import { EventDraft } from '@/store/eventDraftUtils';

interface EventHistoryItemProps {
  event: Event;
  isEditing: boolean;
  draft: EventDraft | null;
  onStartEdit: (event: Event) => void;
  onChangeDraft: <K extends keyof EventDraft>(field: K, value: EventDraft[K]) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  formatEventTime: (timestamp: number) => string;
  onEditEventTime?: (event: Event) => void;
  canEditTime?: boolean;
  categories?: Category[];
  isCategoryEnabled?: boolean;
  interruptContacts: string[];
  interruptSubjects: string[];
  interruptCategories: Array<{ name: string; color: string }>;
  tasks: MyTask[];
}

const EVENT_TYPE_LABELS: Record<Event['type'], string> = {
  task: 'タスク',
  interrupt: '割り込み',
  break: '休憩',
};

const InterruptEditor = ({
  draft,
  onChangeDraft,
  contacts,
  subjects,
  categories,
}: {
  draft: EventDraft;
  onChangeDraft: <K extends keyof EventDraft>(field: K, value: EventDraft[K]) => void;
  contacts: string[];
  subjects: string[];
  categories: Array<{ name: string; color: string }>;
}) => (
  <div className="space-y-3">
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Input
          value={draft.who}
          onChange={event => onChangeDraft('who', event.target.value)}
          placeholder="誰からの割り込みか"
        />
        {contacts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {contacts.map(contact => (
              <Button
                key={contact}
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 rounded-full border px-3 text-xs"
                onClick={() => onChangeDraft('who', contact)}
              >
                {contact}
              </Button>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Input
          value={draft.label}
          onChange={event => onChangeDraft('label', event.target.value)}
          placeholder="件名"
        />
        {subjects.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {subjects.map(subject => (
              <Button
                key={subject}
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 rounded-full border px-3 text-xs"
                onClick={() => onChangeDraft('label', subject)}
              >
                {subject}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
    <div className="flex flex-wrap gap-2">
      {categories.map(item => (
        <Button
          key={item.name}
          type="button"
          size="sm"
          variant={draft.interruptType === item.name ? 'default' : 'outline'}
          className={draft.interruptType === item.name ? 'text-white' : ''}
          style={draft.interruptType === item.name ? { backgroundColor: item.color, borderColor: item.color } : {}}
          onClick={() => onChangeDraft('interruptType', item.name)}
        >
          {item.name}
        </Button>
      ))}
    </div>
  </div>
);

export default function EventHistoryItem({
  event,
  isEditing,
  draft,
  onStartEdit,
  onChangeDraft,
  onCancelEdit,
  onSaveEdit,
  formatEventTime,
  onEditEventTime,
  canEditTime = false,
  categories = [],
  isCategoryEnabled = false,
  interruptContacts,
  interruptSubjects,
  interruptCategories,
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

  if (!draft || !isEditing) {
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
              {category && (
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
                <div>要件カテゴリ: {event.interruptType || '未入力'}</div>
              </div>
            )}
            {event.memo && (
              <div className="text-sm text-slate-600 dark:text-slate-300">
                📝 {event.memo.length > 80 ? `${event.memo.slice(0, 80)}…` : event.memo}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {event.end && canEditTime && onEditEventTime && (
              <Button size="icon" variant="ghost" onClick={() => onEditEventTime(event)} title="終了時刻を調整">
                <Clock className="h-4 w-4" />
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={() => onStartEdit(event)} title="イベントを編集">
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </li>
    );
  }

  const draftLinkedTask = draft.myTaskId ? tasks.find(task => task.id === draft.myTaskId) : undefined;
  const draftLinkedTaskName = draftLinkedTask?.name?.trim() ?? '';
  const draftLabelTrimmed = draft.label.trim();
  const isLabelFollowingTaskName =
    draft.type === 'task' && Boolean(draftLinkedTaskName) && (!draftLabelTrimmed || draftLabelTrimmed === draftLinkedTaskName);
  const shouldShowEmptyLabelHint = draft.type === 'task' && !draft.myTaskId && !draftLabelTrimmed;

  return (
    <li className="rounded-md border p-3 text-sm">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={draft.type} onValueChange={value => onChangeDraft('type', value as Event['type'])}>
            <SelectTrigger className="w-[140px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="task">タスク</SelectItem>
              <SelectItem value="interrupt">割り込み</SelectItem>
              <SelectItem value="break">休憩</SelectItem>
            </SelectContent>
          </Select>
          {draft.type === 'task' && isCategoryEnabled && (
            <Select
              value={draft.categoryId ?? 'none'}
              onValueChange={value => onChangeDraft('categoryId', value === 'none' ? null : value)}
            >
              <SelectTrigger className="h-9 w-[180px] justify-between text-sm">
                <SelectValue placeholder="カテゴリなし" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="none">カテゴリなし</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {draft.type === 'task' && (
            <Select
              value={draft.myTaskId ?? 'none'}
              onValueChange={value => onChangeDraft('myTaskId', value === 'none' ? null : value)}
            >
              <SelectTrigger className="h-9 w-[220px] text-sm">
                <SelectValue placeholder="紐付けタスク" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="none">紐付け無し</SelectItem>
                {tasks.map(task => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {draft.type === 'interrupt' ? (
          <InterruptEditor
            draft={draft}
            onChangeDraft={onChangeDraft}
            contacts={interruptContacts}
            subjects={interruptSubjects}
            categories={interruptCategories}
          />
        ) : (
          <>
            <Input
              value={draft.label}
              onChange={event => onChangeDraft('label', event.target.value)}
              placeholder={draft.type === 'task' ? 'タスク名(空欄なら紐付けタスク名を使用)' : '休憩名'}
            />
            {isLabelFollowingTaskName && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                紐付けタスク名を初期値にしています。必要に応じて書き換えてください。
              </p>
            )}
            {shouldShowEmptyLabelHint && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                タスク名を入力するか、紐付けタスクを選択してください。
              </p>
            )}
          </>
        )}

        <textarea
          value={draft.memo}
          onChange={event => onChangeDraft('memo', event.target.value)}
          placeholder="補足があれば入力してください"
          className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancelEdit}>
            キャンセル
          </Button>
          <Button type="button" onClick={onSaveEdit}>
            保存
          </Button>
        </div>
      </div>
    </li>
  );
}
