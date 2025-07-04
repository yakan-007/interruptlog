import { Event } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export interface EventTimeValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateEventEndTime(
  event: Event,
  newEndTime: number
): EventTimeValidationResult {
  if (!event.end) {
    return {
      isValid: false,
      error: 'Cannot edit event: event is still running'
    };
  }
  
  if (newEndTime <= event.start) {
    return {
      isValid: false,
      error: 'End time must be after start time'
    };
  }
  
  if (newEndTime > Date.now()) {
    return {
      isValid: false,
      error: 'End time cannot be in the future'
    };
  }
  
  return { isValid: true };
}

export interface GapEventOptions {
  originalEvent: Event;
  newEndTime: number;
  gapActivityName?: string;
}

export function createGapEvent({
  originalEvent,
  newEndTime,
  gapActivityName = '不明なアクティビティ'
}: GapEventOptions): Event {
  if (!originalEvent.end) {
    throw new Error('Original event must have an end time');
  }
  
  return {
    id: uuidv4(),
    type: 'task',
    label: gapActivityName,
    start: newEndTime,
    end: originalEvent.end,
    meta: {
      isUnknownActivity: true
    }
  };
}

export interface EventUpdateResult {
  updatedEvent: Event;
  gapEvent?: Event;
  shouldCreateGap: boolean;
}

export function updateEventWithTimeChange(
  event: Event,
  newEndTime: number,
  gapActivityName?: string,
  newEventType?: Event['type'],
  newLabel?: string,
  newCategoryId?: string
): EventUpdateResult {
  const validation = validateEventEndTime(event, newEndTime);
  
  if (!validation.isValid) {
    throw new Error(validation.error);
  }
  
  const shouldCreateGap = event.end! > newEndTime && (event.end! - newEndTime) >= 60000; // 1 minute gap
  
  const updatedEvent: Event = { 
    ...event, 
    end: newEndTime,
    ...(newEventType && { type: newEventType }),
    ...(newLabel !== undefined && { label: newLabel }),
    ...(newCategoryId !== undefined && { categoryId: newCategoryId })
  };
  
  let gapEvent: Event | undefined;
  
  if (shouldCreateGap) {
    gapEvent = createGapEvent({
      originalEvent: event,
      newEndTime,
      gapActivityName
    });
  }
  
  return {
    updatedEvent,
    gapEvent,
    shouldCreateGap
  };
}

export function insertEventWithGap(
  events: Event[],
  eventIndex: number,
  updatedEvent: Event,
  gapEvent: Event
): Event[] {
  const newEvents = [...events];
  newEvents[eventIndex] = updatedEvent;
  newEvents.splice(eventIndex + 1, 0, gapEvent);
  return newEvents;
}