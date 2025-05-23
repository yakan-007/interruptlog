import { useState, useEffect } from 'react';
import useEventsStore from '@/store/useEventsStore';
import { Event } from '@/types';
import { formatElapsedTime } from '@/lib/utils';

export default function useActiveTimer() {
  const { currentEventId, events, isHydrated } = useEventsStore();
  const [activeEvent, setActiveEvent] = useState<Event | undefined>(undefined);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');

  useEffect(() => {
    if (!isHydrated) return;

    const current = events.find(e => e.id === currentEventId);
    setActiveEvent(current);

    if (!current || current.end) {
      setElapsedTime('00:00:00');
      return;
    }

    setElapsedTime(formatElapsedTime(current.start));

    const timerId = setInterval(() => {
      // eventsとcurrentEventIdは常に最新のものをストアから取得する
      const { events: latestEvents, currentEventId: latestId } = useEventsStore.getState();
      const latestActiveEvent = latestEvents.find(e => e.id === latestId);
      
      if (latestActiveEvent && !latestActiveEvent.end) {
        setElapsedTime(formatElapsedTime(latestActiveEvent.start));
      } else {
        setElapsedTime('00:00:00');
        clearInterval(timerId);
      }
    }, 1000);

    return () => clearInterval(timerId);
  }, [currentEventId, events, isHydrated]);

  return { activeEvent, elapsedTime };
} 