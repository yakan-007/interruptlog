import Icons from '../../icons';
import { interruptCategoryLabel, t } from '../../i18n';
import { pauseCategoryDetail } from './pausePresentation';

export function ActivitySwitch({ mode, locale, onStartNextPause }) {
  return (
    <div className="il-activity-switch">
      <span>{t(locale, 'sheets.switchActivity')}</span>
      <div className="il-activity-switch-actions">
        <button type="button" className="il-activity-switch-btn interrupt" onClick={() => onStartNextPause('interrupt')}>
          {Icons.bolt(14)} {t(locale, 'sheets.startAnotherInterrupt')}
        </button>
        {mode === 'interrupt' && (
          <button type="button" className="il-activity-switch-btn break" onClick={() => onStartNextPause('break')}>
            {Icons.coffee(14)} {t(locale, 'sheets.startBreak')}
          </button>
        )}
      </div>
    </div>
  );
}

export function PauseCategoryPicker({ activeKind, categories, categoryId, locale, onSelect, onSwitchKind }) {
  return (
    <div className="il-field">
      <label>{t(locale, 'sheets.pauseCategory')}</label>
      <div className="il-pause-kind-tabs il-segmented">
        <button type="button" className={activeKind === 'interrupt' ? 'active' : ''} onClick={() => onSwitchKind('interrupt')}>
          {t(locale, 'sheets.pauseKindInterrupt')}
        </button>
        <button type="button" className={activeKind === 'break' ? 'active' : ''} onClick={() => onSwitchKind('break')}>
          {t(locale, 'sheets.pauseKindBreak')}
        </button>
      </div>
      <div className="il-pause-category-grid">
        {categories.map((category) => {
          const detail = pauseCategoryDetail(category, locale);
          return (
            <button
              key={category.id}
              type="button"
              className={'il-pause-category ' + category.kind + (detail ? '' : ' compact') + (categoryId === category.id ? ' sel' : '')}
              onClick={() => onSelect(category)}
            >
              <span className="main">{interruptCategoryLabel(locale, category)}</span>
              {detail && <span className="kind">{detail}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
