'use client';

import { Event } from '@/types';
import React from 'react';

interface EventListProps {
  events: Event[];
}

const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (start: number, end?: number): string => {
  if (!end) return '-';
  const durationMs = end - start;
  if (durationMs < 0) return 'In progress';
  const seconds = Math.floor((durationMs / 1000) % 60);
  const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
  const hours = Math.floor(durationMs / (1000 * 60 * 60));

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const getTypeColor = (type: Event['type']) => {
  switch (type) {
    case 'task': return 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200';
    case 'interrupt': return 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200';
    case 'break': return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200';
    default: return 'bg-gray-50 dark:bg-gray-600';
  }
};

const EventList: React.FC<EventListProps> = ({ events }) => {
  if (!events || events.length === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400">No events to display.</p>;
  }

  return (
    <ul className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className={`flex items-center justify-between rounded-lg p-3 shadow-sm ${getTypeColor(event.type)}`}>
          <div className="flex flex-col">
            <span className="font-medium capitalize">
              {event.type}{event.label ? `: ${event.label}` : ''}
            </span>
            <span className="text-xs">
              {formatTimestamp(event.start)}
              {event.end ? ` - ${formatTimestamp(event.end)}` : ' (running)'}
            </span>
          </div>
          <span className="font-mono text-sm">
            {formatDuration(event.start, event.end)}
          </span>
        </li>
      ))}
    </ul>
  );
};

export default EventList; 