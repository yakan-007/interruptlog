'use client';

import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PlusCircle, Zap, CheckCircle2, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import TaskCard from '@/components/TaskCard';
import { Event, MyTask, TaskPlanning } from '@/types';
import { formatDateTimeLabel } from '@/utils/dateTime';
import useEventsStore from '@/store/useEventsStore';
import { useFeatureFlags, useTaskManagement, useArchivedTasks } from '@/hooks/useStoreSelectors';
import TaskPlanningDialog from '@/components/task/TaskPlanningDialog';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import ArchivedTasksDialog from '@/components/task/ArchivedTasksDialog';
import TaskEditDialog from '@/components/task/TaskEditDialog';

interface TaskManagementSectionProps {
  activeEvent?: Event;
}

export default function TaskManagementSection({ activeEvent }: TaskManagementSectionProps) {
  const { myTasks, categories, isCategoryEnabled, autoStartTask, actions } = useTaskManagement();
  const featureFlags = useFeatureFlags();
  const planningEnabled = featureFlags.enableTaskPlanning;
  const sortByDueDate = useEventsStore(state => state.uiSettings.sortTasksByDueDate);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskCategoryId, setNewTaskCategoryId] = useState<string>('');
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [newTaskPlannedDuration, setNewTaskPlannedDuration] = useState<string>('');
  const [newTaskDueAt, setNewTaskDueAt] = useState<string>('');
  const [planningEditorTaskId, setPlanningEditorTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState('');
  const [editingTaskDialogId, setEditingTaskDialogId] = useState<string | null>(null);
  const archivedTasks = useArchivedTasks();
  const archivedCount = archivedTasks.length;
  const recentArchivedTasks = useMemo(() => archivedTasks.slice(0, 5), [archivedTasks]);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);

  const {
    draggingItemId: draggingTaskId,
    dragOverItemId: dragOverTaskId,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDragEnd,
    handleDrop,
  } = useDragAndDrop(myTasks, actions.reorderMyTasks);

  const resetAdvancedInputs = () => {
    setNewTaskPlannedDuration('');
    setNewTaskDueAt('');
  };

  const createPlanningData = () => {
    if (!planningEnabled) return undefined;
    return buildPlanningFromInputs({
      plannedDuration: newTaskPlannedDuration,
      dueAt: newTaskDueAt,
    });
  };

  const handleAddNewTask = () => {
    if (newTaskName.trim() !== '') {
      const categoryId = newTaskCategoryId && newTaskCategoryId !== 'none' ? newTaskCategoryId : undefined;
      const planningData = createPlanningData();

      actions.addMyTask(newTaskName.trim(), categoryId, {
        planning: planningData,
      });
      setNewTaskName('');
      setNewTaskCategoryId('');
      resetAdvancedInputs();
    }
  };

  const handleStartEditTask = (taskId: string, currentName: string) => {
    setEditingTaskId(taskId);
    setEditingTaskName(currentName);
  };

  const handleSetEditingTaskName = (name: string) => {
    setEditingTaskName(name);
  };

  const handleCancelEditTask = () => {
    setEditingTaskId(null);
    setEditingTaskName('');
  };

  const resolveTaskById = (taskId: string) => myTasks.find(task => task.id === taskId);

  const handleSaveTaskName = (taskId: string) => {
    const trimmedName = editingTaskName.trim();
    if (!trimmedName) {
      handleCancelEditTask();
      return;
    }

    const targetTask = resolveTaskById(taskId);
    if (!targetTask) {
      handleCancelEditTask();
      return;
    }

    if (targetTask.name !== trimmedName) {
      actions.updateMyTask(taskId, trimmedName);
    }

    handleCancelEditTask();
  };

  const confirmAction = (message: string) => {
    if (typeof window === 'undefined') {
      return true;
    }
    return window.confirm(message);
  };

  const handleToggleCompletion = (taskId: string) => {
    const targetTask = resolveTaskById(taskId);
    if (!targetTask) {
      return;
    }

    const isActiveTask =
      activeEvent &&
      activeEvent.type === 'task' &&
      activeEvent.meta?.myTaskId === taskId &&
      !activeEvent.end;

    if (isActiveTask) {
      const confirmed = confirmAction('このタスクは現在実行中です。イベントを停止して完了にしますか？');
      if (!confirmed) {
        return;
      }
      actions.stopCurrentEvent();
    }

    actions.toggleMyTaskCompletion(taskId);
  };

  const handleStartEvent = (label: string, taskId?: string) => {
    actions.startTask(label, taskId);
  };

  const handleDeleteTask = (taskId: string) => {
    const message = 'このタスクを削除しますか？';
    if (!confirmAction(message)) {
      return;
    }
    actions.removeMyTask(taskId);
  };

  const handleRestoreArchivedTask = (taskId: string) => {
    actions.restoreArchivedTask(taskId);
  };

  const handleDeleteArchivedTask = (taskId: string) => {
    const message = 'アーカイブからこのタスクを削除しますか？';
    if (!confirmAction(message)) {
      return;
    }
    actions.deleteArchivedTask(taskId);
  };

  // Separate tasks by completion status
  const activeTasks = useMemo(
    () => myTasks.filter(task => !task.isCompleted),
    [myTasks],
  );

  const planningEditorTask = useMemo(
    () => (planningEditorTaskId ? myTasks.find(task => task.id === planningEditorTaskId) ?? null : null),
    [myTasks, planningEditorTaskId]
  );
  const taskEditDialogTask = useMemo(
    () => (editingTaskDialogId ? myTasks.find(task => task.id === editingTaskDialogId) ?? null : null),
    [myTasks, editingTaskDialogId]
  );

  useEffect(() => {
    if (!planningEnabled) {
      setIsAdvancedOpen(false);
      resetAdvancedInputs();
    }
  }, [planningEnabled]);

  useEffect(() => {
    if (!editingTaskId) {
      return;
    }

    const stillExists = myTasks.some(task => task.id === editingTaskId);
    if (!stillExists) {
      handleCancelEditTask();
    }
  }, [editingTaskId, myTasks]);

  useEffect(() => {
    if (!editingTaskDialogId) {
      return;
    }

    const stillExists = myTasks.some(task => task.id === editingTaskDialogId);
    if (!stillExists) {
      setEditingTaskDialogId(null);
    }
  }, [editingTaskDialogId, myTasks]);

  const handleOpenPlanningEditor = (taskId: string) => {
    setPlanningEditorTaskId(taskId);
  };

  const handleOpenTaskEditDialog = (taskId: string) => {
    setEditingTaskDialogId(taskId);
  };

  const handleClosePlanningEditor = () => {
    setPlanningEditorTaskId(null);
  };

  const handleCloseTaskEditDialog = () => {
    setEditingTaskDialogId(null);
  };

  const handleSavePlanning = (updates: { planning?: TaskPlanning | null }) => {
    if (!planningEditorTaskId) return;
    actions.updateMyTaskPlanning(planningEditorTaskId, updates);
    handleClosePlanningEditor();
  };

  const handleResetPlanning = () => {
    if (!planningEditorTaskId) return;
    actions.updateMyTaskPlanning(planningEditorTaskId, {
      planning: null,
    });
    handleClosePlanningEditor();
  };

  const handleSaveTaskEdits = (updates: { name: string; categoryId?: string }) => {
    if (!taskEditDialogTask) return;
    if (updates.name !== taskEditDialogTask.name) {
      actions.updateMyTask(taskEditDialogTask.id, updates.name);
    }
    if (isCategoryEnabled && updates.categoryId !== taskEditDialogTask.categoryId) {
      actions.updateMyTaskCategory(taskEditDialogTask.id, updates.categoryId);
    }
    handleCloseTaskEditDialog();
  };

  return (
    <div className="mb-8">
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">マイタスク</h2>
      </div>
      <div className="flex gap-2 mb-4">
        <Input
          type="text"
          value={newTaskName}
          onChange={(e) => setNewTaskName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleAddNewTask();
            }
          }}
          placeholder="新しいタスク名"
          className="flex-grow"
        />
        {isCategoryEnabled && (
          <Select value={newTaskCategoryId} onValueChange={setNewTaskCategoryId}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="カテゴリ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">カテゴリなし</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button 
          onClick={handleAddNewTask} 
          variant="outline"
          className={autoStartTask ? 'border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-300 dark:hover:bg-orange-900/20' : ''}
          title={autoStartTask ? 'タスク追加後、自動で開始されます' : 'タスクを追加します'}
        >
          {autoStartTask ? (
            <Zap className="mr-2 h-4 w-4" />
          ) : (
            <PlusCircle className="mr-2 h-4 w-4" />
          )}
          {autoStartTask ? '追加して開始' : 'タスクを追加'}
        </Button>
      </div>

      {planningEnabled && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(prev => !prev)}
            className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {isAdvancedOpen ? '詳細入力を閉じる' : '詳細を追加'}
          </button>
          {isAdvancedOpen && (
            <div className="mt-3 space-y-3 rounded-lg border border-gray-200 p-4 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">予定時間 (分)</label>
                  <Input
                    type="number"
                    min={0}
                    value={newTaskPlannedDuration}
                    onChange={event => setNewTaskPlannedDuration(event.target.value)}
                    placeholder="例: 90"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">期限</label>
                  <Input
                    type="datetime-local"
                    value={newTaskDueAt}
                    onChange={event => setNewTaskDueAt(event.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={resetAdvancedInputs}>
                  クリア
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Tasks Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <Circle className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            進行中のタスク ({activeTasks.length})
          </h3>
        </div>
        {sortByDueDate && (
          <p className="ml-6 text-xs text-gray-500 dark:text-gray-400">
            納期が近い順に並べ替えています。ドラッグでの順序入れ替えは一時的に無効です。
          </p>
        )}
        
        {activeTasks.map((task: MyTask) => (
          <TaskCard
            key={task.id}
            task={task}
            activeEvent={activeEvent}
            editingTaskId={editingTaskId}
            editingTaskName={editingTaskName}
            draggingTaskId={draggingTaskId}
            dragOverTaskId={dragOverTaskId}
            onStartEditTask={handleStartEditTask}
            onSaveTaskName={handleSaveTaskName}
            onCancelEditTask={handleCancelEditTask}
            onSetEditingTaskName={handleSetEditingTaskName}
            onToggleCompletion={handleToggleCompletion}
            onStartEvent={handleStartEvent}
            onDeleteTask={handleDeleteTask}
            onDragStart={sortByDueDate ? undefined : handleDragStart}
            onDragOver={sortByDueDate ? undefined : handleDragOver}
            onDragLeave={sortByDueDate ? undefined : handleDragLeave}
            onDrop={sortByDueDate ? undefined : handleDrop}
            onDragEnd={sortByDueDate ? undefined : handleDragEnd}
            onEditPlanning={planningEnabled ? handleOpenPlanningEditor : undefined}
            onEditTask={handleOpenTaskEditDialog}
            isDragDisabled={sortByDueDate}
          />
        ))}
        
        {activeTasks.length === 0 && (
          <p className="text-gray-500 text-sm ml-6">進行中のタスクがありません。新しいタスクを追加してください！</p>
        )}
      </div>

      {/* Archived Tasks Preview */}
      {archivedCount > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowCompletedTasks(!showCompletedTasks)}
            className="flex items-center gap-2 w-full text-left mb-3 hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-md transition-colors"
          >
            {showCompletedTasks ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              アーカイブ済みタスク ({archivedCount})
            </h3>
          </button>

          {showCompletedTasks && (
            <div className="space-y-2 ml-6">
              {recentArchivedTasks.map(task => (
                <div key={task.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-200">{task.name}</p>
                      <p className="text-xs text-slate-500">
                        完了: {formatDateTime(task.completedAt)} / アーカイブ: {formatDateTime(task.archivedAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleRestoreArchivedTask(task.id)}>
                        復元
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteArchivedTask(task.id)}>
                        削除
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {archivedCount > recentArchivedTasks.length && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setIsArchiveDialogOpen(true)}
                  className="px-0"
                >
                  すべて表示
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {planningEnabled && planningEditorTask && (
        <TaskPlanningDialog
          task={planningEditorTask}
          isOpen={Boolean(planningEditorTask)}
          onClose={handleClosePlanningEditor}
          onSave={handleSavePlanning}
          onReset={handleResetPlanning}
        />
      )}

      <TaskEditDialog
        task={taskEditDialogTask}
        categories={categories}
        isCategoryEnabled={isCategoryEnabled}
        isOpen={Boolean(taskEditDialogTask)}
        onClose={handleCloseTaskEditDialog}
        onSave={handleSaveTaskEdits}
      />

      <ArchivedTasksDialog
        open={isArchiveDialogOpen}
        onOpenChange={setIsArchiveDialogOpen}
        tasks={archivedTasks}
        onRestore={handleRestoreArchivedTask}
        onDelete={handleDeleteArchivedTask}
      />
    </div>
  );
}

function formatDateTime(timestamp?: number | null) {
  if (!timestamp) {
    return '-';
  }
  return formatDateTimeLabel(timestamp);
}

function buildPlanningFromInputs({
  plannedDuration,
  dueAt,
}: {
  plannedDuration: string;
  dueAt: string;
}): TaskPlanning | undefined {
  const cleanedDuration = plannedDuration ? Math.max(Number(plannedDuration), 0) : undefined;
  const parsedDueAt = dueAt ? new Date(dueAt).getTime() : undefined;
  const normalizedDueAt = parsedDueAt && !Number.isNaN(parsedDueAt) ? parsedDueAt : undefined;
  const planning: TaskPlanning = {
    plannedDurationMinutes: cleanedDuration && Number.isFinite(cleanedDuration) ? cleanedDuration : undefined,
    dueAt: normalizedDueAt ?? undefined,
  };

  const hasData = Object.values(planning).some(value => value !== undefined);
  return hasData ? planning : undefined;
}
