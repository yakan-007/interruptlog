import { normalizeLocale } from '../i18n';
import { asArray, asNumber, asPositiveTimestamp, cleanText, clone, isObject, uniqueTexts } from './utils';

export const APP_NAME = 'InterruptLog';
export const SCHEMA_VERSION = 2;

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
  memberName: '',
  locale: 'ja-JP',
  teamModeEnabled: false,
  teamLightsEnabled: true,
  topAdd: true,
  sortDue: false,
  historyView: 'timeline',
  onboardingDone: false,
};

export const TYPE_LABELS = {
  task: 'タスク',
  interrupt: '割り込み',
  break: '休憩',
  unknown: '記録',
};

export function createEmptyState() {
  const now = Date.now();
  return {
    version: SCHEMA_VERSION,
    tasks: [],
    taskTemplates: [],
    events: [],
    categories: clone(defaultCategories),
    interruptCats: clone(defaultInterruptCats),
    whoChips: [],
    subjectChips: [],
    teamWorkspace: {
      taxonomyVersion: defaultTaxonomyVersion(now),
      archiveImportedAt: null,
      focusWindow: { start: '10:00', end: '12:00' },
      questionMode: 'ask-later',
      interruptionQueue: [],
      presence: {
        enabled: false,
        teamId: '',
        anonymousMemberId: defaultAnonymousMemberId(now),
        colorSeed: defaultColorSeed(now),
        shareKeyHint: '',
      },
    },
    teamArchive: {
      entries: [],
    },
    preferences: { ...defaultPreferences },
    running: null,
  };
}

export function normalizeState(raw, now = Date.now(), options = {}) {
  const base = createEmptyState();
  if (!isObject(raw)) return base;

  const tasks = asArray(raw.tasks).map(normalizeTask).filter(Boolean);
  const taskTemplates = asArray(raw.taskTemplates).map(normalizeTaskTemplate).filter(Boolean);
  const categories = asArray(raw.categories).map(normalizeCategory).filter(Boolean);
  const interruptCats = asArray(raw.interruptCats).map(normalizeInterruptCategory).filter(Boolean);
  const events = asArray(raw.events).map(normalizeEvent).filter(Boolean);
  const taskIds = new Set(tasks.map((task) => task.id));
  const running = normalizeRunning(raw.running, taskIds);

  return {
    version: SCHEMA_VERSION,
    tasks,
    taskTemplates,
    events: resolveOpenEvents(events, running, now),
    categories: categories.length ? categories : clone(defaultCategories),
    interruptCats: interruptCats.length ? interruptCats : clone(defaultInterruptCats),
    whoChips: uniqueTexts(raw.whoChips),
    subjectChips: uniqueTexts(raw.subjectChips),
    teamWorkspace: normalizeTeamWorkspace(raw.teamWorkspace, now),
    teamArchive: normalizeTeamArchive(raw.teamArchive),
    preferences: normalizePreferences(isObject(raw.preferences) ? raw.preferences : {}, options),
    running,
  };
}

function normalizePreferences(raw = {}, options = {}) {
  return {
    dark: Boolean(raw.dark ?? defaultPreferences.dark),
    accent: cleanText(raw.accent) || defaultPreferences.accent,
    memberName: cleanText(raw.memberName),
    locale: normalizeLocale(raw.locale ?? defaultPreferences.locale),
    teamModeEnabled: Boolean(raw.teamModeEnabled ?? defaultPreferences.teamModeEnabled),
    teamLightsEnabled: Boolean(raw.teamLightsEnabled ?? defaultPreferences.teamLightsEnabled),
    topAdd: Boolean(raw.topAdd ?? defaultPreferences.topAdd),
    sortDue: Boolean(raw.sortDue ?? defaultPreferences.sortDue),
    historyView: normalizeHistoryView(raw.historyView),
    onboardingDone: Boolean(raw.onboardingDone ?? options.assumeOnboarded ?? defaultPreferences.onboardingDone),
  };
}

function normalizeHistoryView(value) {
  return value === 'list' ? 'list' : 'timeline';
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
    taskTemplateId: cleanText(task.taskTemplateId) || null,
    packVersion: cleanText(task.packVersion) || null,
    planning: {
      plannedDurationMinutes: Math.max(0, asNumber(task.planning?.plannedDurationMinutes, 0) ?? 0),
      dueAt: asPositiveTimestamp(task.planning?.dueAt, null),
    },
    createdAt: asNumber(task.createdAt, Date.now()),
    completedAt: asNumber(task.completedAt, null),
  };
}

