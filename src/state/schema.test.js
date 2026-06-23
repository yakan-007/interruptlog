import { describe, expect, it } from 'vitest';
import {
  buildBackup,
  createEmptyState,
  normalizeState,
  parseBackup,
  saveTaskInState,
  clearTodayWorkdayEndInState,
  setTodayWorkdayEndInState,
  setWorkScheduleInState,
} from './index';
import { at, createPersonalState } from '../test/factories';

describe('personal schema and backup', () => {
  it('keeps personal preferences and drops unknown legacy preference keys', () => {
    const normalized = normalizeState({
      ...createEmptyState(),
      preferences: { ...createEmptyState().preferences, historyView: 'list', autoStart: true },
    });
    const fallback = parseBackup({
      schemaVersion: 1,
      state: {
        ...createEmptyState(),
        preferences: { ...createEmptyState().preferences, historyView: 'weird', autoStart: true },
      },
    });

    expect(normalized.version).toBe(1);
    expect(normalized.preferences.historyView).toBe('list');
    expect(normalized.preferences.onboardingDone).toBe(false);
    expect('autoStart' in normalized.preferences).toBe(false);
    expect(normalized.preferences.locale).toBe('ja-JP');
    expect(fallback.preferences.historyView).toBe('timeline');
    expect('autoStart' in fallback.preferences).toBe(false);
  });

  it('normalizes the locale without retaining unknown state fields', () => {
    const state = normalizeState({
      ...createEmptyState(),
      preferences: { locale: 'en-US' },
      obsoleteWorkspace: { enabled: true },
    });

    expect(state.preferences.locale).toBe('en-US');
    expect('obsoleteWorkspace' in state).toBe(false);
  });

  it('keeps an optional standard work schedule and daily end override compatible with old state', () => {
    const legacy = normalizeState(createEmptyState());
    const configured = setWorkScheduleInState(legacy, { start: '09:00', end: '17:00' });
    const overridden = setTodayWorkdayEndInState(configured, '18:30', at(11, 10));
    const reset = clearTodayWorkdayEndInState(overridden, at(11, 10));

    expect(legacy.preferences.workSchedule).toEqual({ start: null, end: null });
    expect(configured.preferences.workSchedule).toEqual({ start: '09:00', end: '17:00' });
    expect(overridden.workdaySchedules['2026-05-11']).toEqual({ start: '09:00', end: '18:30' });
    expect(reset.workdaySchedules['2026-05-11']).toEqual({ start: '09:00', end: '17:00' });
    expect(normalizeState({ ...legacy, preferences: { workSchedule: { start: '18:00', end: '09:00' } } }).preferences.workSchedule).toEqual({ start: '18:00', end: '09:00' });
  });

  it('treats zero due dates as unset when loading and saving tasks', () => {
    const raw = {
      ...createEmptyState(),
      tasks: [{
        id: 't1',
        name: '期限なしタスク',
        categoryId: 'cat-dev',
        planning: { plannedDurationMinutes: 15, dueAt: 0 },
      }],
    };
    const normalized = normalizeState(raw, at(11, 9));
    const saved = saveTaskInState(normalized, {
      id: 't1',
      name: '期限なしタスク',
      categoryId: 'cat-dev',
      plannedDurationMinutes: 15,
      dueAt: 0,
      memo: '',
    }, at(11, 10));

    expect(normalized.tasks[0].planning.dueAt).toBeNull();
    expect(saved.state.tasks[0].planning.dueAt).toBeNull();
  });

  it('round-trips JSON backup payloads in the personal format', () => {
    const state = createPersonalState({
      events: [{ id: 'manual-note', type: 'task', label: 'バックアップ確認', memo: '復元後も残す', start: 1000, end: 2000 }],
    });
    const backup = buildBackup(state, 1234);
    const imported = parseBackup(JSON.stringify(backup), 5678);

    expect(backup.appName).toBe('InterruptLog Personal');
    expect(backup.schemaVersion).toBe(1);
    expect(imported.version).toBe(1);
    expect(imported.categories.length).toBeGreaterThan(0);
    expect(imported.events[0]).toMatchObject({ id: 'manual-note', memo: '復元後も残す' });
  });
});
