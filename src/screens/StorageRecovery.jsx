import { useState } from 'react';
import Icons from '../icons';
import { t } from '../i18n';

export default function StorageRecoveryScreen({ locale, onDownload, onReset }) {
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [status, setStatus] = useState(null);

  const downloadRaw = async () => {
    try {
      await onDownload();
      setStatus({ tone: 'success', message: t(locale, 'storage.rawDownloaded') });
    } catch {
      setStatus({ tone: 'error', message: t(locale, 'storage.downloadFailed') });
    }
  };

  const reset = async () => {
    setResetting(true);
    setStatus(null);
    try {
      const result = await onReset();
      if (result.ok) return;
    } catch {
      // Keep the preserved payload available and show the same recovery error.
    }
    setResetting(false);
    setStatus({ tone: 'error', message: t(locale, 'storage.resetFailed') });
  };

  return (
    <main className="il-screen il-storage-recovery il-fade">
      <div className="il-storage-recovery-card">
        <div className="il-storage-recovery-icon" aria-hidden="true">{Icons.alert(28)}</div>
        <div className="il-storage-recovery-eyebrow">{t(locale, 'storage.recoveryEyebrow')}</div>
        <h1>{t(locale, 'storage.recoveryTitle')}</h1>
        <p>{t(locale, 'storage.recoveryCopy')}</p>

        <section className="il-storage-recovery-raw">
          <div className="title">{t(locale, 'storage.rawTitle')}</div>
          <div className="copy">{t(locale, 'storage.rawCopy')}</div>
        </section>

        {status && (
          <div className={`il-storage-recovery-status ${status.tone}`} role={status.tone === 'error' ? 'alert' : 'status'}>
            {status.message}
          </div>
        )}

        {!confirming ? (
          <div className="il-storage-recovery-actions">
            <button className="btn primary fill" onClick={downloadRaw}>{Icons.download(15)} {t(locale, 'storage.downloadRaw')}</button>
            <button className="btn danger fill" onClick={() => { setConfirming(true); setStatus(null); }}>{t(locale, 'storage.startFresh')}</button>
          </div>
        ) : (
          <section className="il-storage-recovery-confirm">
            <div className="title">{t(locale, 'storage.confirmTitle')}</div>
            <div className="copy">{t(locale, 'storage.confirmCopy')}</div>
            <div className="actions">
              <button className="btn tert" onClick={() => setConfirming(false)} disabled={resetting}>{t(locale, 'storage.cancel')}</button>
              <button className="btn danger fill" onClick={reset} disabled={resetting}>
                {resetting ? t(locale, 'storage.resetting') : t(locale, 'storage.confirmReset')}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
