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
        setSheetArg(app.state.running?.draft ?? arg ?? null);
        return;
      }
      if (arg?.kind === 'break') app.actions.beginBreak();
      else app.actions.beginPause(arg?.categoryId ?? null);
      setSheet('pause');
      setSheetArg(arg ?? null);
      return;
    }
    setSheet(nextSheet);
    setSheetArg(arg);
  }, [app.actions, app.state]);

  const updateInterruptDraft = useCallback((draft) => {
    app.actions.updateInterruptDraft(draft);
    if (sheet === 'pause') setSheetArg(draft);
  }, [app.actions, sheet]);

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
