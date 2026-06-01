const DAY_MS = 86400000;
const HOUR_MS = 3600000;
const MINUTE_MS = 60000;
const LONG_EVENT_MS = 4 * HOUR_MS;
const SECOND_EVENT_MS = 60000;

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function pad(n) {
  return String(n).padStart(2, '0');
}

export function startOfHistoryDay(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function getHistoryDayBounds(ts = Date.now()) {
  const dayStart = startOfHistoryDay(ts);
  return { dayStart, dayEnd: dayStart + DAY_MS };
}

export function shiftHistoryDay(ts, delta) {
  const d = new Date(startOfHistoryDay(ts));
  d.setDate(d.getDate() + delta);
  return d.getTime();
}

export function isSameHistoryDay(a, b) {
  return startOfHistoryDay(a) === startOfHistoryDay(b);
}

export function formatHistoryDateParts(ts, now = Date.now()) {
  const d = new Date(ts);
  const relative = isSameHistoryDay(ts, now)
    ? '今日'
    : isSameHistoryDay(ts, shiftHistoryDay(now, -1))
      ? '昨日'
      : isSameHistoryDay(ts, shiftHistoryDay(now, 1))
        ? '明日'
        : null;
  return {
    day: String(d.getDate()),
    month: `${d.getMonth() + 1}月`,
    year: String(d.getFullYear()),
    weekday: WEEKDAYS[d.getDay()],
    relative,
  };
}

export function toHistoryDateInputValue(ts) {
  const d = new Date(startOfHistoryDay(ts));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromHistoryDateInputValue(value) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
}

export function isSuspiciousHistoryEvent(event, running, now = Date.now()) {
  const end = event.end ?? now;
  if (!Number.isFinite(event.start) || !Number.isFinite(end) || end <= event.start) return true;
  if (event.end !== null) return false;
  return !(
    event.type === 'task' &&
    running?.type === 'task' &&
    running.taskId === event.taskId &&
    running.start === event.start
  );
}

export function projectEventIntoHistoryDay(event, selectedDate, now = Date.now()) {
  const { dayStart, dayEnd } = getHistoryDayBounds(selectedDate);
  const actualEnd = event.end ?? now;
  const invalid = !Number.isFinite(event.start) || !Number.isFinite(actualEnd) || actualEnd <= event.start;

  if (invalid) {
    if (!Number.isFinite(event.start) || event.start < dayStart || event.start >= dayEnd) return null;
    const point = Math.min(Math.max(event.start, dayStart), dayEnd - 1);
    return {
      ...event,
      actualEnd,
      clippedStart: point,
      clippedEnd: point,
      clippedDurationMs: 0,
      running: event.end == null,
      startsBeforeDay: false,
      endsAfterDay: false,
      invalid: true,
      longEvent: Number.isFinite(actualEnd - event.start) && (actualEnd - event.start) >= LONG_EVENT_MS,
    };
  }

  if (actualEnd <= dayStart || event.start >= dayEnd) return null;

  const clippedStart = Math.max(event.start, dayStart);
  const clippedEnd = Math.min(actualEnd, dayEnd);
  return {
    ...event,
    actualEnd,
    clippedStart,
    clippedEnd,
    clippedDurationMs: Math.max(0, clippedEnd - clippedStart),
    running: event.end == null,
    startsBeforeDay: event.start < dayStart,
    endsAfterDay: actualEnd > dayEnd,
    invalid: false,
    longEvent: (actualEnd - event.start) >= LONG_EVENT_MS,
  };
}

export function getHistoryDayItems(events, selectedDate, now = Date.now()) {
  return events
    .map((event) => projectEventIntoHistoryDay(event, selectedDate, now))
    .filter(Boolean)
    .sort((a, b) =>
      (b.clippedStart - a.clippedStart) ||
      (b.clippedEnd - a.clippedEnd) ||
      (b.start - a.start)
    );
}

export function summarizeHistoryDay(items) {
  return {
    count: items.length,
    totalMs: items.reduce((sum, item) => sum + item.clippedDurationMs, 0),
  };
}

export function shouldShowHistorySeconds(event) {
  return (event.clippedDurationMs ?? 0) < SECOND_EVENT_MS;
}

export function formatHistoryTimeRange(event, options = {}) {
  const showSeconds = options.showSeconds ?? event.showSeconds ?? shouldShowHistorySeconds(event);
  const startLabel = event.startsBeforeDay ? '00:00' : formatHistoryClock(event.clippedStart, showSeconds);
  const endLabel = event.endsAfterDay ? '24:00' : formatHistoryClock(event.clippedEnd, showSeconds);
  return `${startLabel} – ${endLabel}`;
}

export function assignHistoryLanes(items) {
  const sorted = [...items].sort((a, b) =>
    (a.clippedStart - b.clippedStart) ||
    (a.clippedEnd - b.clippedEnd) ||
    a.id.localeCompare(b.id)
  );

  const assignments = new Map();
  const clusterSizes = new Map();
  let active = [];
  let freeLanes = [];
  let currentClusterId = -1;
  let clusterEnd = -Infinity;
  let clusterSize = 0;

  for (const item of sorted) {
    if (item.clippedStart >= clusterEnd) {
      active = [];
      freeLanes = [];
      currentClusterId += 1;
      clusterEnd = item.clippedEnd;
      clusterSize = 0;
    } else {
      const stillActive = [];
      for (const current of active) {
        if (current.end <= item.clippedStart) freeLanes.push(current.lane);
        else stillActive.push(current);
      }
      active = stillActive;
    }

    freeLanes.sort((a, b) => a - b);
    const lane = freeLanes.length ? freeLanes.shift() : active.length;
    active.push({ end: item.clippedEnd, lane });
    clusterEnd = Math.max(clusterEnd, item.clippedEnd);
    clusterSize = Math.max(clusterSize, active.length);
    clusterSizes.set(currentClusterId, clusterSize);
    assignments.set(item.id, { lane, clusterId: currentClusterId });
  }

  return items.map((item) => {
    const meta = assignments.get(item.id) ?? { lane: 0, clusterId: 0 };
    return {
      ...item,
      lane: meta.lane,
      clusterId: meta.clusterId,
      laneCount: clusterSizes.get(meta.clusterId) ?? 1,
    };
  });
}

export function buildHistoryAnchors(items, selectedDate, now = Date.now()) {
  const { dayStart, dayEnd } = getHistoryDayBounds(selectedDate);
  const timeSet = new Set([dayStart, dayEnd]);

  for (let hour = 1; hour < 24; hour += 1) {
    timeSet.add(dayStart + (hour * HOUR_MS));
  }
  for (const item of items) {
    timeSet.add(item.clippedStart);
    timeSet.add(item.clippedEnd);
  }
  const inDayNow = now > dayStart && now < dayEnd ? now : null;
  if (inDayNow != null) timeSet.add(inDayNow);

  const times = [...timeSet].sort((a, b) => a - b);
  const indexByTime = new Map(times.map((ts, index) => [ts, index]));
  const hourMarkers = Array.from({ length: 24 }, (_, hour) => {
    const ts = dayStart + (hour * HOUR_MS);
    return { hour, ts, index: indexByTime.get(ts) };
  });

  return { dayStart, dayEnd, times, indexByTime, hourMarkers, nowTs: inDayNow };
}

export function solveHistoryAxis(anchors, items, options = {}) {
  const basePxPerHour = options.basePxPerHour ?? 52;
  const outgoing = Array.from({ length: anchors.times.length }, () => []);

  const addEdge = (from, to, minDelta) => {
    if (from == null || to == null || to <= from || minDelta <= 0) return;
    outgoing[from].push({ to, minDelta });
  };

  for (let index = 0; index < anchors.times.length - 1; index += 1) {
    const dt = anchors.times[index + 1] - anchors.times[index];
    addEdge(index, index + 1, (dt / HOUR_MS) * basePxPerHour);
  }

  for (const item of items) {
    addEdge(
      anchors.indexByTime.get(item.clippedStart),
      anchors.indexByTime.get(item.clippedEnd),
      getHistoryMinimumSpan(item, options)
    );
  }

  const byLane = new Map();
  for (const item of items) {
    if (!byLane.has(item.lane)) byLane.set(item.lane, []);
    byLane.get(item.lane).push(item);
  }

  for (const laneItems of byLane.values()) {
    laneItems.sort((a, b) =>
      (a.clippedStart - b.clippedStart) ||
      (a.clippedEnd - b.clippedEnd) ||
      a.id.localeCompare(b.id)
    );
    for (let index = 1; index < laneItems.length; index += 1) {
      const previous = laneItems[index - 1];
      const current = laneItems[index];
      if (current.clippedStart < previous.clippedEnd) continue;
      const gap = getHistoryLaneGap(previous, current, options);
      addEdge(
        anchors.indexByTime.get(previous.clippedEnd),
        anchors.indexByTime.get(current.clippedStart),
        gap
      );
    }
  }

  const y = Array(anchors.times.length).fill(-Infinity);
  y[0] = 0;
  for (let index = 0; index < anchors.times.length; index += 1) {
    if (!Number.isFinite(y[index])) y[index] = index === 0 ? 0 : y[index - 1];
    for (const edge of outgoing[index]) {
      y[edge.to] = Math.max(y[edge.to], y[index] + edge.minDelta);
    }
    if (index + 1 < anchors.times.length) y[index + 1] = Math.max(y[index + 1], y[index]);
  }

  return {
    anchors: anchors.times.map((ts, index) => ({ ts, y: y[index] })),
    hourMarkers: anchors.hourMarkers.map((marker) => ({ ...marker, y: y[marker.index] })),
    totalHeight: y[y.length - 1],
    dayStart: anchors.dayStart,
    dayEnd: anchors.dayEnd,
    nowTs: anchors.nowTs,
  };
}

export function getHistoryTimePosition(axis, ts) {
  if (ts <= axis.anchors[0].ts) return 0;
  if (ts >= axis.anchors[axis.anchors.length - 1].ts) return axis.totalHeight;

  let left = 0;
  let right = axis.anchors.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const current = axis.anchors[mid];
    if (current.ts === ts) return current.y;
    if (current.ts < ts) left = mid + 1;
    else right = mid - 1;
  }

  const previous = axis.anchors[Math.max(0, right)];
  const next = axis.anchors[Math.min(axis.anchors.length - 1, left)];
  if (!next || next.ts === previous.ts) return previous.y;

  const ratio = (ts - previous.ts) / (next.ts - previous.ts);
  return previous.y + ((next.y - previous.y) * ratio);
}

