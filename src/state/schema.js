import { normalizeLocale } from '../domain/locale';
import { isWorkSchedule, normalizeWorkDays, normalizeWorkSchedule } from '../lib/workday';
import { normalizeInterruptDraft } from './pauseEvents';
import { asArray, asNumber, asPositiveTimestamp, cleanText, clone, isObject, uniqueTexts } from './utils';

export const APP_NAME = 'InterruptLog Personal';
export const SCHEMA_VERSION = 1;

const defaultCategories = [
  { id: 'cat-dev', name: '開発', color: 'oklch(0.58 0.12 240)' },
  { id: 'cat-doc', name: 'ドキュメント', color: 'oklch(0.60 0.10 160)' },
  { id: 'cat-mtg', name: '会議', color: 'oklch(0.55 0.12 300)' },
  { id: 'cat-sup', name: 'サポート', color: 'oklch(0.58 0.12 345)' },
  { id: 'cat-adm', name: '雑務', color: 'oklch(0.55 0.03 250)' },
];

const defaultInterruptCats = [
  { id: 'int-call', name: '電話' },
  { id: 'int-chat', name: 'チャット' },
  { id: 'int-q', name: '質問' },
  { id: 'int-other', name: 'その他' },
];


// How the task list is ordered: by due date, or by hand with new tasks on
// top or at the bottom.
const TASK_ORDERS = ['due', 'top', 'bottom'];

const defaultPreferences = {
  dark: false,
  locale: 'ja-JP',
  reportProfile: { affiliation: '', name: '' },
  taskOrder: 'top',
  workSchedule: { start: null, end: null },
  workDays: [1, 2, 3, 4, 5],
  historyView: 'timeline',
  lastBackupExportAt: null,
  onboardingDone: false,
};

export const TYPE_LABELS = {
  task: 'タスク',
  interrupt: '割り込み作業',
  break: '休憩',
  unknown: '記録',
};

export function createEmptyState() {
  return {
    version: SCHEMA_VERSION,
    tasks: [],
    events: [],
    categories: clone(defaultCategories),
    interruptCats: clone(defaultInterruptCats),
    whoChips: [],
    subjectChips: [],
    workdaySchedules: {},
    preferences: { ...defaultPreferences },
    running: null,
  };
}

export function normalizeState(raw, now = Date.now(), options = {}) {
  const base = createEmptyState();
  if (!isObject(raw)) return base;

  const tasks = asArray(raw.tasks).map((task) => normalizeTask(task, now)).filter(Boolean);
  const categories = asArray(raw.categories).map(normalizeCategory).filter(Boolean);
  const interruptCats = normalizeInterruptCategoryList(raw.interruptCats);
  const events = asArray(raw.events).map(normalizeEvent).filter(Boolean);
  const taskIds = new Set(tasks.map((task) => task.id));
  const running = normalizeRunning(raw.running, taskIds);

  return {
    version: SCHEMA_VERSION,
    tasks,
    events: resolveOpenEvents(events, running, now),
    categories: categories.length ? categories : clone(defaultCategories),
    interruptCats,
    whoChips: uniqueTexts(raw.whoChips),
    subjectChips: uniqueTexts(raw.subjectChips),
    workdaySchedules: normalizeWorkdaySchedules(raw.workdaySchedules),
    preferences: normalizePreferences(isObject(raw.preferences) ? raw.preferences : {}, options),
    running,
  };
}

function normalizePreferences(raw = {}, options = {}) {
  return {
    dark: Boolean(raw.dark ?? defaultPreferences.dark),
    locale: normalizeLocale(raw.locale ?? defaultPreferences.locale),
    reportProfile: normalizeReportProfile(raw.reportProfile),
    taskOrder: TASK_ORDERS.includes(raw.taskOrder) ? raw.taskOrder : defaultPreferences.taskOrder,
    workSchedule: normalizeWorkSchedule(raw.workSchedule),
    workDays: normalizeWorkDays(raw.workDays),
    historyView: raw.historyView === 'list' ? 'list' : 'timeline',
    lastBackupExportAt: asPositiveTimestamp(raw.lastBackupExportAt, null),
    onboardingDone: Boolean(raw.onboardingDone ?? options.assumeOnboarded ?? defaultPreferences.onboardingDone),
  };
}

