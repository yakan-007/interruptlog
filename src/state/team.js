import { APP_NAME, normalizeArchiveEntry, normalizeCategory, normalizeInterruptCategory, normalizeTaskTemplate } from './schema';
import { newId } from './ids';
import { asArray, asNumber, cleanText, uniqueTexts } from './utils';

const TEAM_SETTINGS_KIND = 'team-settings';
const TASK_PACK_KIND = 'task-pack';
const TEAM_ARCHIVE_KIND = 'team-archive';
const TEAM_PAYLOAD_VERSION = 1;
const PRESENCE_STATUSES = ['focus', 'interrupt', 'break', 'idle'];

export function buildTeamSettingsExport(state, now = Date.now()) {
  return {
    appName: APP_NAME,
    kind: TEAM_SETTINGS_KIND,
    version: TEAM_PAYLOAD_VERSION,
    exportedAt: new Date(now).toISOString(),
    taxonomyVersion: state.teamWorkspace?.taxonomyVersion ?? '',
    categories: state.categories,
    interruptCats: state.interruptCats,
    whoChips: state.whoChips,
    subjectChips: state.subjectChips,
    focusWindow: state.teamWorkspace?.focusWindow,
    questionMode: state.teamWorkspace?.questionMode,
  };
}

export function applyTeamSettingsImport(state, input) {
  const payload = parsePayload(input);
  if (!payload || payload.kind !== TEAM_SETTINGS_KIND) {
    return { state, error: 'チーム設定JSONを読み込めませんでした', addedCategories: 0, updatedCategories: 0, addedInterruptCategories: 0, updatedInterruptCategories: 0 };
  }

  const incoming = asArray(payload.categories).map(normalizeCategory).filter(Boolean);
  const byId = new Map(incoming.map((category) => [category.id, category]));
  let updatedCategories = 0;
  const categories = state.categories.map((category) => {
    if (!byId.has(category.id)) return category;
    updatedCategories += 1;
    const next = byId.get(category.id);
    byId.delete(category.id);
    return next;
  });
  const additions = [...byId.values()];
  const incomingInterrupts = asArray(payload.interruptCats).map(normalizeInterruptCategory).filter(Boolean);
  const interruptsById = new Map(incomingInterrupts.map((category) => [category.id, category]));
  let updatedInterruptCategories = 0;
  const interruptCats = state.interruptCats.map((category) => {
    if (!interruptsById.has(category.id)) return category;
    updatedInterruptCategories += 1;
    const next = interruptsById.get(category.id);
    interruptsById.delete(category.id);
    return next;
  });
  const interruptAdditions = [...interruptsById.values()];

  return {
    state: {
      ...state,
      categories: [...categories, ...additions],
      interruptCats: [...interruptCats, ...interruptAdditions],
      whoChips: uniqueTexts([...state.whoChips, ...asArray(payload.whoChips)]),
      subjectChips: uniqueTexts([...state.subjectChips, ...asArray(payload.subjectChips)]),
      teamWorkspace: {
        ...state.teamWorkspace,
        taxonomyVersion: cleanText(payload.taxonomyVersion) || state.teamWorkspace.taxonomyVersion,
        focusWindow: normalizeFocusWindowInput(payload.focusWindow ?? state.teamWorkspace.focusWindow),
        questionMode: normalizeQuestionModeInput(payload.questionMode ?? state.teamWorkspace.questionMode),
      },
    },
    error: null,
    addedCategories: additions.length,
    updatedCategories,
    addedInterruptCategories: interruptAdditions.length,
    updatedInterruptCategories,
  };
}

export function buildTaskPackExport(state, now = Date.now()) {
  const packVersion = state.teamWorkspace?.taxonomyVersion ?? '';
  return {
    appName: APP_NAME,
    kind: TASK_PACK_KIND,
    version: TEAM_PAYLOAD_VERSION,
    packId: `tasks-${packVersion || formatMonthKey(now)}`,
    packVersion: packVersion || formatMonthKey(now),
    exportedAt: new Date(now).toISOString(),
    tasks: (state.taskTemplates ?? [])
      .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
      .map((template) => ({
        taskTemplateId: template.id,
        sourceTaskId: template.id,
        name: template.name,
        categoryId: template.categoryId,
        plannedDurationMinutes: template.planning?.plannedDurationMinutes ?? 0,
        dueAt: template.planning?.dueAt ?? null,
      })),
  };
}

