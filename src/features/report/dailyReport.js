import { categoryLabel, interruptCategoryLabel } from '../../i18n';
import { createReportSnapshot, getWorkdayBounds, selectRangeEvents } from '../../state';

const SOON_DAYS = 3;
const TOP_INTERRUPTIONS = 5;
const TOP_SENDERS = 3;
const DUE_RANK = { overdue: 0, today: 1, soon: 2 };

/**
 * One day's report as facts only: everything comes from the records, and the
 * notes written while working are attached to the rows they belong to. Every
 * output (copied text, print, CSV) renders this object.
 */
export function buildDailyReport(state, dayStart, asOf = Date.now()) {
  const locale = state.preferences.locale;
  const dayEnd = addDays(dayStart, 1);
  const until = Math.min(asOf, dayEnd);
  const snapshot = createReportSnapshot(state.events, until);
  const events = until > dayStart ? selectRangeEvents(snapshot, dayStart, until) : [];
  const categoryById = new Map(state.categories.map((category) => [category.id, category]));
  const context = {
    locale,
    dayStart,
    dayEnd,
    until,
    categoryName: (id) => categoryLabel(locale, categoryById.get(id)) || '',
  };

  const tasks = buildTaskSections(state, events, snapshot, context);
  const interruptions = buildInterruptions(state, events, locale);

  return {
    date: dayStart,
    profile: {
      affiliation: state.preferences.reportProfile?.affiliation ?? '',
      name: state.preferences.reportProfile?.name ?? '',
    },
    span: buildSpan(state, events, dayStart),
    totals: buildTotals(events, interruptions.count, tasks.completed.length),
    completed: tasks.completed,
    inProgress: tasks.inProgress,
    recordOnly: buildRecordOnly(events, context),
    interruptions,
    remaining: tasks.remaining,
  };
}

function buildSpan(state, events, dayStart) {
  const workday = getWorkdayBounds(state, dayStart);
  if (workday) return { kind: 'workday', start: workday.start, end: workday.end };
  if (events.length === 0) return null;
  return {
    kind: 'recorded',
    start: Math.min(...events.map((event) => event.clippedStart)),
    end: Math.max(...events.map((event) => event.clippedEnd)),
  };
}

function buildTotals(events, interruptCount, completedCount) {
  const totals = { recorded: 0, focus: 0, interrupt: 0, interruptCount, break: 0, completedCount };
  for (const event of events) {
    totals.recorded += event.durationMs;
    if (event.type === 'task') totals.focus += event.durationMs;
    else if (event.type === 'interrupt') totals.interrupt += event.durationMs;
    else if (event.type === 'break') totals.break += event.durationMs;
  }
  return totals;
}

function buildTaskSections(state, events, snapshot, context) {
  const taskById = new Map(state.tasks.map((task) => [task.id, task]));
  const dayGroups = groupBy(events.filter((event) => event.type === 'task' && event.taskId), (event) => event.taskId);
  const totalByTask = new Map();
  for (const event of selectRangeEvents(snapshot, Number.NEGATIVE_INFINITY, context.until)) {
    if (event.type !== 'task' || !event.taskId) continue;
    totalByTask.set(event.taskId, (totalByTask.get(event.taskId) ?? 0) + event.durationMs);
  }

  const ids = new Set(dayGroups.keys());
  for (const task of state.tasks) {
    if (isDoneBy(task, context.dayEnd) && task.completedAt >= context.dayStart) ids.add(task.id);
  }

  const completed = [];
  const inProgress = [];
  for (const id of ids) {
    const task = taskById.get(id);
    const dayEvents = dayGroups.get(id) ?? [];
    const done = isDoneBy(task, context.dayEnd);
    const row = buildTaskRow({ id, task, dayEvents, totalTime: totalByTask.get(id) ?? 0, done, context });
    (done ? completed : inProgress).push(row);
  }
  completed.sort((left, right) => overOf(right) - overOf(left) || right.dayTime - left.dayTime);
  inProgress.sort(byDueThenTime);

  const remaining = state.tasks
    .filter((task) => !ids.has(task.id) && !isDoneBy(task, context.dayEnd) && task.createdAt < context.dayEnd)
    .map((task) => buildTaskRow({ id: task.id, task, dayEvents: [], totalTime: totalByTask.get(task.id) ?? 0, done: false, context }))
    .filter((row) => row.dueStatus)
    .sort((left, right) => left.dueAt - right.dueAt);

  return { completed, inProgress, remaining };
}

