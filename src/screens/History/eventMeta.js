import { categoryLabel, interruptCategoryLabel } from '../../i18n';

// The secondary line of a record in History. The dot / rail color already
// says task, interruption or break, so the type is never written out; the
// sender is shown only when the title doesn't already name them.
export function findEventCategory(event, state) {
  if (!event.categoryId) return null;
  return state.categories.find((category) => category.id === event.categoryId)
    || state.interruptCats.find((category) => category.id === event.categoryId)
    || null;
}

export function eventCategoryText(event, category, locale) {
  if (!category) return null;
  return event.type === 'interrupt' ? interruptCategoryLabel(locale, category) : categoryLabel(locale, category);
}

export function eventSenderText(event) {
  const who = event.who?.trim();
  if (!who) return null;
  const title = event.workDetail || event.label || '';
  return title.includes(who) ? null : who;
}
