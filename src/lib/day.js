// Local calendar days. Every "which day is this" question in the app goes
// through these, so day boundaries agree everywhere (and across DST).

export function startOfDay(timestamp) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function addDays(timestamp, days) {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

// Whole days from one day to another (0 = same day, 1 = the next).
export function daysBetween(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / 86400000);
}
