import { getLocaleConfig, LOCALES, normalizeLocale, SUPPORTED_LOCALES } from './localeConfig.js';

export { LOCALES, normalizeLocale, SUPPORTED_LOCALES };
export { categoryLabel, interruptCategoryLabel } from './taxonomy.js';
export { formatDate, formatDateHeader, formatDateTime, formatDuration, formatDurationShort, formatRelative, getDuePresets } from './formatters.js';

export function t(locale, path) {
  const parts = path.split('.');
  let value = getLocaleConfig(locale).text;
  for (const part of parts) value = value?.[part];
  return typeof value === 'string' ? value : path;
}

export function tx(locale, path, args) {
  const parts = path.split('.');
  let value = getLocaleConfig(locale).text;
  for (const part of parts) value = value?.[part];
  if (typeof value === 'function') return value(args ?? {});
  return value ?? path;
}

export function typeLabel(locale, type) {
  if (type === 'task') return t(locale, 'common.task');
  if (type === 'interrupt') return t(locale, 'common.interrupt');
  if (type === 'break') return t(locale, 'common.break');
  return t(locale, 'common.record');
}

export function urgencyLabel(locale, urgency) {
  if (urgency === 'low') return t(locale, 'common.low');
  if (urgency === 'high') return t(locale, 'common.high');
  return t(locale, 'common.medium');
}

export function translateMessage(locale, message) {
  if (normalizeLocale(locale) === 'ja-JP' || !message) return message;
  const messages = {
    '入力を確認してください': 'Check your input',
    '終了は開始より後にしてください': 'End must be after start',
    '開始と終了を正しく入力してください': 'Enter a valid start and end',
    'イベントが見つかりませんでした': 'Event not found',
    '現在進行中の時間帯は、いったん停止してから編集してください': 'Stop the current session before editing this time range',
    'JSONを読み込めませんでした': 'Could not read JSON',
    'タスク実行中': 'Task running',
    '割り込み中': 'Interruption active',
    '割り込み作業中': 'Handling interruption',
    '休憩中': 'On break',
    '割り込み': 'Interruption',
    '割り込み作業': 'Interruption',
    '割り込み作業が開始されていません': 'No interruption is in progress',
    '休憩': 'Break',
  };
  return messages[message] ?? message;
}
