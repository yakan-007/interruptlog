'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EventHistoryItem, { EventEditDraft } from '@/components/EventHistoryItem';
import { Event } from '@/types';
import { formatEventTime } from '@/lib/timeUtils';
import { useCategories, useIsCategoryEnabled, useStoreActions } from '@/hooks/useStoreSelectors';
import useEventsStore from '@/store/useEventsStore';

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
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<EventEditDraft | null>(null);

  const categories = useCategories();
  const isCategoryEnabled = useIsCategoryEnabled();
  const actions = useStoreActions();
  const interruptContacts = useEventsStore(state => state.interruptContacts);
  const interruptSubjects = useEventsStore(state => state.interruptSubjects);
  const interruptCategorySettings = useEventsStore(state => state.interruptCategorySettings);
  const interruptCategoryLabels = [
    interruptCategorySettings.category1,
    interruptCategorySettings.category2,
    interruptCategorySettings.category3,
    interruptCategorySettings.category4,
    interruptCategorySettings.category5,
    interruptCategorySettings.category6,
  ];

  const buildDraftFromEvent = (event: Event): EventEditDraft => ({
    type: event.type,
    label: event.label ?? '',
    memo: event.memo ?? '',
    categoryId: event.categoryId ?? null,
    who: event.who ?? '',
    interruptType: event.interruptType ?? '',
    breakType: (event.breakType ?? 'short') as NonNullable<Event['breakType']>,
    urgency: event.urgency ?? 'Medium',
  });

  const handleStartEdit = (event: Event) => {
    setEditingEventId(event.id);
    setEditingDraft(buildDraftFromEvent(event));
  };

  const handleCancelEdit = () => {
    setEditingEventId(null);
    setEditingDraft(null);
  };

  const handleDraftChange = <K extends keyof EventEditDraft>(field: K, value: EventEditDraft[K]) => {
    setEditingDraft(prev => {
      if (!prev) return prev;
      if (field === 'type') {
        const nextType = value as Event['type'];
        if (nextType === 'task') {
          return {
            ...prev,
            type: 'task',
            categoryId: prev.categoryId ?? null,
            who: '',
            interruptType: '',
          } as EventEditDraft;
        }
        if (nextType === 'interrupt') {
          return {
            ...prev,
            type: 'interrupt',
            categoryId: null,
            who: prev.who,
            interruptType: prev.interruptType,
          } as EventEditDraft;
        }
        return {
          ...prev,
          type: 'break',
          categoryId: null,
          who: '',
          interruptType: '',
          breakType: (prev.breakType || 'short') as NonNullable<Event['breakType']>,
        } as EventEditDraft;
      }

      if (field === 'breakType') {
        return {
          ...prev,
          breakType: (value || 'short') as NonNullable<Event['breakType']>,
        } as EventEditDraft;
      }

      if (field === 'categoryId') {
        return {
          ...prev,
          categoryId: value,
        } as EventEditDraft;
      }

      return {
        ...prev,
        [field]: value,
      } as EventEditDraft;
    });
  };

  const handleSaveEdit = () => {
    if (!editingEventId || !editingDraft) {
      return;
    }

    const targetEvent = events.find(event => event.id === editingEventId);
    if (!targetEvent) {
      handleCancelEdit();
      return;
    }

    const trimmedLabel = editingDraft.label.trim();
    const trimmedMemo = editingDraft.memo.trim();

    let nextEvent: Event = {
      ...targetEvent,
      type: editingDraft.type,
      label: trimmedLabel ? trimmedLabel : undefined,
      memo: trimmedMemo ? trimmedMemo : undefined,
      urgency: editingDraft.type === 'interrupt' ? editingDraft.urgency : undefined,
    };

    if (editingDraft.type === 'task') {
      nextEvent = {
        ...nextEvent,
        categoryId: editingDraft.categoryId ?? undefined,
        who: undefined,
        interruptType: undefined,
        breakType: undefined,
        urgency: undefined,
      };
    }

    if (editingDraft.type === 'interrupt') {
      const trimmedWho = editingDraft.who.trim();
      const trimmedInterrupt = editingDraft.interruptType.trim();
      nextEvent = {
        ...nextEvent,
        categoryId: undefined,
        who: trimmedWho ? trimmedWho : undefined,
        interruptType: trimmedInterrupt ? trimmedInterrupt : undefined,
        breakType: undefined,
      };
    }

    if (editingDraft.type === 'break') {
      nextEvent = {
        ...nextEvent,
        categoryId: undefined,
        who: undefined,
        interruptType: undefined,
        breakType: editingDraft.breakType || undefined,
        urgency: undefined,
      };
    }

    if (nextEvent.type !== 'task' && nextEvent.meta?.myTaskId) {
      const { myTaskId, ...rest } = nextEvent.meta;
      nextEvent = {
        ...nextEvent,
        meta: Object.keys(rest).length > 0 ? rest : undefined,
      };
    }

    actions.updateEvent(nextEvent);
    handleCancelEdit();
  };

  // Last completed event for time editing guard
  const lastCompletedEvent = useMemo(
    () => [...events].reverse().find(event => event.end !== undefined),
    [events],
  );

  const filteredEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (eventFilter) {
      case 'today':
        return events.filter(event => new Date(event.start) >= today);
      case 'today-yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return events.filter(event => new Date(event.start) >= yesterday);
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return events.filter(event => new Date(event.start) >= weekAgo);
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
      case 'today':
        return '本日のみ';
      case 'today-yesterday':
        return '本日+昨日';
      case 'week':
        return '過去1週間';
      case 'all':
      default:
        return 'すべて';
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
                isEditing={editingEventId === event.id}
                draft={editingEventId === event.id ? editingDraft : null}
                onStartEdit={handleStartEdit}
                onChangeDraft={handleDraftChange}
                onCancelEdit={handleCancelEdit}
                onSaveEdit={handleSaveEdit}
                formatEventTime={formatEventTime}
                onEditEventTime={onEditEventTime}
                canEditTime={event.id === lastCompletedEvent?.id}
                categories={categories}
                isCategoryEnabled={isCategoryEnabled}
                interruptContacts={interruptContacts}
                interruptSubjects={interruptSubjects}
                interruptCategoryLabels={interruptCategoryLabels}
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
