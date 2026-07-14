import { useState } from 'react';
import { t } from '../../i18n';
import { useListReorderDrag } from '../../lib/useListReorderDrag';
import { AddRowButton, CategoryRow, InterruptCategoryRow } from './SettingsRows';

export default function CategorySections({ state, actions, locale, onOpenPanel }) {
  const [reorderMode, setReorderMode] = useState(null);
  const categoryReorder = useListReorderDrag({ onMove: actions.moveCategoryToIndex });
  const interruptCategoryReorder = useListReorderDrag({ onMove: actions.moveInterruptCategoryToIndex });
  const categoryReordering = reorderMode === 'categories';
  const interruptCategoryReordering = reorderMode === 'interruptCategories';

  return (
    <>
      <SectionHeader
        title={t(locale, 'settings.categories')}
        count={state.categories.length}
        locale={locale}
        reorderActive={categoryReordering}
        onToggleReorder={() => setReorderMode(categoryReordering ? null : 'categories')}
      />
      <div className="il-settings-group">
        {state.categories.map((category, index) => (
          <CategoryRow
            key={category.id}
            category={category}
            locale={locale}
            onClick={() => onOpenPanel({ type: 'category', category })}
            rowProps={categoryReordering ? categoryReorder.getRowProps(category.id, index) : undefined}
            dragHandleProps={categoryReordering ? categoryReorder.getHandleProps(category.id, index) : undefined}
            dragging={categoryReorder.drag?.id === category.id}
            dropPosition={categoryReordering ? categoryReorder.getDropPosition(category.id, index, state.categories.length) : null}
            reorderMode={categoryReordering}
          />
        ))}
        {!categoryReordering && <AddRowButton label={t(locale, 'settings.addCategory')} onClick={() => onOpenPanel({ type: 'category' })} />}
      </div>

      <SectionHeader
        title={t(locale, 'settings.interruptCategories')}
        count={state.interruptCats.length}
        locale={locale}
        reorderActive={interruptCategoryReordering}
        onToggleReorder={() => setReorderMode(interruptCategoryReordering ? null : 'interruptCategories')}
      />
      <div className="il-settings-group">
        {state.interruptCats.map((category, index) => (
          <InterruptCategoryRow
            key={category.id}
            category={category}
            locale={locale}
            onClick={() => onOpenPanel({ type: 'interruptCategory', category })}
            rowProps={interruptCategoryReordering ? interruptCategoryReorder.getRowProps(category.id, index) : undefined}
            dragHandleProps={interruptCategoryReordering ? interruptCategoryReorder.getHandleProps(category.id, index) : undefined}
            dragging={interruptCategoryReorder.drag?.id === category.id}
            dropPosition={interruptCategoryReordering ? interruptCategoryReorder.getDropPosition(category.id, index, state.interruptCats.length) : null}
            reorderMode={interruptCategoryReordering}
          />
        ))}
        {!interruptCategoryReordering && <AddRowButton label={t(locale, 'settings.addInterruptCategory')} onClick={() => onOpenPanel({ type: 'interruptCategory' })} />}
      </div>
    </>
  );
}

function SectionHeader({ title, count, locale, reorderActive, onToggleReorder }) {
  return (
    <div className="il-section-h il-settings-section-h">
      <span>{title}</span>
      <span className="il-settings-section-actions">
        <span className="count">{count}</span>
        {count > 1 && (
          <button
            type="button"
            className={'il-settings-reorder-toggle' + (reorderActive ? ' active' : '')}
            onClick={onToggleReorder}
          >
            {reorderActive ? t(locale, 'settings.reorderDone') : t(locale, 'settings.reorder')}
          </button>
        )}
      </span>
    </div>
  );
}
