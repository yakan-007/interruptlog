import {
  buildBackup,
  buildReportCsv,
  parseBackup,
  previewOverlapRepairInState,
} from '../../state';

export function createDataCommands({ getState, setLastError, setOverlapRepairUi, setTrackedAppState }) {
  return {
    exportJson() {
      return JSON.stringify(buildBackup(getState()), null, 2);
    },
    importJson(payload) {
      try {
        const imported = parseBackup(payload);
        setTrackedAppState(imported);
        const preview = previewOverlapRepairInState(imported, Date.now());
        setOverlapRepairUi({ sheetOpen: Boolean(preview), deferred: false });
        setLastError(null);
        return { ok: true, error: null, requiresRepair: Boolean(preview) };
      } catch {
        const error = 'JSONを読み込めませんでした';
        setLastError(error);
        return { ok: false, error, requiresRepair: false };
      }
    },
    exportReportCsv(range) {
      return buildReportCsv(getState(), range);
    },
  };
}
