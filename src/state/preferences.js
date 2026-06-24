import { newId } from './ids';
import { normalizeCategory, normalizeInterruptCategory } from './schema';
import { cleanText, uniqueTexts } from './utils';

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
    tasks: state.tasks.map((task) => task.categoryId === categoryId ? { ...task, categoryId: null } : task),
    events: state.events.map((event) => event.categoryId === categoryId ? { ...event, categoryId: null } : event),
  };
}

export function moveCategoryToIndexInState(state, categoryId, targetIndex) {
  return {
    ...state,
    categories: moveItemToIndex(state.categories, (category) => category.id === categoryId, targetIndex),
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

export function moveInterruptCategoryToIndexInState(state, categoryId, targetIndex) {
  return {
    ...state,
    interruptCats: moveItemToIndex(state.interruptCats, (category) => category.id === categoryId, targetIndex),
  };
}

export function saveChipsInState(state, kind, chips) {
  const key = kind === 'subject' ? 'subjectChips' : 'whoChips';
  return { ...state, [key]: uniqueTexts(chips) };
}

export function moveChipToIndexInState(state, kind, chip, targetIndex) {
  const key = kind === 'subject' ? 'subjectChips' : 'whoChips';
  return {
    ...state,
    [key]: moveItemToIndex(state[key], (item) => item === chip, targetIndex),
  };
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

export function setReportProfileInState(state, profile) {
  return {
    ...state,
    preferences: {
      ...state.preferences,
      reportProfile: {
        affiliation: cleanText(profile?.affiliation),
        name: cleanText(profile?.name),
      },
    },
  };
}

function moveItemToIndex(items, match, targetIndex) {
  const from = items.findIndex(match);
  if (from < 0 || items.length < 2) return items;
  const item = items[from];
  const withoutItem = items.filter((_, index) => index !== from);
  const safeIndex = Math.max(0, Math.min(withoutItem.length, Number(targetIndex) || 0));
  const next = [
    ...withoutItem.slice(0, safeIndex),
    item,
    ...withoutItem.slice(safeIndex),
  ];
  return next.every((nextItem, index) => nextItem === items[index]) ? items : next;
}
