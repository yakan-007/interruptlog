'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import EventHistoryItem from '@/components/EventHistoryItem';
import { Event, Category } from '@/types';
import { formatEventTime } from '@/lib/timeUtils';
import { YESTERDAY_EVENTS_LIMIT } from '@/lib/constants';

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
  // Find the last completed event
  const lastCompletedEvent = useMemo(() => 
    [...events].reverse().find(event => event.end !== undefined),
    [events]
  );

  // Filter events for display: today's events + last 5 from yesterday
  const filteredEvents = useMemo(() => {
    if (showAllHistory) {
      return events;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayEvents = events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= today;
    });
    
    const yesterdayEvents = events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= yesterday && eventDate < today;
    });
    
    // Get last events from yesterday
    const last5YesterdayEvents = yesterdayEvents.slice(-YESTERDAY_EVENTS_LIMIT);
    
    // Combine and sort by start time
    return [...last5YesterdayEvents, ...todayEvents].sort((a, b) => a.start - b.start);
  }, [events, showAllHistory]);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">イベント履歴</h2>
      {filteredEvents.length > 0 ? (
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
      ) : (
        <p className="text-gray-500">まだイベントが記録されていません。</p>
      )}
      
      {/* Show more button */}
      {!showAllHistory && events.length > filteredEvents.length && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            onClick={() => setShowAllHistory(true)}
            className="text-sm"
          >
            すべての履歴を表示（残り{events.length - filteredEvents.length}件）
          </Button>
        </div>
      )}
      
      {showAllHistory && events.length > 0 && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            onClick={() => setShowAllHistory(false)}
            className="text-sm"
          >
            表示を減らす
          </Button>
        </div>
      )}
    </div>
  );
}