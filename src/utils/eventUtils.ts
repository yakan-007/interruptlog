import { Event, MyTask } from '@/types';
import { EVENT_TYPES } from '@/lib/constants';

/**
 * イベント関連のユーティリティ関数
 */

// Type Guards
export function isTaskEvent(event: Event): boolean {
  return event.type === EVENT_TYPES.TASK;
}

export function isInterruptEvent(event: Event): boolean {
  return event.type === EVENT_TYPES.INTERRUPT;
}

export function isBreakEvent(event: Event): boolean {
  return event.type === EVENT_TYPES.BREAK;
}

export function isActiveEvent(event: Event): boolean {
  return !event.end;
}

export function isCompletedEvent(event: Event): boolean {
  return !!event.end;
}

// Event Property Accessors
export function getTaskIdFromEvent(event: Event): string | undefined {
  return event.meta?.myTaskId;
}

export function getDurationMs(event: Event): number {
  if (!event.end) {
    return Date.now() - event.start;
  }
  return event.end - event.start;
}

export function getEventTypeLabel(eventType: Event['type']): string {
  switch (eventType) {
    case EVENT_TYPES.TASK:
      return 'タスク';
    case EVENT_TYPES.INTERRUPT:
      return '割り込み';
    case EVENT_TYPES.BREAK:
      return '休憩';
    default:
      return 'イベント';
  }
}

// Event Filtering
export function filterEventsByDate(events: Event[], date: Date): Event[] {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return events.filter(event => {
    const eventDate = new Date(event.start);
    return eventDate >= startOfDay && eventDate <= endOfDay;
  });
}

export function filterEventsByDateRange(
  events: Event[], 
  startDate: Date, 
  endDate: Date
): Event[] {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  return events.filter(event => {
    const eventDate = new Date(event.start);
    return eventDate >= start && eventDate <= end;
  });
}

export function filterEventsByType(events: Event[], type: Event['type']): Event[] {
  return events.filter(event => event.type === type);
}

export function filterCompletedEvents(events: Event[]): Event[] {
  return events.filter(isCompletedEvent);
}

export function filterActiveEvents(events: Event[]): Event[] {
  return events.filter(isActiveEvent);
}

// Event Analysis
export function getTotalDurationByType(
  events: Event[], 
  type: Event['type']
): number {
  return filterEventsByType(events, type)
    .filter(isCompletedEvent)
    .reduce((total, event) => total + getDurationMs(event), 0);
}

export function getEventCountByType(
  events: Event[], 
  type: Event['type']
): number {
  return filterEventsByType(events, type).length;
}

export function getMostFrequentEventType(events: Event[]): Event['type'] | null {
  if (events.length === 0) return null;
  
  const counts = events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {} as Record<Event['type'], number>);
  
  return Object.entries(counts).reduce((a, b) => 
    counts[a[0] as Event['type']] > counts[b[0] as Event['type']] ? a : b
  )[0] as Event['type'];
}

// Task-Event Relationships
export function getEventsForTask(events: Event[], taskId: string): Event[] {
  return events.filter(event => getTaskIdFromEvent(event) === taskId);
}

export function getTaskTotalDuration(events: Event[], taskId: string): number {
  return getEventsForTask(events, taskId)
    .filter(isCompletedEvent)
    .reduce((total, event) => total + getDurationMs(event), 0);
}

export function getActiveTaskEvent(events: Event[]): Event | null {
  return events.find(event => isTaskEvent(event) && isActiveEvent(event)) || null;
}

export function getLastCompletedEvent(events: Event[]): Event | null {
  const completedEvents = filterCompletedEvents(events);
  if (completedEvents.length === 0) return null;
  
  return completedEvents.reduce((latest, event) => 
    event.start > latest.start ? event : latest
  );
}

// Event Creation Helpers
export function createTaskEvent(
  label: string, 
  taskId?: string, 
  categoryId?: string
): Omit<Event, 'id' | 'start'> {
  return {
    type: EVENT_TYPES.TASK,
    label,
    meta: taskId ? { myTaskId: taskId } : undefined,
    categoryId,
  };
}

export function createInterruptEvent(
  label?: string,
  who?: string,
  interruptType?: string,
  urgency?: 'Low' | 'Medium' | 'High'
): Omit<Event, 'id' | 'start'> {
  return {
    type: EVENT_TYPES.INTERRUPT,
    label,
    who,
    interruptType,
    urgency,
  };
}

export function createBreakEvent(
  label?: string,
  breakType?: 'short' | 'coffee' | 'lunch' | 'custom' | 'indefinite',
  durationMinutes?: number
): Omit<Event, 'id' | 'start'> {
  return {
    type: EVENT_TYPES.BREAK,
    label,
    breakType,
    breakDurationMinutes: durationMinutes,
  };
}

// Date/Time Helpers
export function isToday(timestamp: number): boolean {
  const today = new Date();
  const eventDate = new Date(timestamp);
  
  return today.toDateString() === eventDate.toDateString();
}

export function isSameDay(timestamp1: number, timestamp2: number): boolean {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);
  
  return date1.toDateString() === date2.toDateString();
}

export function getStartOfDay(date: Date = new Date()): Date {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay;
}

export function getEndOfDay(date: Date = new Date()): Date {
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
}

// Validation Helpers
export function isValidEventTime(
  startTime: number, 
  endTime: number
): { isValid: boolean; error?: string } {
  if (endTime <= startTime) {
    return {
      isValid: false,
      error: '終了時刻は開始時刻より後である必要があります'
    };
  }
  
  if (endTime > Date.now()) {
    return {
      isValid: false,
      error: '終了時刻は現在時刻より前である必要があります'
    };
  }
  
  return { isValid: true };
}

export function hasEventOverlap(
  event1: Event,
  event2: Event
): boolean {
  const event1End = event1.end || Date.now();
  const event2End = event2.end || Date.now();
  
  return !(event1End <= event2.start || event2End <= event1.start);
}

// Event Sorting
export function sortEventsByStartTime(events: Event[], ascending = true): Event[] {
  return [...events].sort((a, b) => 
    ascending ? a.start - b.start : b.start - a.start
  );
}

export function sortEventsByDuration(events: Event[], ascending = true): Event[] {
  return [...events].sort((a, b) => {
    const durationA = getDurationMs(a);
    const durationB = getDurationMs(b);
    return ascending ? durationA - durationB : durationB - durationA;
  });
}