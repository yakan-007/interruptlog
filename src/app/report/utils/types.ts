import type { InterruptionStats, SummaryMetrics } from '@/lib/reportUtils';

export type Granularity = 'day' | 'week' | 'month' | 'year';

export type TrendDirection = 'up' | 'down' | 'flat';

export interface DateRange {
  start: Date;
  end: Date;
  startKey: string;
  endKey: string;
  days: string[];
}

export interface RangeInfo {
  current: DateRange;
  previous: DateRange;
}

export interface HighlightMetric {
  id: string;
  label: string;
  value: string;
  deltaLabel: string;
  trend: TrendDirection;
  helper?: string;
}

export interface TaskDailyStat {
  dateKey: string;
  label: string;
  newCount: number;
  completedCount: number;
  canceledCount: number;
  backlogEnd: number;
}

export interface TaskTotals {
  newCount: number;
  completedCount: number;
  canceledCount: number;
  backlogEnd: number;
}

export interface TaskRangeComputation {
  daily: TaskDailyStat[];
  totals: TaskTotals;
  baselineBacklog: number;
}

export interface TaskMonthlyPoint {
  dateKey: string;
  label: string;
  newCount: number;
  completedCount: number;
  backlogEnd: number;
}

export interface TaskYearlyPoint {
  monthKey: string;
  label: string;
  newCount: number;
  completedCount: number;
  backlogEnd: number;
}

export interface TaskWeeklyPoint {
  dateKey: string;
  label: string;
  newCount: number;
  completedCount: number;
  netCount: number;
  backlogEnd: number;
}

export interface HourlyTrendPoint {
  hourLabel: string;
  focusMinutes: number;
  interruptMinutes: number;
  breakMinutes: number;
}

export interface WeeklyActivityPoint {
  label: string;
  focusHours: number;
  interruptHours: number;
  focusRate: number;
}

export interface HeatmapRow {
  dayKey: string;
  label: string;
  values: number[];
}

export interface HighlightBuilderArgs {
  summaryMetrics: SummaryMetrics;
  taskRanges: { current: TaskRangeComputation; previous: TaskRangeComputation };
  granularity: Granularity;
  interruptionStats: InterruptionStats;
}
