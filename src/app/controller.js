import { useMemo } from 'react';
import { formatDate, t, translateError } from '../i18n';
import { ERROR_CODES } from '../domain/errors';
import { systemClock } from '../platform/clock';

export function buildViewState(app, clock = systemClock) {
  return {
    ...app.state,
    ready: app.ready,
    todayLabel: formatDate(clock.now(), app.state.preferences.locale, { month: 'long', weekday: 'short' }),
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
  const toast = (message) => showToast(message);
  const exportText = createTextExporter({ locale, toast });
  return {
    openSheet,
    closeSheet,
    ...createPassthroughActions({ app, closeSheet }),
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
        toast(translateError(locale, ERROR_CODES.PAUSE_ACTIVE));
        return { ok: false, errorCode: ERROR_CODES.PAUSE_ACTIVE };
      }
      const result = app.actions.createTaskAndStart(data);
      if (!result.ok && result.errorCode) toast(translateError(locale, result.errorCode));
      return result;
    },
    restoreTaskAndStart(id) {
      const result = app.actions.restoreTaskAndStart(id);
      if (!result.ok && result.errorCode) toast(translateError(locale, result.errorCode));
      return result;
    },
    addMissedEvent(event, options) {
      const result = app.actions.addMissedEvent(event, options);
      if (result.ok) {
        closeSheet();
        toast(t(locale, 'toasts.eventAdded'));
      } else {
        toast(translateError(locale, result.errorCode));
      }
      return result;
    },
    async exportJson() {
      await exportText({
        filename: datedFilename('interruptlog-backup', 'json'),
        content: () => app.actions.exportJson(),
        type: 'application/json',
        downloadOnly: true,
        successKey: 'toasts.jsonExported',
        afterSuccess: () => app.actions.markBackupExported(),
      });
    },
    importJson(payload) {
      const result = app.actions.importJson(payload);
      toast(result.ok ? t(locale, 'toasts.jsonImported') : translateError(locale, result.errorCode));
      return result;
    },
    finishOnboarding() {
      app.actions.finishOnboarding();
    },
    async exportReportCsv(range, asOf) {
      await exportText({
        filename: datedFilename(`interruptlog-report-${range}`, 'csv', asOf),
        content: () => app.actions.exportReportCsv(range, asOf),
        type: 'text/csv;charset=utf-8',
        downloadOnly: true,
        successKey: 'toasts.csvExported',
      });
    },
    async exportAnalysisCsv(range, asOf) {
      await exportText({
        filename: datedFilename(`interruptlog-analysis-${range}`, 'csv', asOf),
        content: () => app.actions.exportAnalysisCsv(range, asOf),
        type: 'text/csv;charset=utf-8',
        downloadOnly: true,
        successKey: 'toasts.csvExported',
      });
    },
  };
}

function createPassthroughActions({ app, closeSheet }) {
  const call = (action) => (...args) => action(...args);
  const callAndClose = (action) => (...args) => {
    const result = action(...args);
    closeSheet();
    return result;
  };
  return {
    ...bindActions(app.actions, call, [
      'completeTask',
      'restoreTask',
      'uncompleteTask',
      'reorderTask',
      'moveTaskToIndex',
      'selectPauseCategory',
      'setBreakTarget',
      'saveCategory',
      'deleteCategory',
      'moveCategoryToIndex',
      'saveInterruptCategory',
      'deleteInterruptCategory',
      'moveInterruptCategoryToIndex',
      'saveChips',
      'moveChipToIndex',
      'setDark',
      'setAccent',
      'setLocale',
      'setTopAdd',
      'setSortDue',
      'setWorkSchedule',
      'setTodayWorkdayEnd',
      'clearTodayWorkdayEnd',
      'setHistoryView',
      'setReportProfile',
      'finishOnboarding',
      'resetAll',
      'beginNextPause',
    ]),
    ...bindActions(app.actions, callAndClose, [
      'stopTask',
      'deleteTask',
    ]),
    startTask(id) {
      app.actions.startTask(id);
      return { ok: true, errorCode: null };
    },
    createInterruptFollowupTask(interruptData, taskData) {
      const result = app.actions.createInterruptFollowupTask(interruptData, taskData);
      if (result.ok) closeSheet();
      return result;
    },
    saveInterrupt(data) {
      const result = app.actions.saveInterrupt(data);
      closeSheet();
      return result;
    },
    saveBreak(data) {
      const result = app.actions.saveBreak(data);
      closeSheet();
      return result;
    },
    cancelInterrupt() {
      const result = app.actions.cancelInterrupt();
      closeSheet();
      return result;
    },
    stopInterrupt(resume) {
      const result = app.actions.stopInterrupt(resume);
      closeSheet();
      return result;
    },
    previewSaveEvent: app.actions.previewSaveEvent,
    saveEvent: app.actions.saveEvent,
    previewTaskRecord: app.actions.previewTaskRecord,
    saveTaskRecord: app.actions.saveTaskRecord,
    deleteEvent: app.actions.deleteEvent,
    previewAddMissedEvent: app.actions.previewAddMissedEvent,
    applyResolution: app.actions.applyResolution,
    openOverlapRepair: app.actions.openOverlapRepair,
    deferOverlapRepair: call(app.actions.deferOverlapRepair),
  };
}

function bindActions(actions, bind, names) {
  return Object.fromEntries(names.map((name) => [name, bind(actions[name])]));
}

function createTextExporter({ locale, toast }) {
  return async ({ filename, content, type, downloadOnly = false, successKey, afterSuccess }) => {
    try {
      await shareOrDownloadText(
        filename,
        typeof content === 'function' ? content() : content,
        type,
        { downloadOnly }
      );
      afterSuccess?.();
      toast(t(locale, successKey));
    } catch {
      toast(t(locale, 'toasts.exportCanceled'));
    }
  };
}

function datedFilename(base, extension, timestamp = null) {
  const dateKey = timestamp == null
    ? new Date().toISOString().slice(0, 10)
    : localDateKey(timestamp);
  return `${base}-${dateKey}.${extension}`;
}

function localDateKey(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useViewActions(args) {
  const { app, showToast, openSheet, closeSheet } = args;
  return useMemo(
    () => createViewActions({ app, showToast, openSheet, closeSheet }),
    [app, showToast, openSheet, closeSheet]
  );
}

export async function shareOrDownloadText(filename, content, type, options = {}) {
  const file = new File([content], filename, { type });
  if (!options.downloadOnly && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
    }
  }
  downloadFile(file, filename);
}

function downloadFile(file, filename) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
