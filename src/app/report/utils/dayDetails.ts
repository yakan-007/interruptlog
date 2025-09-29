import { getDuration } from '@/lib/reportUtils';
import type { Event, TaskLifecycleRecord } from '@/types';

export interface DailyTaskDetailRow {
  id: string;
  name: string;
  totalDurationMs: number;
  eventCount: number;
}

export interface DailyInterruptionDetailRow {
  label: string;
  totalDurationMs: number;
  count: number;
}

const DEFAULT_TASK_LABEL = '未記入タスク';
const DEFAULT_INTERRUPT_LABEL = '未記入';

const resolveTaskIdentity = (
  event: Event,
  ledger: Record<string, TaskLifecycleRecord>,
): { id: string; name: string } => {
  if (event.meta?.myTaskId) {
    const record = ledger[event.meta.myTaskId];
    const name = record?.name?.trim();
    if (name && name.length > 0) {
      return { id: event.meta.myTaskId, name };
    }
    const label = event.label?.trim();
    return { id: event.meta.myTaskId, name: label && label.length > 0 ? label : DEFAULT_TASK_LABEL };
  }

  const label = event.label?.trim();
  const fallback = label && label.length > 0 ? label : DEFAULT_TASK_LABEL;
  return { id: `label:${fallback}`, name: fallback };
};

export const buildDailyTaskDetails = (
  events: Event[],
  ledger: Record<string, TaskLifecycleRecord>,
): DailyTaskDetailRow[] => {
  const aggregate = new Map<string, DailyTaskDetailRow>();

  events.forEach(event => {
    if (event.type !== 'task') return;
    const duration = getDuration(event);
    if (duration <= 0) return;

    const { id, name } = resolveTaskIdentity(event, ledger);
    const entry = aggregate.get(id) ?? { id, name, totalDurationMs: 0, eventCount: 0 };
    entry.totalDurationMs += duration;
    entry.eventCount += 1;
    aggregate.set(id, entry);
  });

  return Array.from(aggregate.values()).sort((a, b) => {
    if (b.totalDurationMs !== a.totalDurationMs) {
      return b.totalDurationMs - a.totalDurationMs;
    }
    return b.eventCount - a.eventCount;
  });
};

const normalizeInterruptLabel = (value?: string): string => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_INTERRUPT_LABEL;
};

export const buildDailyInterruptionDetails = (events: Event[]): DailyInterruptionDetailRow[] => {
  const aggregate = new Map<string, DailyInterruptionDetailRow>();

  events.forEach(event => {
    if (event.type !== 'interrupt') return;
    const duration = getDuration(event);
    const label = normalizeInterruptLabel(event.who);
    const entry = aggregate.get(label) ?? { label, totalDurationMs: 0, count: 0 };
    entry.totalDurationMs += duration;
    entry.count += 1;
    aggregate.set(label, entry);
  });

  return Array.from(aggregate.values()).sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return b.totalDurationMs - a.totalDurationMs;
  });
};
