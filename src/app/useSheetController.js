import { useCallback, useMemo, useState } from 'react';

export function useSheetController(app, showOnboarding) {
  const [sheet, setSheet] = useState(null);
  const [sheetArg, setSheetArg] = useState(null);

  const closeSheet = useCallback(() => {
    setSheet(null);
    setSheetArg(null);
  }, []);

  const openSheet = useCallback((nextSheet, arg) => {
    if (nextSheet === 'interrupt' && app.state.running?.type !== 'interrupt') app.actions.beginInterrupt();
    else if (nextSheet === 'break' && app.state.running?.type !== 'break') app.actions.beginBreak();
    setSheet(nextSheet);
    setSheetArg(arg);
  }, [app.actions, app.state.running?.type]);

  const restoreSheet = useCallback((nextSheet, arg) => {
    setSheet(nextSheet);
    setSheetArg(arg ?? null);
  }, []);

  return useMemo(() => ({
    closeSheet,
    openSheet,
    restoreSheet,
    activeSheet: sheet ?? (!showOnboarding && app.overlapRepair.pending ? 'repairOverlaps' : null),
    activeSheetArg: sheet == null ? app.overlapRepair.pending : sheetArg,
  }), [app.overlapRepair.pending, closeSheet, openSheet, restoreSheet, sheet, sheetArg, showOnboarding]);
}