export function saveTaskTemplateInState(state, template, now = Date.now()) {
  const normalized = normalizeTaskTemplate({
    id: template.id || newId('tpl', now),
    name: template.name,
    categoryId: template.categoryId,
    planning: {
      plannedDurationMinutes: template.plannedDurationMinutes,
      dueAt: template.dueAt,
    },
    createdAt: template.createdAt ?? now,
  });
  if (!normalized) return { state, error: '配布用タスクを保存できませんでした' };
  const exists = state.taskTemplates.some((item) => item.id === normalized.id);
  return {
    state: {
      ...state,
      taskTemplates: exists
        ? state.taskTemplates.map((item) => item.id === normalized.id ? normalized : item)
        : [...state.taskTemplates, normalized],
    },
    error: null,
  };
}

export function deleteTaskTemplateInState(state, templateId) {
  return {
    ...state,
    taskTemplates: state.taskTemplates.filter((template) => template.id !== templateId),
  };
}

export function applyTaskPackImport(state, input, now = Date.now()) {
  const payload = parsePayload(input);
  if (!payload || payload.kind !== TASK_PACK_KIND) {
    return { state, error: 'タスクパックJSONを読み込めませんでした', addedTasks: 0, skippedTasks: 0 };
  }

  const packVersion = cleanText(payload.packVersion) || cleanText(payload.exportedAt) || 'unknown';
  const existing = new Set(state.tasks
    .filter((task) => task.taskTemplateId && task.packVersion)
    .map((task) => `${task.taskTemplateId}:${task.packVersion}`));
  const activeOrders = state.tasks.filter((task) => !task.isCompleted).map((task) => task.order);
  const startOrder = activeOrders.length ? Math.max(...activeOrders) + 1 : 0;
  const importedTasks = [];
  let skippedTasks = 0;

  for (const item of asArray(payload.tasks)) {
    const taskTemplateId = cleanText(item.taskTemplateId);
    const name = cleanText(item.name);
    if (!taskTemplateId || !name) {
      skippedTasks += 1;
      continue;
    }
    const key = `${taskTemplateId}:${packVersion}`;
    if (existing.has(key)) {
      skippedTasks += 1;
      continue;
    }
    existing.add(key);
    importedTasks.push({
      id: newId('tn', now + importedTasks.length),
      name,
      isCompleted: false,
      order: startOrder + importedTasks.length,
      categoryId: cleanText(item.categoryId) || (state.categories[0]?.id ?? null),
      sourceTaskId: cleanText(item.sourceTaskId) || taskTemplateId,
      taskTemplateId,
      packVersion,
      planning: {
        plannedDurationMinutes: Math.max(0, asNumber(item.plannedDurationMinutes, 0) ?? 0),
        dueAt: asNumber(item.dueAt, null),
      },
      createdAt: now,
      completedAt: null,
    });
  }

  return {
    state: {
      ...state,
      tasks: [...state.tasks, ...importedTasks],
    },
    error: null,
    addedTasks: importedTasks.length,
    skippedTasks,
  };
}

export function addReportRowsToArchive(state, rows, now = Date.now()) {
  const existing = new Set(state.teamArchive.entries.map(archiveEntryKey));
  const additions = [];
  let skippedEntries = 0;

  for (const row of rows) {
    const entry = normalizeArchiveEntry(row);
    if (!entry) {
      skippedEntries += 1;
      continue;
    }
    const key = archiveEntryKey(entry);
    if (existing.has(key)) {
      skippedEntries += 1;
      continue;
    }
    existing.add(key);
    additions.push(entry);
  }

  return {
    state: {
      ...state,
      teamWorkspace: {
        ...state.teamWorkspace,
        archiveImportedAt: additions.length ? now : state.teamWorkspace.archiveImportedAt,
      },
      teamArchive: {
        entries: [...state.teamArchive.entries, ...additions],
      },
    },
    error: null,
    addedEntries: additions.length,
    skippedEntries,
  };
}

