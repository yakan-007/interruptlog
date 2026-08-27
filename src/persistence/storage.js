import { LEGACY_STATE_KEYS, STATE_KEY } from '../constants';

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readLocalState(key) {
  if (!canUseLocalStorage()) return { status: 'ok', state: null };
  let raw;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return { status: 'ok', state: null };
  }
  if (raw === null) return { status: 'ok', state: null };
  try {
    return { status: 'ok', state: JSON.parse(raw) };
  } catch {
    return { status: 'corrupt', raw };
  }
}

function writeLocalJson(key, value) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

async function loadPersistedState() {
  removeLegacyState();
  return readLocalState(STATE_KEY);
}

async function savePersistedState(state) {
  writeLocalJson(STATE_KEY, state);
}

async function clearPersistedState() {
  if (!canUseLocalStorage()) return;
  window.localStorage.removeItem(STATE_KEY);
}

export const browserStateStorage = Object.freeze({
  load: loadPersistedState,
  save: savePersistedState,
  clear: clearPersistedState,
});

function removeLegacyState() {
  if (!canUseLocalStorage()) return;
  for (const key of LEGACY_STATE_KEYS) window.localStorage.removeItem(key);
}
