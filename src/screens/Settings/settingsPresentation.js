import { t, tx } from '../../i18n';

const BACKUP_REMINDER_DAYS = 7;
const DAY_MS = 86_400_000;

export function getBackupStatus(lastBackupExportAt, locale, now = Date.now()) {
  if (!lastBackupExportAt) {
    return {
      due: true,
      note: t(locale, 'settings.exportBackupNever'),
    };
  }

  const days = Math.floor((now - lastBackupExportAt) / DAY_MS);
  if (days >= BACKUP_REMINDER_DAYS) {
    return {
      due: true,
      note: tx(locale, 'settings.exportBackupDue', days),
    };
  }

  return {
    due: false,
    note: tx(locale, 'settings.exportBackupFresh', formatBackupDate(lastBackupExportAt, locale)),
  };
}

function formatBackupDate(timestamp, locale) {
  return new Intl.DateTimeFormat(locale, {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}