export function addTeamDemoArchiveInState(state, now = Date.now()) {
  const day = new Date(now);
  day.setHours(9, 0, 0, 0);
  const isoAt = (minutes) => new Date(day.getTime() + minutes * 60000).toISOString();
  const reportDate = isoAt(0).slice(0, 10);
  const demoRows = [
    { member: 'Light A', reportDate, range: 'day', timezone: 'Asia/Tokyo', start: isoAt(0), end: isoAt(85), type: 'task', label: 'Focus block', category: 'Development', categoryId: 'cat-dev', durationMinutes: 85, source: 'demo' },
    { member: 'Light A', reportDate, range: 'day', timezone: 'Asia/Tokyo', start: isoAt(95), end: isoAt(118), type: 'interrupt', label: 'Request', category: 'Support', categoryId: 'cat-sup', who: 'Team', urgency: 'med', durationMinutes: 23, source: 'demo' },
    { member: 'Light A', reportDate, range: 'day', timezone: 'Asia/Tokyo', start: isoAt(135), end: isoAt(210), type: 'task', label: 'Review', category: 'Documentation', categoryId: 'cat-doc', durationMinutes: 75, source: 'demo' },
    { member: 'Light B', reportDate, range: 'day', timezone: 'Asia/Tokyo', start: isoAt(20), end: isoAt(70), type: 'task', label: 'Build', category: 'Development', categoryId: 'cat-dev', durationMinutes: 50, source: 'demo' },
    { member: 'Light B', reportDate, range: 'day', timezone: 'Asia/Tokyo', start: isoAt(75), end: isoAt(105), type: 'break', label: 'Break', category: '', categoryId: '', durationMinutes: 30, source: 'demo' },
    { member: 'Light B', reportDate, range: 'day', timezone: 'Asia/Tokyo', start: isoAt(120), end: isoAt(190), type: 'task', label: 'Implementation', category: 'Development', categoryId: 'cat-dev', durationMinutes: 70, source: 'demo' },
    { member: 'Light C', reportDate, range: 'day', timezone: 'Asia/Tokyo', start: isoAt(10), end: isoAt(35), type: 'interrupt', label: 'Question', category: 'Meeting', categoryId: 'cat-mtg', who: 'Client', urgency: 'high', durationMinutes: 25, source: 'demo' },
    { member: 'Light C', reportDate, range: 'day', timezone: 'Asia/Tokyo', start: isoAt(50), end: isoAt(160), type: 'task', label: 'Support work', category: 'Support', categoryId: 'cat-sup', durationMinutes: 110, source: 'demo' },
    { member: 'Light D', reportDate, range: 'day', timezone: 'Asia/Tokyo', start: isoAt(45), end: isoAt(140), type: 'task', label: 'Ops', category: 'Admin', categoryId: 'cat-adm', durationMinutes: 95, source: 'demo' },
    { member: 'Light D', reportDate, range: 'day', timezone: 'Asia/Tokyo', start: isoAt(150), end: isoAt(175), type: 'interrupt', label: 'Chat', category: 'Support', categoryId: 'cat-sup', who: 'Team', urgency: 'low', durationMinutes: 25, source: 'demo' },
  ];
  return addReportRowsToArchive(state, demoRows, now);
}

export function buildTeamArchiveExport(state, now = Date.now()) {
  return {
    appName: APP_NAME,
    kind: TEAM_ARCHIVE_KIND,
    version: TEAM_PAYLOAD_VERSION,
    exportedAt: new Date(now).toISOString(),
    entries: state.teamArchive.entries,
  };
}

export function applyTeamArchiveImport(state, input, now = Date.now()) {
  const payload = parsePayload(input);
  if (!payload || payload.kind !== TEAM_ARCHIVE_KIND) {
    return { state, error: 'チームアーカイブJSONを読み込めませんでした', addedEntries: 0, skippedEntries: 0 };
  }
  return addReportRowsToArchive(state, asArray(payload.entries), now);
}

export function aggregateArchiveRows(entries, grain = 'month') {
  const periods = new Map();
  for (const entry of entries) {
    const period = getPeriodKey(entry, grain);
    if (!period) continue;
    if (!periods.has(period)) periods.set(period, createArchiveSummary(period));
    addEntryToSummary(periods.get(period), entry);
  }
  return [...periods.values()].map(finalizeArchiveSummary).sort((a, b) => b.period.localeCompare(a.period));
}

export function compareArchivePeriods(entries, grain = 'month') {
  const periods = aggregateArchiveRows(entries, grain);
  const current = periods[0] ?? createArchiveSummary('');
  const previous = periods[1] ?? createArchiveSummary('');
  return {
    current,
    previous,
    deltas: {
      task: current.totals.task - previous.totals.task,
      interrupt: current.totals.interrupt - previous.totals.interrupt,
      break: current.totals.break - previous.totals.break,
      unknown: current.totals.unknown - previous.totals.unknown,
      total: current.totals.total - previous.totals.total,
    },
  };
}

