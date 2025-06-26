// Store action types for better type safety and consistency

export interface StartTaskAction {
  type: 'START_TASK';
  payload: {
    label?: string;
    taskId?: string;
  };
}

export interface StopEventAction {
  type: 'STOP_EVENT';
}

export interface StartInterruptAction {
  type: 'START_INTERRUPT';
  payload: {
    label?: string;
    who?: string;
    interruptType?: string;
    urgency?: 'Low' | 'Medium' | 'High';
  };
}

export interface StartBreakAction {
  type: 'START_BREAK';
  payload: {
    label?: string;
    breakType?: 'short' | 'coffee' | 'lunch' | 'custom' | 'indefinite';
    breakDurationMinutes?: number;
  };
}

export interface AddTaskAction {
  type: 'ADD_TASK';
  payload: {
    name: string;
    categoryId?: string;
  };
}

export interface UpdateTaskAction {
  type: 'UPDATE_TASK';
  payload: {
    id: string;
    name?: string;
    categoryId?: string;
    isCompleted?: boolean;
  };
}

export interface RemoveTaskAction {
  type: 'REMOVE_TASK';
  payload: {
    id: string;
  };
}

export interface ReorderTasksAction {
  type: 'REORDER_TASKS';
  payload: {
    taskId: string;
    newOrder: number;
  };
}

export interface AddCategoryAction {
  type: 'ADD_CATEGORY';
  payload: {
    name: string;
    color: string;
  };
}

export interface UpdateCategoryAction {
  type: 'UPDATE_CATEGORY';
  payload: {
    id: string;
    name: string;
    color: string;
  };
}

export interface RemoveCategoryAction {
  type: 'REMOVE_CATEGORY';
  payload: {
    id: string;
  };
}

export interface ToggleCategoryEnabledAction {
  type: 'TOGGLE_CATEGORY_ENABLED';
}

export interface UpdateInterruptCategoryAction {
  type: 'UPDATE_INTERRUPT_CATEGORY';
  payload: {
    categoryId: 'category1' | 'category2' | 'category3' | 'category4' | 'category5' | 'category6';
    name: string;
  };
}

export interface ResetInterruptCategoryAction {
  type: 'RESET_INTERRUPT_CATEGORY';
  payload: {
    categoryId: 'category1' | 'category2' | 'category3' | 'category4' | 'category5' | 'category6';
  };
}

export interface ToggleTaskPlacementAction {
  type: 'TOGGLE_TASK_PLACEMENT';
}

export interface ToggleAutoStartTaskAction {
  type: 'TOGGLE_AUTO_START_TASK';
}

export type StoreAction = 
  | StartTaskAction
  | StopEventAction
  | StartInterruptAction
  | StartBreakAction
  | AddTaskAction
  | UpdateTaskAction
  | RemoveTaskAction
  | ReorderTasksAction
  | AddCategoryAction
  | UpdateCategoryAction
  | RemoveCategoryAction
  | ToggleCategoryEnabledAction
  | UpdateInterruptCategoryAction
  | ResetInterruptCategoryAction
  | ToggleTaskPlacementAction
  | ToggleAutoStartTaskAction;

// Action creators for type safety
export const createStartTaskAction = (label?: string, taskId?: string): StartTaskAction => ({
  type: 'START_TASK',
  payload: { label, taskId }
});

export const createStopEventAction = (): StopEventAction => ({
  type: 'STOP_EVENT'
});

export const createAddTaskAction = (name: string, categoryId?: string): AddTaskAction => ({
  type: 'ADD_TASK',
  payload: { name, categoryId }
});

export const createUpdateTaskAction = (
  id: string, 
  updates: { name?: string; categoryId?: string; isCompleted?: boolean }
): UpdateTaskAction => ({
  type: 'UPDATE_TASK',
  payload: { id, ...updates }
});

export const createRemoveTaskAction = (id: string): RemoveTaskAction => ({
  type: 'REMOVE_TASK',
  payload: { id }
});

// Type guards for action discrimination
export function isStartTaskAction(action: StoreAction): action is StartTaskAction {
  return action.type === 'START_TASK';
}

export function isAddTaskAction(action: StoreAction): action is AddTaskAction {
  return action.type === 'ADD_TASK';
}

export function isUpdateTaskAction(action: StoreAction): action is UpdateTaskAction {
  return action.type === 'UPDATE_TASK';
}