function buildTaskRow({ id, task, dayEvents, totalTime, done, context }) {
  const name = task?.name ?? dayEvents[0]?.label ?? '';
  const plannedMs = (task?.planning?.plannedDurationMinutes ?? 0) * 60000;
  const dueAt = task?.planning?.dueAt ?? null;
  const completedAt = done ? task?.completedAt ?? null : null;
  return {
    id,
    name,
    categoryName: context.categoryName(dayEvents[0]?.categoryId ?? task?.categoryId),
    dayTime: sum(dayEvents),
    totalTime,
    plannedMs,
    overMs: plannedMs > 0 ? totalTime - plannedMs : null,
    dueAt,
    dueStatus: getDueStatus({ dueAt, done, completedAt, context }),
    completedAt,
    notes: collectNotes(dayEvents, name),
  };
}

function getDueStatus({ dueAt, done, completedAt, context }) {
  if (dueAt == null) return null;
  if (done) return completedAt != null && completedAt > dueAt ? 'late' : null;
  if (dueAt < context.until) return 'overdue';
  if (dueAt < context.dayEnd) return 'today';
  if (dueAt < addDays(context.dayEnd, SOON_DAYS)) return 'soon';
  return null;
}

function buildRecordOnly(events, context) {
  const groups = groupBy(
    events.filter((event) => event.type === 'task' && !event.taskId),
    (event) => `${event.workDetail || event.label}\u0000${event.categoryId ?? ''}`
  );
  return [...groups.values()]
    .map((group) => {
      const name = group[0].workDetail || group[0].label;
      return {
        id: group[0].id,
        name,
        categoryName: context.categoryName(group[0].categoryId),
        time: sum(group),
        notes: collectNotes(group, name),
      };
    })
    .sort((left, right) => right.time - left.time);
}

function buildInterruptions(state, events, locale) {
  const categoryById = new Map(state.interruptCats.map((category) => [category.id, category]));
  const items = events
    .filter((event) => event.type === 'interrupt')
    .map((event) => ({
      id: event.id,
      label: event.label,
      who: event.who || '',
      categoryName: interruptCategoryLabel(locale, categoryById.get(event.categoryId)) || '',
      time: event.durationMs,
      memo: event.memo || '',
      start: event.clippedStart,
    }))
    .sort((left, right) => right.time - left.time || left.start - right.start);

  const senderGroups = groupBy(items.filter((item) => item.who), (item) => item.who);
  const senders = [...senderGroups.entries()]
    .map(([label, group]) => ({ label, count: group.length, time: sumTime(group) }))
    .sort((left, right) => right.time - left.time || right.count - left.count);
  const topSenders = senders.slice(0, TOP_SENDERS);
  const otherSenderItems = items.filter((item) => !topSenders.some((sender) => sender.label === item.who));

  // Notes are never dropped: an interruption with a memo stays listed even
  // when it is shorter than the top entries.
  const listed = items.filter((item, index) => index < TOP_INTERRUPTIONS || item.memo);
  const unlisted = items.filter((item) => !listed.includes(item));

  return {
    count: items.length,
    time: sumTime(items),
    senders: topSenders,
    otherSenders: senders.length > 0 ? summarize(otherSenderItems) : null,
    items: listed,
    otherItems: summarize(unlisted),
  };
}

function collectNotes(events, name) {
  const notes = [];
  for (const event of [...events].sort((left, right) => left.clippedStart - right.clippedStart)) {
    if (event.workDetail && event.workDetail !== name) notes.push(event.workDetail);
    if (event.memo) notes.push(event.memo);
  }
  return [...new Set(notes)];
}

function isDoneBy(task, dayEnd) {
  return Boolean(task?.isCompleted && (task.completedAt == null || task.completedAt < dayEnd));
}

function overOf(row) {
  return row.overMs > 0 ? row.overMs : 0;
}

function byDueThenTime(left, right) {
  return (DUE_RANK[left.dueStatus] ?? 3) - (DUE_RANK[right.dueStatus] ?? 3) || right.dayTime - left.dayTime;
}

function summarize(items) {
  return { count: items.length, time: sumTime(items) };
}

function groupBy(items, keyOf) {
  const groups = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

function sum(events) {
  return events.reduce((total, event) => total + event.durationMs, 0);
}

function sumTime(items) {
  return items.reduce((total, item) => total + item.time, 0);
}

function addDays(timestamp, days) {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + days);
  return date.getTime();
}
