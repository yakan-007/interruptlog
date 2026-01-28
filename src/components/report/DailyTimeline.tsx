'use client';

import { useMemo } from 'react';
import { Category, Event, TaskLifecycleRecord, InterruptCategorySettings } from '@/types';
import { formatDuration, formatEventTime } from '@/lib/timeUtils';
import { createDateFromKey } from '@/lib/reportUtils';

interface DailyTimelineProps {
  events: Event[];
  dateKey: string;
  categories: Category[];
  taskLedger: Record<string, TaskLifecycleRecord>;
  interruptCategorySettings: InterruptCategorySettings;
}

const TYPE_COLORS: Record<Event['type'], string> = {
  task: '#10B981',
  interrupt: '#EF4444',
  break: '#64748B',
};

const BREAK_LABELS: Record<NonNullable<Event['breakType']>, string> = {
  short: 'ショート休憩',
  coffee: 'コーヒー休憩',
  lunch: 'ランチ休憩',
  custom: '休憩',
  indefinite: '休憩',
};

const formatHour = (hour: number): string => {
  if (hour === 0) return '0:00';
  if (hour === 12) return '12:00';
  return `${hour}:00`;
};

type TimelineSegment = {
  id: string;
  label: string;
  start: number;
  end: number;
  type: 'task' | 'interrupt' | 'break' | 'gap';
  color: string;
};

const buildSegmentLabel = (
  event: Event,
  taskLedger: Record<string, TaskLifecycleRecord>
): string => {
  if (event.meta?.isUnknownActivity) return '未分類の時間';
  if (event.type === 'task') {
    const taskName = event.meta?.myTaskId ? taskLedger[event.meta.myTaskId]?.name?.trim() : undefined;
    if (taskName) return taskName;
    const label = event.label?.trim();
    return label && label.length > 0 ? label : 'タスク';
  }
  if (event.type === 'interrupt') {
    const label = event.label?.trim();
    if (label && label.length > 0) return label;
    const who = event.who?.trim();
    if (who && who.length > 0) return who;
    return '割り込み';
  }
  const label = event.label?.trim();
  if (label && label.length > 0) return label;
  if (event.breakType) return BREAK_LABELS[event.breakType];
  return '休憩';
};

const resolveSegmentColor = (
  event: Event,
  categories: Category[],
  interruptCategorySettings: InterruptCategorySettings
): string => {
  if (event.type === 'task') {
    if (event.categoryId) {
      const category = categories.find(cat => cat.id === event.categoryId);
      if (category?.color) return category.color;
    }
    return TYPE_COLORS.task;
  }

  if (event.type === 'interrupt') {
    const map = new Map<string, string>([
      [interruptCategorySettings.category1, '#EF4444'],
      [interruptCategorySettings.category2, '#F59E0B'],
      [interruptCategorySettings.category3, '#3B82F6'],
      [interruptCategorySettings.category4, '#8B5CF6'],
      [interruptCategorySettings.category5, '#10B981'],
      [interruptCategorySettings.category6, '#6B7280'],
    ]);
    if (event.interruptType && map.has(event.interruptType)) {
      return map.get(event.interruptType)!;
    }
    return TYPE_COLORS.interrupt;
  }

  return TYPE_COLORS.break;
};

export default function DailyTimeline({
  events,
  dateKey,
  categories,
  taskLedger,
  interruptCategorySettings,
}: DailyTimelineProps) {
  const dayStart = useMemo(() => createDateFromKey(dateKey).getTime(), [dateKey]);
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const dayDuration = dayEnd - dayStart;

  const segments = useMemo(() => {
    const relevant = events
      .map(event => {
        const end = typeof event.end === 'number' ? event.end : Date.now();
        return { event, end };
      })
      .filter(({ event, end }) => event.start < dayEnd && end > dayStart)
      .sort((a, b) => a.event.start - b.event.start);

    const result: TimelineSegment[] = [];
    let cursor = dayStart;

    relevant.forEach(({ event, end }) => {
      const start = Math.max(event.start, dayStart);
      const clampedEnd = Math.min(end, dayEnd);
      if (clampedEnd <= start) {
        return;
      }

      if (start > cursor) {
        result.push({
          id: `gap-${cursor}`,
          label: '未記録',
          start: cursor,
          end: start,
          type: 'gap',
          color: '#E2E8F0',
        });
      }

      result.push({
        id: event.id,
        label: buildSegmentLabel(event, taskLedger),
        start,
        end: clampedEnd,
        type: event.type,
        color: resolveSegmentColor(event, categories, interruptCategorySettings),
      });

      cursor = Math.max(cursor, clampedEnd);
    });

    if (cursor < dayEnd) {
      result.push({
        id: `gap-${cursor}`,
        label: '未記録',
        start: cursor,
        end: dayEnd,
        type: 'gap',
        color: '#E2E8F0',
      });
    }

    return result;
  }, [events, dayEnd, dayStart, categories, taskLedger, interruptCategorySettings]);

  const hourMarks = [0, 3, 6, 9, 12, 15, 18, 21, 24];

  const hasActualEvents = segments.some(segment => segment.type !== 'gap');

  if (!hasActualEvents) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">今日のタイムライン</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">この日はイベントがありません。</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">今日のタイムライン</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">今日の流れを時間帯で確認できます。</p>
      </div>

      <div className="mt-4">
        <div className="relative h-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
          {segments.map(segment => {
            const duration = Math.max(0, segment.end - segment.start);
            const widthPercent = (duration / dayDuration) * 100;
            const leftPercent = ((segment.start - dayStart) / dayDuration) * 100;
            const showLabel = widthPercent >= 8;
            const tooltip = `${segment.label} • ${formatEventTime(segment.start)} - ${formatEventTime(segment.end)} (${formatDuration(duration)})`;

            return (
              <div
                key={segment.id}
                className="absolute top-1/2 h-8 -translate-y-1/2 rounded-lg px-2 text-[11px] font-medium text-white shadow-sm transition hover:opacity-90"
                style={{
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`,
                  backgroundColor: segment.color,
                  color: segment.type === 'gap' ? '#475569' : '#ffffff',
                }}
                title={tooltip}
              >
                {showLabel ? segment.label : ''}
              </div>
            );
          })}
        </div>

        <div className="relative mt-2 h-5 text-[11px] text-slate-500 dark:text-slate-400">
          {hourMarks.map(hour => (
            <span
              key={hour}
              className="absolute -translate-x-1/2"
              style={{ left: `${(hour / 24) * 100}%` }}
            >
              {formatHour(hour)}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS.task }} />
          タスク
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS.interrupt }} />
          割り込み
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS.break }} />
          休憩
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#E2E8F0' }} />
          未記録
        </div>
      </div>
    </section>
  );
}
