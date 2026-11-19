import { categoryLabel, interruptCategoryLabel, t, typeLabel } from '../../i18n';
import { createReportSnapshot, selectRangeEvents } from '../../state';

/**
 * The work table: one row per record, cut at midnight, in a fixed column
 * order that is ours rather than any one workplace's. It pastes into Excel as
 * plain values (date, HH:MM, whole minutes), so a sheet built on it can sum
 * and pivot by date, person, type, and category, and several people's rows
 * can be stacked into one sheet.
 */
export const WORK_TABLE_COLUMNS = [
  'date',
  'affiliation',
  'name',
  'start',
  'end',
  'minutes',
  'type',
  'category',
  'content',
  'who',
  'memo',
];

export function buildWorkTable(state, since, until, asOf = Date.now()) {
  const locale = state.preferences.locale;
  const end = Math.min(until, asOf);
  const snapshot = createReportSnapshot(state.events, end);
  const events = end > since ? selectRangeEvents(snapshot, since, end) : [];
  const profile = state.preferences.reportProfile ?? {};
  const taskById = new Map(state.tasks.map((task) => [task.id, task]));
  const taskCategoryById = new Map(state.categories.map((category) => [category.id, category]));
  const interruptCategoryById = new Map(state.interruptCats.map((category) => [category.id, category]));

  const categoryName = (event) => {
    if (event.type === 'interrupt') return interruptCategoryLabel(locale, interruptCategoryById.get(event.categoryId)) || '';
    if (event.type === 'task') return categoryLabel(locale, taskCategoryById.get(event.categoryId)) || '';
    return '';
  };

  const rows = [];
  for (const event of [...events].sort((a, b) => a.clippedStart - b.clippedStart || a.clippedEnd - b.clippedEnd)) {
    const task = event.taskId ? taskById.get(event.taskId) : null;
    const content = event.type === 'task'
      ? task?.name || event.workDetail || event.label || ''
      : event.label || '';
    const notes = [];
    if (event.type === 'task' && event.workDetail && event.workDetail !== content) notes.push(event.workDetail);
    if (event.memo) notes.push(event.memo);

    for (const [pieceStart, pieceEnd] of splitAtMidnight(event.clippedStart, event.clippedEnd)) {
      rows.push([
        formatDate(pieceStart),
        profile.affiliation ?? '',
        profile.name ?? '',
        formatTime(pieceStart),
        formatEndTime(pieceStart, pieceEnd),
        Math.round((pieceEnd - pieceStart) / 60000),
        typeLabel(locale, event.type),
        categoryName(event),
        content,
        event.type === 'interrupt' ? event.who || '' : '',
        notes.join(' / '),
      ]);
    }
  }

  return {
    header: WORK_TABLE_COLUMNS.map((column) => t(locale, `report.workTable.columns.${column}`)),
    rows,
  };
}

/** Tab-separated with a header row: what Excel and Google Sheets paste as cells. */
export function formatWorkTableTsv(table) {
  return [table.header, ...table.rows]
    .map((row) => row.map(tsvCell).join('\t'))
    .join('\n');
}

function tsvCell(value) {
  return String(value ?? '').replace(/[\t\r\n]+/g, ' ').trim();
}

function splitAtMidnight(start, end) {
  const pieces = [];
  let cursor = start;
  while (cursor < end) {
    const next = Math.min(nextMidnight(cursor), end);
    pieces.push([cursor, next]);
    cursor = next;
  }
  return pieces;
}

function nextMidnight(timestamp) {
  const date = new Date(timestamp);
  date.setHours(24, 0, 0, 0);
  return date.getTime();
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// A piece that runs to midnight ends at 24:00 of its own day, not 00:00.
function formatEndTime(pieceStart, pieceEnd) {
  return pieceEnd === nextMidnight(pieceStart) ? '24:00' : formatTime(pieceEnd);
}

function pad(value) {
  return String(value).padStart(2, '0');
}
