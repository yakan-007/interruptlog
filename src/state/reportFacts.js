/**
 * A read-only, time-resolved view of the event log used by every personal
 * report. Keeping clipping here makes reports, CSV, and derived cards agree
 * after a history edit.
 */
export function createReportSnapshot(stateOrEvents, now = Date.now()) {
  const sourceEvents = Array.isArray(stateOrEvents)
    ? stateOrEvents
    : stateOrEvents?.events ?? [];
  const resolvedNow = Number.isFinite(now) ? now : Date.now();
  const events = sourceEvents
    .map((event, index) => {
      const start = Number(event?.start);
      const resolvedEnd = event?.end == null ? resolvedNow : Number(event.end);
      if (!Number.isFinite(start) || !Number.isFinite(resolvedEnd) || resolvedEnd <= start) return null;
      return { ...event, start, resolvedEnd, _reportOrder: index };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start || a.resolvedEnd - b.resolvedEnd || a._reportOrder - b._reportOrder);

  const starts = [];
  const maxEnds = [];
  let maxEnd = Number.NEGATIVE_INFINITY;
  for (const event of events) {
    starts.push(event.start);
    maxEnd = Math.max(maxEnd, event.resolvedEnd);
    maxEnds.push(maxEnd);
  }

  return { events, starts, maxEnds, now: resolvedNow };
}

export function selectRangeEvents(snapshot, since, until) {
  if (!snapshot || !Number.isFinite(until) || until <= since) return [];
  const startIndex = firstPrefixEndAfter(snapshot.maxEnds, since);
  const endIndex = lowerBound(snapshot.starts, until);
  const selected = [];

  for (let index = startIndex; index < endIndex; index += 1) {
    const event = snapshot.events[index];
    if (event.resolvedEnd <= since) continue;
    const clippedStart = Math.max(event.start, since);
    const clippedEnd = Math.min(event.resolvedEnd, until);
    if (clippedEnd <= clippedStart) continue;
    const { _reportOrder, resolvedEnd: _resolvedEnd, ...fact } = event;
    selected.push({ ...fact, clippedStart, clippedEnd, durationMs: clippedEnd - clippedStart });
  }
  return selected;
}

export function calculateRangeStats(snapshot, since, until) {
  const events = selectRangeEvents(snapshot, since, until);
  const stats = { focus: 0, interrupt: 0, break: 0, unknown: 0, events };
  for (const event of events) {
    if (event.type === 'task') stats.focus += event.durationMs;
    else if (event.type === 'interrupt') stats.interrupt += event.durationMs;
    else if (event.type === 'break') stats.break += event.durationMs;
    else stats.unknown += event.durationMs;
  }
  return stats;
}

function lowerBound(values, target) {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (values[middle] < target) low = middle + 1;
    else high = middle;
  }
  return low;
}

function firstPrefixEndAfter(maxEnds, timestamp) {
  let low = 0;
  let high = maxEnds.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (maxEnds[middle] > timestamp) high = middle;
    else low = middle + 1;
  }
  return low;
}
