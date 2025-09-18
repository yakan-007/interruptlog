'use client';

import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PlusCircle, Zap, CheckCircle2, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import TaskCard from '@/components/TaskCard';
import { Event, MyTask, TaskPlanning } from '@/types';
import useEventsStore from '@/store/useEventsStore';
import { useFeatureFlags, useTaskManagement } from '@/hooks/useStoreSelectors';
import TaskPlanningDialog from '@/components/task/TaskPlanningDialog';

interface TaskManagementSectionProps {
  activeEvent?: Event;
  editingTaskId: string | null;
  editingTaskName: string;
  draggingTaskId: string | null;
  dragOverTaskId: string | null;
  onStartEditTask: (taskId: string, currentName: string) => void;
  onSaveTaskName: (taskId: string) => void;
  onCancelEditTask: () => void;
  onSetEditingTaskName: (name: string) => void;
  onToggleCompletion: (taskId: string) => void;
  onStartEvent: (label: string, taskId?: string) => void;
  onDeleteTask: (taskId: string) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, targetTaskId: string) => void;
  onDragEnd: () => void;
}

export default function TaskManagementSection({
  activeEvent,
  editingTaskId,
  editingTaskName,
  draggingTaskId,
  dragOverTaskId,
  onStartEditTask,
  onSaveTaskName,
  onCancelEditTask,
  onSetEditingTaskName,
  onToggleCompletion,
  onStartEvent,
  onDeleteTask,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: TaskManagementSectionProps) {
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

  const resetAdvancedInputs = () => {
    setNewTaskPlannedDuration('');
    setNewTaskDueAt('');
  };

  const handleAddNewTask = () => {
    if (newTaskName.trim() !== '') {
      const categoryId = newTaskCategoryId && newTaskCategoryId !== 'none' ? newTaskCategoryId : undefined;
      const planningData: TaskPlanning | undefined = planningEnabled
        ? buildPlanningFromInputs({
            plannedDuration: newTaskPlannedDuration,
            dueAt: newTaskDueAt,
          })
        : undefined;

      actions.addMyTask(newTaskName.trim(), categoryId, {
        planning: planningData,
      });
      setNewTaskName('');
      setNewTaskCategoryId('');
      resetAdvancedInputs();
    }
  };

  // Separate tasks by completion status
  const { activeTasks, completedTasks } = useMemo(() => {
    const active = myTasks.filter(task => !task.isCompleted);
    const completed = myTasks.filter(task => task.isCompleted);
    return { activeTasks: active, completedTasks: completed };
  }, [myTasks]);

  const planningEditorTask = useMemo(
    () => (planningEditorTaskId ? myTasks.find(task => task.id === planningEditorTaskId) ?? null : null),
    [myTasks, planningEditorTaskId]
  );

  useEffect(() => {
    if (!planningEnabled) {
      setIsAdvancedOpen(false);
      resetAdvancedInputs();
    }
  }, [planningEnabled]);

  const handleOpenPlanningEditor = (taskId: string) => {
    setPlanningEditorTaskId(taskId);
  };

  const handleClosePlanningEditor = () => {
    setPlanningEditorTaskId(null);
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

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-2">マイタスク</h2>
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
            onStartEditTask={onStartEditTask}
            onSaveTaskName={onSaveTaskName}
            onCancelEditTask={onCancelEditTask}
            onSetEditingTaskName={onSetEditingTaskName}
            onToggleCompletion={onToggleCompletion}
            onStartEvent={onStartEvent}
            onDeleteTask={onDeleteTask}
            onDragStart={sortByDueDate ? undefined : onDragStart}
            onDragOver={sortByDueDate ? undefined : onDragOver}
            onDragLeave={sortByDueDate ? undefined : onDragLeave}
            onDrop={sortByDueDate ? undefined : onDrop}
            onDragEnd={sortByDueDate ? undefined : onDragEnd}
            onEditPlanning={planningEnabled ? handleOpenPlanningEditor : undefined}
            isDragDisabled={sortByDueDate}
          />
        ))}
        
        {activeTasks.length === 0 && (
          <p className="text-gray-500 text-sm ml-6">進行中のタスクがありません。新しいタスクを追加してください！</p>
        )}
      </div>

      {/* Completed Tasks Section */}
      {completedTasks.length > 0 && (
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
              完了済みタスク ({completedTasks.length})
            </h3>
          </button>
          
          {showCompletedTasks && (
            <div className="space-y-2 ml-6">
              {completedTasks.map((task: MyTask) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  activeEvent={activeEvent}
                  editingTaskId={editingTaskId}
                  editingTaskName={editingTaskName}
                  draggingTaskId={draggingTaskId}
                  dragOverTaskId={dragOverTaskId}
                  onStartEditTask={onStartEditTask}
                  onSaveTaskName={onSaveTaskName}
                  onCancelEditTask={onCancelEditTask}
                  onSetEditingTaskName={onSetEditingTaskName}
                  onToggleCompletion={onToggleCompletion}
                  onStartEvent={onStartEvent}
                  onDeleteTask={onDeleteTask}
                  onDragStart={sortByDueDate ? undefined : onDragStart}
                  onDragOver={sortByDueDate ? undefined : onDragOver}
                  onDragLeave={sortByDueDate ? undefined : onDragLeave}
                  onDrop={sortByDueDate ? undefined : onDrop}
                  onDragEnd={sortByDueDate ? undefined : onDragEnd}
                  onEditPlanning={planningEnabled ? handleOpenPlanningEditor : undefined}
                  isDragDisabled={sortByDueDate}
                />
              ))}
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
    </div>
  );
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