export function normalizeTaskTemplate(template) {
  if (!isObject(template) || !template.id) return null;
  return {
    id: String(template.id),
    name: cleanText(template.name) || '配布用タスク',
    categoryId: template.categoryId ? String(template.categoryId) : null,
    planning: {
      plannedDurationMinutes: Math.max(0, asNumber(template.planning?.plannedDurationMinutes, 0) ?? 0),
      dueAt: asPositiveTimestamp(template.planning?.dueAt, null),
    },
    createdAt: asNumber(template.createdAt, Date.now()),
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
  return {
    ...event,
    id: String(event.id),
    type: ['task', 'interrupt', 'break', 'unknown'].includes(event.type) ? event.type : 'unknown',
    label: cleanText(event.label) || TYPE_LABELS[event.type] || 'イベント',
    sourceTaskId: cleanText(event.sourceTaskId) || null,
    taskTemplateId: cleanText(event.taskTemplateId) || null,
    packVersion: cleanText(event.packVersion) || null,
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
    preTaskId: running.preTaskId ?? null,
    plannedBreakDurationMinutes: running.type === 'break'
      ? Math.max(0, asNumber(running.plannedBreakDurationMinutes, 0) ?? 0)
      : null,
  };
}

function normalizeTeamWorkspace(raw = {}, now = Date.now()) {
  return {
    taxonomyVersion: cleanText(raw?.taxonomyVersion) || defaultTaxonomyVersion(now),
    archiveImportedAt: asNumber(raw?.archiveImportedAt, null),
    focusWindow: normalizeFocusWindow(raw?.focusWindow),
    questionMode: normalizeQuestionMode(raw?.questionMode),
    interruptionQueue: asArray(raw?.interruptionQueue).map(normalizeQueueItem).filter(Boolean),
    presence: normalizePresenceSettings(raw?.presence, now),
  };
}

function normalizeTeamArchive(raw = {}) {
  return {
    entries: asArray(raw?.entries).map(normalizeArchiveEntry).filter(Boolean),
  };
}

export function normalizeArchiveEntry(entry) {
  if (!isObject(entry)) return null;
  const durationMinutes = asNumber(entry.durationMinutes, null);
  const type = ['task', 'interrupt', 'break', 'unknown'].includes(entry.type) ? entry.type : null;
  if (!type || durationMinutes == null) return null;
  return {
    member: cleanText(entry.member) || '未設定',
    reportDate: cleanText(entry.reportDate),
    range: cleanText(entry.range),
    timezone: cleanText(entry.timezone),
    start: cleanText(entry.start),
    end: cleanText(entry.end),
    type,
    label: cleanText(entry.label),
    category: cleanText(entry.category),
    categoryId: cleanText(entry.categoryId),
    taskId: cleanText(entry.taskId),
    sourceTaskId: cleanText(entry.sourceTaskId),
    taskTemplateId: cleanText(entry.taskTemplateId),
    taxonomyVersion: cleanText(entry.taxonomyVersion),
    who: cleanText(entry.who),
    urgency: cleanText(entry.urgency),
    memo: cleanText(entry.memo),
    durationMinutes,
    source: cleanText(entry.source),
  };
}

function defaultTaxonomyVersion(now = Date.now()) {
  const date = new Date(now);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `local-${year}-${month}`;
}

function defaultAnonymousMemberId(now = Date.now()) {
  return `anon-${Math.abs(Math.sin(now) * 1e9).toString(36).slice(0, 8)}`;
}

function defaultColorSeed(now = Date.now()) {
  return `seed-${Math.abs(Math.cos(now) * 1e9).toString(36).slice(0, 8)}`;
}

function normalizeFocusWindow(raw = {}) {
  return {
    start: normalizeClockText(raw.start, '10:00'),
    end: normalizeClockText(raw.end, '12:00'),
  };
}

function normalizeClockText(value, fallback) {
  const text = cleanText(value);
  return /^\d{2}:\d{2}$/.test(text) ? text : fallback;
}

function normalizeQuestionMode(value) {
  return ['open', 'ask-later', 'focus', 'break'].includes(value) ? value : 'ask-later';
}

function normalizeQueueItem(item) {
  if (!isObject(item)) return null;
  return {
    id: cleanText(item.id),
    priority: ['now', 'today', 'later'].includes(item.priority) ? item.priority : 'later',
    subject: cleanText(item.subject) || '相談',
    createdAt: asNumber(item.createdAt, Date.now()),
    done: Boolean(item.done),
  };
}

function normalizePresenceSettings(raw = {}, now = Date.now()) {
  return {
    enabled: Boolean(raw.enabled),
    teamId: cleanText(raw.teamId),
    anonymousMemberId: cleanText(raw.anonymousMemberId) || defaultAnonymousMemberId(now),
    colorSeed: cleanText(raw.colorSeed) || defaultColorSeed(now),
    shareKeyHint: cleanText(raw.shareKeyHint),
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
