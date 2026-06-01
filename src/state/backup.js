import { APP_NAME, SCHEMA_VERSION, normalizeState } from './schema';
import { isObject } from './utils';

export function buildBackup(state, now = Date.now()) {
  return {
    appName: APP_NAME,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date(now).toISOString(),
    state: normalizeState(state, now),
  };
}

export function parseBackup(input, now = Date.now()) {
  const parsed = typeof input === 'string' ? JSON.parse(input) : input;
  if (!isObject(parsed)) throw new Error('invalid backup');
  if (Object.prototype.hasOwnProperty.call(parsed, 'state')) {
    if (parsed.schemaVersion !== SCHEMA_VERSION) throw new Error('unsupported schema');
    return normalizeState(parsed.state, now, { assumeOnboarded: true });
  }
  return normalizeState(parsed, now, { assumeOnboarded: true });
}
