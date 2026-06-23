import { createEmptyState } from '../state';

export function createPersonalState(overrides = {}) {
  return { ...createEmptyState(), ...overrides };
}

export function at(day, hour, minute = 0, second = 0) {
  return new Date(2026, 4, day, hour, minute, second).getTime();
}
