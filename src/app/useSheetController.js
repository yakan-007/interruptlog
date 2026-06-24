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
    if (nextSheet === 'newInterrupt') {
      app.actions.beginInterrupt();
      setInterruptDraft(null);
      setSheet('interrupt');
      setSheetArg(null);
      return;
    }
    if (nextSheet === 'newBreak') {
      app.actions.beginBreak();
      setSheet('break');
      setSheetArg(null);
      return;
    }
    if (nextSheet === 'interrupt') {
      const isNewInterrupt = app.state.running?.type !== 'interrupt';
      if (isNewInterrupt) app.actions.beginInterrupt();
      const draft = arg ?? (isNewInterrupt ? null : interruptDraft ?? app.state.running?.draft ?? null);
      if (isNewInterrupt) setInterruptDraft(draft);
      setSheet(nextSheet);
      setSheetArg(draft);
      return;
    }
    else if (nextSheet === 'break' && app.state.running?.type !== 'break') app.actions.beginBreak();
    setSheet(nextSheet);
    setSheetArg(arg);
  }, [app.actions, app.state.running?.draft, app.state.running?.type, interruptDraft]);

  const updateInterruptDraft = useCallback((draft) => {
    setInterruptDraft(draft);
    app.actions.updateInterruptDraft(draft);
    if (sheet === 'interrupt') setSheetArg(draft);
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
