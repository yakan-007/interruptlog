export function taskTargetForEvent(event, state) {
  if (event?.taskId && state.tasks.some((task) => task.id === event.taskId)) {
    return { mode: 'existing', taskId: event.taskId };
  }
  return {
    mode: 'new',
    name: event?.label ?? '',
    categoryId: state.categories.some((category) => category.id === event?.categoryId)
      ? event.categoryId
      : state.categories[0]?.id ?? null,
    complete: true,
  };
}
