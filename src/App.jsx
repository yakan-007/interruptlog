import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppLifecycle } from './app/lifecycle';
import { buildViewState, useViewActions } from './app/controller';
import {
  AddMissedSheet,
  AddTaskSheet,
  BreakSheet,
  ConfirmStopSheet,
  InterruptSheet,
  RepairOverlapsSheet,
  ResolveEventSheet,
  ResumeOrStopSheet,
} from './components/sheets';
import RunningBar from './components/RunningBar';
import Icons from './icons';
import EditEventSheet from './screens/History/EditEventSheet';
import HistoryScreen from './screens/History';
import LogScreen from './screens/Log';
import OnboardingScreen from './screens/Onboarding';
import ReportScreen from './screens/Report';
import SettingsScreen from './screens/Settings';
import { useAppState } from './useAppState';

const TABS = [
  { id: 'log', label: 'タスク', icon: Icons.tasks },
  { id: 'history', label: '履歴', icon: Icons.history },
  { id: 'report', label: 'レポート', icon: Icons.report },
  { id: 'settings', label: '設定', icon: Icons.settings },
];

export default function App() {
  const app = useAppState();
  const [tab, setTab] = useState('log');
  const [sheet, setSheet] = useState(null);
  const [sheetArg, setSheetArg] = useState(null);
  const [toast, setToast] = useState(null);

  const containerRef = useRef(null);
  const toastTimeoutRef = useRef(null);

  const closeSheet = useCallback(() => {
    setSheet(null);
    setSheetArg(null);
  }, []);

  const openSheet = useCallback((nextSheet, arg) => {
    if (nextSheet === 'interrupt') app.actions.beginInterrupt();
    else if (nextSheet === 'break') app.actions.beginBreak();
    setSheet(nextSheet);
    setSheetArg(arg);
  }, [app.actions]);

  const showToast = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => () => clearTimeout(toastTimeoutRef.current), []);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.setAttribute('data-theme', app.state.preferences.dark ? 'dark' : 'light');
    containerRef.current.style.setProperty('--accent', app.state.preferences.accent);
  }, [app.state.preferences.accent, app.state.preferences.dark]);

  useEffect(() => {
    const updateKeyboardInset = () => {
      const viewport = window.visualViewport;
      const inset = viewport
        ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
        : 0;
      containerRef.current?.style.setProperty('--keyboard-inset', `${Math.round(inset)}px`);
    };

    updateKeyboardInset();
    window.visualViewport?.addEventListener('resize', updateKeyboardInset);
    window.visualViewport?.addEventListener('scroll', updateKeyboardInset);
    window.addEventListener('resize', updateKeyboardInset);
    return () => {
      window.visualViewport?.removeEventListener('resize', updateKeyboardInset);
      window.visualViewport?.removeEventListener('scroll', updateKeyboardInset);
      window.removeEventListener('resize', updateKeyboardInset);
    };
  }, []);

  const state = useMemo(() => buildViewState(app), [app]);
  const actions = useViewActions({ app, showToast, openSheet, closeSheet });
  const showOnboarding = app.ready && !state.preferences.onboardingDone;
  const activeSheet = sheet ?? (!showOnboarding && state.overlapRepair.pending ? 'repairOverlaps' : null);
  const activeSheetArg = sheet == null ? state.overlapRepair.pending : sheetArg;

  const handleResolutionBack = useCallback(() => {
    if (!sheetArg?.returnSheet) {
      closeSheet();
      return;
    }
    setSheet(sheetArg.returnSheet);
    setSheetArg(sheetArg.returnArg ?? null);
  }, [closeSheet, sheetArg]);

  const handleResolutionConfirm = useCallback((resolution) => {
    actions.applyResolution(resolution.preview);
    closeSheet();
    showToast(resolution.successMessage ?? 'イベントを保存しました');
  }, [actions, closeSheet, showToast]);

  const handleRepairApply = useCallback(() => {
    if (!activeSheetArg?.nextEvents && !state.overlapRepair.pending) return;
    const preview = activeSheetArg?.nextEvents ? activeSheetArg : state.overlapRepair.pending;
    actions.applyResolution(preview);
    closeSheet();
    showToast('重複イベントを整理しました');
  }, [actions, activeSheetArg, closeSheet, showToast, state.overlapRepair.pending]);

  const handleRepairDefer = useCallback(() => {
    actions.deferOverlapRepair();
    closeSheet();
  }, [actions, closeSheet]);

  useAppLifecycle({
    enabled: app.ready,
    persistNow: app.persistNow,
    resyncNow: app.resyncNow,
  });

  if (!app.ready) {
    return <div ref={containerRef} className="il il-appshell" data-theme={app.state.preferences.dark ? 'dark' : 'light'} />;
  }

  return (
    <div ref={containerRef} className="il il-appshell" data-theme={state.preferences.dark ? 'dark' : 'light'}>
      {showOnboarding ? (
        <OnboardingScreen actions={actions} />
      ) : (
        <>
          <div className="il-appcontent">
            {tab === 'log' && <LogScreen state={state} actions={actions} />}
            {tab === 'history' && <HistoryScreen state={state} actions={actions} />}
            {tab === 'report' && <ReportScreen state={state} actions={actions} />}
            {tab === 'settings' && <SettingsScreen state={state} actions={actions} />}

            {state.running && (
              <RunningBar
                state={state}
                actions={actions}
                raised={tab === 'log'}
                compact={tab !== 'log'}
              />
            )}
            {toast && <div className="il-toast">{Icons.check(14)} {toast}</div>}

            {activeSheet === 'interrupt' && <InterruptSheet state={state} actions={actions} onClose={closeSheet} />}
            {activeSheet === 'break' && <BreakSheet state={state} actions={actions} onClose={closeSheet} />}
            {activeSheet === 'resumeOrStop' && <ResumeOrStopSheet state={state} actions={actions} onClose={closeSheet} />}
            {activeSheet === 'confirmStop' && <ConfirmStopSheet state={state} actions={actions} onClose={closeSheet} />}
            {activeSheet === 'addTask' && (
              <AddTaskSheet
                state={state}
                actions={actions}
                onClose={closeSheet}
                draft={activeSheetArg?.draft}
                onDraftChange={activeSheetArg?.onDraftChange}
                onAfterSubmit={activeSheetArg?.onAfterSubmit}
              />
            )}
            {activeSheet === 'editTask' && <AddTaskSheet state={state} actions={actions} onClose={closeSheet} editing={activeSheetArg} />}
            {activeSheet === 'addMissed' && <AddMissedSheet actions={actions} onClose={closeSheet} initialDraft={activeSheetArg} />}
            {activeSheet === 'editEvent' && <EditEventSheet event={activeSheetArg} state={state} actions={actions} onClose={closeSheet} />}
            {activeSheet === 'resolveEvent' && <ResolveEventSheet resolution={activeSheetArg} onBack={handleResolutionBack} onConfirm={handleResolutionConfirm} />}
            {activeSheet === 'repairOverlaps' && <RepairOverlapsSheet preview={activeSheetArg ?? state.overlapRepair.pending} onDefer={handleRepairDefer} onApply={handleRepairApply} />}
          </div>

          <nav className="il-tabbar">
            {TABS.map((item) => (
              <TabButton key={item.id} icon={item.icon} label={item.label} active={tab === item.id} onClick={() => setTab(item.id)} />
            ))}
          </nav>
        </>
      )}
    </div>
  );
}

function TabButton({ icon, label, active, onClick }) {
  return (
    <button className={'il-tab' + (active ? ' active' : '')} onClick={onClick}>
      <span className="il-tabicon" aria-hidden="true">{icon(22)}</span>
      <span>{label}</span>
    </button>
  );
}
