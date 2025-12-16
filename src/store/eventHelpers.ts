import { Event } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const GAP_MIN_MS = 10_000; // minimum gap duration to auto-offer creation

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

export function clearTypeSpecificFields(event: Event, targetType: Event['type']): Event {
  // Remove fields not applicable to the target type to keep data consistent
  const base: Event = { ...event };
  if (targetType !== 'task') {
    delete (base as any).categoryId;
  }
  if (targetType !== 'task' && base.meta?.myTaskId) {
    const meta = { ...base.meta };
    delete (meta as any).myTaskId;
    base.meta = Object.keys(meta).length > 0 ? meta : undefined;
  }
  if (targetType === 'task') {
    delete (base as any).who;
    delete (base as any).interruptType;
    delete (base as any).urgency;
    delete (base as any).breakType;
    delete (base as any).breakDurationMinutes;
  } else if (targetType === 'interrupt') {
    delete (base as any).breakType;
    delete (base as any).breakDurationMinutes;
  } else if (targetType === 'break') {
    delete (base as any).who;
    delete (base as any).interruptType;
    delete (base as any).urgency;
  }
  return base;
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
  
  const shouldCreateGap = event.end! > newEndTime && (event.end! - newEndTime) >= GAP_MIN_MS;
  // Start from original event, optionally switch type then clear irrelevant fields
  const typeToApply = newEventType ?? event.type;
  let updatedEvent: Event = { ...event } as Event;
  if (newEventType) {
    updatedEvent = { ...updatedEvent, type: typeToApply } as Event;
    updatedEvent = clearTypeSpecificFields(updatedEvent, typeToApply);
  }
  // Apply common updates
  updatedEvent = {
    ...updatedEvent,
    end: newEndTime,
    ...(newLabel !== undefined && { label: newLabel }),
    ...(newCategoryId !== undefined && { categoryId: newCategoryId }),
  } as Event;
  
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
