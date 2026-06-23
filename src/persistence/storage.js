import { LEGACY_STATE_KEYS, STATE_KEY } from '../constants';

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
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
  removeLegacyState();
  return readLocalJson(STATE_KEY);
}

export async function savePersistedState(state) {
  writeLocalJson(STATE_KEY, state);
}

function removeLegacyState() {
  if (!canUseLocalStorage()) return;
  for (const key of LEGACY_STATE_KEYS) window.localStorage.removeItem(key);
}
