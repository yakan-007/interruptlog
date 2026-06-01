import { Preferences } from '@capacitor/preferences';
import { STATE_KEY } from './state';

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

async function readPreferenceJson(key) {
  try {
    const { value } = await Preferences.get({ key });
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

async function writePreferenceJson(key, value) {
  try {
    await Preferences.set({ key, value: JSON.stringify(value) });
    return true;
  } catch {
    return false;
  }
}

function readLocalJson(key) {
  if (!canUseLocalStorage()) return null;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function writeLocalJson(key, value) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export async function loadPersistedState() {
  return await readPreferenceJson(STATE_KEY) ?? readLocalJson(STATE_KEY);
}

export async function savePersistedState(state) {
  const wrotePreference = await writePreferenceJson(STATE_KEY, state);
  if (!wrotePreference) writeLocalJson(STATE_KEY, state);
}

export async function clearPersistedState() {
  try {
    await Preferences.remove({ key: STATE_KEY });
  } catch {
    // localStorage fallback below
  }
  if (canUseLocalStorage()) window.localStorage.removeItem(STATE_KEY);
}
