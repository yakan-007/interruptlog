'use client';

import React, { useMemo } from 'react';
import { Event } from '@/types';
import { useTypedI18n } from '@/hooks/useTypedI18n';
import { layout, typography, eventHistory, colors } from '@/styles/tailwind-classes';

interface EventHistorySectionProps {
  events: Event[];
}

const EventHistorySection: React.FC<EventHistorySectionProps> = React.memo(({ events }) => {
  const t = useTypedI18n();

  const reversedEvents = useMemo(() => {
    return events.slice().reverse();
  }, [events]);

  return (
    <div>
      <h2 className={typography.sectionTitle}>{t('eventHistory.title')}</h2>
      {events.length > 0 ? (
        <ul className={layout.spaceY2}>
          {reversedEvents.map((event) => (
            <li key={event.id} className={eventHistory.listItem}>
              <span className={`${eventHistory.eventLabel} ${event.end ? '' : colors.activeText}`}>
                {event.label ?? t('eventHistory.unnamed')}
              </span>
              <span className={eventHistory.eventTime}>
                ({new Date(event.start).toLocaleTimeString()}
                {event.end ? ` - ${new Date(event.end).toLocaleTimeString()}` : ` - ${t('eventHistory.active')}`})
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={typography.textGray}>{t('eventHistory.noEventsMessage')}</p>
      )}
    </div>
  );
});

EventHistorySection.displayName = 'EventHistorySection';

export default EventHistorySection; 