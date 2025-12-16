import { SliceContext } from './shared';
import { DueAlertSettings } from '@/types';

type SettingsActionKeys =
  | 'toggleTaskPlacement'
  | 'toggleAutoStartTask'
  | 'setFeatureFlag'
  | 'toggleFeatureFlag'
  | 'setDueAlertPreset'
  | 'setDueAlertSettings'
  | 'toggleSortTasksByDueDate'
  | 'setSortTasksByDueDate';

export const createSettingsActions = ({
  set,
  get,
  persist,
}: SliceContext): Pick<import('../types').EventsActions, SettingsActionKeys> => {
  const {
    persistTaskPlacementSetting,
    persistAutoStartTaskSetting,
    persistFeatureFlags,
    persistDueAlertSettings,
    persistUiSettings,
  } = persist;

  return {
    toggleTaskPlacement: () => {
      set({ addTaskToTop: !get().addTaskToTop });
      persistTaskPlacementSetting();
    },

    toggleAutoStartTask: () => {
      set({ autoStartTask: !get().autoStartTask });
      persistAutoStartTaskSetting();
    },

    setFeatureFlag: (flag, value) => {
      set({ featureFlags: { ...get().featureFlags, [flag]: value } });
      persistFeatureFlags();
    },

    toggleFeatureFlag: (flag) => {
      const current = get().featureFlags[flag];
      set({ featureFlags: { ...get().featureFlags, [flag]: !current } });
      persistFeatureFlags();
    },

    setDueAlertPreset: (preset: DueAlertSettings['preset']) => {
      const presetMap: Record<DueAlertSettings['preset'], DueAlertSettings> = {
        'day-before': {
          warningMinutes: 24 * 60,
          dangerMinutes: 4 * 60,
          preset: 'day-before',
        },
        'few-hours': {
          warningMinutes: 6 * 60,
          dangerMinutes: 60,
          preset: 'few-hours',
        },
        tight: {
          warningMinutes: 120,
          dangerMinutes: 30,
          preset: 'tight',
        },
      };
      set({ dueAlertSettings: presetMap[preset] });
      persistDueAlertSettings();
    },

    setDueAlertSettings: (settings) => {
      set({ dueAlertSettings: settings });
      persistDueAlertSettings();
    },

    toggleSortTasksByDueDate: () => {
      set(state => ({ uiSettings: { ...state.uiSettings, sortTasksByDueDate: !state.uiSettings.sortTasksByDueDate } }));
      persistUiSettings();
    },

    setSortTasksByDueDate: (value: boolean) => {
      set(state => ({ uiSettings: { ...state.uiSettings, sortTasksByDueDate: value } }));
      persistUiSettings();
    },
  };
};
