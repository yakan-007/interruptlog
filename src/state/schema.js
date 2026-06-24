import { normalizeLocale } from '../i18n';
import { isWorkSchedule, normalizeWorkSchedule } from '../lib/workday';
import { asArray, asNumber, asPositiveTimestamp, cleanText, clone, isObject, uniqueTexts } from './utils';

export const APP_NAME = 'InterruptLog Personal';
export const SCHEMA_VERSION = 1;

const defaultCategories = [
  { id: 'cat-dev', name: '開発', color: 'oklch(0.58 0.12 240)' },
  { id: 'cat-doc', name: 'ドキュメント', color: 'oklch(0.60 0.10 160)' },
  { id: 'cat-mtg', name: '会議', color: 'oklch(0.55 0.12 300)' },
  { id: 'cat-sup', name: 'サポート', color: 'oklch(0.60 0.13 35)' },
  { id: 'cat-adm', name: '雑務', color: 'oklch(0.62 0.04 80)' },
];

const defaultInterruptCats = [
  { id: 'int-call', name: '電話', icon: 'phone' },
  { id: 'int-chat', name: 'チャット', icon: 'chat' },
  { id: 'int-q', name: '質問', icon: 'q' },
  { id: 'int-other', name: 'その他', icon: 'dots' },
];

const defaultPreferences = {
  dark: false,
  accent: 'oklch(0.35 0.03 250)',
  locale: 'ja-JP',
  reportProfile: { affiliation: '', name: '' },
  topAdd: true,
  sortDue: false,
  workSchedule: { start: null, end: null },
  historyView: 'timeline',
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

  const tasks = asArray(raw.tasks).map(normalizeTask).filter(Boolean);
  const categories = asArray(raw.categories).map(normalizeCategory).filter(Boolean);
  const interruptCats = asArray(raw.interruptCats).map(normalizeInterruptCategory).filter(Boolean);
  const events = asArray(raw.events).map(normalizeEvent).filter(Boolean);
  const taskIds = new Set(tasks.map((task) => task.id));
  const running = normalizeRunning(raw.running, taskIds);

  return {
    version: SCHEMA_VERSION,
    tasks,
    events: resolveOpenEvents(events, running, now),
    categories: categories.length ? categories : clone(defaultCategories),
    interruptCats: interruptCats.length ? interruptCats : clone(defaultInterruptCats),
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
    accent: cleanText(raw.accent) || defaultPreferences.accent,
    locale: normalizeLocale(raw.locale ?? defaultPreferences.locale),
    reportProfile: normalizeReportProfile(raw.reportProfile),
    topAdd: Boolean(raw.topAdd ?? defaultPreferences.topAdd),
    sortDue: Boolean(raw.sortDue ?? defaultPreferences.sortDue),
    workSchedule: normalizeWorkSchedule(raw.workSchedule),
    historyView: raw.historyView === 'list' ? 'list' : 'timeline',
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
      .map(([key, schedule]) => [key, normalizeWorkSchedule(schedule)])
  );
}

function normalizeTask(task) {
  if (!isObject(task) || !task.id) return null;
  return {
    id: String(task.id),
    name: cleanText(task.name) || '無題のタスク',
    memo: cleanText(task.memo),
    isCompleted: Boolean(task.isCompleted),
    order: asNumber(task.order, 0),
    categoryId: task.categoryId ? String(task.categoryId) : null,
    sourceTaskId: cleanText(task.sourceTaskId) || null,
    interruptOriginId: cleanText(task.interruptOriginId) || null,
    planning: {
      plannedDurationMinutes: Math.max(0, asNumber(task.planning?.plannedDurationMinutes, 0) ?? 0),
      dueAt: asPositiveTimestamp(task.planning?.dueAt, null),
    },
    createdAt: asNumber(task.createdAt, Date.now()),
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
  const rawIcon = category.icon;
  return {
    id: String(category.id),
    name: cleanText(category.name) || 'カテゴリ',
    icon: rawIcon === null ? null : cleanText(rawIcon) || 'dots',
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
    urgency: ['low', 'med', 'high'].includes(event.urgency) ? event.urgency : 'med',
    sourceTaskId: cleanText(event.sourceTaskId) || null,
    interruptOriginId: cleanText(event.interruptOriginId) || null,
    breakDurationMinutes: Math.max(0, asNumber(event.breakDurationMinutes, 0) ?? 0),
    start,
    end,
  };
}

function normalizeRunning(running, taskIds) {
  if (!isObject(running) || !running.type || running.start == null) return null;
  if (running.type === 'task' && (!running.taskId || !taskIds.has(running.taskId))) return null;
  if (!['task', 'interrupt', 'break'].includes(running.type)) return null;
  const resumeStack = normalizeResumeStack(running.resumeStack, taskIds, running.preTaskId);
  return {
    type: running.type,
    taskId: running.taskId ?? null,
    start: asNumber(running.start, null),
    label: running.label ?? null,
    preTaskId: resumeStack.slice().reverse().find((context) => context.type === 'task')?.taskId ?? null,
    resumeStack,
    draft: running.type === 'interrupt' ? normalizeInterruptDraft(running.draft) : null,
    plannedBreakDurationMinutes: running.type === 'break'
      ? Math.max(0, asNumber(running.plannedBreakDurationMinutes, 0) ?? 0)
      : null,
  };
}

function normalizeResumeStack(raw, taskIds, legacyPreTaskId) {
  const source = Array.isArray(raw)
    ? raw
    : legacyPreTaskId ? [{ type: 'task', taskId: legacyPreTaskId }] : [];
  return source.flatMap((context) => {
    if (!isObject(context)) return [];
    if (context.type === 'task' && context.taskId && taskIds.has(context.taskId)) {
      return [{ type: 'task', taskId: String(context.taskId) }];
    }
    if (context.type === 'interrupt') return [{ type: 'interrupt', draft: normalizeInterruptDraft(context.draft) }];
    if (context.type === 'break') {
      return [{ type: 'break', plannedBreakDurationMinutes: Math.max(0, asNumber(context.plannedBreakDurationMinutes, 0) ?? 0) }];
    }
    return [];
  });
}

function normalizeInterruptDraft(raw) {
  return {
    who: cleanText(raw?.who),
    saveWhoChip: Boolean(raw?.saveWhoChip),
    label: cleanText(raw?.label),
    urgency: ['low', 'med', 'high'].includes(raw?.urgency) ? raw.urgency : 'med',
    categoryId: cleanText(raw?.categoryId) || null,
    memo: cleanText(raw?.memo),
  };
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
