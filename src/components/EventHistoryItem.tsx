'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StickyNote, Check, X, Clock } from 'lucide-react';
import { Event, Category } from '@/types';

interface EventHistoryItemProps {
  event: Event;
  editingMemoEventId: string | null;
  memoText: string;
  onStartEditMemo: (eventId: string, currentMemo?: string) => void;
  onSaveMemo: (eventId: string) => void;
  onCancelEditMemo: () => void;
  onSetMemoText: (text: string) => void;
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
  onStartEditMemo,
  onSaveMemo,
  onCancelEditMemo,
  onSetMemoText,
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

  return (
    <li className="p-3 border rounded-md text-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center">
            {category && (
              <div 
                className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                style={{ backgroundColor: category.color }}
                title={category.name}
              />
            )}
            <span className={`font-medium ${event.end ? '' : 'text-green-600 dark:text-green-400'}`}>
              {event.label ?? 'Unnamed'}
            </span>
            <span className="text-gray-600 dark:text-gray-300 ml-2">
              ({formatEventTime(event.start)}
              {event.end ? ` - ${formatEventTime(event.end)}` : ' - Active'})
            </span>
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