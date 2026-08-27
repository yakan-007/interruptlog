import {
  buildAnalysisCsv,
  buildBackup,
  buildReportCsv,
  parseBackup,
  previewOverlapRepairInState,
  setPreferenceInState,
} from '../../state';
import { ERROR_CODES } from '../../domain/errors';

export function createDataCommands({ getState, mutate, now, setOverlapRepairUi, setTrackedAppState }) {
  return {
    exportJson() {
      return JSON.stringify(buildBackup(getState(), now()), null, 2);
    },
    markBackupExported(timestamp = now()) {
      mutate((state) => setPreferenceInState(state, 'lastBackupExportAt', timestamp));
    },
    importJson(payload) {
      try {
        const currentTime = now();
        const imported = parseBackup(payload, currentTime);
        setTrackedAppState(imported);
        const preview = previewOverlapRepairInState(imported, currentTime);
        setOverlapRepairUi({ sheetOpen: Boolean(preview), deferred: false });
        return { ok: true, errorCode: null, requiresRepair: Boolean(preview) };
      } catch {
        return { ok: false, errorCode: ERROR_CODES.INVALID_BACKUP, requiresRepair: false };
      }
    },
    exportReportCsv(range, asOf = now()) {
      return buildReportCsv(getState(), range, asOf);
    },
    exportAnalysisCsv(range, asOf = now()) {
      return buildAnalysisCsv(getState(), range, asOf);
    },
  };
}
