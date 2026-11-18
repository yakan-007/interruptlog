import { interruptCategoryLabel, t } from '../../i18n';

// Form fields shared by every sheet that records an interruption or break:
// the pause sheet, the record editor and the missed-time sheet. Keeping them
// in one place keeps their order, labels and chips identical.

// A horizontal row of chips that also scrolls with a vertical mouse wheel.
export function ChipRow({ children }) {
  const scrollWithWheel = (event) => {
    const row = event.currentTarget;
    if (row.scrollWidth <= row.clientWidth) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    row.scrollLeft += event.deltaY;
    event.preventDefault();
  };
  return <div className="il-chiprow" onWheel={scrollWithWheel}>{children}</div>;
}

export function InterruptCategoryField({ categories, selectedId, locale, onSelect, children }) {
  return (
    <div className="il-field">
      <label>{t(locale, 'sheets.pauseCategory')}</label>
      <div className="il-chipgrid">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={'c' + (selectedId === category.id ? ' sel' : '')}
            aria-pressed={selectedId === category.id}
            onClick={() => onSelect(category)}
          >
            {interruptCategoryLabel(locale, category)}
          </button>
        ))}
        {children}
      </div>
    </div>
  );
}

export function SenderField({ whoChips, who, onChange, saveWhoChip, onSaveWhoChipChange, locale }) {
  const customWho = Boolean(who.trim()) && !whoChips.includes(who.trim());
  return (
    <div className="il-field">
      <label>{t(locale, 'sheets.sender')}</label>
      <ChipRow>
        <input
          className="c il-chipinput"
          placeholder={t(locale, 'sheets.newSender')}
          value={who && !whoChips.includes(who) ? who : ''}
          onChange={(event) => onChange(event.target.value)}
        />
        {whoChips.map((item) => (
          <button key={item} type="button" className={'c' + (who === item ? ' sel' : '')} onClick={() => onChange(item)}>
            {item}
          </button>
        ))}
      </ChipRow>
      {customWho && (
        <label className="il-inline-check">
          <input type="checkbox" checked={saveWhoChip} onChange={(event) => onSaveWhoChipChange(event.target.checked)} />
          <span>{t(locale, 'sheets.saveSender')}</span>
        </label>
      )}
    </div>
  );
}

const MEMO_PLACEHOLDERS = {
  interrupt: 'sheets.memoPlaceholder',
  break: 'sheets.breakMemoPlaceholder',
  task: 'sheets.taskMemoPlaceholder',
};

export function MemoField({ type, memo, onChange, locale }) {
  return (
    <div className="il-field">
      <label>{t(locale, 'sheets.memo')}</label>
      <textarea
        className="il-textarea"
        placeholder={t(locale, MEMO_PLACEHOLDERS[type] ?? MEMO_PLACEHOLDERS.task)}
        value={memo}
        onChange={(event) => onChange(event.target.value)}
        aria-label={t(locale, 'sheets.memo')}
      />
    </div>
  );
}
