'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StickyNote, Check, X, Clock, Pencil } from 'lucide-react';
import { Event, Category } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EventHistoryItemProps {
  event: Event;
  editingMemoEventId: string | null;
  memoText: string;
  editingLabelEventId: string | null;
  labelText: string;
  onStartEditMemo: (eventId: string, currentMemo?: string) => void;
  onSaveMemo: (eventId: string) => void;
  onCancelEditMemo: () => void;
  onSetMemoText: (text: string) => void;
  onStartEditLabel: (eventId: string, currentLabel?: string) => void;
  onSaveLabel: (eventId: string) => void;
  onCancelEditLabel: () => void;
  onSetLabelText: (text: string) => void;
  onChangeCategory: (eventId: string, categoryId: string | null) => void;
  formatEventTime: (timestamp: number) => string;
  onEditEventTime?: (event: Event) => void;
  canEditTime?: boolean;
  categories?: Category[];
  isCategoryEnabled?: boolean;
}

export default function EventHistoryItem({
  event,
  editingMemoEventId,
  memoText,
  editingLabelEventId,
  labelText,
  onStartEditMemo,
  onSaveMemo,
  onCancelEditMemo,
  onSetMemoText,
  onStartEditLabel,
  onSaveLabel,
  onCancelEditLabel,
  onSetLabelText,
  onChangeCategory,
  formatEventTime,
  onEditEventTime,
  canEditTime = false,
  categories = [],
  isCategoryEnabled = false,
}: EventHistoryItemProps) {
  // カテゴリ情報の取得
  const category = isCategoryEnabled && event.categoryId 
    ? categories.find(c => c.id === event.categoryId) 
    : null;

  const isEditingLabel = editingLabelEventId === event.id;

  return (
    <li className="p-3 border rounded-md text-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {isCategoryEnabled && (
              <Select
                value={event.categoryId ?? 'none'}
                onValueChange={value => onChangeCategory(event.id, value === 'none' ? null : value)}
              >
                <SelectTrigger
                  className="h-7 w-7 rounded-full border border-transparent p-0 transition hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-rose-400"
                  title={category ? category.name : 'カテゴリなし'}
                >
                  <div
                    className="mx-auto h-3 w-3 rounded-full"
                    style={{ backgroundColor: category?.color ?? '#CBD5F5' }}
                  />
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
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-2">
              {!isEditingLabel ? (
                <>
                  <span
                    className={`font-medium ${event.end ? '' : 'text-green-600 dark:text-green-400'} cursor-text`}
                    onDoubleClick={() => onStartEditLabel(event.id, event.label)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={eventKey => {
                      if (eventKey.key === 'Enter') {
                        onStartEditLabel(event.id, event.label);
                      }
                    }}
                  >
                    {event.label ?? 'Unnamed'}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => onStartEditLabel(event.id, event.label)}
                    title="名前を編集"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <Input
                  value={labelText}
                  onChange={inputEvent => onSetLabelText(inputEvent.target.value)}
                  className="h-7 w-56 text-sm"
                  autoFocus
                  onKeyDown={keyboardEvent => {
                    if (keyboardEvent.key === 'Enter') {
                      onSaveLabel(event.id);
                    } else if (keyboardEvent.key === 'Escape') {
                      onCancelEditLabel();
                    }
                  }}
                  onBlur={() => onSaveLabel(event.id)}
                />
              )}
              <span className="text-gray-600 dark:text-gray-300">
                ({formatEventTime(event.start)}
                {event.end ? ` - ${formatEventTime(event.end)}` : ' - Active'})
              </span>
            </div>
          </div>
          
          {/* Memo display or edit */}
          {editingMemoEventId === event.id ? (
            <div className="mt-2 flex gap-2">
              <Input
                type="text"
                value={memoText}
                onChange={(e) => onSetMemoText(e.target.value)}
                placeholder="Add memo..."
                className="flex-1 text-sm"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    onSaveMemo(event.id);
                  }
                }}
                autoFocus
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSaveMemo(event.id)}
                title="Save memo"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onCancelEditMemo}
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : event.memo ? (
            <div className="mt-1 text-gray-600 dark:text-gray-400 text-sm">
              📝 {event.memo.length > 80 ? `${event.memo.substring(0, 80)}...` : event.memo}
            </div>
          ) : null}
        </div>
        
        {/* Action buttons */}
        {event.end && (
          <div className="flex gap-1 ml-2">
            {canEditTime && onEditEventTime && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEditEventTime(event)}
                title="Edit end time"
              >
                <Clock className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onStartEditMemo(event.id, event.memo)}
                title={event.memo ? "Edit memo" : "Add memo"}
              >
                <StickyNote className="h-4 w-4" />
              </Button>
            </div>
        )}
      </div>
    </li>
  );
}