export function buildHistoryTimelineModel(items, selectedDate, now = Date.now(), options = {}) {
  const laneItems = assignHistoryLanes(items);
  const anchors = buildHistoryAnchors(laneItems, selectedDate, now);
  const axis = solveHistoryAxis(anchors, laneItems, options);

  const modeledItems = laneItems
    .map((item) => {
      const startY = getHistoryTimePosition(axis, item.clippedStart);
      const endY = getHistoryTimePosition(axis, item.clippedEnd);
      const minSpan = getHistoryMinimumSpan(item, options);
      const heightPx = Math.max(endY - startY, minSpan);
      return {
        ...item,
        startY,
        endY: startY + heightPx,
        topPx: startY,
        heightPx,
        variant: chooseHistoryVariant(item, heightPx),
        showSeconds: shouldShowHistorySeconds(item),
      };
    })
    .sort((a, b) =>
      (a.startY - b.startY) ||
      (a.lane - b.lane) ||
      a.id.localeCompare(b.id)
    );

  return {
    axis,
    items: modeledItems,
    nowY: axis.nowTs != null ? getHistoryTimePosition(axis, axis.nowTs) : null,
  };
}

export {
  DAY_MS,
  HOUR_MS,
  LONG_EVENT_MS,
};

function formatHistoryClock(ts, showSeconds) {
  const d = new Date(ts);
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  if (!showSeconds) return `${hh}:${mm}`;
  return `${hh}:${mm}:${pad(d.getSeconds())}`;
}

function getHistoryMinimumSpan(event, options) {
  const duration = event.clippedDurationMs ?? 0;
  if (duration < SECOND_EVENT_MS) return options.microMinHeight ?? 24;
  if (duration < 5 * MINUTE_MS) return options.shortMinHeight ?? 28;
  if (duration < 15 * MINUTE_MS) return options.compactMinHeight ?? 34;
  if (duration < 30 * MINUTE_MS) return options.mediumMinHeight ?? 42;
  return 0;
}

function getHistoryLaneGap(previous, current, options) {
  const baseGap = options.gapPx ?? 6;
  const microGap = options.microGapPx ?? 4;
  return shouldShowHistorySeconds(previous) || shouldShowHistorySeconds(current) ? microGap : baseGap;
}

function chooseHistoryVariant(event, heightPx) {
  if (shouldShowHistorySeconds(event) || heightPx < 28) return 'micro';
  if (heightPx < 60 || event.laneCount > 1) return 'compact';
  return 'full';
}
