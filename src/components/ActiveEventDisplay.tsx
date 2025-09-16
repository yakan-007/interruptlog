'use client';

import { Event } from '@/types';
import { useTimer } from '@/hooks/useTimer';
import { getEventTypeLabel } from '@/utils/eventUtils';
import { COLORS } from '@/lib/constants';

interface ActiveEventDisplayProps {
  activeEvent: Event;
}

export default function ActiveEventDisplay({ activeEvent }: ActiveEventDisplayProps) {
  const elapsedTime = useTimer(activeEvent.start, true);
  const eventTypeLabel = getEventTypeLabel(activeEvent.type);

  const getEventColor = (eventType: Event['type']) => {
    switch (eventType) {
      case 'task':
        return COLORS.TASK;
      case 'interrupt':
        return COLORS.INTERRUPT;
      case 'break':
        return COLORS.BREAK;
      default:
        return COLORS.SECONDARY;
    }
  };

  const eventColor = getEventColor(activeEvent.type);

  return (
    <div className="flex flex-col items-center text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Event Type Badge */}
      <div 
        className="px-3 py-1 rounded-full text-white text-sm font-medium mb-2"
        style={{ backgroundColor: eventColor }}
      >
        {eventTypeLabel}
      </div>

      {/* Event Label */}
      <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1 max-w-48 truncate">
        {activeEvent.label || `${eventTypeLabel}中`}
      </div>

      {/* Timer Display */}
      <div className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400 mb-2">
        {elapsedTime}
      </div>

      {/* Additional Info */}
      {activeEvent.type === 'interrupt' && (
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          {activeEvent.who && (
            <div>発信者: {activeEvent.who}</div>
          )}
          {activeEvent.interruptType && (
            <div>種類: {activeEvent.interruptType}</div>
          )}
          {activeEvent.urgency && (
            <div>緊急度: {activeEvent.urgency}</div>
          )}
        </div>
      )}

      {activeEvent.type === 'break' && activeEvent.breakDurationMinutes && (
        <div className="text-xs text-gray-600 dark:text-gray-400">
          予定時間: {activeEvent.breakDurationMinutes}分
        </div>
      )}
    </div>
  );
}