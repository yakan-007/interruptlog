import { ERROR_CODES } from '../domain/errors';
import { applyResolutionPreviewInState } from './eventResolution';
import {
  validateEventWindow,
  validateRunningOverlap,
  validateSameDayWindow,
} from './eventValidation';
import { newId } from './ids';
import { eventsOverlap } from './resolution';
import { buildResolutionPreviewInState } from './runningResolution';
import { TYPE_LABELS } from './schema';
import { createTaskInState } from './tasks';
import { asNumber, cleanText } from './utils';
import { ensureWorkdayScheduleInState } from './workday';

/**
 * Build a task work record from a factual time entry and its destination.
 * A task is deliberately a destination, not an editable event label: changing
 * the destination moves the time to that task in every report.
 */
export function previewTaskRecordInState(state, record, now = Date.now(), options = {}) {
  const prepared = prepareTaskRecordCandidate(state, record, now, { ...options, preview: true });
  if (prepared.errorCode) return { preview: null, errorCode: prepared.errorCode };

  const { candidate, previous } = prepared;
  const errorCode = validateEventWindow(candidate)
    ?? (options.requireSameDay ? validateSameDayWindow(candidate) : null)
    ?? validateRunningOverlap(state, candidate, now);
  if (errorCode) return { preview: null, errorCode };

  const preview = buildResolutionPreviewInState(state, candidate, {
    replaceEvent: previous,
    now,
  });
  return { preview, errorCode: null };
}

export function saveTaskRecordInState(state, record, now = Date.now(), options = {}) {
  const preflight = previewTaskRecordInState(state, record, now, options);
  if (preflight.errorCode) return { state, taskId: null, errorCode: preflight.errorCode };

  const materialized = materializeTaskTargetInState(state, record, now, options);
  if (materialized.errorCode) return { state, taskId: null, errorCode: materialized.errorCode };

  const prepared = prepareTaskRecordCandidate(materialized.state, materialized.record, now, options);
  if (prepared.errorCode) return { state, taskId: null, errorCode: prepared.errorCode };
  const preview = buildResolutionPreviewInState(materialized.state, prepared.candidate, {
    replaceEvent: prepared.previous,
    now,
  });
  const resolved = applyResolutionPreviewInState(materialized.state, preview);
  return {
    state: ensureWorkdayScheduleInState(resolved, prepared.candidate.start),
    taskId: materialized.taskId,
    errorCode: null,
  };
}

export function previewReplaceTimeRangeInState(state, record, now = Date.now(), options = {}) {
  const result = previewTaskRecordInState(state, { ...record, id: null, type: 'task' }, now, { ...options, requireSameDay: true });
  if (result.errorCode || !result.preview) return result;
  return {
    ...result,
    impact: buildRangeImpact(state.events, result.preview.candidate.start, result.preview.candidate.end, now),
  };
}

export function replaceTimeRangeInState(state, record, now = Date.now(), options = {}) {
  const preflight = previewReplaceTimeRangeInState(state, record, now, options);
  if (preflight.errorCode) return { state, taskId: null, errorCode: preflight.errorCode };
  return saveTaskRecordInState(state, { ...record, id: null, type: 'task' }, now, options);
}

function prepareTaskRecordCandidate(state, record, now, { createId = newId, preview = false } = {}) {
  const previous = record.id ? state.events.find((event) => event.id === record.id) : null;
  if (record.id && !previous) return { candidate: null, previous: null, errorCode: ERROR_CODES.EVENT_NOT_FOUND };

  const type = ['task', 'interrupt', 'break'].includes(record.type) ? record.type : 'task';
  const taskTarget = resolveTaskTarget(state, record);
  const start = asNumber(record.start, null);
  const end = asNumber(record.end, null);
  const base = {
    ...record,
    id: previous?.id ?? record.id ?? (preview ? '__record-preview__' : createId('ev', now)),
    type,
    start,
    end,
    memo: cleanText(record.memo),
    taskId: null,
    workDetail: null,
  };
  delete base.taskTarget;
  delete base.complete;

  if (type !== 'task') {
    return {
      candidate: {
        ...base,
        label: cleanText(record.label) || TYPE_LABELS[type] || 'イベント',
        who: type === 'interrupt' ? cleanText(record.who) : '',
        categoryId: type === 'interrupt' ? record.categoryId ?? null : null,
      },
      previous,
      errorCode: null,
    };
  }

  if (taskTarget.mode === 'existing') {
    const task = state.tasks.find((item) => item.id === taskTarget.taskId);
    if (!task) return { candidate: null, previous, errorCode: ERROR_CODES.TASK_NOT_FOUND };
    return {
      candidate: taskEventFromTask(base, task, record.workDetail),
      previous,
      errorCode: null,
    };
  }

  if (taskTarget.mode === 'new') {
    const name = cleanText(taskTarget.name);
    if (!name) return { candidate: null, previous, errorCode: ERROR_CODES.TASK_NAME_REQUIRED };
    const virtualTask = {
      id: preview ? '__new-task-preview__' : '__new-task__',
      name,
      categoryId: taskTarget.categoryId ?? state.categories[0]?.id ?? null,
    };
    return {
      candidate: taskEventFromTask(base, virtualTask, record.workDetail),
      previous,
      errorCode: null,
    };
  }

  const detail = cleanText(record.workDetail);
  return {
    candidate: {
      ...base,
      taskId: null,
      categoryId: taskTarget.categoryId ?? record.categoryId ?? state.categories[0]?.id ?? null,
      label: detail || cleanText(record.label) || '記録のみの作業',
      workDetail: detail || null,
    },
    previous,
    errorCode: null,
  };
}

