import { useState } from 'react';
import Icons from '../icons';
import { t } from '../i18n';

export default function PersistenceWarning({ locale, onExport, onRetry }) {
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <section className="il-persistence-warning" role="alert" aria-live="assertive">
      <div className="il-persistence-warning-icon" aria-hidden="true">{Icons.alert(16)}</div>
      <div className="il-persistence-warning-content">
        <div className="title">{t(locale, 'storage.saveFailedTitle')}</div>
        <div className="copy">{t(locale, 'storage.saveFailedCopy')}</div>
        <div className="actions">
          <button className="btn secondary sm" onClick={retry} disabled={retrying}>
            {retrying ? t(locale, 'storage.retrying') : t(locale, 'storage.retry')}
          </button>
          <button className="btn secondary sm" onClick={onExport}>{Icons.download(13)} {t(locale, 'storage.exportBackup')}</button>
        </div>
      </div>
    </section>
  );
}
