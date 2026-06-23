import { newId } from './ids';
import { TYPE_LABELS } from './schema';
import { asNumber, cleanText, startOfDay } from './utils';
import { ensureWorkdayScheduleInState } from './workday';
import { createTaskInState } from './tasks';
import {
  buildManualResolutionPreview,
  buildOverlapRepairPreview,
  eventsOverlap,
  sortEventsByWindow,
} from './resolution';

function validateEventWindow({ start, end }) {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return '開始と終了を正しく入力してください';
  if (end <= start) return '終了は開始より後にしてください';
  return null;
}

function validateSameDayWindow({ start, end }) {
  if (startOfDay(start) !== startOfDay(end - 1)) return '時間帯を記録し直せるのは同じ日の範囲だけです';
  return null;
}

export function saveEventInState(state, updated) {
  const result = previewSaveEventInState(state, updated);
  if (result.error || !result.preview) return { state, error: result.error ?? '入力を確認してください' };
  return { state: ensureWorkdayScheduleInState(applyResolutionPreviewInState(state, result.preview), updated.start), error: null };
}

export function deleteEventInState(state, eventId) {
  const removed = state.events.find((event) => event.id === eventId);
  const runningMatches = removed?.end === null && state.running?.type === 'task' && state.running?.start === removed.start;
  return {
    ...state,
    events: state.events.filter((event) => event.id !== eventId),
    running: runningMatches ? null : state.running,
  };
}

export function addMissedEventInState(state, event, options = {}, now = Date.now()) {
  const result = previewAddMissedEventInState(state, event, options, now);
  if (result.error || !result.preview) return { state, error: result.error ?? '入力を確認してください' };
  const nextState = ensureWorkdayScheduleInState(applyResolutionPreviewInState(state, result.preview), event.start);
  const who = cleanText(event.who);
  return {
    state: options.saveWhoChip && who && !nextState.whoChips.includes(who)
      ? { ...nextState, whoChips: [...nextState.whoChips, who] }
      : nextState,
    error: null,
  };
}

export function previewSaveEventInState(state, updated, now = Date.now()) {
  const previous = state.events.find((event) => event.id === updated.id);
  if (!previous) return { preview: null, error: 'イベントが見つかりませんでした' };

  const draft = {
    ...updated,
    id: previous.id,
    label: cleanText(updated.label) || TYPE_LABELS[updated.type] || previous.label || 'イベント',
    memo: cleanText(updated.memo),
    start: asNumber(updated.start, null),
    end: asNumber(updated.end, null),
  };
  const error = validateEventWindow(draft) ?? validateRunningOverlap(state, draft, now);
  if (error) return { preview: null, error };

  return {
    preview: buildManualResolutionPreview(state.events, draft, {
      replaceEvent: previous,
      now,
    }),
    error: null,
  };
}

export function previewAddMissedEventInState(state, event, options = {}, now = Date.now()) {
  const draft = {
    ...event,
    id: newId('ev', now),
    label: cleanText(event.label) || TYPE_LABELS[event.type] || 'イベント',
    memo: cleanText(event.memo),
    start: asNumber(event.start, null),
    end: asNumber(event.end, null),
  };
  const error = validateEventWindow(draft);
  const runningError = validateRunningOverlap(state, draft, now);
  if (error || runningError) return { preview: null, error: error ?? runningError };

  return {
    preview: buildManualResolutionPreview(state.events, draft, {
      createGap: Boolean(options.createGap),
      now,
    }),
    error: null,
  };
}

/**
 * Build a task work record from a factual time entry and its destination.
 * A task is deliberately a destination, not an editable event label: changing
 * the destination moves the time to that task in every report.
 */
export function previewTaskRecordInState(state, record, now = Date.now(), options = {}) {
  const prepared = prepareTaskRecordCandidate(state, record, now, { preview: true });
  if (prepared.error) return { preview: null, error: prepared.error };

  const { candidate, previous } = prepared;
  const error = validateEventWindow(candidate)
    ?? (options.requireSameDay ? validateSameDayWindow(candidate) : null)
    ?? validateRunningOverlap(state, candidate, now);
  if (error) return { preview: null, error };

  const preview = buildManualResolutionPreview(state.events, candidate, {
    replaceEvent: previous,
    now,
  });
  return { preview, error: null };
}

export function saveTaskRecordInState(state, record, now = Date.now()) {
  const preflight = previewTaskRecordInState(state, record, now);
  if (preflight.error) return { state, taskId: null, error: preflight.error };

  const materialized = materializeTaskTargetInState(state, record, now);
  if (materialized.error) return { state, taskId: null, error: materialized.error };

  const prepared = prepareTaskRecordCandidate(materialized.state, materialized.record, now);
  if (prepared.error) return { state, taskId: null, error: prepared.error };
  const preview = buildManualResolutionPreview(materialized.state.events, prepared.candidate, {
    replaceEvent: prepared.previous,
    now,
  });
  const resolved = applyResolutionPreviewInState(materialized.state, preview);
  return {
    state: ensureWorkdayScheduleInState(resolved, prepared.candidate.start),
    taskId: materialized.taskId,
    error: null,
  };
}

