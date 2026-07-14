import { getHistoryDayBounds, isSameHistoryDay } from './historyDate';
import { shouldShowHistorySeconds } from './historyEvents';

const HOUR_MS = 3600000;
const MINUTE_MS = 60000;
const SECOND_EVENT_MS = 60000;

function assignHistoryLanes(items) {
  const sorted = [...items].sort((left, right) =>
    (left.clippedStart - right.clippedStart)
    || (left.clippedEnd - right.clippedEnd)
    || left.id.localeCompare(right.id)
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

    freeLanes.sort((left, right) => left - right);
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

function buildHistoryAnchors(items, selectedDate, now = Date.now()) {
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

  const times = [...timeSet].sort((left, right) => left - right);
  const indexByTime = new Map(times.map((timestamp, index) => [timestamp, index]));
  const hourMarkers = Array.from({ length: 24 }, (_, hour) => {
    const timestamp = dayStart + (hour * HOUR_MS);
    return { hour, ts: timestamp, index: indexByTime.get(timestamp) };
  });

  return { dayStart, dayEnd, times, indexByTime, hourMarkers, nowTs: inDayNow };
}

function solveHistoryAxis(anchors, items, options = {}) {
  const basePxPerHour = options.basePxPerHour ?? 52;
  const outgoing = Array.from({ length: anchors.times.length }, () => []);

  const addEdge = (from, to, minDelta) => {
    if (from == null || to == null || to <= from || minDelta <= 0) return;
    outgoing[from].push({ to, minDelta });
  };

  for (let index = 0; index < anchors.times.length - 1; index += 1) {
    const duration = anchors.times[index + 1] - anchors.times[index];
    addEdge(index, index + 1, (duration / HOUR_MS) * basePxPerHour);
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
    laneItems.sort((left, right) =>
      (left.clippedStart - right.clippedStart)
      || (left.clippedEnd - right.clippedEnd)
      || left.id.localeCompare(right.id)
    );
    for (let index = 1; index < laneItems.length; index += 1) {
      const previous = laneItems[index - 1];
      const current = laneItems[index];
      if (current.clippedStart < previous.clippedEnd) continue;
      addEdge(
        anchors.indexByTime.get(previous.clippedEnd),
        anchors.indexByTime.get(current.clippedStart),
        getHistoryLaneGap(previous, current, options)
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
    anchors: anchors.times.map((timestamp, index) => ({ ts: timestamp, y: y[index] })),
    hourMarkers: anchors.hourMarkers.map((marker) => ({ ...marker, y: y[marker.index] })),
    totalHeight: y[y.length - 1],
    dayStart: anchors.dayStart,
    dayEnd: anchors.dayEnd,
    nowTs: anchors.nowTs,
  };
}

export function getHistoryTimePosition(axis, timestamp) {
  if (timestamp <= axis.anchors[0].ts) return 0;
  if (timestamp >= axis.anchors[axis.anchors.length - 1].ts) return axis.totalHeight;

  let left = 0;
  let right = axis.anchors.length - 1;
  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const current = axis.anchors[middle];
    if (current.ts === timestamp) return current.y;
    if (current.ts < timestamp) left = middle + 1;
    else right = middle - 1;
  }

  const previous = axis.anchors[Math.max(0, right)];
  const next = axis.anchors[Math.min(axis.anchors.length - 1, left)];
  if (!next || next.ts === previous.ts) return previous.y;

  const ratio = (timestamp - previous.ts) / (next.ts - previous.ts);
  return previous.y + ((next.y - previous.y) * ratio);
}

export function buildHistoryTimelineModel(items, selectedDate, now = Date.now(), options = {}) {
  const laneItems = assignHistoryLanes(items);
  const anchors = buildHistoryAnchors(laneItems, selectedDate, now);
  const axis = solveHistoryAxis(anchors, laneItems, options);
  const gaps = buildHistoryGaps(laneItems, axis, selectedDate, now, options);

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
    .sort((left, right) =>
      (left.startY - right.startY)
      || (left.lane - right.lane)
      || left.id.localeCompare(right.id)
    );

  return {
    axis,
    gaps,
    items: modeledItems,
    nowY: axis.nowTs != null ? getHistoryTimePosition(axis, axis.nowTs) : null,
  };
}

function buildHistoryGaps(items, axis, selectedDate, now, options) {
  const { dayStart, dayEnd } = getHistoryDayBounds(selectedDate);
  const until = isSameHistoryDay(selectedDate, now) ? Math.min(now, dayEnd) : dayEnd;
  const minGapMs = options.minGapMs ?? 5 * MINUTE_MS;
  const minGapHeight = options.minGapHeight ?? 24;
  if (until <= dayStart) return [];

  const intervals = items
    .map((item) => ({
      start: Math.max(dayStart, item.clippedStart),
      end: Math.min(until, item.clippedEnd),
    }))
    .filter((item) => item.end > item.start)
    .sort((left, right) => left.start - right.start || left.end - right.end);

  const merged = [];
  for (const interval of intervals) {
    const last = merged[merged.length - 1];
    if (!last || interval.start > last.end) merged.push({ ...interval });
    else last.end = Math.max(last.end, interval.end);
  }

  const gaps = [];
  let cursor = dayStart;
  for (const interval of merged) {
    if (interval.start - cursor >= minGapMs) gaps.push(createHistoryGap(cursor, interval.start, axis, minGapHeight));
    cursor = Math.max(cursor, interval.end);
  }
  if (until - cursor >= minGapMs) gaps.push(createHistoryGap(cursor, until, axis, minGapHeight));
  return gaps;
}

function createHistoryGap(start, end, axis, minHeight) {
  const startY = getHistoryTimePosition(axis, start);
  const endY = getHistoryTimePosition(axis, end);
  const heightPx = Math.max(endY - startY, minHeight);
  return {
    id: `gap-${start}-${end}`,
    start,
    end,
    startY,
    endY,
    topPx: startY,
    heightPx,
  };
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
