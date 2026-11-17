import Icons from '../../icons';
import { interruptCategoryLabel, t } from '../../i18n';

// Ends the current interruption or break and starts the other kind from now,
// keeping the task to return to. Picking a category below instead re-labels
// the current record from its start.
export function PauseSwitchButton({ mode, locale, onSwitch }) {
  const nextKind = mode === 'break' ? 'interrupt' : 'break';
  return (
    <button type="button" className={'il-pause-switch ' + nextKind} onClick={() => onSwitch(nextKind)}>
      {nextKind === 'break' ? Icons.coffee(14) : Icons.bolt(14)}
      {t(locale, nextKind === 'break' ? 'sheets.switchToBreak' : 'sheets.switchToInterrupt')}
    </button>
  );
}

export function PauseCategoryPicker({ categories, categoryId, locale, onSelect }) {
  const groups = [
    ['interrupt', t(locale, 'sheets.pauseKindInterrupt')],
    ['break', t(locale, 'sheets.pauseKindBreak')],
  ].map(([kind, label]) => [kind, label, categories.filter((category) => category.kind === kind)])
    .filter(([, , items]) => items.length > 0);

  return (
    <div className="il-field">
      <label>{t(locale, 'sheets.pauseCategory')}</label>
      <div className="il-pause-category-groups">
        {groups.map(([kind, label, items]) => (
          <div key={kind} className="il-pause-category-group" role="group" aria-label={label}>
            <span className="il-pause-category-group-label">{label}</span>
            <div className="il-pause-category-grid">
              {items.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={'il-pause-category ' + category.kind + (categoryId === category.id ? ' sel' : '')}
                  onClick={() => onSelect(category)}
                >
                  {interruptCategoryLabel(locale, category)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
