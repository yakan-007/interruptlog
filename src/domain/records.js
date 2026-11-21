// A single record or running timer this long is most likely a timer that was
// left running. The forgotten-timer notice uses it, and the forecast leaves
// such records out of its corrections.
export const LIKELY_FORGOTTEN_MS = 4 * 3600000;

// Earliest due date first; tasks without one go last. Ties keep the hand-made
// order. (Two missing due dates subtract to NaN, which falls through.)
export function compareByDueDate(a, b) {
  return (a.planning?.dueAt ?? Infinity) - (b.planning?.dueAt ?? Infinity) || a.order - b.order;
}
