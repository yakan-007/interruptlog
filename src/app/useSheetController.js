import { useCallback, useMemo, useState } from 'react';

export function useSheetController(app, showOnboarding) {
  const [sheet, setSheet] = useState(null);
  const [sheetArg, setSheetArg] = useState(null);

  const closeSheet = useCallback(() => {
    setSheet(null);
    setSheetArg(null);
  }, []);

  const openSheet = useCallback((nextSheet, arg) => {
    if (nextSheet === 'newPause') {
      if (app.state.running?.type === 'interrupt' || app.state.running?.type === 'break') {
        setSheet('pause');
        setSheetArg(null);
        return;
      }
      if (arg?.kind === 'break') app.actions.beginBreak();
      else app.actions.beginPause(arg?.categoryId ?? null);
      // The pause sheet reads its draft from the running pause, never from here,
      // so a pause started after a split cannot inherit the previous one's input.
      setSheet('pause');
      setSheetArg(null);
      return;
    }
    setSheet(nextSheet);
    setSheetArg(arg);
  }, [app.actions, app.state]);

  const updateInterruptDraft = useCallback((draft) => {
    app.actions.updateInterruptDraft(draft);
  }, [app.actions]);

  const restoreSheet = useCallback((nextSheet, arg) => {
    setSheet(nextSheet);
    setSheetArg(arg ?? null);
  }, []);

  return useMemo(() => ({
    closeSheet,
    openSheet,
    restoreSheet,
    updateInterruptDraft,
    activeSheet: sheet ?? (!showOnboarding && app.overlapRepair.pending ? 'repairOverlaps' : null),
    activeSheetArg: sheet == null ? app.overlapRepair.pending : sheetArg,
  }), [app.overlapRepair.pending, closeSheet, openSheet, restoreSheet, sheet, sheetArg, showOnboarding, updateInterruptDraft]);
}