function taskEventFromTask(base, task, workDetail) {
  return {
    ...base,
    taskId: task.id,
    label: task.name,
    categoryId: task.categoryId ?? null,
    workDetail: cleanText(workDetail) || null,
  };
}

function resolveTaskTarget(state, record) {
  const target = record.taskTarget;
  if (target?.mode === 'existing') return target;
  if (target?.mode === 'new' || target?.mode === 'none') {
    const categoryId = state.categories.some((category) => category.id === target.categoryId)
      ? target.categoryId
      : state.categories[0]?.id ?? null;
    return { ...target, categoryId };
  }
  if (record.taskId && state.tasks.some((task) => task.id === record.taskId)) {
    return { mode: 'existing', taskId: record.taskId };
  }
  return { mode: 'none', categoryId: record.categoryId ?? state.categories[0]?.id ?? null };
}

function materializeTaskTargetInState(state, record, now, dependencies = {}) {
  const target = resolveTaskTarget(state, record);
  if (record.type !== 'task' || target.mode !== 'new') {
    return { state, record: { ...record, taskTarget: target }, taskId: target.mode === 'existing' ? target.taskId : null, errorCode: null };
  }

  const normalizedName = cleanText(target.name).toLocaleLowerCase();
  const existing = state.tasks.find((task) => !task.isCompleted
    && cleanText(task.name).toLocaleLowerCase() === normalizedName);
  if (existing) {
    return {
      state,
      record: { ...record, taskTarget: { mode: 'existing', taskId: existing.id } },
      taskId: existing.id,
      errorCode: null,
    };
  }

  const created = createTaskInState(state, {
    name: target.name,
    categoryId: target.categoryId ?? state.categories[0]?.id ?? null,
    plannedDurationMinutes: target.plannedDurationMinutes ?? 0,
    dueAt: target.dueAt ?? null,
    memo: target.taskMemo ?? '',
  }, asNumber(record.start, now) ?? now, dependencies);
  if (created.errorCode || !created.taskId) return { state, record, taskId: null, errorCode: created.errorCode ?? ERROR_CODES.TASK_CREATE_FAILED };

  const completedState = target.complete
    ? {
        ...created.state,
        tasks: created.state.tasks.map((task) => task.id === created.taskId
          ? { ...task, isCompleted: true, completedAt: asNumber(record.end, now) ?? now }
          : task),
      }
    : created.state;

  return {
    state: completedState,
    record: { ...record, taskTarget: { mode: 'existing', taskId: created.taskId } },
    taskId: created.taskId,
    errorCode: null,
  };
}

function buildRangeImpact(events, start, end, now) {
  const items = events
    .filter((event) => eventsOverlap(event, { start, end }, now))
    .map((event) => {
      const clippedStart = Math.max(event.start, start);
      const clippedEnd = Math.min(event.end ?? now, end);
      return {
        id: event.id,
        type: event.type,
        label: event.workDetail || event.label,
        durationMs: Math.max(0, clippedEnd - clippedStart),
        start: clippedStart,
        end: clippedEnd,
      };
    });
  const covered = items
    .sort((a, b) => a.start - b.start)
    .reduce((ranges, item) => {
      const previous = ranges.at(-1);
      if (!previous || item.start > previous.end) ranges.push({ start: item.start, end: item.end });
      else previous.end = Math.max(previous.end, item.end);
      return ranges;
    }, [])
    .reduce((sum, range) => sum + range.end - range.start, 0);
  return {
    items,
    unrecordedMs: Math.max(0, end - start - covered),
  };
}