export function buildPublicPresence(state, now = Date.now()) {
  const settings = state.teamWorkspace?.presence ?? {};
  const status = state.running?.type === 'task'
    ? 'focus'
    : state.running?.type === 'interrupt'
      ? 'interrupt'
      : state.running?.type === 'break'
        ? 'break'
        : 'idle';
  const startedAt = state.running?.start ?? now;
  const elapsedMinutes = Math.max(0, (now - startedAt) / 60000);
  return {
    teamId: cleanText(settings.teamId),
    anonymousMemberId: cleanText(settings.anonymousMemberId) || 'anonymous',
    status,
    intensity: Math.max(0.25, Math.min(1, status === 'idle' ? 0.25 : 0.45 + elapsedMinutes / 90)),
    colorSeed: cleanText(settings.colorSeed) || 'seed',
    updatedAt: new Date(now).toISOString(),
  };
}

export function buildAmbientReplay(entries) {
  const rows = asArray(entries).filter((entry) => entry.start && entry.end && entry.type);
  if (rows.length === 0) return { members: [], frames: [], summary: { focus: 0, interrupt: 0, break: 0, idle: 0 } };
  const sorted = [...rows].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const validTimes = sorted.flatMap((entry) => [Date.parse(entry.start), Date.parse(entry.end)]).filter(Number.isFinite);
  if (validTimes.length === 0) return { members: [], frames: [], summary: { focus: 0, interrupt: 0, break: 0, idle: 0 } };
  const since = Math.min(...validTimes);
  const until = Math.max(...validTimes);
  const memberNames = [...new Set(sorted.map((entry) => cleanText(entry.member) || '未設定'))].sort((a, b) => a.localeCompare(b, 'ja'));
  const members = memberNames.map((member, index) => ({
    id: `member-${index + 1}`,
    label: `Light ${index + 1}`,
    colorSeed: `${member}:${index}`,
  }));
  const step = Math.max(5 * 60000, Math.ceil((until - since) / 72));
  const frames = [];
  for (let ts = since; ts <= until; ts += step) {
    const states = members.map((member) => {
      const name = memberNames[members.indexOf(member)];
      const active = sorted.find((entry) => (cleanText(entry.member) || '未設定') === name && Date.parse(entry.start) <= ts && Date.parse(entry.end) > ts);
      return {
        memberId: member.id,
        status: active ? eventTypeToPresence(active.type) : 'idle',
        intensity: active ? Math.min(1, 0.45 + Number(active.durationMinutes || 0) / 180) : 0.2,
      };
    });
    frames.push({ at: new Date(ts).toISOString(), states });
  }
  const summary = rows.reduce((totals, entry) => {
    const key = eventTypeToPresence(entry.type);
    totals[key] = (totals[key] ?? 0) + Number(entry.durationMinutes || 0) * 60000;
    return totals;
  }, { focus: 0, interrupt: 0, break: 0, idle: 0 });
  return { members, frames, summary };
}

export function addInterruptionQueueItemInState(state, item, now = Date.now()) {
  const queueItem = {
    id: item.id || newId('q', now),
    priority: ['now', 'today', 'later'].includes(item.priority) ? item.priority : 'later',
    subject: cleanText(item.subject) || '相談',
    createdAt: item.createdAt ?? now,
    done: Boolean(item.done),
  };
  return {
    ...state,
    teamWorkspace: {
      ...state.teamWorkspace,
      interruptionQueue: [...(state.teamWorkspace.interruptionQueue ?? []), queueItem],
    },
  };
}

export function updateInterruptionQueueItemInState(state, id, patch) {
  return {
    ...state,
    teamWorkspace: {
      ...state.teamWorkspace,
      interruptionQueue: (state.teamWorkspace.interruptionQueue ?? []).map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    },
  };
}

export function deleteInterruptionQueueItemInState(state, id) {
  return {
    ...state,
    teamWorkspace: {
      ...state.teamWorkspace,
      interruptionQueue: (state.teamWorkspace.interruptionQueue ?? []).filter((item) => item.id !== id),
    },
  };
}

