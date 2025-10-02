'use client';

import React from 'react';
import { Event, Category, MyTask } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Pencil } from 'lucide-react';
import { Label } from '@/components/ui/label';
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

const renderCategoryPill = (event: Event, categories: Category[] | undefined, tasks: MyTask[]) => {
  if (event.type !== 'task' || !event.categoryId || !categories) {
    const taskName = event.meta?.myTaskId ? tasks.find(task => task.id === event.meta?.myTaskId)?.name : null;
    return taskName ? (
      <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
        {taskName}
      </span>
    ) : null;
  }
  const category = categories.find(cat => cat.id === event.categoryId);
  const taskName = event.meta?.myTaskId ? tasks.find(task => task.id === event.meta?.myTaskId)?.name : null;
  if (!category && !taskName) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
      {category && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />}
      {category?.name ?? 'カテゴリなし'}
      {taskName && `（${taskName}）`}
    </span>
  );
};

const renderMetaSummary = (event: Event) => {
  if (event.type === 'interrupt') {
    return (
      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <div>発信: {event.who || '未入力'}</div>
        <div>要件カテゴリ: {event.interruptType || '未入力'}</div>
        <div>緊急度: {event.urgency ?? '未設定'}</div>
      </div>
    );
  }

  if (event.type === 'break') {
    return (
      <div className="text-xs text-slate-500 dark:text-slate-400">
        休憩タイプ: {event.breakType ?? '未設定'}
      </div>
    );
  }

  return null;
};

const renderCategoryEditor = (
  draft: EventDraft,
  categories: Category[],
  onChangeDraft: <K extends keyof EventDraft>(field: K, value: EventDraft[K]) => void,
  tasks: MyTask[],
) => (
  <Select
    value={draft.categoryId ?? 'none'}
    onValueChange={value => onChangeDraft('categoryId', value === 'none' ? null : value)}
  >
    <SelectTrigger className="h-9 w-[180px] justify-between text-sm">
      <SelectValue placeholder="カテゴリを選択">
        {draft.categoryId
          ? categories.find(cat => cat.id === draft.categoryId)?.name ?? 'カテゴリなし'
          : 'カテゴリなし'}
      </SelectValue>
    </SelectTrigger>
    <SelectContent className="max-h-60">
      <SelectItem value="none">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-slate-300" />
          カテゴリなし
        </div>
      </SelectItem>
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
);

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
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-300">発信者</label>
        <Input
          value={draft.who}
          onChange={event => onChangeDraft('who', event.target.value)}
          placeholder="例: 佐藤部長"
        />
        {contacts.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
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
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-300">件名</label>
        <Input
          value={draft.label}
          onChange={event => onChangeDraft('label', event.target.value)}
          placeholder="例: XX会社からの電話"
        />
        {subjects.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
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
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500 dark:text-slate-300">要件カテゴリ</label>
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
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500 dark:text-slate-300">緊急度</label>
      <Select
        value={draft.urgency}
        onValueChange={value => onChangeDraft('urgency', value as EventDraft['urgency'])}
      >
        <SelectTrigger className="w-[160px] text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Low">低</SelectItem>
          <SelectItem value="Medium">中</SelectItem>
          <SelectItem value="High">高</SelectItem>
        </SelectContent>
      </Select>
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
  const renderViewMode = () => (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
         <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
           {EVENT_TYPE_LABELS[event.type]}
         </span>
          {renderCategoryPill(event, categories, tasks)}
          <span className={`font-medium ${event.end ? '' : 'text-green-600 dark:text-green-400'}`}>
            {event.label ?? '無題のイベント'}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            ({formatEventTime(event.start)}
            {event.end ? ` - ${formatEventTime(event.end)}` : ' - 実行中'})
          </span>
        </div>
        {renderMetaSummary(event)}
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
  );

  if (!draft || !isEditing) {
    return (
      <li className="rounded-md border p-3 text-sm">
        {renderViewMode()}
      </li>
    );
  }

  const renderTaskOptions = () => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500 dark:text-slate-300">紐付けタスク</label>
      <Select
        value={draft.myTaskId ?? 'none'}
        onValueChange={value => onChangeDraft('myTaskId', value === 'none' ? null : value)}
      >
        <SelectTrigger className="w-[220px] text-sm">
          <SelectValue placeholder="紐付け無し" />
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
    </div>
  );

  return (
    <li className="rounded-md border p-3 text-sm">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={draft.type}
            onValueChange={value => onChangeDraft('type', value as Event['type'])}
          >
            <SelectTrigger className="w-[140px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="task">タスク</SelectItem>
              <SelectItem value="interrupt">割り込み</SelectItem>
              <SelectItem value="break">休憩</SelectItem>
            </SelectContent>
          </Select>
          {draft.type === 'task' && isCategoryEnabled && renderCategoryEditor(draft, categories, onChangeDraft, tasks)}
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
          <div className="grid gap-2">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-300">件名</label>
            <Input
              value={draft.label}
              onChange={event => onChangeDraft('label', event.target.value)}
              placeholder="イベント名"
            />
          </div>
        )}

        <div className="grid gap-2">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-300">メモ</label>
          <textarea
            value={draft.memo}
            onChange={event => onChangeDraft('memo', event.target.value)}
            placeholder="補足があれば入力してください"
            className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

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
