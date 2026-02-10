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
import { buildAnomalies, filterDismissedAnomalies } from '@/utils/anomalies';
import useDismissedAnomalies from '@/hooks/useDismissedAnomalies';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

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
  const { dismissedIds: dismissedAnomalyIds } = useDismissedAnomalies();

  const pageTitle = useMemo(() => {
    if (!isHydrated) {
      return 'InterruptLog';
    }
    return activeEvent ? `InterruptLog - ${activeEvent.label ?? 'タスク'}` : 'InterruptLog';
  }, [activeEvent, isHydrated]);

  useDocumentTitle(pageTitle);

  // Handle event time editing
  const handleEditEvent = (event: Event) => {
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
    newCategoryId?: string | null,
    interruptType?: string,
    createGapEvent?: boolean,
    extra?: {
      who?: string;
      memo?: string;
      myTaskId?: string | null;
      breakType?: Event['breakType'];
      breakDurationMinutes?: Event['breakDurationMinutes'];
    },
  ) => {
    actions.updateEventTimeRange(
      eventId,
      newStartTime,
      newEndTime,
      gapActivityName,
      newEventType,
      newLabel,
      newCategoryId,
      interruptType,
      createGapEvent,
      extra
    );
    setIsEditModalOpen(false);
    setEditingEvent(null);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingEvent(null);
  };

  const orderedEvents = useMemo(() => events.slice().sort((a, b) => a.start - b.start), [events]);
  const anomalyCount = useMemo(() => {
    const anomalies = buildAnomalies(events);
    return filterDismissedAnomalies(anomalies, dismissedAnomalyIds).length;
  }, [events, dismissedAnomalyIds]);

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
    <div className="container mx-auto px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <div className="space-y-4">
        <h1 className="text-xl font-bold sm:text-2xl">InterruptLog</h1>
        {anomalyCount > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>異常なイベントが {anomalyCount} 件あります。</span>
            </div>
            <Link href="/settings#anomaly-check" className="text-xs font-semibold underline underline-offset-4">
              設定で確認する
            </Link>
          </div>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <TaskManagementSection
            activeEvent={activeEvent}
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <EventHistorySection
            events={events}
            showAllHistory={showAllHistory}
            setShowAllHistory={setShowAllHistory}
            onAddPastEvent={() => {
              setPendingAddRange({ start: lastCompletedEventEnd, end: suggestedBackfillEnd });
              setIsAddPastEventOpen(true);
            }}
            onEditEvent={handleEditEvent}
          />
        </section>
      </div>

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
