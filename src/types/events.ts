// Discriminated union types for better type safety

interface BaseEvent {
  id: string;
  label?: string;
  start: number;
  end?: number;
  categoryId?: string;
  memo?: string;
}

export interface TaskEvent extends BaseEvent {
  type: 'task';
  meta?: {
    myTaskId?: string;
    isUnknownActivity?: boolean;
  };
}

export interface InterruptEvent extends BaseEvent {
  type: 'interrupt';
  who?: string;
  interruptType?: string;
  urgency?: 'Low' | 'Medium' | 'High';
}

export interface BreakEvent extends BaseEvent {
  type: 'break';
  breakType?: 'short' | 'coffee' | 'lunch' | 'custom' | 'indefinite';
  breakDurationMinutes?: number;
}

export type Event = TaskEvent | InterruptEvent | BreakEvent;

// Type guards for event discrimination
export function isTaskEvent(event: Event): event is TaskEvent {
  return event.type === 'task';
}

export function isInterruptEvent(event: Event): event is InterruptEvent {
  return event.type === 'interrupt';
}

export function isBreakEvent(event: Event): event is BreakEvent {
  return event.type === 'break';
}

// Event creation helpers with proper typing
export function createTaskEvent(
  data: Omit<TaskEvent, 'id' | 'type'> & { id?: string }
): TaskEvent {
  return {
    type: 'task',
    id: data.id || crypto.randomUUID(),
    ...data,
  };
}

export function createInterruptEvent(
  data: Omit<InterruptEvent, 'id' | 'type'> & { id?: string }
): InterruptEvent {
  return {
    type: 'interrupt',
    id: data.id || crypto.randomUUID(),
    ...data,
  };
}

export function createBreakEvent(
  data: Omit<BreakEvent, 'id' | 'type'> & { id?: string }
): BreakEvent {
  return {
    type: 'break',
    id: data.id || crypto.randomUUID(),
    ...data,
  };
}