import {
  completeTaskInState,
  createTaskAndStartInState,
  createTaskInState,
  deleteTaskInState,
  moveTaskToIndexInState,
  reorderTaskInState,
  restoreTaskAndStartInState,
  restoreTaskInState,
  saveTaskInState,
  startTaskInState,
  stopTaskInState,
  uncompleteTaskInState,
} from '../../state';

export function createTaskCommands({ applyResult, getState, mutateWith }) {
  return {
    startTask: mutateWith(startTaskInState),
    stopTask: mutateWith(stopTaskInState),
    completeTask: mutateWith(completeTaskInState),
    restoreTask: mutateWith(restoreTaskInState),
    uncompleteTask: mutateWith(uncompleteTaskInState),
    deleteTask: mutateWith(deleteTaskInState),
    reorderTask: mutateWith(reorderTaskInState),
    moveTaskToIndex: mutateWith(moveTaskToIndexInState),
    restoreTaskAndStart(id) {
      return applyResult(restoreTaskAndStartInState(getState(), id));
    },
    saveTask(data) {
      return applyResult(saveTaskInState(getState(), data));
    },
    createTask(data) {
      return applyResult(createTaskInState(getState(), data));
    },
    createTaskAndStart(data) {
      return applyResult(createTaskAndStartInState(getState(), data));
    },
  };
}
