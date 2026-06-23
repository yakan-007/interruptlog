import { useCallback, useMemo, useRef, useState } from 'react';
import { useAppLifecycle } from './app/lifecycle';
import { buildViewState, useViewActions } from './app/controller';
import { useAppLayout } from './app/useAppLayout';
import { useSheetController } from './app/useSheetController';
import { useToast } from './app/useToast';
import {
  AddMissedSheet,
  AddTaskSheet,
  BreakSheet,
  ConfirmStopSheet,
  InterruptSheet,
  RepairOverlapsSheet,
  ResolveEventSheet,
  ResumeOrStopSheet,
  WorkdayEndSheet,
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
import { t, translateMessage } from './i18n';

const TABS = [
  { id: 'log', labelKey: 'tabs.log', icon: Icons.tasks },
  { id: 'history', labelKey: 'tabs.history', icon: Icons.history },
  { id: 'report', labelKey: 'tabs.report', icon: Icons.report },
  { id: 'settings', labelKey: 'tabs.settings', icon: Icons.settings },
];

export default function App() {
  const app = useAppState();
  const [tab, setTab] = useState('log');
  const containerRef = useRef(null);
  const state = useMemo(() => buildViewState(app), [app]);
  const showOnboarding = app.ready && !state.preferences.onboardingDone;
  const { activeSheet, activeSheetArg, closeSheet, openSheet, restoreSheet } = useSheetController(app, showOnboarding);
  const { showToast, toast } = useToast();
  useAppLayout(containerRef, app.state.preferences);
  const actions = useViewActions({ app, showToast, openSheet, closeSheet });

  const handleResolutionBack = useCallback(() => {
    if (!activeSheetArg?.returnSheet) {
      closeSheet();
      return;
    }
    restoreSheet(activeSheetArg.returnSheet, activeSheetArg.returnArg);
  }, [activeSheetArg, closeSheet, restoreSheet]);

  const handleResolutionConfirm = useCallback((resolution) => {
    if (resolution.mode === 'taskRecord') {
      const result = actions.saveTaskRecord(resolution.record);
      if (!result.ok) return;
      closeSheet();
      showToast(translateMessage(state.preferences.locale, resolution.successMessage ?? t(state.preferences.locale, 'toasts.eventSaved')));
      return;
    }
    actions.applyResolution(resolution.preview);
    closeSheet();
    showToast(translateMessage(state.preferences.locale, resolution.successMessage ?? t(state.preferences.locale, 'toasts.eventSaved')));
  }, [actions, closeSheet, showToast, state.preferences.locale]);

  const handleRepairApply = useCallback(() => {
    if (!activeSheetArg?.nextEvents && !state.overlapRepair.pending) return;
    const preview = activeSheetArg?.nextEvents ? activeSheetArg : state.overlapRepair.pending;
    actions.applyResolution(preview);
    closeSheet();
    showToast(t(state.preferences.locale, 'toasts.repaired'));
  }, [actions, activeSheetArg, closeSheet, showToast, state.overlapRepair.pending, state.preferences.locale]);

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
        <OnboardingScreen actions={actions} locale={state.preferences.locale} />
      ) : (
        <>
          <div className="il-appcontent">
            {tab === 'log' && <LogScreen state={state} actions={actions} />}
            {tab === 'history' && <HistoryScreen state={state} actions={actions} />}
            {tab === 'report' && <ReportScreen state={state} actions={actions} />}
            {tab === 'settings' && <SettingsScreen state={state} actions={actions} />}

            {state.running && !activeSheet && (
              <RunningBar
                state={state}
                actions={actions}
                raised={tab === 'log'}
                compact={tab !== 'log'}
                locale={state.preferences.locale}
              />
            )}
            {toast && <div className="il-toast">{Icons.check(14)} {toast}</div>}

            {activeSheet === 'interrupt' && <InterruptSheet state={state} actions={actions} onClose={actions.cancelInterrupt} initialDraft={activeSheetArg} />}
            {activeSheet === 'break' && <BreakSheet state={state} actions={actions} onClose={actions.cancelInterrupt} />}
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
            {activeSheet === 'interruptFollowup' && (
              <AddTaskSheet
                state={state}
                actions={actions}
                onClose={closeSheet}
                followup
                interruptData={activeSheetArg}
                onBackToInterrupt={() => openSheet('interrupt', activeSheetArg)}
                draft={{ name: activeSheetArg?.label ?? '' }}
              />
            )}
            {activeSheet === 'editTask' && <AddTaskSheet state={state} actions={actions} onClose={closeSheet} editing={activeSheetArg} />}
            {activeSheet === 'workdayEnd' && <WorkdayEndSheet state={state} actions={actions} onClose={closeSheet} />}
            {activeSheet === 'addMissed' && <AddMissedSheet state={state} actions={actions} onClose={closeSheet} initialDraft={activeSheetArg} />}
            {activeSheet === 'editEvent' && <EditEventSheet event={activeSheetArg} state={state} actions={actions} onClose={closeSheet} />}
            {activeSheet === 'resolveEvent' && <ResolveEventSheet resolution={activeSheetArg} locale={state.preferences.locale} onBack={handleResolutionBack} onConfirm={handleResolutionConfirm} />}
            {activeSheet === 'repairOverlaps' && <RepairOverlapsSheet preview={activeSheetArg ?? state.overlapRepair.pending} locale={state.preferences.locale} onDefer={handleRepairDefer} onApply={handleRepairApply} />}
          </div>

          <nav className="il-tabbar">
            {TABS.map((item) => (
              <TabButton key={item.id} icon={item.icon} label={t(state.preferences.locale, item.labelKey)} active={tab === item.id} onClick={() => setTab(item.id)} />
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
