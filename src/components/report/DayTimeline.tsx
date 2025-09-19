'use client';

import { TimelineData, TimelineSegment } from '@/lib/timelineBuilder';

interface DayTimelineProps {
  data: TimelineData;
}

export default function DayTimeline({ data }: DayTimelineProps) {
  if (!data) return null;
  const { segments, summary } = data;
  if (segments.length === 0) return null;

  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-lg shadow-slate-100/40 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
      <header className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
          今日のタイムライン
        </h2>
        <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
          {summary.firstStart && summary.lastEnd && (
            <Chip label="稼働" value={`${formatTime(summary.firstStart)}〜${formatTime(summary.lastEnd)}`} tone="muted" />
          )}
          <Chip label="集中" value={`${Math.round(summary.totalFocusMinutes)}分`} tone="info" />
          <Chip label="割り込み" value={`${Math.round(summary.totalInterruptMinutes)}分`} tone="warning" />
          <Chip label="休憩" value={`${Math.round(summary.totalBreakMinutes)}分`} tone="muted" />
          {summary.longestFocus && (
            <Chip
              label="ベストセッション"
              value={`${summary.longestFocus.label} (${Math.round(summary.longestFocus.durationMinutes)}分)`}
              tone="positive"
            />
          )}
        </div>
      </header>
      <div className="mt-4 space-y-3">
        {segments.map(segment => (
          <div key={segment.id} className="flex items-start gap-3">
            <span
              className="mt-1 h-3 w-3 rounded-sm"
              style={{
                backgroundColor:
                  segment.type === 'task'
                    ? segment.categoryColor ?? '#3b82f6'
                    : segment.type === 'interrupt'
                      ? '#ef4444'
                      : '#6b7280',
              }}
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {formatTime(segment.start)} - {formatTime(segment.end)} {segment.label}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {segmentDurationLabel(segment)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function normalizeToDay(timestamp: number): Date {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatTime(value: number): string {
  const date = new Date(value);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  if (hours === 0 && minutes === 0) {
    return '24:00';
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function segmentDurationLabel(segment: TimelineSegment): string {
  const minutes = Math.round(segment.durationMinutes);
  if (segment.type === 'task') {
    return `${minutes}分 集中`; 
  }
  if (segment.type === 'interrupt') {
    return `${minutes}分 割り込み応対`; 
  }
  return `${minutes}分 休憩`;
}

type ChipTone = 'info' | 'warning' | 'muted' | 'positive';

interface ChipProps {
  label: string;
  value: string;
  tone?: ChipTone;
}

function Chip({ label, value, tone = 'info' }: ChipProps) {
  const chipTone: ChipTone = tone ?? 'info';
  const toneClasses: Record<ChipTone, string> = {
    info: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/40 dark:text-blue-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-200',
    muted: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300',
    positive: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-200',
  };
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium shadow-sm ${toneClasses[chipTone]}`}
    >
      <span className="uppercase text-[10px] tracking-wide">{label}</span>
      <span>{value}</span>
    </span>
  );
}
