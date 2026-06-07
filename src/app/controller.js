import { useMemo } from 'react';

const DATE_LABEL_OPTIONS = { month: 'long', day: 'numeric', weekday: 'short' };
const PAUSED_START_MESSAGE = '先に現在の割り込みや休憩を処理してください';

export function buildViewState(app) {
  return {
    ready: app.ready,
    lastError: app.lastError,
    todayLabel: new Date().toLocaleDateString('ja-JP', DATE_LABEL_OPTIONS),
    interruptCats: app.state.interruptCats,
    tasks: app.state.tasks,
    taskTemplates: app.state.taskTemplates,
    events: app.state.events,
    categories: app.state.categories,
    whoChips: app.state.whoChips,
    subjectChips: app.state.subjectChips,
    teamWorkspace: app.state.teamWorkspace,
    teamArchive: app.state.teamArchive,
    preferences: app.state.preferences,
    running: app.state.running,
    activeTasks: app.derived.activeTasks,
    completedTasks: app.derived.completedTasks,
    runningTaskMeta: app.derived.runningTaskMeta,
    overlapRepair: {
      pending: app.overlapRepair.pending,
      warning: app.overlapRepair.deferred ?? app.overlapRepair.pending,
    },
  };
}

export function createViewActions({ app, showToast, openSheet, closeSheet }) {
  return {
    openSheet,
    closeSheet,
    startTask(id) {
      if (app.state.running?.type === 'interrupt' || app.state.running?.type === 'break') {
        showToast(PAUSED_START_MESSAGE);
        return { ok: false, error: PAUSED_START_MESSAGE };
      }
      app.actions.startTask(id);
      return { ok: true, error: null };
    },
    stopTask(complete) {
      app.actions.stopTask(complete);
      closeSheet();
    },
    completeTask(id) {
      app.actions.completeTask(id);
    },
    restoreTask(id) {
      app.actions.restoreTask(id);
    },
    restoreTaskAndStart(id) {
      const result = app.actions.restoreTaskAndStart(id);
      if (!result.ok && result.error) showToast(result.error);
      return result;
    },
    uncompleteTask: app.actions.uncompleteTask,
    deleteTask(id) {
      app.actions.deleteTask(id);
      closeSheet();
    },
    reorderTask(id, direction) {
      app.actions.reorderTask(id, direction);
    },
    moveTaskToIndex(id, targetIndex) {
      app.actions.moveTaskToIndex(id, targetIndex);
    },
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
        showToast(PAUSED_START_MESSAGE);
        return { ok: false, error: PAUSED_START_MESSAGE };
      }
      const result = app.actions.createTaskAndStart(data);
      if (!result.ok && result.error) showToast(result.error);
      return result;
    },
    saveInterrupt(data) {
      app.actions.saveInterrupt(data);
      closeSheet();
    },
    cancelInterrupt() {
      app.actions.cancelInterrupt();
      closeSheet();
    },
    stopInterrupt(resume) {
      app.actions.stopInterrupt(resume);
      closeSheet();
    },
    saveBreak(data) {
      app.actions.saveBreak(data);
      closeSheet();
    },
    setBreakTarget(minutes) {
      app.actions.setBreakTarget(minutes);
    },
    previewSaveEvent: app.actions.previewSaveEvent,
    saveEvent: app.actions.saveEvent,
    deleteEvent: app.actions.deleteEvent,
    addMissedEvent(event, options) {
      const result = app.actions.addMissedEvent(event, options);
      if (result.ok) {
        closeSheet();
        showToast('イベントを追加しました');
      } else {
        showToast(result.error ?? '入力を確認してください');
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
    deferOverlapRepair() {
      app.actions.deferOverlapRepair();
    },
    saveCategory(category) {
      app.actions.saveCategory(category);
    },
    deleteCategory(id) {
      app.actions.deleteCategory(id);
    },
    saveInterruptCategory(category) {
      app.actions.saveInterruptCategory(category);
    },
    deleteInterruptCategory(id) {
      app.actions.deleteInterruptCategory(id);
    },
    saveChips(kind, chips) {
      app.actions.saveChips(kind, chips);
    },
    saveTaskTemplate(template) {
      return app.actions.saveTaskTemplate(template);
    },
    deleteTaskTemplate(id) {
      app.actions.deleteTaskTemplate(id);
    },
    async exportJson() {
      try {
        await shareOrDownloadText(
          `interruptlog-backup-${new Date().toISOString().slice(0, 10)}.json`,
          app.actions.exportJson(),
          'application/json'
        );
        showToast('JSONを書き出しました');
      } catch {
        showToast('書き出しをキャンセルしました');
      }
    },
    async exportTeamSettings() {
      try {
        await shareOrDownloadText(
          `interruptlog-team-settings-${new Date().toISOString().slice(0, 10)}.json`,
          app.actions.exportTeamSettings(),
          'application/json'
        );
        showToast('チーム設定を書き出しました');
      } catch {
        showToast('書き出しをキャンセルしました');
      }
    },
    importTeamSettings(payload) {
      const result = app.actions.importTeamSettings(payload);
      showToast(result.ok
        ? `チーム設定を読み込みました (${result.addedCategories}件追加)`
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
        showToast('タスクパックを書き出しました');
      } catch {
        showToast('書き出しをキャンセルしました');
      }
    },
    importTaskPack(payload) {
      const result = app.actions.importTaskPack(payload);
      showToast(result.ok
        ? `タスクパックを読み込みました (${result.addedTasks}件追加)`
        : result.error);
      return result;
    },
    addRowsToTeamArchive(rows) {
      const result = app.actions.addRowsToTeamArchive(rows);
      showToast(result.ok
        ? `アーカイブに保存しました (${result.addedEntries}行)`
        : result.error);
      return result;
    },
    async exportTeamArchive() {
      try {
        await shareOrDownloadText(
          `interruptlog-team-archive-${new Date().toISOString().slice(0, 10)}.json`,
          app.actions.exportTeamArchive(),
          'application/json'
        );
        showToast('チームアーカイブを書き出しました');
      } catch {
        showToast('書き出しをキャンセルしました');
      }
    },
    importTeamArchive(payload) {
      const result = app.actions.importTeamArchive(payload);
      showToast(result.ok
        ? `チームアーカイブを読み込みました (${result.addedEntries}行追加)`
        : result.error);
      return result;
    },
    importJson(payload) {
      const result = app.actions.importJson(payload);
      showToast(result.ok ? 'JSONを読み込みました' : result.error);
      return result;
    },
    finishOnboarding() {
      app.actions.finishOnboarding();
    },
    async exportReportCsv(range) {
      if (app.state.preferences.teamModeEnabled && !app.state.preferences.memberName.trim()) {
        showToast('設定で表示名を入力してください');
        return;
      }
      try {
        await shareOrDownloadText(
          `interruptlog-report-${range}-${new Date().toISOString().slice(0, 10)}.csv`,
          app.actions.exportReportCsv(range),
          'text/csv;charset=utf-8'
        );
        showToast('CSVを書き出しました');
      } catch {
        showToast('書き出しをキャンセルしました');
      }
    },
    resetAll() {
      app.actions.resetAll();
    },
    setDark: app.actions.setDark,
    setAccent: app.actions.setAccent,
    setMemberName: app.actions.setMemberName,
    setTeamModeEnabled: app.actions.setTeamModeEnabled,
    setTopAdd: app.actions.setTopAdd,
    setSortDue: app.actions.setSortDue,
    setShowTodayStrip: app.actions.setShowTodayStrip,
    setHistoryView: app.actions.setHistoryView,
  };
}

export function useViewActions(args) {
  const { app, showToast, openSheet, closeSheet } = args;
  return useMemo(
    () => createViewActions({ app, showToast, openSheet, closeSheet }),
    [app, showToast, openSheet, closeSheet]
  );
}

export async function shareOrDownloadText(filename, content, type) {
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
