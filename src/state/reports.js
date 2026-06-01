import { cleanText, csvCell } from './utils';

const DAY_MS = 86400000;
const TEAM_MEMBER_FALLBACK = '未設定';
const REPORT_TYPES = ['task', 'interrupt', 'break', 'unknown'];

export function getRangeBounds(range, now = Date.now()) {
  const today = startOfDay(now);
  if (range === 'day') return { since: today, until: now, prevSince: today - DAY_MS, prevUntil: today };
  if (range === 'week') return { since: now - (7 * DAY_MS), until: now, prevSince: now - (14 * DAY_MS), prevUntil: now - (7 * DAY_MS) };
  if (range === 'month') return { since: now - (30 * DAY_MS), until: now, prevSince: now - (60 * DAY_MS), prevUntil: now - (30 * DAY_MS) };
  return { since: now - (365 * DAY_MS), until: now, prevSince: now - (730 * DAY_MS), prevUntil: now - (365 * DAY_MS) };
}

export function getEventOverlap(event, since, until, now = Date.now()) {
  const end = event.end ?? now;
  const start = Math.max(event.start, since);
  const clippedEnd = Math.min(end, until);
  const durationMs = Math.max(0, clippedEnd - start);
  if (durationMs <= 0) return null;
  return { ...event, clippedStart: start, clippedEnd, durationMs };
}

export function calcStats(events, since, until, now = Date.now()) {
  const overlaps = events.map((event) => getEventOverlap(event, since, until, now)).filter(Boolean);
  const sumMs = (type) => overlaps
    .filter((item) => item.type === type)
    .reduce((sum, item) => sum + Math.min(item.durationMs, 12 * 3600000), 0);

  return {
    focus: sumMs('task'),
    interrupt: sumMs('interrupt'),
    break: sumMs('break'),
    unknown: sumMs('unknown'),
    events: overlaps,
  };
}

