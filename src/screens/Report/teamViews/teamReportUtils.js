import { formatDateTime, t } from '../../../i18n';

export function formatTemplateDue(dueAt, locale = 'ja-JP') {
  if (!Number.isFinite(dueAt)) return t(locale, 'team.noDue');
  return formatDateTime(dueAt, locale);
}

export function queuePriorityLabel(priority, locale = 'ja-JP') {
  if (priority === 'now') return t(locale, 'team.now');
  if (priority === 'today') return t(locale, 'team.today');
  return t(locale, 'team.later');
}