function normalizeReportProfile(raw) {
  return {
    affiliation: cleanText(raw?.affiliation),
    name: cleanText(raw?.name),
  };
}

function normalizeWorkdaySchedules(raw) {
  if (!isObject(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw)
      .filter(([key, schedule]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && isWorkSchedule(schedule))
      .map(([key, schedule]) => [key, schedule.override ? { ...normalizeWorkSchedule(schedule), override: true } : normalizeWorkSchedule(schedule)])
  );
}

function normalizeTask(task, now) {
  if (!isObject(task) || !task.id) return null;
  return {
    id: String(task.id),
    name: cleanText(task.name) || '無題のタスク',
    memo: cleanText(task.memo),
    isCompleted: Boolean(task.isCompleted),
    order: asNumber(task.order, 0),
    categoryId: task.categoryId ? String(task.categoryId) : null,
    planning: {
      plannedDurationMinutes: Math.max(0, asNumber(task.planning?.plannedDurationMinutes, 0) ?? 0),
      dueAt: asPositiveTimestamp(task.planning?.dueAt, null),
    },
    createdAt: asNumber(task.createdAt, now),
    completedAt: asNumber(task.completedAt, null),
  };
}

export function normalizeCategory(category) {
  if (!isObject(category) || !category.id) return null;
  return {
    id: String(category.id),
    name: cleanText(category.name) || 'カテゴリ',
    color: String(category.color || 'oklch(0.58 0.08 220)'),
  };
}

export function normalizeInterruptCategory(category) {
  if (!isObject(category) || !category.id) return null;
  return {
    id: String(category.id),
    name: cleanText(category.name) || 'カテゴリ',
  };
}

export function normalizeEvent(event) {
  if (!isObject(event) || !event.id) return null;
  const start = asNumber(event.start, null);
  const end = event.end === null ? null : asNumber(event.end, null);
  if (start == null) return null;
  const type = ['task', 'interrupt', 'break', 'unknown'].includes(event.type) ? event.type : 'unknown';
  return {
    id: String(event.id),
    type,
    taskId: cleanText(event.taskId) || null,
    label: cleanText(event.label) || TYPE_LABELS[type] || 'イベント',
    categoryId: cleanText(event.categoryId) || null,
    memo: cleanText(event.memo),
    workDetail: cleanText(event.workDetail) || null,
    who: cleanText(event.who),
    start,
    end,
  };
}

function normalizeRunning(running, taskIds) {
  if (!isObject(running) || !running.type || running.start == null) return null;
  if (running.type === 'task' && (!running.taskId || !taskIds.has(running.taskId))) return null;
  if (!['task', 'interrupt', 'break'].includes(running.type)) return null;
  return {
    type: running.type,
    taskId: running.taskId ?? null,
    start: asNumber(running.start, null),
    label: running.label ?? null,
    returnTaskId: running.type !== 'task' && taskIds.has(running.returnTaskId) ? String(running.returnTaskId) : null,
    categoryId: cleanText(running.categoryId) || cleanText(running.draft?.categoryId) || null,
    draft: running.type === 'interrupt' ? normalizeInterruptDraft(running.draft) : null,
  };
}

function normalizeInterruptCategoryList(raw) {
  const categories = asArray(raw).map(normalizeInterruptCategory).filter(Boolean);
  return categories.length ? categories : clone(defaultInterruptCats);
}


function resolveOpenEvents(events, running, now = Date.now()) {
  return events.map((event) => {
    if (event.end !== null) return event;
    const matchesRunningTask =
      running?.type === 'task' &&
      event.type === 'task' &&
      event.taskId === running.taskId &&
      event.start === running.start;
    return matchesRunningTask ? event : { ...event, end: now };
  });
}
