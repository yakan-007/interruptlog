import { useMemo } from 'react';
import { formatDate, t, translateMessage } from '../i18n';

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

function createViewActions({ app, showToast, openSheet, closeSheet, clearInterruptDraft }) {
  const locale = app.state.preferences.locale;
  const toast = (message) => showToast(translateMessage(locale, message));
  const exportText = createTextExporter({ locale, toast });
  return {
    openSheet,
    closeSheet,
    ...createPassthroughActions({ app, closeSheet, clearInterruptDraft }),
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
    restoreTaskAndStart(id) {
      const result = app.actions.restoreTaskAndStart(id);
      if (!result.ok && result.error) toast(result.error);
      return result;
    },
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
    async exportJson() {
      await exportText({
        filename: datedFilename('interruptlog-backup', 'json'),
        content: () => app.actions.exportJson(),
        type: 'application/json',
        successKey: 'toasts.jsonExported',
      });
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
      await exportText({
        filename: datedFilename(`interruptlog-report-${range}`, 'csv'),
        content: () => app.actions.exportReportCsv(range),
        type: 'text/csv;charset=utf-8',
        downloadOnly: true,
        successKey: 'toasts.csvExported',
      });
    },
    async exportAnalysisCsv(range) {
      await exportText({
        filename: datedFilename(`interruptlog-analysis-${range}`, 'csv'),
        content: () => app.actions.exportAnalysisCsv(range),
        type: 'text/csv;charset=utf-8',
        downloadOnly: true,
        successKey: 'toasts.csvExported',
      });
    },
  };
}

function createPassthroughActions({ app, closeSheet, clearInterruptDraft }) {
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
    ]),
    ...bindActions(app.actions, callAndClose, [
      'stopTask',
      'deleteTask',
    ]),
    startTask(id) {
      app.actions.startTask(id);
      return { ok: true, error: null };
    },
    createInterruptFollowupTask(interruptData, taskData) {
      const result = app.actions.createInterruptFollowupTask(interruptData, taskData);
      if (result.ok) {
        clearInterruptDraft();
        closeSheet();
      }
      return result;
    },
    saveInterrupt(data) {
      const result = app.actions.saveInterrupt(data);
      clearInterruptDraft();
      closeSheet();
      return result;
    },
    saveBreak(data) {
      const result = app.actions.saveBreak(data);
      clearInterruptDraft();
      closeSheet();
      return result;
    },
    cancelInterrupt() {
      const result = app.actions.cancelInterrupt();
      clearInterruptDraft();
      closeSheet();
      return result;
    },
    stopInterrupt(resume) {
      const result = app.actions.stopInterrupt(resume);
      clearInterruptDraft();
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
  return async ({ filename, content, type, downloadOnly = false, successKey }) => {
    try {
      await shareOrDownloadText(
        filename,
        typeof content === 'function' ? content() : content,
        type,
        { downloadOnly }
      );
      toast(t(locale, successKey));
    } catch {
      toast(t(locale, 'toasts.exportCanceled'));
    }
  };
}

function datedFilename(base, extension) {
  return `${base}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

export function useViewActions(args) {
  const { app, showToast, openSheet, closeSheet, clearInterruptDraft } = args;
  return useMemo(
    () => createViewActions({ app, showToast, openSheet, closeSheet, clearInterruptDraft }),
    [app, showToast, openSheet, closeSheet, clearInterruptDraft]
  );
}

async function shareOrDownloadText(filename, content, type, options = {}) {
  const file = new File([content], filename, { type });
  if (!options.downloadOnly && navigator.canShare?.({ files: [file] })) {
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
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
