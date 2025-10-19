import { SliceContext } from './shared';
import { createTaskWithOrdering, handleAutoStartTask, reorderTasks, removeTaskAndReorder } from '../taskHelpers';
import { sortMyTasks, reassignOrder } from '../hydrationHelpers';
import { Event, TaskPlanning, MyTask, ArchivedTask, Category, TaskLifecycleRecord } from '@/types';

type TaskActionKeys =
  | 'addMyTask'
  | 'removeMyTask'
  | 'updateMyTask'
  | 'updateMyTaskPlanning'
  | 'setMyTasks'
  | 'restoreArchivedTask'
  | 'deleteArchivedTask'
  | 'toggleMyTaskCompletion'
  | 'setMyTaskCompletion'
  | 'reorderMyTasks'
  | 'getTaskTotalDuration'
  | 'updateMyTaskCategory';

export const createTaskActions = ({
  set,
  get,
  persist,
  getActions,
}: SliceContext): Pick<import('../types').EventsActions, TaskActionKeys> => {
  const isTaskCurrentlyRunning = (taskId: string) => {
    const { currentEventId, events } = get();
    if (!currentEventId) {
      return false;
    }
    const activeEvent = events.find(event => event.id === currentEventId && !event.end);
    return Boolean(activeEvent && activeEvent.type === 'task' && activeEvent.meta?.myTaskId === taskId);
  };

  const getCategoryById = (categoryId?: string) =>
    categoryId ? get().categories.find(cat => cat.id === categoryId) : undefined;

  const buildLedgerBase = (
    task: MyTask,
    category: Category | undefined,
    existing?: TaskLifecycleRecord,
  ): TaskLifecycleRecord => ({
    id: existing?.id ?? task.id,
    name: task.name,
    createdAt: existing?.createdAt ?? task.createdAt,
    createdCategoryId: existing?.createdCategoryId ?? task.categoryId ?? null,
    createdCategoryName: existing?.createdCategoryName ?? category?.name,
    createdPlannedMinutes: existing?.createdPlannedMinutes ?? task.planning?.plannedDurationMinutes ?? null,
    createdDueAt: existing?.createdDueAt ?? task.planning?.dueAt ?? null,
    latestCategoryId: task.categoryId ?? existing?.latestCategoryId ?? null,
    latestCategoryName: category?.name ?? existing?.latestCategoryName,
    latestPlannedMinutes: task.planning?.plannedDurationMinutes ?? existing?.latestPlannedMinutes ?? null,
    latestDueAt: task.planning?.dueAt ?? existing?.latestDueAt ?? null,
    completedAt: existing?.completedAt ?? null,
    completedCategoryId: existing?.completedCategoryId ?? null,
    completedCategoryName: existing?.completedCategoryName,
    completedPlannedMinutes: existing?.completedPlannedMinutes ?? null,
    completedDueAt: existing?.completedDueAt ?? null,
    canceledAt: existing?.canceledAt ?? null,
    canceledCategoryId: existing?.canceledCategoryId ?? null,
    canceledCategoryName: existing?.canceledCategoryName,
  });

  const mergeLedgerForTask = (
    ledger: Record<string, TaskLifecycleRecord>,
    task: MyTask,
    category: Category | undefined,
    overrides?: Partial<TaskLifecycleRecord>,
  ): TaskLifecycleRecord => ({
    ...buildLedgerBase(task, category, ledger[task.id]),
    ...overrides,
  });

  const archiveActiveTask = (task: MyTask) => {
    const category = getCategoryById(task.categoryId);
    const now = Date.now();
    const completedAt = task.completedAt ?? now;

    set(state => {
      const updatedLedger = mergeLedgerForTask(state.taskLedger, task, category, {
        completedAt,
        completedCategoryId: task.categoryId ?? null,
        completedCategoryName: category?.name,
        completedPlannedMinutes: task.planning?.plannedDurationMinutes ?? null,
        completedDueAt: task.planning?.dueAt ?? null,
      });

      const archivedTask: ArchivedTask = {
        ...task,
        isCompleted: true,
        completedAt,
        archivedAt: now,
      };

      return {
        myTasks: reassignOrder(state.myTasks.filter(item => item.id !== task.id)),
        archivedTasks: [archivedTask, ...state.archivedTasks.filter(item => item.id !== task.id)],
        taskLedger: {
          ...state.taskLedger,
          [task.id]: updatedLedger,
        },
      };
    });

    persistMyTasksState();
    persistArchivedTasks();
    persistTaskLedger();
  };

  const restoreTaskFromArchive = (taskId: string) => {
    const archivedTask = get().archivedTasks.find(task => task.id === taskId);
    if (!archivedTask) {
      return;
    }

    const category = getCategoryById(archivedTask.categoryId);
    const { archivedAt, ...rest } = archivedTask;
    const restoredBase: MyTask = {
      ...rest,
      isCompleted: false,
      completedAt: null,
    };

    set(state => ({
      myTasks: reassignOrder([
        ...state.myTasks,
        {
          ...restoredBase,
          order: state.myTasks.length,
        },
      ]),
      archivedTasks: state.archivedTasks.filter(task => task.id !== taskId),
      taskLedger: {
        ...state.taskLedger,
        [taskId]: mergeLedgerForTask(state.taskLedger, restoredBase, category, {
          completedAt: null,
          completedCategoryId: null,
          completedCategoryName: undefined,
          completedPlannedMinutes: null,
          completedDueAt: null,
        }),
      },
    }));

    persistMyTasksState();
    persistArchivedTasks();
    persistTaskLedger();
  };

  const {
    persistMyTasksState,
    persistTaskLedger,
    persistMyTasksStateDebounced,
    persistEventsState,
    persistArchivedTasks,
  } = persist;

  return {
    addMyTask: (
      name: string,
      categoryId?: string,
      options?: { suppressAutoStart?: boolean; planning?: TaskPlanning },
    ) => {
      const actions = getActions();
      const { myTasks: currentTasks, addTaskToTop, autoStartTask, currentEventId, events, categories } = get();
      const suppressAutoStart = options?.suppressAutoStart ?? false;
      const planning = options?.planning;

      try {
        const { newTask, updatedTasks } = createTaskWithOrdering({
          name,
          categoryId,
          addToTop: addTaskToTop,
          existingTasks: currentTasks,
          planning,
        });

        const category = categories.find(cat => cat.id === categoryId);
        const plannedMinutes = planning?.plannedDurationMinutes ?? null;
        const dueAt = planning?.dueAt ?? null;

        set(state => ({
          myTasks: updatedTasks,
          taskLedger: {
            ...state.taskLedger,
            [newTask.id]: {
              id: newTask.id,
              name: newTask.name,
              createdAt: newTask.createdAt,
              createdCategoryId: category?.id ?? null,
              createdCategoryName: category?.name,
              createdPlannedMinutes: plannedMinutes,
              createdDueAt: dueAt,
              latestCategoryId: category?.id ?? null,
              latestCategoryName: category?.name,
              latestPlannedMinutes: plannedMinutes,
              latestDueAt: dueAt,
              completedAt: null,
              completedCategoryId: null,
              completedCategoryName: undefined,
              completedPlannedMinutes: null,
              completedDueAt: null,
              canceledAt: null,
              canceledCategoryId: null,
              canceledCategoryName: undefined,
            },
          },
        }));
        persistMyTasksState();
        persistTaskLedger();

        if (autoStartTask && !suppressAutoStart) {
          handleAutoStartTask({
            task: newTask,
            currentEventId,
            events,
            startTaskAction: actions.startTask,
            updateEventAction: actions.updateEvent,
          });
        }
      } catch (error) {
        console.error('[useEventsStore] Error adding task:', error);
      }
    },

    removeMyTask: (id: string) => {
      const { myTasks: currentTasks, categories } = get();
      const taskToRemove = currentTasks.find(task => task.id === id);
      if (!taskToRemove) {
        return;
      }

      const updatedTasks = removeTaskAndReorder(currentTasks, id);
      const removalTime = Date.now();
      const category = categories.find(cat => cat.id === taskToRemove.categoryId);

      set(state => ({
        myTasks: updatedTasks,
        taskLedger: {
          ...state.taskLedger,
          [id]: {
            id,
            name: taskToRemove.name,
            createdAt: state.taskLedger[id]?.createdAt ?? taskToRemove.createdAt,
            completedAt:
              state.taskLedger[id]?.completedAt ??
              (taskToRemove.isCompleted ? taskToRemove.completedAt ?? removalTime : null),
            canceledAt: removalTime,
            createdCategoryId: state.taskLedger[id]?.createdCategoryId ?? taskToRemove.categoryId ?? null,
            createdCategoryName: state.taskLedger[id]?.createdCategoryName,
            createdPlannedMinutes:
              state.taskLedger[id]?.createdPlannedMinutes ?? taskToRemove.planning?.plannedDurationMinutes ?? null,
            createdDueAt: state.taskLedger[id]?.createdDueAt ?? taskToRemove.planning?.dueAt ?? null,
            latestCategoryId: state.taskLedger[id]?.latestCategoryId ?? taskToRemove.categoryId ?? null,
            latestCategoryName: state.taskLedger[id]?.latestCategoryName,
            latestPlannedMinutes:
              state.taskLedger[id]?.latestPlannedMinutes ?? taskToRemove.planning?.plannedDurationMinutes ?? null,
            latestDueAt: state.taskLedger[id]?.latestDueAt ?? taskToRemove.planning?.dueAt ?? null,
            completedCategoryId:
              state.taskLedger[id]?.completedCategoryId ?? (taskToRemove.isCompleted ? taskToRemove.categoryId ?? null : null),
            completedCategoryName: state.taskLedger[id]?.completedCategoryName,
            completedPlannedMinutes:
              state.taskLedger[id]?.completedPlannedMinutes ??
              (taskToRemove.isCompleted ? taskToRemove.planning?.plannedDurationMinutes ?? null : null),
            completedDueAt:
              state.taskLedger[id]?.completedDueAt ??
              (taskToRemove.isCompleted ? taskToRemove.planning?.dueAt ?? null : null),
            canceledCategoryId: category?.id ?? taskToRemove.categoryId ?? null,
            canceledCategoryName: category?.name,
          },
        },
      }));

      persistMyTasksState();
      persistTaskLedger();
    },

    updateMyTask: (id: string, newName: string) => {
      set(state => ({
        myTasks: state.myTasks.map(task =>
          task.id === id
            ? {
                ...task,
                name: newName,
              }
            : task,
        ),
        taskLedger: {
          ...state.taskLedger,
          [id]: state.taskLedger[id]
            ? {
                ...state.taskLedger[id],
                name: newName,
              }
            : state.taskLedger[id],
        },
      }));
      persistMyTasksState();
      persistTaskLedger();
    },

    updateMyTaskPlanning: (id: string, updates: { planning?: TaskPlanning | null }) => {
      const actions = getActions();
      const { events, currentEventId } = get();
      set(state => {
        const updatedTasks = state.myTasks.map(task =>
          task.id === id
            ? {
                ...task,
                planning: updates.planning ?? undefined,
              }
            : task,
        );

        const updatedLedger = { ...state.taskLedger };
        const task = state.myTasks.find(t => t.id === id);
        if (task) {
          const normalizedPlanning = updates.planning ?? undefined;
          const plannedMinutes = normalizedPlanning?.plannedDurationMinutes ?? null;
          const dueAt = normalizedPlanning?.dueAt ?? null;

          updatedLedger[id] = {
            ...updatedLedger[id],
            latestPlannedMinutes: plannedMinutes,
            latestDueAt: dueAt,
          };
        }
        return {
          myTasks: updatedTasks,
          taskLedger: updatedLedger,
        };
      });

      persistMyTasksState();
      persistTaskLedger();

      if (!currentEventId) {
        return;
      }
      const currentEvent = events.find(event => event.id === currentEventId);
      if (currentEvent && currentEvent.type === 'task' && currentEvent.meta?.myTaskId === id && !currentEvent.end) {
        const normalizedPlanning = updates.planning ?? undefined;
        const updatedEvent: Event = {
          ...currentEvent,
          meta: {
            ...currentEvent.meta,
            ...(normalizedPlanning !== undefined ? { planningSnapshot: normalizedPlanning } : {}),
          },
        };

        set({
          events: events.map(event => (event.id === currentEventId ? updatedEvent : event)),
        });
        persistEventsState();
      }
    },

    setMyTasks: (tasks: MyTask[]) => {
      const baseNow = Date.now();
      const categories = get().categories;

      const activeTasks: MyTask[] = [];
      const completedTasks: MyTask[] = [];
      const archivedEntries: ArchivedTask[] = [];

      tasks.forEach((task, index) => {
        const createdAt = task.createdAt ?? baseNow;
        const normalized: MyTask = {
          ...task,
          isCompleted: task.isCompleted ?? false,
          order: task.order ?? index,
          planning: task.planning || undefined,
          createdAt,
          completedAt: task.completedAt ?? (task.isCompleted ? createdAt : null),
          canceledAt: task.canceledAt ?? null,
        };

        if (normalized.isCompleted) {
          completedTasks.push(normalized);
          archivedEntries.push({
            ...normalized,
            isCompleted: true,
            completedAt: normalized.completedAt ?? baseNow,
            archivedAt: baseNow,
          });
        } else {
          activeTasks.push(normalized);
        }
      });

      const sortedActiveTasks = reassignOrder(sortMyTasks(activeTasks));
      const completedIds = new Set(archivedEntries.map(task => task.id));

      set(state => {
        const updatedLedger = { ...state.taskLedger };

        sortedActiveTasks.forEach(task => {
          const category = categories.find(cat => cat.id === task.categoryId);
          updatedLedger[task.id] = mergeLedgerForTask(updatedLedger, task, category);
        });

        completedTasks.forEach(task => {
          const category = categories.find(cat => cat.id === task.categoryId);
          const completedAt = task.completedAt ?? baseNow;
          updatedLedger[task.id] = mergeLedgerForTask(updatedLedger, task, category, {
            completedAt,
            completedCategoryId: task.categoryId ?? null,
            completedCategoryName: category?.name,
            completedPlannedMinutes: task.planning?.plannedDurationMinutes ?? null,
            completedDueAt: task.planning?.dueAt ?? null,
          });
        });

        return {
          myTasks: sortedActiveTasks,
          archivedTasks: [
            ...archivedEntries,
            ...state.archivedTasks.filter(task => !completedIds.has(task.id)),
          ],
          taskLedger: updatedLedger,
        };
      });

      persistMyTasksState();
      persistArchivedTasks();
      persistTaskLedger();
    },

    restoreArchivedTask: restoreTaskFromArchive,

    deleteArchivedTask: (taskId: string) => {
      set(state => ({
        archivedTasks: state.archivedTasks.filter(task => task.id !== taskId),
      }));
      persistArchivedTasks();
    },

    toggleMyTaskCompletion: (taskId: string) => {
      if (isTaskCurrentlyRunning(taskId)) {
        return;
      }

      const task = get().myTasks.find(t => t.id === taskId);
      if (task && !task.isCompleted) {
        archiveActiveTask(task);
        return;
      }

      restoreTaskFromArchive(taskId);
    },

    setMyTaskCompletion: (taskId: string, completed: boolean) => {
      if (isTaskCurrentlyRunning(taskId)) {
        return;
      }

      const task = get().myTasks.find(t => t.id === taskId);

      if (completed) {
        if (task) {
          archiveActiveTask(task);
        }
        return;
      }

      if (task) {
        const category = getCategoryById(task.categoryId);
        const clearedTask: MyTask = {
          ...task,
          isCompleted: false,
          completedAt: null,
        };

        set(state => ({
          myTasks: state.myTasks.map(item =>
            item.id === taskId
              ? clearedTask
              : item,
          ),
          taskLedger: {
            ...state.taskLedger,
            [taskId]: mergeLedgerForTask(state.taskLedger, clearedTask, category, {
              completedAt: null,
              completedCategoryId: null,
              completedCategoryName: undefined,
              completedPlannedMinutes: null,
              completedDueAt: null,
            }),
          },
        }));
        persistMyTasksState();
        persistTaskLedger();
      } else {
        restoreTaskFromArchive(taskId);
      }
    },

    reorderMyTasks: (taskId: string, newOrder: number) => {
      const currentTasks = get().myTasks;
      try {
        const updatedTasks = reassignOrder(reorderTasks(currentTasks, taskId, newOrder));
        set({ myTasks: updatedTasks });
        persistMyTasksStateDebounced();
      } catch (error) {
        console.error('[useEventsStore] Error reordering tasks:', error);
      }
    },

    getTaskTotalDuration: (taskId: string) => {
      const { events } = get();
      return events
        .filter(event => event.type === 'task' && event.meta?.myTaskId === taskId && event.end)
        .reduce((total, event) => total + (event.end! - event.start), 0);
    },

    updateMyTaskCategory: (id: string, categoryId: string | undefined) => {
      const { myTasks: currentTasks, categories } = get();
      const updatedTasks = currentTasks.map(task =>
        task.id === id ? { ...task, categoryId } : task,
      );
      const category = categories.find(cat => cat.id === categoryId);
      set(state => ({
        myTasks: updatedTasks,
        taskLedger: state.taskLedger[id]
          ? {
              ...state.taskLedger,
              [id]: {
                ...state.taskLedger[id],
                latestCategoryId: categoryId ?? null,
                latestCategoryName: category?.name ?? state.taskLedger[id].latestCategoryName,
              },
            }
          : state.taskLedger,
      }));
      persistMyTasksState();
      persistTaskLedger();
    },
  };
};
