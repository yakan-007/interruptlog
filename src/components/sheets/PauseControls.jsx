import { t } from '../../i18n';
import { InterruptCategoryField } from './RecordFields';

// Ends the current interruption or break here and starts the other one from
// now, keeping the task to return to. The same action as the input card's.
export function PauseSwitchButton({ mode, locale, onSwitch }) {
  const nextKind = mode === 'break' ? 'interrupt' : 'break';
  return (
    <button type="button" className="il-pause-switch" onClick={() => onSwitch(nextKind)}>
      {t(locale, nextKind === 'break' ? 'sheets.switchToBreak' : 'sheets.switchToInterrupt')}
    </button>
  );
}

// What this timer is. Interruption categories and "break" sit in one row:
// picking one re-labels the whole timer from its start (one record).
export function PauseCategoryPicker({ mode, categories, categoryId, locale, onSelect, onSelectBreak }) {
  return (
    <InterruptCategoryField
      categories={categories}
      selectedId={mode === 'interrupt' ? categoryId : null}
      locale={locale}
      onSelect={onSelect}
    >
      <span className="il-pause-category-divider" aria-hidden="true" />
      <button
        type="button"
        className={'c' + (mode === 'break' ? ' sel' : '')}
        aria-pressed={mode === 'break'}
        onClick={onSelectBreak}
      >
        {t(locale, 'common.break')}
      </button>
    </InterruptCategoryField>
  );
}
