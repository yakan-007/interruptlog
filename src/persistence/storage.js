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

// Another tab of the app saved: hand over what it saved, so this tab shows it
// instead of later overwriting it with an older copy.
function subscribeToOtherTabs(onChange) {
  if (typeof window === 'undefined') return () => {};
  const handleStorage = (event) => {
    if (event.key !== STATE_KEY || event.storageArea !== window.localStorage) return;
    if (event.newValue === null) {
      onChange(null);
      return;
    }
    try {
      onChange(JSON.parse(event.newValue));
    } catch {
      // A half-written or foreign value; the next save from that tab will follow.
    }
  };
  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}

async function clearPersistedState() {
  if (!canUseLocalStorage()) return;
  window.localStorage.removeItem(STATE_KEY);
}

export const browserStateStorage = Object.freeze({
  load: loadPersistedState,
  save: savePersistedState,
  clear: clearPersistedState,
  subscribe: subscribeToOtherTabs,
});

function removeLegacyState() {
  if (!canUseLocalStorage()) return;
  for (const key of LEGACY_STATE_KEYS) window.localStorage.removeItem(key);
}