export function buildReportCsv(state, range, now = Date.now()) {
  const bounds = getRangeBounds(range, now);
  const stats = calcStats(state.events, bounds.since, bounds.until, now);
  const member = cleanText(state.preferences?.memberName);
  const reportDate = formatDateKey(bounds.since);
  const timezone = getTimezoneName();
  const taxonomyVersion = state.teamWorkspace?.taxonomyVersion ?? '';
  const taskById = new Map(state.tasks.map((task) => [task.id, task]));
  const categoryName = (id) =>
    state.categories.find((category) => category.id === id)?.name ?? id ?? '';
  const rows = [
    ['member', 'reportDate', 'range', 'timezone', 'start', 'end', 'type', 'label', 'category', 'categoryId', 'taskId', 'sourceTaskId', 'taskTemplateId', 'taxonomyVersion', 'who', 'urgency', 'memo', 'durationMinutes'],
    ...stats.events
      .sort((a, b) => a.clippedStart - b.clippedStart)
      .map((event) => {
        const task = event.taskId ? taskById.get(event.taskId) : null;
        return [
          member,
          reportDate,
          range,
          timezone,
          new Date(event.clippedStart).toISOString(),
          new Date(event.clippedEnd).toISOString(),
          event.type,
          event.label ?? '',
          categoryName(event.categoryId),
          event.categoryId ?? '',
          event.taskId ?? '',
          event.sourceTaskId ?? task?.sourceTaskId ?? '',
          event.taskTemplateId ?? task?.taskTemplateId ?? '',
          taxonomyVersion,
          event.who ?? '',
          event.urgency ?? '',
          event.memo ?? '',
          (event.durationMs / 60000).toFixed(1),
        ];
      }),
  ];
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

export function parseReportCsv(text, source = '') {
  const records = parseCsv(text);
  if (records.length === 0) return { rows: [], skipped: 0, source };
  const headers = records[0].map((cell) => cleanText(cell));
  const hasTeamColumns = headers.includes('member') && headers.includes('durationMinutes');
  const skippedRows = [];
  const rows = records.slice(1).map((record, index) => {
    const item = rowToObject(headers, record);
    const durationMinutes = Number(item.durationMinutes);
    const type = REPORT_TYPES.includes(item.type) ? item.type : null;
    if (!type || !Number.isFinite(durationMinutes)) {
      skippedRows.push(index + 2);
      return null;
    }
    return {
      member: hasTeamColumns ? cleanText(item.member) || TEAM_MEMBER_FALLBACK : TEAM_MEMBER_FALLBACK,
      reportDate: cleanText(item.reportDate),
      range: cleanText(item.range),
      timezone: cleanText(item.timezone),
      start: cleanText(item.start),
      end: cleanText(item.end),
      type,
      label: cleanText(item.label),
      category: cleanText(item.category),
      categoryId: cleanText(item.categoryId),
      taskId: cleanText(item.taskId),
      sourceTaskId: cleanText(item.sourceTaskId),
      taskTemplateId: cleanText(item.taskTemplateId),
      taxonomyVersion: cleanText(item.taxonomyVersion),
      who: cleanText(item.who),
      urgency: cleanText(item.urgency),
      memo: cleanText(item.memo),
      durationMinutes,
      source,
    };
  }).filter(Boolean);
  return { rows, skipped: skippedRows.length, source };
}

export function parseReportCsvFiles(files) {
  return files.reduce((result, file) => {
    const parsed = parseReportCsv(file.text, file.name);
    result.rows.push(...parsed.rows);
    result.skipped += parsed.skipped;
    result.files += 1;
    return result;
  }, { rows: [], skipped: 0, files: 0 });
}

export function aggregateTeamReportRows(rows) {
  const totals = emptyTeamTotals();
  const members = new Map();
  const senders = new Map();
  const hourly = Array(12).fill(0);

  for (const row of rows) {
    const durationMs = row.durationMinutes * 60000;
    addDuration(totals, row.type, durationMs);
    if (row.type === 'interrupt') totals.interruptCount += 1;

    const memberKey = cleanText(row.member) || TEAM_MEMBER_FALLBACK;
    if (!members.has(memberKey)) members.set(memberKey, { member: memberKey, ...emptyTeamTotals() });
    const member = members.get(memberKey);
    addDuration(member, row.type, durationMs);
    if (row.type === 'interrupt') member.interruptCount += 1;

    if (row.type === 'interrupt' && row.who) {
      if (!senders.has(row.who)) senders.set(row.who, { who: row.who, time: 0, count: 0 });
      const sender = senders.get(row.who);
      sender.time += durationMs;
      sender.count += 1;
    }

    if (row.type === 'interrupt') {
      const hour = new Date(row.start).getHours();
      if (hour >= 9 && hour <= 20) hourly[hour - 9] += durationMs;
    }
  }

  const memberList = [...members.values()]
    .map((member) => ({
      ...member,
      total: member.task + member.interrupt + member.break + member.unknown,
      focusRate: member.task + member.interrupt + member.break + member.unknown > 0
        ? Math.round((member.task / (member.task + member.interrupt + member.break + member.unknown)) * 100)
        : 0,
    }))
    .sort((a, b) => b.total - a.total || a.member.localeCompare(b.member, 'ja'));

  return {
    totals: {
      ...totals,
      total: totals.task + totals.interrupt + totals.break + totals.unknown,
    },
    members: memberList,
    senders: [...senders.values()].sort((a, b) => b.time - a.time || b.count - a.count).slice(0, 8),
    hourly,
    rowCount: rows.length,
  };
}

function startOfDay(ts) {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function formatDateKey(ts) {
  const date = new Date(ts);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTimezoneName() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  const input = String(text ?? '').replace(/^\uFEFF/, '');
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((item) => item.some((cellValue) => cleanText(cellValue)));
}

function rowToObject(headers, record) {
  return headers.reduce((result, header, index) => {
    result[header] = record[index] ?? '';
    return result;
  }, {});
}

function emptyTeamTotals() {
  return { task: 0, interrupt: 0, break: 0, unknown: 0, interruptCount: 0 };
}

function addDuration(target, type, durationMs) {
  if (type === 'task') target.task += durationMs;
  else if (type === 'interrupt') target.interrupt += durationMs;
  else if (type === 'break') target.break += durationMs;
  else target.unknown += durationMs;
}