export function previewReplaceTimeRangeInState(state, record, now = Date.now()) {
  const result = previewTaskRecordInState(state, { ...record, id: null, type: 'task' }, now, { requireSameDay: true });
  if (result.error || !result.preview) return result;
  return {
    ...result,
    impact: buildRangeImpact(state.events, result.preview.candidate.start, result.preview.candidate.end, now),
  };
}

export function replaceTimeRangeInState(state, record, now = Date.now()) {
  const preflight = previewReplaceTimeRangeInState(state, record, now);
  if (preflight.error) return { state, taskId: null, error: preflight.error };
  return saveTaskRecordInState(state, { ...record, id: null, type: 'task' }, now);
}

export function previewOverlapRepairInState(state, now = Date.now()) {
  return buildOverlapRepairPreview(state.events, now);
}

export function applyResolutionPreviewInState(state, preview) {
  if (!preview?.nextEvents) return state;
  return {
    ...state,
    events: sortEventsByWindow(preview.nextEvents),
  };
}

function validateRunningOverlap(state, draft, now = Date.now()) {
  if (!state.running?.start) return null;
  const runningEvent = {
    id: '__running__',
    type: state.running.type,
    start: state.running.start,
    end: now,
  };
  return eventsOverlap(runningEvent, draft, now)
    ? '現在進行中の時間帯は、いったん停止してから編集してください'
    : null;
}

function prepareTaskRecordCandidate(state, record, now, { preview = false } = {}) {
  const previous = record.id ? state.events.find((event) => event.id === record.id) : null;
  if (record.id && !previous) return { candidate: null, previous: null, error: 'イベントが見つかりませんでした' };

  const type = ['task', 'interrupt', 'break'].includes(record.type) ? record.type : 'task';
  const taskTarget = resolveTaskTarget(state, record);
  const start = asNumber(record.start, null);
  const end = asNumber(record.end, null);
  const base = {
    ...record,
    id: previous?.id ?? record.id ?? newId('ev', now),
    type,
    start,
    end,
    memo: cleanText(record.memo),
    taskId: null,
    sourceTaskId: null,
    interruptOriginId: null,
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
        urgency: type === 'interrupt' ? record.urgency ?? 'med' : 'med',
        categoryId: type === 'interrupt' ? record.categoryId ?? null : null,
      },
      previous,
      error: null,
    };
  }

  if (taskTarget.mode === 'existing') {
    const task = state.tasks.find((item) => item.id === taskTarget.taskId);
    if (!task) return { candidate: null, previous, error: '選んだタスクが見つかりませんでした' };
    return {
      candidate: taskEventFromTask(base, task, record.workDetail),
      previous,
      error: null,
    };
  }

  if (taskTarget.mode === 'new') {
    const name = cleanText(taskTarget.name);
    if (!name) return { candidate: null, previous, error: 'タスク名を入力してください' };
    const virtualTask = {
      id: preview ? '__new-task-preview__' : '__new-task__',
      name,
      categoryId: taskTarget.categoryId ?? state.categories[0]?.id ?? null,
      sourceTaskId: null,
      interruptOriginId: null,
    };
    return {
      candidate: taskEventFromTask(base, virtualTask, record.workDetail),
      previous,
      error: null,
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
    error: null,
  };
}

function taskEventFromTask(base, task, workDetail) {
  return {
    ...base,
    taskId: task.id,
    label: task.name,
    categoryId: task.categoryId ?? null,
    sourceTaskId: task.sourceTaskId ?? null,
    interruptOriginId: task.interruptOriginId ?? null,
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

function materializeTaskTargetInState(state, record, now) {
  const target = resolveTaskTarget(state, record);
  if (record.type !== 'task' || target.mode !== 'new') {
    return { state, record: { ...record, taskTarget: target }, taskId: target.mode === 'existing' ? target.taskId : null, error: null };
  }

  const normalizedName = cleanText(target.name).toLocaleLowerCase();
  const existing = state.tasks.find((task) => !task.isCompleted
    && cleanText(task.name).toLocaleLowerCase() === normalizedName);
  if (existing) {
    return {
      state,
      record: { ...record, taskTarget: { mode: 'existing', taskId: existing.id } },
      taskId: existing.id,
      error: null,
    };
  }

  const created = createTaskInState(state, {
    name: target.name,
    categoryId: target.categoryId ?? state.categories[0]?.id ?? null,
    plannedDurationMinutes: target.plannedDurationMinutes ?? 0,
    dueAt: target.dueAt ?? null,
    memo: target.taskMemo ?? '',
  }, asNumber(record.start, now) ?? now);
  if (created.error || !created.taskId) return { state, record, taskId: null, error: created.error ?? 'タスクを作成できませんでした' };

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
    error: null,
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
