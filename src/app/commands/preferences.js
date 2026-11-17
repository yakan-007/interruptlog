import {
  clearTodayWorkdayEndInState,
  createEmptyState,
  deleteCategoryInState,
  deleteInterruptCategoryInState,
  moveCategoryToIndexInState,
  moveChipToIndexInState,
  moveInterruptCategoryToIndexInState,
  saveCategoryInState,
  saveChipsInState,
  saveInterruptCategoryInState,
  setPreferenceInState,
  setReportProfileInState,
  setTodayWorkdayEndInState,
  setWorkScheduleInState,
} from '../../state';

export function createPreferenceCommands({ createId, mutate, mutateWith, now, setOverlapRepairUi }) {
  const dependencies = { createId };
  const setPreference = (key) => (value) => {
    mutate((state) => setPreferenceInState(state, key, value));
  };

  return {
    saveCategory: (category) => mutate((state) => saveCategoryInState(state, category, now(), dependencies)),
    deleteCategory: mutateWith(deleteCategoryInState),
    moveCategoryToIndex: mutateWith(moveCategoryToIndexInState),
    saveInterruptCategory: (category) => mutate((state) => saveInterruptCategoryInState(state, category, now(), dependencies)),
    deleteInterruptCategory: mutateWith(deleteInterruptCategoryInState),
    moveInterruptCategoryToIndex: mutateWith(moveInterruptCategoryToIndexInState),
    saveChips: mutateWith(saveChipsInState),
    moveChipToIndex: mutateWith(moveChipToIndexInState),
    setDark: setPreference('dark'),
    setLocale: setPreference('locale'),
    setTopAdd: setPreference('topAdd'),
    setSortDue: setPreference('sortDue'),
    setHistoryView: setPreference('historyView'),
    setReportProfile: mutateWith(setReportProfileInState),
    setWorkSchedule: mutateWith(setWorkScheduleInState),
    setTodayWorkdayEnd: (end) => mutate((state) => setTodayWorkdayEndInState(state, end, now())),
    clearTodayWorkdayEnd: () => mutate((state) => clearTodayWorkdayEndInState(state, now())),
    finishOnboarding: () => mutate((state) => setPreferenceInState(state, 'onboardingDone', true)),
    resetAll: () => {
      mutate((state) => ({
        ...createEmptyState(),
        preferences: {
          ...createEmptyState().preferences,
          onboardingDone: state.preferences.onboardingDone,
        },
      }));
      setOverlapRepairUi({ sheetOpen: false, deferred: false });
    },
  };
}
