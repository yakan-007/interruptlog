'use client';

import { useEffect, useMemo, useState } from 'react';
import { Event } from '@/types';
import TaskManagementSection from '@/components/main/TaskManagementSection';
import EventHistorySection from '@/components/main/EventHistorySection';
import EventEditModal from '@/components/EventEditModal';
import AddPastEventModal from '@/components/AddPastEventModal';
import {
  useActiveEvent,
  useIsHydrated,
  useStoreActions,
  useEvents,
} from '@/hooks/useStoreSelectors';
import useDocumentTitle from '@/hooks/useDocumentTitle';

export default function LogPage() {
  const activeEvent = useActiveEvent();
  const events = useEvents();
  const isHydrated = useIsHydrated();
  const actions = useStoreActions();

  const [showAllHistory, setShowAllHistory] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddPastEventOpen, setIsAddPastEventOpen] = useState(false);
  const [pendingAddRange, setPendingAddRange] = useState<{ start: number; end: number } | null>(null);

  const pageTitle = useMemo(() => {
    if (!isHydrated) {
      return 'InterruptLog Slim';
    }
    return activeEvent ? `InterruptLog Slim - ${activeEvent.label ?? 'タスク'}` : 'InterruptLog Slim';
  }, [activeEvent, isHydrated]);

  useDocumentTitle(pageTitle);

  // Handle event time editing
  const handleEditEventTime = (event: Event) => {
    setEditingEvent(event);
    setIsEditModalOpen(true);
  };

  const handleSaveEventTime = (
    eventId: string,
    newStartTime: number,
    newEndTime: number,
    gapActivityName?: string,
    newEventType?: Event['type'],
    newLabel?: string,
    newCategoryId?: string,
    interruptType?: string,
    createGapEvent?: boolean,
  ) => {
    actions.updateEventTimeRange(eventId, newStartTime, newEndTime, gapActivityName, newEventType, newLabel, newCategoryId, interruptType, createGapEvent);
    setIsEditModalOpen(false);
    setEditingEvent(null);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingEvent(null);
  };

  const orderedEvents = useMemo(() => events.slice().sort((a, b) => a.start - b.start), [events]);

  const lastCompletedEventEnd = useMemo(() => {
    const completed = events.filter(event => event.end !== undefined);
    if (completed.length === 0) {
      return Date.now() - 60 * 60 * 1000;
    }

    const latest = completed.reduce((acc, event) => {
      if (!event.end) return acc;
      return event.end > acc ? event.end : acc;
    }, completed[0].end ?? 0);

    if (!latest || Number.isNaN(latest)) {
      return Date.now() - 60 * 60 * 1000;
    }
    const now = Date.now();
    return Math.min(latest, now - 60_000);
  }, [events]);

  const suggestedBackfillEnd = useMemo(() => {
    const now = Date.now();
    const candidate = activeEvent ? activeEvent.start : now;
    return Math.min(candidate, now);
  }, [activeEvent]);

  useEffect(() => {
    if (isAddPastEventOpen && !pendingAddRange) {
      setPendingAddRange({ start: lastCompletedEventEnd, end: suggestedBackfillEnd });
    }
  }, [isAddPastEventOpen, pendingAddRange, lastCompletedEventEnd, suggestedBackfillEnd]);

  return (
    <div className="container mx-auto p-4 pb-16">
      <h1 className="text-2xl font-bold mb-4">InterruptLog</h1>

      <TaskManagementSection
        activeEvent={activeEvent}
      />

      <EventHistorySection
        events={events}
        showAllHistory={showAllHistory}
        setShowAllHistory={setShowAllHistory}
        onAddPastEvent={() => {
          setPendingAddRange({ start: lastCompletedEventEnd, end: suggestedBackfillEnd });
          setIsAddPastEventOpen(true);
        }}
        onEditEventTime={handleEditEventTime}
      />

      <AddPastEventModal
        open={isAddPastEventOpen}
        onOpenChange={open => {
          setIsAddPastEventOpen(open);
          if (!open) {
            setPendingAddRange(null);
          }
        }}
        defaultRange={pendingAddRange ?? { start: lastCompletedEventEnd, end: suggestedBackfillEnd }}
      />

      <EventEditModal
        event={editingEvent}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleSaveEventTime}
        prevEvent={editingEvent ? orderedEvents[orderedEvents.findIndex(e => e.id === editingEvent.id) - 1] : undefined}
        nextEvent={editingEvent ? orderedEvents[orderedEvents.findIndex(e => e.id === editingEvent.id) + 1] : undefined}
      />

      {/* 画面下部の操作バーは元の構成に依存しているため、ここでは使わない */}
    </div>
  );
}
