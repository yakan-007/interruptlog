'use client';

import React from 'react';
import { Event, Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Pencil } from 'lucide-react';
import { Label } from '@/components/ui/label';

type InterruptUrgency = NonNullable<Event['urgency']>;

export interface EventEditDraft {
  type: Event['type'];
  label: string;
  memo: string;
  categoryId: string | null;
  who: string;
  interruptType: string;
  breakType: NonNullable<Event['breakType']> | '';
  urgency: InterruptUrgency;
}

interface EventHistoryItemProps {
  event: Event;
  isEditing: boolean;
  draft: EventEditDraft | null;
  onStartEdit: (event: Event) => void;
  onChangeDraft: <K extends keyof EventEditDraft>(field: K, value: EventEditDraft[K]) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  formatEventTime: (timestamp: number) => string;
  onEditEventTime?: (event: Event) => void;
  canEditTime?: boolean;
  categories?: Category[];
  isCategoryEnabled?: boolean;
  interruptContacts: string[];
  interruptSubjects: string[];
  interruptCategoryLabels: string[];
}

const EVENT_TYPE_LABELS: Record<Event['type'], string> = {
  task: 'タスク',
  interrupt: '割り込み',
  break: '休憩',
};

const BREAK_TYPE_OPTIONS: Array<{ value: NonNullable<Event['breakType']>; label: string }> = [
  { value: 'short', label: 'ショート' },
  { value: 'coffee', label: 'コーヒー' },
  { value: 'lunch', label: 'ランチ' },
  { value: 'custom', label: 'カスタム' },
  { value: 'indefinite', label: '未設定' },
];

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
  interruptCategoryLabels,
}: EventHistoryItemProps) {
  const category = isCategoryEnabled && event.categoryId
    ? categories.find(cat => cat.id === event.categoryId)
    : undefined;

  const renderViewMode = () => (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {EVENT_TYPE_LABELS[event.type]}
          </span>
          {event.type === 'task' && category && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {category.name}
            </span>
          )}
          <span className={`font-medium ${event.end ? '' : 'text-green-600 dark:text-green-400'}`}>
            {event.label ?? '無題のイベント'}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            ({formatEventTime(event.start)}
            {event.end ? ` - ${formatEventTime(event.end)}` : ' - 実行中'})
          </span>
        </div>
        {event.type === 'interrupt' && (
          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <div>発信: {event.who || '未入力'}</div>
            <div>要件カテゴリ: {event.interruptType || '未入力'}</div>
            <div>緊急度: {event.urgency ?? '未設定'}</div>
          </div>
        )}
        {event.type === 'break' && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            休憩タイプ: {event.breakType ?? '未設定'}
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
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onEditEventTime(event)}
            title="終了時刻を調整"
          >
            <Clock className="h-4 w-4" />
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onStartEdit(event)}
          title="イベントを編集"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderCategoryEditor = () => (
    <Select
      value={draft?.categoryId ?? 'none'}
      onValueChange={value => onChangeDraft('categoryId', value === 'none' ? null : value)}
    >
      <SelectTrigger className="h-9 w-[180px] justify-between text-sm">
        <SelectValue placeholder="カテゴリを選択">
          {draft?.categoryId
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

  const renderEditMode = () => {
    if (!draft) return null;

    return (
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
          {draft.type === 'task' && isCategoryEnabled && renderCategoryEditor()}
        </div>

        <div className="grid gap-2">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-300">件名</label>
          <Input
            value={draft.label}
            onChange={event => onChangeDraft('label', event.target.value)}
            placeholder="イベント名"
          />
        </div>

        {draft.type === 'interrupt' && (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-300">発信者</label>
                <Input
                  value={draft.who}
                  onChange={event => onChangeDraft('who', event.target.value)}
                  placeholder="例: 佐藤部長"
                />
                {interruptContacts.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {interruptContacts.map(contact => (
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
                {interruptSubjects.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {interruptSubjects.map(subject => (
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
                {interruptCategoryLabels.map(label => (
                  <Button
                    key={label}
                    type="button"
                    size="sm"
                    variant={draft.interruptType === label ? 'default' : 'outline'}
                    onClick={() => onChangeDraft('interruptType', label)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-300">緊急度</label>
              <Select
                value={draft.urgency}
                onValueChange={value => onChangeDraft('urgency', value as InterruptUrgency)}
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
        )}

        {draft.type === 'break' && (
          <div className="grid gap-2">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-300">休憩タイプ</label>
            <Select
              value={draft.breakType || 'short'}
              onValueChange={value => onChangeDraft('breakType', value as NonNullable<Event['breakType']>)}
            >
              <SelectTrigger className="w-[180px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BREAK_TYPE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
    );
  };

  return (
    <li className="rounded-md border p-3 text-sm">
      {isEditing ? renderEditMode() : renderViewMode()}
    </li>
  );
}
