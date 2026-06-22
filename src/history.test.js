import { describe, expect, it } from 'vitest';
import {
  buildHistoryTimelineModel,
  createDefaultMissedDraft,
  formatHistoryDateParts,
  formatHistoryTimeRange,
  fromHistoryDateInputValue,
  getHistoryDayItems,
  getHistoryTimePosition,
  isSuspiciousHistoryEvent,
  shiftHistoryDay,
  startOfHistoryDay,
  toHistoryDateInputValue,
} from './lib/history';

const at = (day, hour, minute = 0, second = 0) =>
  new Date(2026, 3, day, hour, minute, second).getTime();

describe('history helpers', () => {
  it('defaults a missed event on today to the preceding 30 minutes, never future time', () => {
    const now = at(24, 14, 35, 42);
    const draft = createDefaultMissedDraft(startOfHistoryDay(now), now);

    expect(draft).toMatchObject({ startH: '14', startM: '05', endH: '14', endM: '35' });
  });

  it('includes a previous-day event in the selected day and clamps it to midnight', () => {
    const selectedDate = at(24, 12);
    const items = getHistoryDayItems([
      { id: 'overnight', type: 'task', label: '深夜作業', start: at(23, 22), end: at(24, 6) },
    ], selectedDate, at(24, 12));

    expect(items).toHaveLength(1);
    expect(items[0].startsBeforeDay).toBe(true);
    expect(items[0].clippedStart).toBe(startOfHistoryDay(selectedDate));
    expect(items[0].clippedEnd).toBe(at(24, 6));
    expect(items[0].clippedDurationMs).toBe(6 * 3600000);
  });

  it('includes a next-day event in the selected day and clamps it to 24:00', () => {
    const selectedDate = at(24, 10);
    const nextDayStart = shiftHistoryDay(selectedDate, 1);
    const items = getHistoryDayItems([
      { id: 'late', type: 'task', label: '夜更かし', start: at(24, 20), end: at(25, 2) },
    ], selectedDate, at(24, 23));

    expect(items).toHaveLength(1);
    expect(items[0].endsAfterDay).toBe(true);
    expect(items[0].clippedStart).toBe(at(24, 20));
    expect(items[0].clippedEnd).toBe(nextDayStart);
    expect(items[0].clippedDurationMs).toBe(4 * 3600000);
  });

  it('round-trips selected dates through the date input value helpers', () => {
    const selectedDate = at(24, 0);
    const value = toHistoryDateInputValue(selectedDate);

    expect(value).toBe('2026-04-24');
    expect(fromHistoryDateInputValue(value)).toBe(selectedDate);
  });

  it('keeps the same event set between list projection and the timeline model', () => {
    const selectedDate = at(24, 9);
    const items = getHistoryDayItems([
      { id: 'a', type: 'task', label: '朝会', start: at(24, 9), end: at(24, 10) },
      { id: 'b', type: 'interrupt', label: '電話', start: at(24, 9, 30), end: at(24, 9, 45) },
      { id: 'c', type: 'task', label: '実装', start: at(24, 13), end: at(24, 15) },
    ], selectedDate, at(24, 18));
    const timeline = buildHistoryTimelineModel(items, selectedDate, at(24, 18));

    expect(timeline.items.map((item) => item.id).sort()).toEqual(items.map((item) => item.id).sort());
    expect(timeline.items.find((item) => item.id === 'a')?.laneCount).toBe(2);
  });

  it('builds touchable gaps only for empty recorded time', () => {
    const selectedDate = at(24, 0);
    const items = getHistoryDayItems([
      { id: 'a', type: 'task', label: '朝会', start: at(24, 9), end: at(24, 10) },
      { id: 'b', type: 'interrupt', label: '電話', start: at(24, 9, 30), end: at(24, 10, 30) },
      { id: 'c', type: 'task', label: '実装', start: at(24, 11), end: at(24, 12) },
    ], selectedDate, at(25, 9));
    const timeline = buildHistoryTimelineModel(items, selectedDate, at(25, 9));

    expect(timeline.gaps.map((gap) => [gap.start, gap.end])).toEqual([
      [at(24, 0), at(24, 9)],
      [at(24, 10, 30), at(24, 11)],
      [at(24, 12), at(25, 0)],
    ]);
    expect(timeline.gaps.every((gap) => gap.heightPx >= 24)).toBe(true);
  });

  it('does not create a history gap in future time today', () => {
    const selectedDate = at(24, 0);
    const items = getHistoryDayItems([
      { id: 'a', type: 'task', label: '朝会', start: at(24, 9), end: at(24, 10) },
    ], selectedDate, at(24, 12));
    const timeline = buildHistoryTimelineModel(items, selectedDate, at(24, 12));

    expect(timeline.gaps.map((gap) => [gap.start, gap.end])).toEqual([
      [at(24, 0), at(24, 9)],
      [at(24, 10), at(24, 12)],
    ]);
  });

  it('keeps time positions strictly monotonic across an hour boundary', () => {
    const selectedDate = at(24, 0);
    const items = getHistoryDayItems([
      { id: 'switch', type: 'task', label: '切り替え', start: at(24, 6, 59, 58), end: at(24, 7, 0, 3) },
    ], selectedDate, at(24, 8));
    const timeline = buildHistoryTimelineModel(items, selectedDate, at(24, 8));

    const before = getHistoryTimePosition(timeline.axis, at(24, 6, 59, 58));
    const boundary = getHistoryTimePosition(timeline.axis, at(24, 7, 0, 0));
    const after = getHistoryTimePosition(timeline.axis, at(24, 7, 0, 3));

    expect(before).toBeLessThan(boundary);
    expect(boundary).toBeLessThan(after);
  });

  it('places the 7:00 marker below dense pre-7 events', () => {
    const selectedDate = at(24, 0);
    const items = getHistoryDayItems([
      { id: 'a', type: 'interrupt', label: '漫画を読む', start: at(24, 6, 15), end: at(24, 6, 20) },
      { id: 'b', type: 'task', label: 'プログラミング', start: at(24, 6, 20), end: at(24, 6, 26) },
      { id: 'c', type: 'task', label: '日記を書く', start: at(24, 6, 26), end: at(24, 6, 42) },
      { id: 'd', type: 'interrupt', label: '割り込み', start: at(24, 6, 42), end: at(24, 6, 44) },
      { id: 'e', type: 'task', label: '日記を書く', start: at(24, 6, 44), end: at(24, 6, 45) },
      { id: 'f', type: 'break', label: 'ショート', start: at(24, 6, 45), end: at(24, 6, 50) },
      { id: 'g', type: 'task', label: '日記を書く', start: at(24, 6, 50), end: at(24, 6, 50, 30) },
      { id: 'h', type: 'interrupt', label: '武田から', start: at(24, 6, 50, 30), end: at(24, 6, 51) },
      { id: 'i', type: 'task', label: '日記を書く', start: at(24, 6, 51), end: at(24, 6, 55) },
    ], selectedDate, at(24, 9));
    const timeline = buildHistoryTimelineModel(items, selectedDate, at(24, 9));
    const seven = timeline.axis.hourMarkers.find((marker) => marker.hour === 7)?.y ?? 0;
    const preSevenBottom = Math.max(
      ...timeline.items
        .filter((item) => item.clippedEnd <= at(24, 7))
        .map((item) => item.endY)
    );

    expect(seven).toBeGreaterThanOrEqual(preSevenBottom);
  });

  it('lets a sub-minute event cross 7:00 and keeps the next event below it', () => {
    const selectedDate = at(24, 0);
    const items = getHistoryDayItems([
      { id: 'span', type: 'task', label: '跨ぎ', start: at(24, 6, 59, 50), end: at(24, 7, 0, 10) },
      { id: 'after', type: 'interrupt', label: '次', start: at(24, 7, 0, 10), end: at(24, 7, 0, 20) },
    ], selectedDate, at(24, 8));
    const timeline = buildHistoryTimelineModel(items, selectedDate, at(24, 8));
    const seven = timeline.axis.hourMarkers.find((marker) => marker.hour === 7)?.y ?? 0;
    const span = timeline.items.find((item) => item.id === 'span');
    const after = timeline.items.find((item) => item.id === 'after');

    expect(span).toBeTruthy();
    expect(after).toBeTruthy();
    expect(span.topPx).toBeLessThan(seven);
    expect(span.endY).toBeGreaterThan(seven);
    expect(after.topPx).toBeGreaterThanOrEqual(seven);
    expect(after.topPx).toBeGreaterThanOrEqual(span.endY);
  });

  it('shows seconds only for events shorter than one minute', () => {
    const selectedDate = at(24, 0);
    const items = getHistoryDayItems([
      { id: 'minute', type: 'task', label: '1分', start: at(24, 7, 5, 0), end: at(24, 7, 6, 0) },
      { id: 'short', type: 'task', label: '5秒', start: at(24, 6, 59, 58), end: at(24, 7, 0, 3) },
    ], selectedDate, at(24, 8));
    const shortEvent = items.find((item) => item.id === 'short');
    const minuteEvent = items.find((item) => item.id === 'minute');

    expect(formatHistoryTimeRange(shortEvent)).toBe('06:59:58 – 07:00:03');
    expect(formatHistoryTimeRange(minuteEvent)).toBe('07:05 – 07:06');
  });

  it('keeps sequential second-level events separated on the same lane', () => {
    const selectedDate = at(24, 0);
    const items = getHistoryDayItems([
      { id: 'a', type: 'task', label: 'A', start: at(24, 7, 0, 0), end: at(24, 7, 0, 5) },
      { id: 'b', type: 'task', label: 'B', start: at(24, 7, 0, 5), end: at(24, 7, 0, 10) },
      { id: 'c', type: 'task', label: 'C', start: at(24, 7, 0, 10), end: at(24, 7, 0, 15) },
    ], selectedDate, at(24, 8));
    const timeline = buildHistoryTimelineModel(items, selectedDate, at(24, 8));
    const sameLane = timeline.items
      .filter((item) => item.lane === 0)
      .sort((a, b) => a.topPx - b.topPx);

    expect(sameLane[1].topPx).toBeGreaterThanOrEqual(sameLane[0].endY);
    expect(sameLane[2].topPx).toBeGreaterThanOrEqual(sameLane[1].endY);
  });

  it('places the current time line between hour markers', () => {
    const selectedDate = at(24, 0);
    const now = at(24, 15, 30);
    const items = getHistoryDayItems([
      { id: 'running', type: 'task', taskId: 't1', label: '継続中', start: at(24, 13), end: null },
    ], selectedDate, now);
    const timeline = buildHistoryTimelineModel(items, selectedDate, now);
    const fifteen = timeline.axis.hourMarkers.find((marker) => marker.hour === 15)?.y ?? 0;
    const sixteen = timeline.axis.hourMarkers.find((marker) => marker.hour === 16)?.y ?? 0;

    expect(timeline.nowY).toBeGreaterThan(fifteen);
    expect(timeline.nowY).toBeLessThan(sixteen);
  });

  it('marks only invalid or mismatched open events as suspicious', () => {
    const matchingRunning = { type: 'task', taskId: 't1', start: at(24, 9) };
    const longButClosed = { id: 'long', type: 'task', taskId: 't1', label: '長時間', start: at(24, 9), end: at(24, 18) };
    const invalid = { id: 'broken', type: 'task', taskId: 't2', label: '壊れた', start: at(24, 12), end: at(24, 11) };
    const openMismatch = { id: 'open', type: 'task', taskId: 't3', label: '放置', start: at(24, 14), end: null };
    const openMatch = { id: 'current', type: 'task', taskId: 't1', label: '実行中', start: at(24, 9), end: null };

    expect(isSuspiciousHistoryEvent(longButClosed, matchingRunning, at(24, 19))).toBe(false);
    expect(isSuspiciousHistoryEvent(invalid, matchingRunning, at(24, 19))).toBe(true);
    expect(isSuspiciousHistoryEvent(openMismatch, matchingRunning, at(24, 19))).toBe(true);
    expect(isSuspiciousHistoryEvent(openMatch, matchingRunning, at(24, 19))).toBe(false);
  });

  it('formats relative date parts around today', () => {
    const now = at(24, 12);

    expect(formatHistoryDateParts(at(24, 8), now).relative).toBe('今日');
    expect(formatHistoryDateParts(at(23, 8), now).relative).toBe('昨日');
    expect(formatHistoryDateParts(at(25, 8), now).relative).toBe('明日');
    expect(formatHistoryDateParts(at(24, 8), now, 'en-US')).toMatchObject({
      month: 'Apr',
      weekday: 'Fri',
      relative: 'Today',
    });
  });
});
