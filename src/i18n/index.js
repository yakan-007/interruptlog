import { getLocaleConfig, LOCALES, normalizeLocale, SUPPORTED_LOCALES } from './localeConfig.js';
import { ERROR_CODES } from '../domain/errors.js';

const ERROR_MESSAGE_PATHS = {
  [ERROR_CODES.CHECK_INPUT]: 'errors.checkInput',
  [ERROR_CODES.END_NOT_AFTER_START]: 'errors.invalidWindow',
  [ERROR_CODES.EVENT_NOT_FOUND]: 'errors.eventNotFound',
  [ERROR_CODES.INTERRUPT_NOT_ACTIVE]: 'errors.interruptNotActive',
  [ERROR_CODES.INVALID_BACKUP]: 'errors.invalidBackup',
  [ERROR_CODES.INVALID_EVENT_WINDOW]: 'errors.invalidEventWindow',
  [ERROR_CODES.RUNNING_OVERLAP]: 'errors.runningOverlap',
  [ERROR_CODES.SAME_DAY_REQUIRED]: 'errors.sameDayRequired',
  [ERROR_CODES.TASK_CREATE_FAILED]: 'errors.taskCreateFailed',
  [ERROR_CODES.TASK_NAME_REQUIRED]: 'errors.taskNameRequired',
  [ERROR_CODES.TASK_NOT_FOUND]: 'errors.taskNotFound',
};

export { LOCALES, normalizeLocale, SUPPORTED_LOCALES };
export { categoryLabel, interruptCategoryLabel } from './taxonomy.js';
export { formatDate, formatDateHeader, formatDateTime, formatDueAt, formatDuration, formatDurationShort, formatRelative, getDuePresets } from './formatters.js';

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

export function translateError(locale, errorCode, fallbackPath = 'errors.checkInput') {
  return t(locale, ERROR_MESSAGE_PATHS[errorCode] ?? fallbackPath);
}
