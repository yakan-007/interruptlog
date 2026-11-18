import { t, tx } from '../../i18n';
import {
  ExportRow,
  NavRow,
  RepairWarningRow,
  SettingsNote,
} from './SettingsRows';
import { getBackupStatus } from './settingsPresentation';

export default function PersonalDataSections({ state, actions, locale, onOpenPanel, now }) {
  const backupStatus = getBackupStatus(state.preferences.lastBackupExportAt, locale, now);
  const reportProfile = state.preferences.reportProfile ?? { affiliation: '', name: '' };
  const reportProfileNote = [reportProfile.affiliation, reportProfile.name]
    .filter(Boolean)
    .join(' · ') || t(locale, 'settings.reportProfileUnset');

  return (
    <>
      <div className="il-section-h"><span>{t(locale, 'settings.frequentInputs')}</span></div>
      <div className="il-settings-group">
        <NavRow title={t(locale, 'settings.whoChips')} note={state.whoChips.length ? state.whoChips.join(' · ') : t(locale, 'settings.noSavedItems')} onClick={() => onOpenPanel({ type: 'chips', kind: 'who' })} />
        <NavRow title={t(locale, 'settings.subjectChips')} note={tx(locale, 'common.count', state.subjectChips.length)} onClick={() => onOpenPanel({ type: 'chips', kind: 'subject' })} />
      </div>

      <div className="il-section-h"><span>{t(locale, 'settings.data')}</span></div>
      {state.overlapRepair.warning && (
        <div className="il-settings-group">
          <RepairWarningRow locale={locale} onRepair={() => actions.openOverlapRepair()} />
        </div>
      )}
      <div className="il-settings-group">
        <NavRow title={t(locale, 'settings.reportProfile')} note={reportProfileNote} onClick={() => onOpenPanel({ type: 'reportProfile' })} />
        <SettingsNote lines={tx(locale, 'settings.storageLines')} />
        <ExportRow title={t(locale, 'settings.exportBackup')} note={backupStatus.note} due={backupStatus.due} onClick={() => actions.exportJson()} />
        <NavRow title={t(locale, 'settings.importBackup')} onClick={() => onOpenPanel({ type: 'import' })} />
        <NavRow title={t(locale, 'settings.resetAll')} danger onClick={() => onOpenPanel({ type: 'reset' })} />
      </div>

      <div className="il-settings-footnote">
        <div className="title">{t(locale, 'settings.webFootTitle')}</div>
        <div className="il-settings-footlinks">
          <a href="/privacy.html" target="_blank" rel="noreferrer">{t(locale, 'settings.privacyPolicy')}</a>
          <a href="https://github.com/yakan-007/interruptlog" target="_blank" rel="noreferrer">{t(locale, 'settings.feedback')}</a>
        </div>
      </div>
    </>
  );
}
