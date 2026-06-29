import { useCallback, useMemo, useState } from 'react';

export function useSheetController(app, showOnboarding) {
  const [sheet, setSheet] = useState(null);
  const [sheetArg, setSheetArg] = useState(null);
  const [interruptDraft, setInterruptDraft] = useState(null);

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
      app.actions.beginPause(arg?.categoryId ?? null);
      setInterruptDraft(null);
      setSheet('pause');
      setSheetArg(arg ?? null);
      return;
    }
    if (nextSheet === 'newInterrupt') {
      app.actions.beginPause(firstPauseCategoryId(app.state, 'interrupt'));
      setInterruptDraft(null);
      setSheet('pause');
      setSheetArg(null);
      return;
    }
    if (nextSheet === 'newBreak') {
      app.actions.beginPause(firstPauseCategoryId(app.state, 'break'));
      setSheet('pause');
      setSheetArg(null);
      return;
    }
    if (nextSheet === 'interrupt') {
      const isNewInterrupt = app.state.running?.type !== 'interrupt';
      if (isNewInterrupt) app.actions.beginPause(firstPauseCategoryId(app.state, 'interrupt'));
      const draft = arg ?? (isNewInterrupt ? null : interruptDraft ?? app.state.running?.draft ?? null);
      if (isNewInterrupt) setInterruptDraft(draft);
      setSheet('pause');
      setSheetArg(draft);
      return;
    }
    if (nextSheet === 'break') {
      if (app.state.running?.type !== 'break') app.actions.beginPause(firstPauseCategoryId(app.state, 'break'));
      setSheet('pause');
      setSheetArg(arg ?? null);
      return;
    }
    setSheet(nextSheet);
    setSheetArg(arg);
  }, [app.actions, app.state, interruptDraft]);

  const updateInterruptDraft = useCallback((draft) => {
    setInterruptDraft(draft);
    app.actions.updateInterruptDraft(draft);
    if (sheet === 'interrupt' || sheet === 'pause') setSheetArg(draft);
  }, [app.actions, sheet]);

  const clearInterruptDraft = useCallback(() => {
    setInterruptDraft(null);
  }, []);

  const restoreSheet = useCallback((nextSheet, arg) => {
    setSheet(nextSheet);
    setSheetArg(arg ?? null);
  }, []);

  return useMemo(() => ({
    closeSheet,
    openSheet,
    restoreSheet,
    updateInterruptDraft,
    clearInterruptDraft,
    activeSheet: sheet ?? (!showOnboarding && app.overlapRepair.pending ? 'repairOverlaps' : null),
    activeSheetArg: sheet == null ? app.overlapRepair.pending : sheetArg,
  }), [app.overlapRepair.pending, clearInterruptDraft, closeSheet, openSheet, restoreSheet, sheet, sheetArg, showOnboarding, updateInterruptDraft]);
}

function firstPauseCategoryId(state, kind) {
  return state.interruptCats.find((category) => category.kind === kind)?.id
    ?? state.interruptCats[0]?.id
    ?? null;
}
