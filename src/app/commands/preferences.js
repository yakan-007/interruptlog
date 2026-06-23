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
  setTodayWorkdayEndInState,
  setWorkScheduleInState,
} from '../../state';

export function createPreferenceCommands({ mutate, mutateWith, setOverlapRepairUi }) {
  const setPreference = (key) => (value) => {
    mutate((state) => setPreferenceInState(state, key, value));
  };

  return {
    saveCategory: mutateWith(saveCategoryInState),
    deleteCategory: mutateWith(deleteCategoryInState),
    moveCategoryToIndex: mutateWith(moveCategoryToIndexInState),
    saveInterruptCategory: mutateWith(saveInterruptCategoryInState),
    deleteInterruptCategory: mutateWith(deleteInterruptCategoryInState),
    moveInterruptCategoryToIndex: mutateWith(moveInterruptCategoryToIndexInState),
    saveChips: mutateWith(saveChipsInState),
    moveChipToIndex: mutateWith(moveChipToIndexInState),
    setDark: setPreference('dark'),
    setAccent: setPreference('accent'),
    setLocale: setPreference('locale'),
    setTopAdd: setPreference('topAdd'),
    setSortDue: setPreference('sortDue'),
    setHistoryView: setPreference('historyView'),
    setWorkSchedule: mutateWith(setWorkScheduleInState),
    setTodayWorkdayEnd: mutateWith(setTodayWorkdayEndInState),
    clearTodayWorkdayEnd: mutateWith(clearTodayWorkdayEndInState),
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
