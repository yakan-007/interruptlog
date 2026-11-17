import { describe, expect, it } from 'vitest';
import {
  createEmptyState,
  moveCategoryToIndexInState,
  moveChipToIndexInState,
  moveInterruptCategoryToIndexInState,
  normalizeState,
  parseBackup,
  setReportProfileInState,
} from './index';

describe('personal preferences', () => {
  it('accepts only the personal backup format', () => {
    const personalState = {
      version: 1,
      tasks: [],
      events: [],
      categories: createEmptyState().categories,
      whoChips: [],
      subjectChips: [],
      preferences: {
        dark: false,
        accent: createEmptyState().preferences.accent,
        topAdd: true,
        sortDue: false,
        showTodayStrip: true,
        historyView: 'timeline',
      },
      running: null,
    };

    const rehydrated = normalizeState(personalState, 0, { assumeOnboarded: true });
    const imported = parseBackup({ schemaVersion: 1, state: personalState }, 0);

    expect(rehydrated.preferences.onboardingDone).toBe(true);
    expect(imported.preferences.onboardingDone).toBe(true);
    expect(() => parseBackup({ schemaVersion: 2, state: personalState }, 0)).toThrow('unsupported schema');
  });

  it('moves personal categories and chips without changing referenced ids', () => {
    const state = {
      ...createEmptyState(),
      tasks: [{
        id: 't1',
        name: 'カテゴリつき',
        isCompleted: false,
        order: 0,
        categoryId: 'cat-dev',
        planning: { plannedDurationMinutes: 0, dueAt: null },
        createdAt: 0,
        completedAt: null,
      }],
      events: [{ id: 'e1', type: 'interrupt', label: '相談', categoryId: 'int-chat', who: '佐藤', start: 1000, end: 2000 }],
      whoChips: ['佐藤', '田中', '鈴木'],
      subjectChips: ['相談', '確認', '会議'],
    };

    const categoriesMoved = moveCategoryToIndexInState(state, 'cat-dev', 2);
    const interruptsMoved = moveInterruptCategoryToIndexInState(categoriesMoved, 'int-chat', 3);
    const whoMoved = moveChipToIndexInState(interruptsMoved, 'who', '佐藤', 2);
    const subjectMoved = moveChipToIndexInState(whoMoved, 'subject', '相談', 2);

    expect(categoriesMoved.categories.map((category) => category.id).slice(0, 3)).toEqual(['cat-doc', 'cat-mtg', 'cat-dev']);
    expect(interruptsMoved.interruptCats.map((category) => category.id)).toEqual(['int-call', 'int-q', 'int-other', 'int-chat']);
    expect(whoMoved.whoChips).toEqual(['田中', '鈴木', '佐藤']);
    expect(subjectMoved.subjectChips).toEqual(['確認', '会議', '相談']);
    expect(subjectMoved.tasks[0].categoryId).toBe('cat-dev');
    expect(subjectMoved.events[0].categoryId).toBe('int-chat');
  });
});

it('stores a compact report profile and normalizes imported profile values', () => {
  const saved = setReportProfileInState(createEmptyState(), {
    affiliation: '  開発部 プラットフォームチーム  ',
    name: '  山田 太郎  ',
  });
  const restored = normalizeState({
    ...createEmptyState(),
    preferences: { reportProfile: { affiliation: 42, name: null } },
  });

  expect(saved.preferences.reportProfile).toEqual({ affiliation: '開発部 プラットフォームチーム', name: '山田 太郎' });
  expect(restored.preferences.reportProfile).toEqual({ affiliation: '42', name: '' });
});
