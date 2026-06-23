export function taskTargetForEvent(event, state) {
  if (event?.taskId && state.tasks.some((task) => task.id === event.taskId)) {
    return { mode: 'existing', taskId: event.taskId };
  }
  return {
    mode: 'none',
    categoryId: state.categories.some((category) => category.id === event?.categoryId)
      ? event.categoryId
      : state.categories[0]?.id ?? null,
  };
}

export function taskWorkDetailForEvent(event, state) {
  if (!event) return '';
  if (event.workDetail) return event.workDetail;
  const task = state.tasks.find((item) => item.id === event.taskId);
  return task && event.label === task.name ? '' : event.label ?? '';
}
