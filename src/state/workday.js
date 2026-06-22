import {
  isWorkSchedule,
  normalizeWorkSchedule,
  timestampAtClock,
  workdayKey,
} from '../lib/workday';

export function getEffectiveWorkdaySchedule(state, timestamp = Date.now()) {
  const snapshot = state.workdaySchedules?.[workdayKey(timestamp)];
  if (isWorkSchedule(snapshot)) return snapshot;
  return isWorkSchedule(state.preferences?.workSchedule) ? state.preferences.workSchedule : null;
}

export function getWorkdayBounds(state, timestamp = Date.now()) {
  const schedule = getEffectiveWorkdaySchedule(state, timestamp);
  if (!schedule) return null;
  return {
    schedule,
    start: timestampAtClock(timestamp, schedule.start),
    end: timestampAtClock(timestamp, schedule.end),
  };
}

export function ensureWorkdayScheduleInState(state, timestamp = Date.now()) {
  const key = workdayKey(timestamp);
  if (isWorkSchedule(state.workdaySchedules?.[key])) return state;
  const schedule = normalizeWorkSchedule(state.preferences?.workSchedule);
  if (!isWorkSchedule(schedule)) return state;
  return {
    ...state,
    workdaySchedules: {
      ...state.workdaySchedules,
      [key]: schedule,
    },
  };
}

export function setWorkScheduleInState(state, schedule) {
  return {
    ...state,
    preferences: {
      ...state.preferences,
      workSchedule: normalizeWorkSchedule(schedule),
    },
  };
}

export function setTodayWorkdayEndInState(state, end, now = Date.now()) {
  const current = getEffectiveWorkdaySchedule(state, now);
  const next = normalizeWorkSchedule({ start: current?.start, end });
  if (!isWorkSchedule(next)) return state;
  return {
    ...state,
    workdaySchedules: {
      ...state.workdaySchedules,
      [workdayKey(now)]: next,
    },
  };
}

export function clearTodayWorkdayEndInState(state, now = Date.now()) {
  const standard = normalizeWorkSchedule(state.preferences?.workSchedule);
  const key = workdayKey(now);
  if (!isWorkSchedule(standard)) {
    const { [key]: _removed, ...remaining } = state.workdaySchedules ?? {};
    return { ...state, workdaySchedules: remaining };
  }
  return {
    ...state,
    workdaySchedules: {
      ...state.workdaySchedules,
      [key]: standard,
    },
  };
}
