import { normalizeEvent } from './schema';
import { startOfDay } from './utils';

const COMPARE_OMIT_KEYS = new Set(['id', 'start', 'end']);

function getEventEnd(event, now = Date.now()) {
  return event.end ?? now;
}

export function sortEventsByWindow(events, now = Date.now()) {
  return [...events].sort((a, b) => {
    const startDiff = a.start - b.start;
    if (startDiff !== 0) return startDiff;
    const endDiff = getEventEnd(a, now) - getEventEnd(b, now);
    if (endDiff !== 0) return endDiff;
    return String(a.id).localeCompare(String(b.id));
  });
}

export function eventsOverlap(a, b, now = Date.now()) {
  return a.start < getEventEnd(b, now) && b.start < getEventEnd(a, now);
}

export function findOverlappingEvents(events, now = Date.now()) {
  const closed = sortEventsByWindow(events.filter((event) => event.end !== null), now);
  const conflictIds = new Set();

  for (let index = 0; index < closed.length; index += 1) {
    const current = closed[index];
    const currentEnd = getEventEnd(current, now);
    for (let nextIndex = index + 1; nextIndex < closed.length; nextIndex += 1) {
      const next = closed[nextIndex];
      if (next.start >= currentEnd) break;
      if (eventsOverlap(current, next, now)) {
        conflictIds.add(current.id);
        conflictIds.add(next.id);
      }
    }
  }

  return closed.filter((event) => conflictIds.has(event.id));
}

export function buildManualResolutionPreview(events, candidateInput, options = {}) {
  const {
    now = Date.now(),
    replaceEvent = null,
    createGap = false,
  } = options;

  const candidate = normalizeEvent(candidateInput);
  const openEvents = events.filter((event) => event.end === null && event.id !== replaceEvent?.id);
  const baseEvents = events.filter((event) => event.end !== null && event.id !== replaceEvent?.id);
  const conflicts = sortEventsByWindow(baseEvents.filter((event) => eventsOverlap(event, candidate, now)), now);
  const entries = [
    ...baseEvents.map((event, priority) => createEntry(event, priority, 'existing', event)),
    createEntry(
      candidate,
      baseEvents.length,
      replaceEvent ? 'candidate-edit' : 'candidate-add',
      replaceEvent ? normalizeEvent(replaceEvent) : null
    ),
  ];

  const segments = buildResolvedSegments(entries, now);
  let nextEvents = segments.map((segment) => segment.event);
  let changes = buildResolutionChanges(entries, segments, now);

  if (createGap) {
    const gapEvent = buildGapEvent(nextEvents, candidate, now);
    if (gapEvent) {
      nextEvents = mergeEquivalentEvents([...nextEvents, gapEvent], now);
      changes = [
        ...changes,
        {
          sourceEventId: gapEvent.id,
          action: 'insert',
          before: null,
          after: gapEvent,
        },
      ];
    }
  }

  return {
    mode: replaceEvent ? 'edit' : 'add',
    candidate,
    conflicts,
    changes,
    nextEvents: sortEventsByWindow([...nextEvents, ...openEvents], now),
  };
}

export function buildOverlapRepairPreview(events, now = Date.now()) {
  const openEvents = events.filter((event) => event.end === null);
  const closedEvents = events.filter((event) => event.end !== null);
  const conflicts = findOverlappingEvents(closedEvents, now);
  if (conflicts.length === 0) return null;

  const entries = closedEvents.map((event, priority) => createEntry(event, priority, 'existing', event));
  const segments = buildResolvedSegments(entries, now);

  return {
    mode: 'repair',
    candidate: null,
    conflicts,
    changes: buildResolutionChanges(entries, segments, now),
    nextEvents: sortEventsByWindow([...segments.map((segment) => segment.event), ...openEvents], now),
  };
}

function mergeEquivalentEvents(events, now = Date.now()) {
  const segments = events.map((event, priority) => ({
    event: normalizeEvent(event),
    priority,
    sourceIds: [event.id],
  }));
  return sortEventsByWindow(mergeEquivalentSegments(segments, now).map((segment) => segment.event), now);
}

function createEntry(event, priority, kind, beforeEvent) {
  const normalizedEvent = normalizeEvent(event);
  return {
    sourceEventId: normalizedEvent.id,
    event: normalizedEvent,
    beforeEvent: beforeEvent ? normalizeEvent(beforeEvent) : null,
    priority,
    kind,
  };
}

function createDerivedEventId(baseId, counter) {
  return `${baseId}~${counter}`;
}

function buildResolvedSegments(entries, now) {
  let segments = [];
  let derivedIdCounter = 0;

  for (const entry of entries) {
    const candidate = {
      event: { ...entry.event },
      priority: entry.priority,
      sourceIds: [entry.sourceEventId],
    };
    const candidateEnd = getEventEnd(candidate.event, now);
    const nextSegments = [];

    for (const segment of segments) {
      if (!eventsOverlap(segment.event, candidate.event, now)) {
        nextSegments.push(segment);
        continue;
      }

      const segmentEnd = getEventEnd(segment.event, now);
      if (segment.event.start < candidate.event.start) {
        nextSegments.push({
          ...segment,
          sourceIds: [...segment.sourceIds],
          event: { ...segment.event, end: candidate.event.start },
        });
      }

      if (segmentEnd > candidateEnd) {
        nextSegments.push({
          ...segment,
          sourceIds: [...segment.sourceIds],
          event: {
            ...segment.event,
            id: createDerivedEventId(segment.sourceIds[0] ?? segment.event.id, derivedIdCounter),
            start: candidateEnd,
            end: segmentEnd,
          },
        });
        derivedIdCounter += 1;
      }
    }

    nextSegments.push(candidate);
    segments = sortSegments(nextSegments, now);
  }

  return mergeEquivalentSegments(segments, now);
}

