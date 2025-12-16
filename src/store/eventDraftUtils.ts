import { Event, MyTask } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export interface EventDraft {
  type: Event['type'];
  label: string;
  memo: string;
  categoryId: string | null;
  who: string;
  interruptType: string;
  breakType: NonNullable<Event['breakType']>;
  urgency: NonNullable<Event['urgency']>;
  myTaskId: string | null;
}

export const UNKNOWN_ACTIVITY_LABEL = '不明なアクティビティ';

export const shouldAutoSyncLabel = (
  currentLabel: string,
  previousTaskName: string | undefined,
  baseEvent?: Event,
) => {
  const trimmed = currentLabel.trim();
  if (!trimmed) {
    return true;
  }

  const trimmedPreviousTaskName = previousTaskName?.trim();
  if (trimmedPreviousTaskName && trimmed === trimmedPreviousTaskName) {
    return true;
  }

  if (baseEvent?.meta?.isUnknownActivity) {
    const baseLabel = (baseEvent.label ?? '').trim();
    if (!trimmed || trimmed === baseLabel) {
      return true;
    }
  }

  if (trimmed === UNKNOWN_ACTIVITY_LABEL) {
    return true;
  }

  return false;
};

export const shouldAutoSyncCategory = (
  currentCategoryId: string | null,
  previousTaskCategoryId: string | undefined | null,
  baseEvent?: Event,
) => {
  const normalizedCurrent = currentCategoryId ?? null;
  const normalizedPreviousTask = previousTaskCategoryId ?? null;

  if (normalizedCurrent === null) {
    return true;
  }

  if (normalizedPreviousTask && normalizedCurrent === normalizedPreviousTask) {
    return true;
  }

  if (baseEvent?.meta?.isUnknownActivity) {
    const baseCategory = baseEvent.categoryId ?? null;
    if (normalizedCurrent === baseCategory) {
      return true;
    }
  }

  return false;
};

export const createDraftFromEvent = (event: Event): EventDraft => ({
  type: event.type,
  label: event.label ?? '',
  memo: event.memo ?? '',
  categoryId: event.categoryId ?? null,
  who: event.who ?? '',
  interruptType: event.interruptType ?? '',
  breakType: (event.breakType ?? 'short') as NonNullable<Event['breakType']>,
  urgency: event.urgency ?? 'Medium',
  myTaskId: event.meta?.myTaskId ?? null,
});

const sanitizeMeta = (event: Event, targetType: Event['type']): Event => {
  const base: Event = { ...event };
  const meta = base.meta ? { ...base.meta } : undefined;

  if (meta && 'isUnknownActivity' in meta) {
    delete meta.isUnknownActivity;
  }

  if (targetType !== 'task' && meta && 'myTaskId' in meta) {
    delete meta.myTaskId;
  }

  base.meta = meta && Object.keys(meta).length > 0 ? meta : undefined;

  if (targetType === 'interrupt') {
    delete (base as any).breakType;
    delete (base as any).breakDurationMinutes;
  } else if (targetType === 'break') {
    delete (base as any).who;
    delete (base as any).interruptType;
    delete (base as any).urgency;
  }

  return base;
};

export const applyDraftToEvent = (
  event: Event,
  draft: EventDraft,
  myTasks: MyTask[]
): Event => {
  let nextEvent: Event = sanitizeMeta({
    ...event,
    type: draft.type,
    label: draft.label.trim() ? draft.label.trim() : undefined,
    memo: draft.memo.trim() ? draft.memo.trim() : undefined,
  }, draft.type);

  switch (draft.type) {
    case 'task': {
      const assignedTask = draft.myTaskId ? myTasks.find(task => task.id === draft.myTaskId) : undefined;
      nextEvent = {
        ...nextEvent,
        categoryId: draft.categoryId ?? assignedTask?.categoryId ?? undefined,
        who: undefined,
        interruptType: undefined,
        urgency: undefined,
        breakType: undefined,
        meta: (() => {
          const meta = nextEvent.meta ? { ...nextEvent.meta } : {};
          if (assignedTask) {
            meta.myTaskId = assignedTask.id;
          } else if ('myTaskId' in meta) {
            delete meta.myTaskId;
          }
          return Object.keys(meta).length > 0 ? meta : undefined;
        })(),
      };
      if (!draft.label.trim() && assignedTask) {
        nextEvent.label = assignedTask.name;
      }
      break;
    }
    case 'interrupt': {
      nextEvent = {
        ...nextEvent,
        categoryId: undefined,
        who: draft.who.trim() ? draft.who.trim() : undefined,
        interruptType: draft.interruptType.trim() ? draft.interruptType.trim() : undefined,
        urgency: draft.urgency,
        breakType: undefined,
      };
      break;
    }
    case 'break': {
      nextEvent = {
        ...nextEvent,
        categoryId: undefined,
        who: undefined,
        interruptType: undefined,
        urgency: undefined,
        breakType: draft.breakType,
        breakDurationMinutes: event.breakDurationMinutes,
      };
      break;
    }
    default:
      break;
  }

  return nextEvent;
};

export const createEventFromDraft = (
  base: Event,
  draft: EventDraft,
  myTasks: MyTask[]
): Event => {
  const eventWithDefaults: Event = {
    ...base,
    id: base.id ?? uuidv4(),
  };
  return applyDraftToEvent(eventWithDefaults, draft, myTasks);
};