export function updateTeamWorkspaceInState(state, patch) {
  return {
    ...state,
    teamWorkspace: {
      ...state.teamWorkspace,
      ...patch,
      focusWindow: patch.focusWindow ? normalizeFocusWindowInput(patch.focusWindow) : state.teamWorkspace.focusWindow,
      questionMode: patch.questionMode ? normalizeQuestionModeInput(patch.questionMode) : state.teamWorkspace.questionMode,
      presence: patch.presence ? { ...state.teamWorkspace.presence, ...patch.presence } : state.teamWorkspace.presence,
    },
  };
}

function parsePayload(input) {
  try {
    return typeof input === 'string' ? JSON.parse(input) : input;
  } catch {
    return null;
  }
}

function eventTypeToPresence(type) {
  if (type === 'task') return 'focus';
  if (type === 'interrupt') return 'interrupt';
  if (type === 'break') return 'break';
  return 'idle';
}

function normalizeFocusWindowInput(raw = {}) {
  const start = /^\d{2}:\d{2}$/.test(cleanText(raw.start)) ? cleanText(raw.start) : '10:00';
  const end = /^\d{2}:\d{2}$/.test(cleanText(raw.end)) ? cleanText(raw.end) : '12:00';
  return { start, end };
}

function normalizeQuestionModeInput(value) {
  return ['open', 'ask-later', 'focus', 'break'].includes(value) ? value : 'ask-later';
}

function archiveEntryKey(entry) {
  return [
    entry.member,
    entry.reportDate,
    entry.start,
    entry.end,
    entry.type,
    entry.taskId,
    entry.taskTemplateId,
    entry.label,
    entry.durationMinutes,
  ].join('|');
}

function getPeriodKey(entry, grain) {
  const dateText = cleanText(entry.reportDate) || cleanText(entry.start).slice(0, 10);
  if (!dateText || dateText.length < 4) return '';
  return grain === 'year' ? dateText.slice(0, 4) : dateText.slice(0, 7);
}

function createArchiveSummary(period) {
  return {
    period,
    totals: { task: 0, interrupt: 0, break: 0, unknown: 0, total: 0, interruptCount: 0 },
    members: new Map(),
    categories: new Map(),
    senders: new Map(),
    rowCount: 0,
  };
}

function addEntryToSummary(summary, entry) {
  const durationMs = entry.durationMinutes * 60000;
  addDuration(summary.totals, entry.type, durationMs);
  summary.totals.total += durationMs;
  if (entry.type === 'interrupt') summary.totals.interruptCount += 1;
  summary.rowCount += 1;

  const member = cleanText(entry.member) || '未設定';
  addGroupedDuration(summary.members, member, 'member', entry.type, durationMs, entry.type === 'interrupt');

  const categoryKey = cleanText(entry.categoryId) || cleanText(entry.category) || '分類なし';
  const category = addGroupedDuration(summary.categories, categoryKey, 'category', entry.type, durationMs, false);
  category.name = cleanText(entry.category) || category.name || categoryKey;

  if (entry.type === 'interrupt' && entry.who) {
    if (!summary.senders.has(entry.who)) summary.senders.set(entry.who, { who: entry.who, time: 0, count: 0 });
    const sender = summary.senders.get(entry.who);
    sender.time += durationMs;
    sender.count += 1;
  }
}

function addGroupedDuration(map, key, labelKey, type, durationMs, countInterrupt) {
  if (!map.has(key)) {
    map.set(key, { [labelKey]: key, task: 0, interrupt: 0, break: 0, unknown: 0, total: 0, interruptCount: 0 });
  }
  const item = map.get(key);
  addDuration(item, type, durationMs);
  item.total += durationMs;
  if (countInterrupt) item.interruptCount += 1;
  return item;
}

function addDuration(target, type, durationMs) {
  if (type === 'task') target.task += durationMs;
  else if (type === 'interrupt') target.interrupt += durationMs;
  else if (type === 'break') target.break += durationMs;
  else target.unknown += durationMs;
}

function finalizeArchiveSummary(summary) {
  return {
    ...summary,
    members: [...summary.members.values()].sort((a, b) => b.total - a.total || a.member.localeCompare(b.member, 'ja')),
    categories: [...summary.categories.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'ja')),
    senders: [...summary.senders.values()].sort((a, b) => b.time - a.time || b.count - a.count).slice(0, 8),
  };
}

function formatMonthKey(now) {
  const date = new Date(now);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
