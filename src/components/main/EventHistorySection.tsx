'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EventHistoryItem from '@/components/EventHistoryItem';
import { Event, Category } from '@/types';
import { formatEventTime } from '@/lib/timeUtils';

type EventFilter = 'today' | 'today-yesterday' | 'week' | 'all';

interface EventHistorySectionProps {
  events: Event[];
  showAllHistory: boolean;
  setShowAllHistory: (show: boolean) => void;
  editingMemoEventId: string | null;
  memoText: string;
  onStartEditMemo: (eventId: string, currentMemo?: string) => void;
  onSaveMemo: (eventId: string) => void;
  onCancelEditMemo: () => void;
  onSetMemoText: (text: string) => void;
  onEditEventTime: (event: Event) => void;
  categories: Category[];
  isCategoryEnabled: boolean;
}

export default function EventHistorySection({
  events,
  showAllHistory,
  setShowAllHistory,
  editingMemoEventId,
  memoText,
  onStartEditMemo,
  onSaveMemo,
  onCancelEditMemo,
  onSetMemoText,
  onEditEventTime,
  categories,
  isCategoryEnabled,
}: EventHistorySectionProps) {
  const [eventFilter, setEventFilter] = useState<EventFilter>('today-yesterday');

  // Find the last completed event
  const lastCompletedEvent = useMemo(() => 
    [...events].reverse().find(event => event.end !== undefined),
    [events]
  );

  // Filter events based on selected time period
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (eventFilter) {
      case 'today':
        return events.filter(event => {
          const eventDate = new Date(event.start);
          return eventDate >= today;
        });
        
      case 'today-yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        return events.filter(event => {
          const eventDate = new Date(event.start);
          return eventDate >= yesterday;
        });
        
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        return events.filter(event => {
          const eventDate = new Date(event.start);
          return eventDate >= weekAgo;
        });
        
      case 'all':
      default:
        return events;
    }
  }, [events, eventFilter]);

  const getFilterLabel = (filter: EventFilter) => {
    switch (filter) {
      case 'today': return '本日のみ';
      case 'today-yesterday': return '本日+昨日';
      case 'week': return '過去1週間';
      case 'all': return 'すべて';
      default: return '';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">イベント履歴</h2>
        <Select value={eventFilter} onValueChange={(value: EventFilter) => setEventFilter(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">本日のみ</SelectItem>
            <SelectItem value="today-yesterday">本日+昨日</SelectItem>
            <SelectItem value="week">過去1週間</SelectItem>
            <SelectItem value="all">すべて</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {filteredEvents.length > 0 ? (
        <>
          <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
            {getFilterLabel(eventFilter)} • {filteredEvents.length}件のイベント
          </div>
          <ul className="space-y-2">
            {filteredEvents
              .slice()
              .reverse()
              .map((event) => (
                <EventHistoryItem
                  key={event.id}
                  event={event}
                  editingMemoEventId={editingMemoEventId}
                  memoText={memoText}
                  onStartEditMemo={onStartEditMemo}
                  onSaveMemo={onSaveMemo}
                  onCancelEditMemo={onCancelEditMemo}
                  onSetMemoText={onSetMemoText}
                  formatEventTime={formatEventTime}
                  onEditEventTime={onEditEventTime}
                  canEditTime={event.id === lastCompletedEvent?.id}
                  categories={categories}
                  isCategoryEnabled={isCategoryEnabled}
                />
              ))}
          </ul>
        </>
      ) : (
        <p className="text-gray-500">
          {eventFilter === 'today' ? '本日' : 
           eventFilter === 'today-yesterday' ? '本日・昨日' :
           eventFilter === 'week' ? '過去1週間' : ''}
          のイベントが記録されていません。
        </p>
      )}
    </div>
  );
}