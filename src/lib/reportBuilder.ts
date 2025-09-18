import { Event, MyTask } from '@/types';
import { SummaryMetrics, computeSummaryMetrics, computeInterruptionStats, filterEventsByDateKey, shiftDateKey } from '@/lib/reportUtils';
import { PlanningInsight } from '@/lib/planningInsights';

export interface DailyReportData {
  summaryMetrics: SummaryMetrics;
  totalFocusMinutes: number;
  totalInterruptMinutes: number;
  breakMinutes: number;
  interruptionCount: number;
  highlights: string[];
  topPlannedTasks: Array<{
    taskName: string;
    plannedMinutes?: number;
    actualMinutes: number;
    dueStatus?: 'danger' | 'warning' | 'neutral';
    dueLabel?: string;
    varianceMinutes?: number;
  }>;
}

export interface WeeklyTrendDatum {
  dateKey: string;
  focusMinutes: number;
  interruptMinutes: number;
}

export function buildDailyReportData(
  events: Event[],
  myTasks: MyTask[],
  dateKey: string,
  planningInsights: PlanningInsight[],
  dueAlertSettings: { warningMinutes: number; dangerMinutes: number },
): DailyReportData {
  const currentEvents = filterEventsByDateKey(events, dateKey);
  const previousEvents = filterEventsByDateKey(events, shiftDateKey(dateKey, -1));
  const summaryMetrics = computeSummaryMetrics(currentEvents, previousEvents);
  const interruptionStats = computeInterruptionStats(currentEvents);

  const focusItem = summaryMetrics.items.find(item => item.key === 'task');
  const interruptItem = summaryMetrics.items.find(item => item.key === 'interrupt');
  const breakItem = summaryMetrics.items.find(item => item.key === 'break');

  const totalFocusMinutes = focusItem ? focusItem.totalDuration / 60000 : 0;
  const totalInterruptMinutes = interruptionStats.totalDuration / 60000;
  const breakMinutes = breakItem ? breakItem.totalDuration / 60000 : 0;

  const highlights: string[] = [];

  if (planningInsights.length) {
    const lateTasks = planningInsights
      .filter(item => item.varianceMinutes !== undefined && item.varianceMinutes > 5)
      .sort((a, b) => (b.varianceMinutes ?? 0) - (a.varianceMinutes ?? 0));

    if (lateTasks.length > 0) {
      const task = lateTasks[0];
      highlights.push(`「${task.taskName}」が計画より約${Math.round(task.varianceMinutes!)}分遅れています。`);
    }

    const aheadTasks = planningInsights
      .filter(item => item.varianceMinutes !== undefined && item.varianceMinutes < -10)
      .sort((a, b) => (a.varianceMinutes ?? 0) - (b.varianceMinutes ?? 0));

    if (aheadTasks.length > 0) {
      const task = aheadTasks[0];
      highlights.push(`「${task.taskName}」は計画より先行しています（${Math.abs(Math.round(task.varianceMinutes!))}分）。`);
    }
  }

  if (interruptionStats.totalCount > 0) {
    highlights.push(`割り込みは${interruptionStats.totalCount}件（合計${Math.round(interruptionStats.totalDuration / 60000)}分）。`);
  }

  if (totalFocusMinutes > 0) {
    highlights.push(`集中作業は${Math.round(totalFocusMinutes)}分でした。`);
  }

  const topPlannedTasks = planningInsights
    .slice()
    .sort((a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity))
    .slice(0, 6)
    .map(item => ({
      taskName: item.taskName,
      plannedMinutes: item.plannedMinutes,
      actualMinutes: item.actualMinutes,
      varianceMinutes: item.varianceMinutes,
      dueStatus: computeDueStatus(item.dueAt, dueAlertSettings),
      dueLabel: item.dueAt ? formatDueShort(item.dueAt) : undefined,
    }));

  return {
    summaryMetrics,
    totalFocusMinutes,
    totalInterruptMinutes,
    breakMinutes,
    interruptionCount: interruptionStats.totalCount,
    highlights,
    topPlannedTasks,
  };
}

function computeDueStatus(
  dueAt: number | undefined,
  settings: { warningMinutes: number; dangerMinutes: number },
): 'danger' | 'warning' | 'neutral' | undefined {
  if (!dueAt) return undefined;
  const diffMinutes = (dueAt - Date.now()) / 60000;
  if (diffMinutes < 0) return 'danger';
  if (diffMinutes <= settings.dangerMinutes) return 'danger';
  if (diffMinutes <= settings.warningMinutes) return 'warning';
  return 'neutral';
}

function formatDueShort(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${month}/${day} ${hours}:${minutes}`;
}

export function buildWeeklyFocusData(events: Event[], anchorDateKey: string): WeeklyTrendDatum[] {
  const data: WeeklyTrendDatum[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const dateKey = shiftDateKey(anchorDateKey, -offset);
    const dayEvents = filterEventsByDateKey(events, dateKey);
    const focusMinutes = dayEvents
      .filter(event => event.type === 'task' && event.end)
      .reduce((total, event) => total + (event.end! - event.start) / 60000, 0);
    const interruptMinutes = dayEvents
      .filter(event => event.type === 'interrupt' && event.end)
      .reduce((total, event) => total + (event.end! - event.start) / 60000, 0);
    data.push({
      dateKey,
      focusMinutes,
      interruptMinutes,
    });
  }
  return data;
}
