const MICRO_EVENT_MS = 60000;
const INTERRUPTION_CHAIN_GAP_MS = 60000;

const DURATION_BUCKETS = [
  { label: '0-10s', maxMs: 10000 },
  { label: '10-30s', maxMs: 30000 },
  { label: '30s-1m', maxMs: 60000 },
  { label: '1-5m', maxMs: 300000 },
  { label: '5m+', maxMs: Infinity },
];

function getDurationBucket(durationMs) {
  const safeDuration = Math.max(0, Number(durationMs) || 0);
  return DURATION_BUCKETS.find((bucket) => safeDuration < bucket.maxMs)?.label ?? '5m+';
}

export function buildEventSequenceAnalysis(events) {
  const sortedEvents = [...events].sort(compareAnalysisEvents);
  const metaById = new Map();

  sortedEvents.forEach((event, index) => {
    const previous = sortedEvents[index - 1] ?? null;
    const next = sortedEvents[index + 1] ?? null;
    const durationMs = Math.max(0, Number(event.durationMs) || ((event.clippedEnd ?? event.end) - (event.clippedStart ?? event.start)));
    const gapFromPreviousMs = previous ? Math.max(0, event.clippedStart - previous.clippedEnd) : null;
    const gapToNextMs = next ? Math.max(0, next.clippedStart - event.clippedEnd) : null;
    const returnedToTask = inferReturnedToTask(event, previous, next);
    const isFollowedByInterrupt =
      event.type === 'interrupt' &&
      next?.type === 'interrupt' &&
      gapToNextMs != null &&
      gapToNextMs <= INTERRUPTION_CHAIN_GAP_MS;

    metaById.set(event.id, {
      sequenceIndex: index + 1,
      durationMs,
      durationBucket: getDurationBucket(durationMs),
      isMicroEvent: durationMs < MICRO_EVENT_MS,
      previousEventType: previous?.type ?? '',
      nextEventType: next?.type ?? '',
      gapFromPreviousMs,
      gapToNextMs,
      returnedToTask,
      isFollowedByInterrupt,
    });
  });

  return { events: sortedEvents, metaById };
}

export function buildMicroInterruptionStats(events) {
  const { events: sortedEvents, metaById } = buildEventSequenceAnalysis(events);
  const interruptions = sortedEvents.filter((event) => event.type === 'interrupt');
  const buckets = DURATION_BUCKETS.map((bucket) => ({ label: bucket.label, count: 0, time: 0 }));
  const bucketByLabel = new Map(buckets.map((bucket) => [bucket.label, bucket]));
  const hourlyMicroCounts = Array(24).fill(0);
  let microCount = 0;
  let microTotalMs = 0;
  let totalMs = 0;
  let chainCount = 0;
  let returnedCount = 0;
  const microDurations = [];

  for (const event of interruptions) {
    const meta = metaById.get(event.id);
    const durationMs = meta?.durationMs ?? 0;
    totalMs += durationMs;
    const bucket = bucketByLabel.get(meta?.durationBucket);
    if (bucket) {
      bucket.count += 1;
      bucket.time += durationMs;
    }
    if (meta?.isMicroEvent) {
      microCount += 1;
      microTotalMs += durationMs;
      microDurations.push(durationMs);
      hourlyMicroCounts[new Date(event.clippedStart).getHours()] += 1;
    }
    if (meta?.isFollowedByInterrupt) chainCount += 1;
    if (meta?.returnedToTask) returnedCount += 1;
  }

  const peakHour = hourlyMicroCounts.reduce((best, count, hour) => count > hourlyMicroCounts[best] ? hour : best, 0);
  const medianMs = median(microDurations);

  return {
    interruptCount: interruptions.length,
    totalMs,
    microCount,
    microTotalMs,
    microMedianMs: medianMs,
    microCountShare: interruptions.length ? microCount / interruptions.length : 0,
    microTimeShare: totalMs ? microTotalMs / totalMs : 0,
    peakHour,
    peakHourCount: hourlyMicroCounts[peakHour] ?? 0,
    chainCount,
    chainRate: interruptions.length ? chainCount / interruptions.length : 0,
    returnedCount,
    returnedRate: interruptions.length ? returnedCount / interruptions.length : 0,
    buckets,
  };
}

function compareAnalysisEvents(a, b) {
  return (a.clippedStart - b.clippedStart) ||
    (a.clippedEnd - b.clippedEnd) ||
    String(a.id ?? '').localeCompare(String(b.id ?? ''));
}

function inferReturnedToTask(event, previous, next) {
  if (event.type !== 'interrupt') return null;
  if (previous?.type !== 'task' || next?.type !== 'task') return false;
  if (!previous.taskId || !next.taskId) return false;
  return previous.taskId === next.taskId;
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}
