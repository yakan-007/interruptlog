'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EventHistoryItem from '@/components/EventHistoryItem';
import { Event } from '@/types';
import { formatEventTime } from '@/lib/timeUtils';
import {
  useCategories,
  useIsCategoryEnabled,
  useStoreActions,
  useMyTasks,
  useInterruptContacts,
  useInterruptSubjects,
  useInterruptCategorySettings,
} from '@/hooks/useStoreSelectors';
import {
  EventDraft,
  createDraftFromEvent,
  applyDraftToEvent,
  shouldAutoSyncLabel,
  shouldAutoSyncCategory,
} from '@/store/eventDraftUtils';
import { INTERRUPT_CATEGORY_COLORS } from '@/lib/constants';

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
  const [editingDraft, setEditingDraft] = useState<EventDraft | null>(null);

  const categories = useCategories();
  const isCategoryEnabled = useIsCategoryEnabled();
  const actions = useStoreActions();
  const interruptContacts = useInterruptContacts();
  const interruptSubjects = useInterruptSubjects();
  const interruptCategorySettings = useInterruptCategorySettings();
  const myTasks = useMyTasks();
  const interruptCategories = [
    { name: interruptCategorySettings.category1, color: INTERRUPT_CATEGORY_COLORS.category1 },
    { name: interruptCategorySettings.category2, color: INTERRUPT_CATEGORY_COLORS.category2 },
    { name: interruptCategorySettings.category3, color: INTERRUPT_CATEGORY_COLORS.category3 },
    { name: interruptCategorySettings.category4, color: INTERRUPT_CATEGORY_COLORS.category4 },
    { name: interruptCategorySettings.category5, color: INTERRUPT_CATEGORY_COLORS.category5 },
    { name: interruptCategorySettings.category6, color: INTERRUPT_CATEGORY_COLORS.category6 },
  ];

  const handleStartEdit = (event: Event) => {
    setEditingEventId(event.id);
    setEditingDraft(createDraftFromEvent(event));
  };

  const handleCancelEdit = () => {
    setEditingEventId(null);
    setEditingDraft(null);
  };

  const handleDraftChange = <K extends keyof EventDraft>(field: K, value: EventDraft[K]) => {
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
            urgency: 'Medium',
            myTaskId: prev.myTaskId ?? null,
          } as EventDraft;
        }
        if (nextType === 'interrupt') {
          return {
            ...prev,
            type: 'interrupt',
            categoryId: null,
            who: prev.who,
            interruptType: prev.interruptType,
            urgency: prev.urgency,
            myTaskId: null,
          } as EventDraft;
        }
        return {
          ...prev,
          type: 'break',
          categoryId: null,
          who: '',
          interruptType: '',
          urgency: 'Medium',
          breakType: prev.breakType || 'short',
          myTaskId: null,
        } as EventDraft;
      }

      if (field === 'breakType') {
        return {
          ...prev,
          breakType: (value || 'short') as NonNullable<Event['breakType']>,
        } as EventDraft;
      }

      if (field === 'myTaskId') {
        const nextTaskId = value as EventDraft['myTaskId'];
        const baseEvent = editingEventId ? events.find(event => event.id === editingEventId) : undefined;
        const previousTask = prev.myTaskId ? myTasks.find(task => task.id === prev.myTaskId) : undefined;
        const nextTask = nextTaskId ? myTasks.find(task => task.id === nextTaskId) : undefined;

        const autoLabel = shouldAutoSyncLabel(prev.label, previousTask?.name, baseEvent);
        const autoCategory = shouldAutoSyncCategory(prev.categoryId ?? null, previousTask?.categoryId, baseEvent);

        let nextLabel = prev.label;
        if (autoLabel) {
          if (nextTask) {
            nextLabel = nextTask.name;
          } else if (!nextTaskId) {
            if (baseEvent?.meta?.isUnknownActivity) {
              nextLabel = baseEvent.label ?? '';
            } else {
              nextLabel = '';
            }
          }
        }

        let nextCategoryId = prev.categoryId;
        if (autoCategory) {
          if (nextTask) {
            nextCategoryId = nextTask.categoryId ?? null;
          } else {
            nextCategoryId = baseEvent?.categoryId ?? null;
          }
        }

        return {
          ...prev,
          myTaskId: nextTaskId,
          label: nextLabel,
          categoryId: nextCategoryId ?? null,
        } as EventDraft;
      }

      if (field === 'categoryId') {
        return {
          ...prev,
          categoryId: value,
        } as EventDraft;
      }

      return {
        ...prev,
        [field]: value,
      } as EventDraft;
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

    const nextEvent = applyDraftToEvent(targetEvent, editingDraft, myTasks);
    actions.updateEvent(nextEvent);
    handleCancelEdit();
  };

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
                canEditTime={Boolean(event.end)}
                categories={categories}
                isCategoryEnabled={isCategoryEnabled}
                interruptContacts={interruptContacts}
                interruptSubjects={interruptSubjects}
                interruptCategories={interruptCategories}
                tasks={myTasks}
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
