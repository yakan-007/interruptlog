'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EventHistoryItem from '@/components/EventHistoryItem';
import { Event } from '@/types';
import { formatEventTime } from '@/lib/timeUtils';
import { useCategories, useIsCategoryEnabled, useStoreActions } from '@/hooks/useStoreSelectors';

type EventFilter = 'today' | 'today-yesterday' | 'week' | 'all';

const DEFAULT_VISIBLE_COUNT = 10;

interface EventHistorySectionProps {
  events: Event[];
  showAllHistory: boolean;
  setShowAllHistory: (show: boolean) => void;
  onAddPastEvent: () => void;
  onEditEventTime: (event: Event) => void;
}

export default function EventHistorySection({
  events,
  showAllHistory,
  setShowAllHistory,
  onEditEventTime,
  onAddPastEvent,
}: EventHistorySectionProps) {
  const [eventFilter, setEventFilter] = useState<EventFilter>('today-yesterday');
  const [editingMemoEventId, setEditingMemoEventId] = useState<string | null>(null);
  const [memoText, setMemoText] = useState('');
  const categories = useCategories();
  const isCategoryEnabled = useIsCategoryEnabled();
  const actions = useStoreActions();

  const handleStartEditMemo = (eventId: string, currentMemo?: string) => {
    setEditingMemoEventId(eventId);
    setMemoText(currentMemo ?? '');
  };

  const handleCancelEditMemo = () => {
    setEditingMemoEventId(null);
    setMemoText('');
  };

  const handleSaveMemo = (eventId: string) => {
    const targetEvent = events.find(event => event.id === eventId);
    if (!targetEvent) {
      handleCancelEditMemo();
      return;
    }

    const trimmedMemo = memoText.trim();
    actions.updateEvent({
      ...targetEvent,
      memo: trimmedMemo ? trimmedMemo : undefined,
    });
    handleCancelEditMemo();
  };

  // Find the last completed event
  const lastCompletedEvent = useMemo(() => 
    [...events].reverse().find(event => event.end !== undefined),
    [events]
  );

  // Filter events based on selected time period
  const filteredEvents = useMemo(() => {
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

  const sortedEvents = useMemo(
    () => [...filteredEvents].sort((a, b) => b.start - a.start),
    [filteredEvents],
  );

  const visibleEvents = showAllHistory ? sortedEvents : sortedEvents.slice(0, DEFAULT_VISIBLE_COUNT);
  const hasHiddenEvents = sortedEvents.length > visibleEvents.length;

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
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">イベント履歴</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button variant="outline" size="sm" onClick={onAddPastEvent}>
            押し忘れを追加
          </Button>
          <Select
            value={eventFilter}
            onValueChange={(value: EventFilter) => {
              setEventFilter(value);
              setShowAllHistory(false);
            }}
          >
            <SelectTrigger className="w-36">
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
      </div>

      {sortedEvents.length > 0 ? (
        <>
          <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
            {getFilterLabel(eventFilter)} • {sortedEvents.length}件のイベント
          </div>
          <ul className="space-y-2">
            {visibleEvents.map(event => (
              <EventHistoryItem
                key={event.id}
                event={event}
                editingMemoEventId={editingMemoEventId}
                memoText={memoText}
                onStartEditMemo={handleStartEditMemo}
                onSaveMemo={handleSaveMemo}
                onCancelEditMemo={handleCancelEditMemo}
                onSetMemoText={setMemoText}
                formatEventTime={formatEventTime}
                onEditEventTime={onEditEventTime}
                canEditTime={event.id === lastCompletedEvent?.id}
                categories={categories}
                isCategoryEnabled={isCategoryEnabled}
              />
            ))}
          </ul>
          {hasHiddenEvents && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" size="sm" onClick={() => setShowAllHistory(true)}>
                さらに表示（{sortedEvents.length - visibleEvents.length}件）
              </Button>
            </div>
          )}
          {showAllHistory && sortedEvents.length > DEFAULT_VISIBLE_COUNT && (
            <div className="mt-2 flex justify-center">
              <Button variant="ghost" size="sm" onClick={() => setShowAllHistory(false)}>
                表示を折りたたむ
              </Button>
            </div>
          )}
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
