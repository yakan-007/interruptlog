import { newId } from './ids';
import { normalizeCategory, normalizeInterruptCategory } from './schema';
import { uniqueTexts } from './utils';

export function saveCategoryInState(state, category, now = Date.now()) {
  const normalized = normalizeCategory({
    id: category.id || newId('cat', now),
    name: category.name,
    color: category.color,
  });
  if (!normalized) return state;
  const exists = state.categories.some((item) => item.id === normalized.id);
  return {
    ...state,
    categories: exists
      ? state.categories.map((item) => item.id === normalized.id ? normalized : item)
      : [...state.categories, normalized],
  };
}

export function deleteCategoryInState(state, categoryId) {
  return {
    ...state,
    categories: state.categories.filter((category) => category.id !== categoryId),
    taskTemplates: (state.taskTemplates ?? []).map((template) => template.categoryId === categoryId ? { ...template, categoryId: null } : template),
    tasks: state.tasks.map((task) => task.categoryId === categoryId ? { ...task, categoryId: null } : task),
    events: state.events.map((event) => event.categoryId === categoryId ? { ...event, categoryId: null } : event),
  };
}

export function saveInterruptCategoryInState(state, category, now = Date.now()) {
  const normalized = normalizeInterruptCategory({
    id: category.id || newId('int', now),
    name: category.name,
    icon: category.icon,
  });
  if (!normalized) return state;
  const exists = state.interruptCats.some((item) => item.id === normalized.id);
  return {
    ...state,
    interruptCats: exists
      ? state.interruptCats.map((item) => item.id === normalized.id ? normalized : item)
      : [...state.interruptCats, normalized],
  };
}

export function deleteInterruptCategoryInState(state, categoryId) {
  return {
    ...state,
    interruptCats: state.interruptCats.filter((category) => category.id !== categoryId),
    events: state.events.map((event) =>
      event.type === 'interrupt' && event.categoryId === categoryId
        ? { ...event, categoryId: null }
        : event
    ),
  };
}

export function saveChipsInState(state, kind, chips) {
  const key = kind === 'subject' ? 'subjectChips' : 'whoChips';
  return { ...state, [key]: uniqueTexts(chips) };
}

export function setPreferenceInState(state, key, value) {
  return {
    ...state,
    preferences: {
      ...state.preferences,
      [key]: value,
    },
  };
}