function sortSegments(segments, now) {
  return [...segments].sort((a, b) => {
    const startDiff = a.event.start - b.event.start;
    if (startDiff !== 0) return startDiff;
    const endDiff = getEventEnd(a.event, now) - getEventEnd(b.event, now);
    if (endDiff !== 0) return endDiff;
    return a.priority - b.priority;
  });
}

function mergeEquivalentSegments(segments, now) {
  const merged = [];

  for (const segment of sortSegments(segments, now)) {
    const previous = merged[merged.length - 1];
    if (!previous || !canMergeSegments(previous, segment, now)) {
      merged.push({ ...segment, sourceIds: [...segment.sourceIds] });
      continue;
    }

    const previousEnd = getEventEnd(previous.event, now);
    const segmentEnd = getEventEnd(segment.event, now);
    const representative = segment.priority >= previous.priority ? segment : previous;
    merged[merged.length - 1] = {
      ...representative,
      priority: Math.max(previous.priority, segment.priority),
      sourceIds: uniqueIds([...previous.sourceIds, ...segment.sourceIds]),
      event: {
        ...representative.event,
        start: Math.min(previous.event.start, segment.event.start),
        end: Math.max(previousEnd, segmentEnd),
      },
    };
  }

  return merged;
}

function canMergeSegments(a, b, now) {
  return getEventEnd(a.event, now) >= b.event.start && sameEventPayload(a.event, b.event);
}

function sameEventPayload(a, b) {
  if (a.type !== b.type) return false;
  const keys = uniqueIds([...Object.keys(a), ...Object.keys(b)]).filter((key) => !COMPARE_OMIT_KEYS.has(key));
  return keys.every((key) => comparableField(a[key]) === comparableField(b[key]));
}

function comparableField(value) {
  return value == null || value === '' ? null : value;
}

function uniqueIds(values) {
  return [...new Set(values)];
}

function buildResolutionChanges(entries, segments, now) {
  const segmentsBySourceId = new Map();
  for (const segment of segments) {
    for (const sourceId of segment.sourceIds) {
      const current = segmentsBySourceId.get(sourceId) ?? [];
      current.push(segment);
      segmentsBySourceId.set(sourceId, current);
    }
  }

  return entries
    .map((entry) => buildChange(entry, segmentsBySourceId.get(entry.sourceEventId) ?? [], now))
    .filter(Boolean);
}

function buildChange(entry, segments, now) {
  const finals = sortSegments(segments, now);
  const before = entry.beforeEvent;

  if (entry.kind === 'candidate-add') {
    return {
      sourceEventId: entry.sourceEventId,
      action: 'insert',
      before: null,
      after: materializeChangeAfter(finals),
    };
  }

  if (!before) return null;
  if (finals.length === 0) {
    return {
      sourceEventId: entry.sourceEventId,
      action: 'remove',
      before,
      after: null,
    };
  }

  if (finals.length > 1) {
    return {
      sourceEventId: entry.sourceEventId,
      action: 'split',
      before,
      after: finals.map((segment) => segment.event),
    };
  }

  const [finalSegment] = finals;
  const after = finalSegment.event;
  const mergedWithOthers = finalSegment.sourceIds.some((sourceId) => sourceId !== entry.sourceEventId);
  const beforeEnd = getEventEnd(before, now);
  const afterEnd = getEventEnd(after, now);

  if (mergedWithOthers) {
    return {
      sourceEventId: entry.sourceEventId,
      action: 'merge',
      before,
      after,
    };
  }

  if (before.start === after.start && beforeEnd === afterEnd) {
    return null;
  }

  if (before.start !== after.start && beforeEnd !== afterEnd) {
    return {
      sourceEventId: entry.sourceEventId,
      action: 'trim-both',
      before,
      after,
    };
  }

  return {
    sourceEventId: entry.sourceEventId,
    action: before.start !== after.start ? 'trim-start' : 'trim-end',
    before,
    after,
  };
}

function materializeChangeAfter(finals) {
  if (finals.length === 0) return null;
  if (finals.length === 1) return finals[0].event;
  return finals.map((segment) => segment.event);
}

function buildGapEvent(events, candidate, now) {
  const dayStart = startOfDay(candidate.start);
  const previousEnd = Math.max(
    ...events
      .filter((event) => getEventEnd(event, now) <= candidate.start && getEventEnd(event, now) >= dayStart)
      .map((event) => getEventEnd(event, now)),
    -Infinity
  );

  if (!Number.isFinite(previousEnd) || candidate.start <= previousEnd) return null;

  return normalizeEvent({
    id: `${candidate.id}~gap`,
    type: 'unknown',
    label: '空白時間',
    start: previousEnd,
    end: candidate.start,
  });
}
