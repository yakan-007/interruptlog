import { getWorkdayBounds } from '../../state';
import { isWorkSchedule } from '../../lib/workday';
import { startOfDay, addDays } from '../../lib/day';
import { compareByDueDate, LIKELY_FORGOTTEN_MS } from '../../domain/records';

// When will each task be done if work goes on as usual, and which due dates
// won't be met without overtime or a day off?
//
// "As usual" means: only working days and their work hours (no overtime),
// minus the interruptions and breaks that usually eat into them, and with the
// remaining estimates scaled by how far estimates usually run over. Tasks are
// worked in due-date order — the most favourable order — so a date that is
// missed here is missed in every order.

const DAY_MS = 86400000;
const PROFILE_DAYS = 14;
const MIN_PROFILE_DAYS = 5;
const PACE_DAYS = 60;
const MIN_PACE_TASKS = 3;
const HORIZON_DAYS = 366;

export function buildForecast(state, now = Date.now()) {
  if (!isWorkSchedule(state.preferences?.workSchedule)) return null;

  const profile = buildWorkProfile(state, now);
  const pace = buildEstimatePace(state, now);
  const spentByTask = sumTaskTime(state.events, now);
  const active = state.tasks.filter((task) => !task.isCompleted);
  const estimated = active
    .filter((task) => (task.planning?.plannedDurationMinutes ?? 0) > 0)
    .sort(compareByDueDate);

  const capacity = createCapacity(state, now, profile.focusShare);
  let cumulativeMs = 0;
  const items = estimated.map((task) => {
    const estimateMs = task.planning.plannedDurationMinutes * 60000 * pace.ratio;
    const remainingMs = Math.max(0, estimateMs - (spentByTask.get(task.id) ?? 0));
    cumulativeMs += remainingMs;
    const finishAt = capacity.finishTimeFor(cumulativeMs);
    const dueAt = task.planning?.dueAt ?? null;
    const shortfallMs = dueAt == null ? 0 : Math.max(0, cumulativeMs - capacity.availableUntil(dueAt));
    return {
      taskId: task.id,
      remainingMs,
      finishAt,
      dueAt,
      late: dueAt != null && shortfallMs > 0,
      shortfallMs,
    };
  });

  return {
    items,
    byTaskId: new Map(items.map((item) => [item.taskId, item])),
    firstLate: items.find((item) => item.late) ?? null,
    unestimatedCount: active.length - estimated.length,
    profile,
    pace,
  };
}


// Usual share of work hours left for tasks, from the last two weeks of
// working days that have records: work hours minus interruptions and breaks
// inside them. Too few days, and no correction is made.
function buildWorkProfile(state, now) {
  const today = startOfDay(now);
  const records = state.events.filter((event) => event.end != null && event.end - event.start < LIKELY_FORGOTTEN_MS);
  const totals = { workMs: 0, interruptMs: 0, interruptCount: 0, breakMs: 0, days: 0 };

  for (let day = addDays(today, -PROFILE_DAYS); day < today; day = addDays(day, 1)) {
    const hours = getWorkdayBounds(state, day);
    if (!hours) continue;
    const inside = records.filter((event) => event.start < hours.end && event.end > hours.start);
    if (inside.length === 0) continue;
    totals.days += 1;
    totals.workMs += hours.end - hours.start;
    for (const event of inside) {
      const overlap = Math.min(event.end, hours.end) - Math.max(event.start, hours.start);
      if (event.type === 'interrupt') {
        totals.interruptMs += overlap;
        totals.interruptCount += 1;
      }
      if (event.type === 'break') totals.breakMs += overlap;
    }
  }

  if (totals.days < MIN_PROFILE_DAYS) {
    return { corrected: false, focusShare: 1, sampleDays: totals.days };
  }
  const focusShare = clamp((totals.workMs - totals.interruptMs - totals.breakMs) / totals.workMs, 0.2, 1);
  return {
    corrected: true,
    focusShare,
    sampleDays: totals.days,
    perDay: {
      workMs: totals.workMs / totals.days,
      interruptMs: totals.interruptMs / totals.days,
      interruptCount: totals.interruptCount / totals.days,
      breakMs: totals.breakMs / totals.days,
      focusMs: (totals.workMs / totals.days) * focusShare,
    },
  };
}

// How long tasks usually take against their estimate, from tasks completed in
// the last 60 days. Fewer than three, and estimates are taken as they are.
function buildEstimatePace(state, now) {
  const since = now - PACE_DAYS * DAY_MS;
  const actualByTask = sumTaskTime(state.events, now, { skipSuspect: true });
  let estimateMs = 0;
  let actualMs = 0;
  let samples = 0;
  for (const task of state.tasks) {
    const minutes = task.planning?.plannedDurationMinutes ?? 0;
    const actual = actualByTask.get(task.id) ?? 0;
    if (!task.isCompleted || (task.completedAt ?? 0) < since || minutes <= 0 || actual <= 0) continue;
    estimateMs += minutes * 60000;
    actualMs += actual;
    samples += 1;
  }
  if (samples < MIN_PACE_TASKS) return { corrected: false, ratio: 1, samples };
  return { corrected: true, ratio: clamp(actualMs / estimateMs, 0.5, 3), samples };
}

function sumTaskTime(events, now, { skipSuspect = false } = {}) {
  const totals = new Map();
  for (const event of events) {
    if (event.type !== 'task' || !event.taskId) continue;
    const duration = (event.end ?? now) - event.start;
    if (skipSuspect && duration >= LIKELY_FORGOTTEN_MS) continue;
    totals.set(event.taskId, (totals.get(event.taskId) ?? 0) + Math.max(0, duration));
  }
  return totals;
}

// The task time available from now on: each working day's hours (today's from
// now), shrunk by the usual focus share.
function createCapacity(state, now, focusShare) {
  const slices = [];
  let day = startOfDay(now);
  for (let index = 0; index < HORIZON_DAYS; index += 1, day = addDays(day, 1)) {
    const hours = getWorkdayBounds(state, day);
    if (!hours) continue;
    const start = Math.max(hours.start, now);
    if (hours.end > start) slices.push({ start, end: hours.end });
  }

  return {
    // When the first `workMs` of task time is used up, or null past the horizon.
    finishTimeFor(workMs) {
      let left = workMs;
      for (const slice of slices) {
        const sliceWork = (slice.end - slice.start) * focusShare;
        if (left <= sliceWork) return slice.start + left / focusShare;
        left -= sliceWork;
      }
      return left <= 0 ? now : null;
    },
    availableUntil(timestamp) {
      let total = 0;
      for (const slice of slices) {
        if (slice.start >= timestamp) break;
        total += (Math.min(slice.end, timestamp) - slice.start) * focusShare;
      }
      return total;
    },
  };
}



function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
