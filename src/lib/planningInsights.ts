import { SummaryItem } from '@/lib/reportUtils';

export interface PlanningInsight {
  taskName: string;
  plannedMinutes?: number;
  actualMinutes: number;
  varianceMinutes?: number;
  dueAt?: number;
}

export interface PlanningAggregates {
  totalActualMinutes: number;
  totalPlannedMinutes: number;
  focusRate: number;
  planningCoverage: number;
  averageVarianceMinutes?: number;
  onTrack: PlanningInsight[];
  behindSchedule: PlanningInsight[];
  aheadOfSchedule: PlanningInsight[];
  overdue: PlanningInsight[];
  upcoming: PlanningInsight[];
}

interface ComputePlanningAggregatesParams {
  insights: PlanningInsight[];
  summaryItems: SummaryItem[];
  selectedDateKey: string;
  now?: number;
  onTrackVarianceThresholdMinutes?: number;
  varianceAlertThresholdMinutes?: number;
  upcomingWindowMinutes?: number;
}

const MINUTES_TO_MS = 60 * 1000;

export function computePlanningAggregates({
  insights,
  summaryItems,
  selectedDateKey,
  now = Date.now(),
  onTrackVarianceThresholdMinutes = 10,
  varianceAlertThresholdMinutes = 15,
  upcomingWindowMinutes = 24 * 60,
}: ComputePlanningAggregatesParams): PlanningAggregates | null {
  if (insights.length === 0) {
    return null;
  }

  const totalActualMinutes = insights.reduce((sum, item) => sum + item.actualMinutes, 0);
  const totalPlannedMinutes = insights.reduce((sum, item) => sum + (item.plannedMinutes ?? 0), 0);

  const plannedCount = insights.filter(item => item.plannedMinutes !== undefined).length;
  const planningCoverage = insights.length > 0 ? plannedCount / insights.length : 0;

  const varianceItems = insights.filter(item => item.varianceMinutes !== undefined);
  const averageVarianceMinutes =
    varianceItems.length > 0
      ? varianceItems.reduce((sum, item) => sum + Math.abs(item.varianceMinutes || 0), 0) /
        varianceItems.length
      : undefined;

  const totalDurationMs = summaryItems.reduce((sum, item) => sum + item.totalDuration, 0);
  const taskDurationMs = summaryItems.find(item => item.key === 'task')?.totalDuration ?? 0;
  const focusRate = totalDurationMs > 0 ? taskDurationMs / totalDurationMs : 0;

  const dayEnd = new Date(selectedDateKey);
  dayEnd.setHours(23, 59, 59, 999);
  const dayEndMs = dayEnd.getTime();
  const upcomingWindowMs = upcomingWindowMinutes * MINUTES_TO_MS;

  const behindSchedule = insights
    .filter(item => (item.varianceMinutes ?? 0) >= varianceAlertThresholdMinutes)
    .slice()
    .sort((a, b) => (b.varianceMinutes ?? 0) - (a.varianceMinutes ?? 0));

  const aheadOfSchedule = insights
    .filter(item => (item.varianceMinutes ?? 0) <= -varianceAlertThresholdMinutes)
    .slice()
    .sort((a, b) => (a.varianceMinutes ?? 0) - (b.varianceMinutes ?? 0));

  const onTrack = insights
    .filter(item => {
      const variance = item.varianceMinutes;
      if (variance === undefined) return false;
      return Math.abs(variance) <= onTrackVarianceThresholdMinutes;
    })
    .slice()
    .sort((a, b) => Math.abs(a.varianceMinutes ?? 0) - Math.abs(b.varianceMinutes ?? 0));

  const overdue = insights
    .filter(item => {
      if (item.dueAt === undefined) return false;
      if (item.plannedMinutes === undefined) return false;
      if (item.dueAt >= dayEndMs) return false;
      const actual = item.actualMinutes;
      const planned = item.plannedMinutes ?? 0;
      const variance = item.varianceMinutes ?? actual - planned;
      return actual + 1 < planned || variance > 0;
    })
    .slice()
    .sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0));

  const upcoming = insights
    .filter(item => {
      if (item.dueAt === undefined) return false;
      return item.dueAt >= dayEndMs && item.dueAt <= dayEndMs + upcomingWindowMs;
    })
    .slice()
    .sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0));

  return {
    totalActualMinutes,
    totalPlannedMinutes,
    focusRate,
    planningCoverage,
    averageVarianceMinutes,
    onTrack,
    behindSchedule,
    aheadOfSchedule,
    overdue,
    upcoming,
  };
}
