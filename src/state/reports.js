import { cleanText, csvCell } from './utils';
import { calculateRangeStats, createReportSnapshot } from './reportFacts';

const TEAM_MEMBER_FALLBACK = '未設定';
const REPORT_TYPES = ['task', 'interrupt', 'break', 'unknown'];

export function getRangeBounds(range, now = Date.now()) {
  const today = startOfDay(now);
  if (range === 'day') return { since: today, until: now, prevSince: shiftCalendarDays(today, -1), prevUntil: today };
  if (range === 'week') return calendarRange(now, 7);
  if (range === 'month') return calendarRange(now, 30);
  return calendarRange(now, 365);
}

export function calcStats(events, since, until, now = Date.now()) {
  return calculateRangeStats(createReportSnapshot(events, now), since, until);
}

export function buildReportCsv(state, range, now = Date.now(), snapshot = null) {
  const bounds = getRangeBounds(range, now);
  const stats = calculateRangeStats(snapshot ?? createReportSnapshot(state, now), bounds.since, bounds.until);
  const member = cleanText(state.preferences?.memberName);
  const reportDate = formatDateKey(bounds.since);
  const timezone = getTimezoneName();
  const taxonomyVersion = state.teamWorkspace?.taxonomyVersion ?? '';
  const taskById = new Map(state.tasks.map((task) => [task.id, task]));
  const categoryName = (id) =>
    state.categories.find((category) => category.id === id)?.name ?? id ?? '';
  const rows = [
    ['member', 'reportDate', 'range', 'timezone', 'start', 'end', 'type', 'label', 'category', 'categoryId', 'taskId', 'sourceTaskId', 'interruptOriginId', 'taskTemplateId', 'taxonomyVersion', 'who', 'urgency', 'memo', 'durationMinutes'],
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
          event.interruptOriginId ?? task?.interruptOriginId ?? '',
          event.taskTemplateId ?? task?.taskTemplateId ?? '',
          taxonomyVersion,
          event.who ?? '',
          event.urgency ?? '',
          event.memo ?? task?.memo ?? '',
          (event.durationMs / 60000).toFixed(1),
        ];
      }),
  ];
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

function parseReportCsv(text, source = '') {
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
      interruptOriginId: cleanText(item.interruptOriginId),
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

export function buildWeeklyReview(state, now = Date.now(), snapshot = null) {
  const { since, until } = getRangeBounds('week', now);
  const stats = calculateRangeStats(snapshot ?? createReportSnapshot(state, now), since, until);
  const hourly = Array(24).fill(0);
  const senders = new Map();
  const categories = new Map();

  for (const event of stats.events) {
    if (event.type !== 'interrupt') continue;
    const hour = new Date(event.clippedStart).getHours();
    hourly[hour] += event.durationMs;
    const who = cleanText(event.who);
    if (who) {
      if (!senders.has(who)) senders.set(who, { label: who, time: 0, count: 0 });
      senders.get(who).time += event.durationMs;
      senders.get(who).count += 1;
    }
    const category = cleanText(event.categoryId || event.category);
    if (category) categories.set(category, (categories.get(category) ?? 0) + event.durationMs);
  }

  const peakHour = hourly.reduce((best, value, index) => value > hourly[best] ? index : best, 0);
  const quietHour = hourly.reduce((best, value, index) => value < hourly[best] ? index : best, 0);
  const topSender = [...senders.values()].sort((a, b) => b.time - a.time || b.count - a.count)[0] ?? null;
  const topCategoryId = [...categories.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const categoryName = topCategoryId
    ? state.categories.find((category) => category.id === topCategoryId)?.name ?? topCategoryId
    : '';
  const focusRate = stats.focus + stats.interrupt + stats.break > 0
    ? Math.round((stats.focus / (stats.focus + stats.interrupt + stats.break)) * 100)
    : 0;
  const suggestion = stats.interrupt > 0
    ? topSender
      ? `${topSender.label}からの相談をまとめる時間を作る候補です`
      : `${peakHour}時台の割り込み作業をまとめる候補です`
    : '割り込み作業の記録が増えると、来週の改善候補を出せます';

  return {
    since,
    until,
    focus: stats.focus,
    interrupt: stats.interrupt,
    break: stats.break,
    focusRate,
    peakHour,
    quietHour,
    topSender,
    categoryName,
    suggestion,
  };
}

function startOfDay(ts) {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function calendarRange(now, days) {
  const since = shiftCalendarDays(now, -days);
  const prevSince = shiftCalendarDays(now, -(days * 2));
  return { since, until: now, prevSince, prevUntil: since };
}

function shiftCalendarDays(timestamp, amount) {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + amount);
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
