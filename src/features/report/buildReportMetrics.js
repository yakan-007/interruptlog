import {
  buildMicroInterruptionStats,
  createReportSnapshot,
  selectRangeEvents,
} from '../../state';
import {
  buildCategoryList,
  buildDayStats,
  buildHourlyInterrupts,
  buildSenders,
  buildWorkdayReport,
} from './interruptionMetrics';
import {
  buildDailyReportData,
  buildDayActivity,
  buildTaskEngagement,
  buildTaskReport,
  groupTaskEvents,
} from './taskMetrics';

export function buildReportMetrics(state, currentStats, bounds, now, snapshot = null) {
  const facts = snapshot ?? createReportSnapshot(state, now);
  const total = currentStats.focus + currentStats.interrupt + currentStats.break || 1;
  const hourly = buildHourlyInterrupts(currentStats.events, state.preferences.workSchedule);
  const maxHourly = Math.max(...hourly.counts, 1);
  const locale = state.preferences.locale;
  const dayStats = buildDayStats(facts, now, locale);
  const maxDay = Math.max(...dayStats.map((day) => day.focus + day.interrupt), 1);
  const senders = buildSenders(currentStats.events);
  const maxSenderTime = Math.max(...senders.map((sender) => sender.time), 1);
  const categoryList = buildCategoryList(currentStats.events);
  const totalCategoryTime = categoryList.reduce((sum, category) => sum + category.time, 0) || 1;
  const taskGroups = groupTaskEvents(currentStats.events);
  const allTaskGroups = groupTaskEvents(selectRangeEvents(facts, Number.NEGATIVE_INFINITY, now));
  const taskReport = buildTaskReport(state, taskGroups, bounds);
  const taskEngagement = buildTaskEngagement(state, taskGroups, allTaskGroups, bounds);
  const dayActivity = buildDayActivity(state, currentStats.events, taskGroups);
  const dailyReport = buildDailyReportData(currentStats, bounds, taskEngagement, dayActivity);
  const workday = buildWorkdayReport(state, currentStats.events, bounds, now);
  const microInterruptions = buildMicroInterruptionStats(currentStats.events);
  const peakHour = hourly.firstHour + hourly.counts.indexOf(Math.max(...hourly.counts));
  const hasInterruptTrend = hourly.counts.some((count) => count > 0);

  return {
    total,
    hourly,
    maxHourly,
    dayStats,
    maxDay,
    senders,
    maxSenderTime,
    categoryList,
    totalCategoryTime,
    peakHour,
    hasInterruptTrend,
    taskEngagement,
    dayActivity,
    dailyReport,
    workday,
    microInterruptions,
    ...taskReport,
  };
}
