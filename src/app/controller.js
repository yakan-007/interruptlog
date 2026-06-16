import { useMemo } from 'react';
import { FEATURES } from '../features';
import { formatDate, t, translateMessage, tx } from '../i18n';

const PAUSED_START_MESSAGE = '先に現在の割り込みや休憩を処理してください';

export function buildViewState(app) {
  return {
    ...app.state,
    ready: app.ready,
    lastError: app.lastError,
    todayLabel: formatDate(Date.now(), app.state.preferences.locale, { month: 'long', weekday: 'short' }),
    activeTasks: app.derived.activeTasks,
    completedTasks: app.derived.completedTasks,
    runningTaskMeta: app.derived.runningTaskMeta,
    overlapRepair: {
      pending: app.overlapRepair.pending,
      warning: app.overlapRepair.deferred ?? app.overlapRepair.pending,
    },
  };
}

function createViewActions({ app, showToast, openSheet, closeSheet }) {
  const locale = app.state.preferences.locale;
  const toast = (message) => showToast(translateMessage(locale, message));
  const call = (action) => (...args) => action(...args);
  const callAndClose = (action) => (...args) => {
    const result = action(...args);
    closeSheet();
    return result;
  };
  return {
    openSheet,
    closeSheet,
    startTask(id) {
      app.actions.startTask(id);
      return { ok: true, error: null };
    },
    stopTask: callAndClose(app.actions.stopTask),
    completeTask: call(app.actions.completeTask),
    restoreTask: call(app.actions.restoreTask),
    restoreTaskAndStart(id) {
      const result = app.actions.restoreTaskAndStart(id);
      if (!result.ok && result.error) toast(result.error);
      return result;
    },
    uncompleteTask: app.actions.uncompleteTask,
    deleteTask: callAndClose(app.actions.deleteTask),
    reorderTask: call(app.actions.reorderTask),
    moveTaskToIndex: call(app.actions.moveTaskToIndex),
    saveTask(data) {
      const result = app.actions.saveTask(data);
      if (result.ok) closeSheet();
      return result;
    },
    createTask(data) {
      const result = app.actions.createTask(data);
      return result;
    },
    createTaskAndStart(data) {
      if (app.state.running?.type === 'interrupt' || app.state.running?.type === 'break') {
        toast(PAUSED_START_MESSAGE);
        return { ok: false, error: PAUSED_START_MESSAGE };
      }
      const result = app.actions.createTaskAndStart(data);
      if (!result.ok && result.error) toast(result.error);
      return result;
    },
    saveInterrupt: callAndClose(app.actions.saveInterrupt),
    cancelInterrupt: callAndClose(app.actions.cancelInterrupt),
    stopInterrupt: callAndClose(app.actions.stopInterrupt),
    saveBreak: callAndClose(app.actions.saveBreak),
    setBreakTarget: call(app.actions.setBreakTarget),
    previewSaveEvent: app.actions.previewSaveEvent,
    saveEvent: app.actions.saveEvent,
    deleteEvent: app.actions.deleteEvent,
    addMissedEvent(event, options) {
      const result = app.actions.addMissedEvent(event, options);
      if (result.ok) {
        closeSheet();
        toast(t(locale, 'toasts.eventAdded'));
      } else {
        toast(result.error ?? t(locale, 'errors.checkInput'));
      }
      return result;
    },
    previewAddMissedEvent: app.actions.previewAddMissedEvent,
    applyResolution(preview) {
      return app.actions.applyResolution(preview);
    },
    openOverlapRepair() {
      return app.actions.openOverlapRepair();
    },
    deferOverlapRepair: call(app.actions.deferOverlapRepair),
    saveCategory: call(app.actions.saveCategory),
    deleteCategory: call(app.actions.deleteCategory),
    saveInterruptCategory: call(app.actions.saveInterruptCategory),
    deleteInterruptCategory: call(app.actions.deleteInterruptCategory),
    saveChips: call(app.actions.saveChips),
    saveTaskTemplate(template) {
      return app.actions.saveTaskTemplate(template);
    },
    deleteTaskTemplate: call(app.actions.deleteTaskTemplate),
    async exportJson() {
      try {
        await shareOrDownloadText(
          `interruptlog-backup-${new Date().toISOString().slice(0, 10)}.json`,
          app.actions.exportJson(),
          'application/json'
        );
        toast(t(locale, 'toasts.jsonExported'));
      } catch {
        toast(t(locale, 'toasts.exportCanceled'));
      }
    },
    async exportTeamSettings() {
      try {
        await shareOrDownloadText(
          `interruptlog-team-settings-${new Date().toISOString().slice(0, 10)}.json`,
          app.actions.exportTeamSettings(),
          'application/json'
        );
        toast(t(locale, 'toasts.teamSettingsExported'));
      } catch {
        toast(t(locale, 'toasts.exportCanceled'));
      }
    },
    importTeamSettings(payload) {
      const result = app.actions.importTeamSettings(payload);
      toast(result.ok
        ? `${t(locale, 'settings.importTeamSettings')} (${result.addedCategories})`
        : result.error);
      return result;
    },
    async exportTaskPack() {
      try {
        await shareOrDownloadText(
          `interruptlog-task-pack-${new Date().toISOString().slice(0, 10)}.json`,
          app.actions.exportTaskPack(),
          'application/json'
        );
        toast(t(locale, 'toasts.taskPackExported'));
      } catch {
        toast(t(locale, 'toasts.exportCanceled'));
      }
    },
    importTaskPack(payload) {
      const result = app.actions.importTaskPack(payload);
      toast(result.ok
        ? `${t(locale, 'team.distribution')} (${result.addedTasks})`
        : result.error);
      return result;
    },
    addRowsToTeamArchive(rows) {
      const result = app.actions.addRowsToTeamArchive(rows);
      toast(result.ok
        ? tx(locale, 'toasts.archiveSaved', result.addedEntries)
        : result.error);
      return result;
    },
    addTeamDemoArchive() {
      const result = app.actions.addTeamDemoArchive();
      toast(result.ok ? t(locale, 'toasts.demoAdded') : result.error);
      return result;
    },
    async exportTeamArchive() {
      try {
        await shareOrDownloadText(
          `interruptlog-team-archive-${new Date().toISOString().slice(0, 10)}.json`,
          app.actions.exportTeamArchive(),
          'application/json'
        );
        toast(t(locale, 'toasts.teamArchiveExported'));
      } catch {
        toast(t(locale, 'toasts.exportCanceled'));
      }
    },
    importTeamArchive(payload) {
      const result = app.actions.importTeamArchive(payload);
      toast(result.ok
        ? `${t(locale, 'settings.importTeamArchive')} (${result.addedEntries})`
        : result.error);
      return result;
    },
    importJson(payload) {
      const result = app.actions.importJson(payload);
      toast(result.ok ? t(locale, 'toasts.jsonImported') : result.error);
      return result;
    },
    finishOnboarding() {
      app.actions.finishOnboarding();
    },
    async exportReportCsv(range) {
      if (FEATURES.teamUi && app.state.preferences.teamModeEnabled && !app.state.preferences.memberName.trim()) {
        toast(t(locale, 'toasts.memberNameRequired'));
        return;
      }
      try {
        await shareOrDownloadText(
          `interruptlog-report-${range}-${new Date().toISOString().slice(0, 10)}.csv`,
          app.actions.exportReportCsv(range),
          'text/csv;charset=utf-8'
        );
        toast(t(locale, 'toasts.csvExported'));
      } catch {
        toast(t(locale, 'toasts.exportCanceled'));
      }
    },
    resetAll() {
      app.actions.resetAll();
    },
    setDark: app.actions.setDark,
    setAccent: app.actions.setAccent,
    setMemberName: app.actions.setMemberName,
    setLocale: app.actions.setLocale,
    setTeamModeEnabled: app.actions.setTeamModeEnabled,
    setTeamLightsEnabled: app.actions.setTeamLightsEnabled,
    setTopAdd: app.actions.setTopAdd,
    setSortDue: app.actions.setSortDue,
    setHistoryView: app.actions.setHistoryView,
    updateTeamWorkspace: app.actions.updateTeamWorkspace,
    addInterruptionQueueItem: app.actions.addInterruptionQueueItem,
    updateInterruptionQueueItem: app.actions.updateInterruptionQueueItem,
    deleteInterruptionQueueItem: app.actions.deleteInterruptionQueueItem,
  };
}

export function useViewActions(args) {
  const { app, showToast, openSheet, closeSheet } = args;
  return useMemo(
    () => createViewActions({ app, showToast, openSheet, closeSheet }),
    [app, showToast, openSheet, closeSheet]
  );
}

async function shareOrDownloadText(filename, content, type) {
  const file = new File([content], filename, { type });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: filename });
    return;
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
