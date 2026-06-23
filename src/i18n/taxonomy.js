import { getLocaleConfig, LOCALES } from './localeConfig.js';

export function categoryLabel(locale, category) { return editableTaxonomyLabel(locale, category, 'categories'); }
export function interruptCategoryLabel(locale, category) { return editableTaxonomyLabel(locale, category, 'interruptCategories'); }
function editableTaxonomyLabel(locale, category, dictionaryKey) {
  if (!category) return '';
  const defaultName = LOCALES['ja-JP'].text[dictionaryKey]?.[category.id];
  if (category.name && category.name !== defaultName) return category.name;
  return getLocaleConfig(locale).text[dictionaryKey]?.[category.id] ?? category.name;
}
