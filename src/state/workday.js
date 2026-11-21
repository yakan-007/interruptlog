import {
  DEFAULT_WORK_DAYS,
  isWorkSchedule,
  normalizeWorkDays,
  normalizeWorkSchedule,
  timestampAtClock,
  workdayKey,
} from '../lib/workday';

// A day is a working day when its weekday is one, or when the user set that
// day's hours themselves (working on a day off).
export function isWorkingDay(state, timestamp = Date.now()) {
  const snapshot = state.workdaySchedules?.[workdayKey(timestamp)];
  if (snapshot?.override && isWorkSchedule(snapshot)) return true;
  const workDays = state.preferences?.workDays ?? DEFAULT_WORK_DAYS;
  return workDays.includes(new Date(timestamp).getDay());
}

export function getEffectiveWorkdaySchedule(state, timestamp = Date.now()) {
  if (!isWorkingDay(state, timestamp)) return null;
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
  // Days off get no snapshot: working on one is holiday work, not a workday.
  if (!isWorkingDay(state, timestamp)) return state;
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

export function setWorkDaysInState(state, workDays) {
  return {
    ...state,
    preferences: {
      ...state.preferences,
      workDays: normalizeWorkDays(workDays),
    },
  };
}

// Setting today's end is the user's own choice: on a day off it makes today a
// working day with those hours.
export function setTodayWorkdayEndInState(state, end, now = Date.now()) {
  const current = getEffectiveWorkdaySchedule(state, now);
  const next = normalizeWorkSchedule({ start: current?.start ?? state.preferences?.workSchedule?.start, end });
  if (!isWorkSchedule(next)) return state;
  return {
    ...state,
    workdaySchedules: {
      ...state.workdaySchedules,
      [workdayKey(now)]: { ...next, override: true },
    },
  };
}

export function clearTodayWorkdayEndInState(state, now = Date.now()) {
  const standard = normalizeWorkSchedule(state.preferences?.workSchedule);
  const key = workdayKey(now);
  const regularDay = (state.preferences?.workDays ?? DEFAULT_WORK_DAYS).includes(new Date(now).getDay());
  // On a day off, going back to the standard means going back to no work hours.
  if (!isWorkSchedule(standard) || !regularDay) {
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
