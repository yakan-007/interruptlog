import { useCallback, useState } from 'react';
import Icons from '../../icons';
import ConfirmFooter from '../../components/sheets/ConfirmFooter';
import SheetShell from '../../components/sheets/SheetShell';
import { CATEGORY_COLORS } from './constants';
import { t, translateError, tx } from '../../i18n';
import { useListReorderDrag } from '../../lib/useListReorderDrag';

export function CategorySheet({ category, locale = 'ja-JP', onClose, onSave, onDelete }) {
  const [name, setName] = useState(category?.name ?? '');
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0]);
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const save = () => {
    if (!name.trim()) {
      setError(t(locale, 'settings.categoryNameRequired'));
      return;
    }
    onSave({ id: category?.id, name, color });
  };

  return (
    <SheetShell title={category ? t(locale, 'settings.editCategory') : t(locale, 'settings.addTaskCategory')} onClose={onClose} locale={locale} footer={confirmingDelete ? (
      <ConfirmFooter
        message={t(locale, 'settings.deleteCategoryConfirm')}
        backLabel={t(locale, 'sheets.back')}
        confirmLabel={t(locale, 'sheets.deleteAction')}
        onBack={() => setConfirmingDelete(false)}
        onConfirm={() => onDelete(category.id)}
      />
    ) : (
      <>
        {category && <button className="btn danger" onClick={() => setConfirmingDelete(true)}>{Icons.trash(14)} {t(locale, 'sheets.delete')}</button>}
        <button className="btn tert" onClick={onClose}>{t(locale, 'sheets.cancel')}</button>
        <button className="btn primary" onClick={save}>{t(locale, 'sheets.save')}</button>
      </>
    )}>
      <div className="il-field">
        <label>{t(locale, 'settings.categoryName')}</label>
        <input className="il-input" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
      </div>
      <div className="il-field">
        <label>{t(locale, 'settings.categoryColor')}</label>
        <div className="il-colorrow">
          {CATEGORY_COLORS.map((item) => (
            <button key={item} className={color === item ? 'sel' : ''} style={{ background: item }} onClick={() => setColor(item)} aria-label={t(locale, 'settings.selectCategoryColor')} />
          ))}
        </div>
      </div>
      {error && <div className="il-inline-error">{error}</div>}
    </SheetShell>
  );
}

export function InterruptCategorySheet({ category, locale = 'ja-JP', onClose, onSave, onDelete }) {
  const [name, setName] = useState(category?.name ?? '');
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const save = () => {
    if (!name.trim()) {
      setError(t(locale, 'settings.interruptCategoryNameRequired'));
      return;
    }
    onSave({ id: category?.id, name });
  };

  return (
    <SheetShell title={category ? t(locale, 'settings.editInterruptCategory') : t(locale, 'settings.addInterruptCategory')} onClose={onClose} locale={locale} footer={confirmingDelete ? (
      <ConfirmFooter
        message={t(locale, 'settings.deleteInterruptCategoryConfirm')}
        backLabel={t(locale, 'sheets.back')}
        confirmLabel={t(locale, 'sheets.deleteAction')}
        onBack={() => setConfirmingDelete(false)}
        onConfirm={() => onDelete(category.id)}
      />
    ) : (
      <>
        {category && <button className="btn danger" onClick={() => setConfirmingDelete(true)}>{Icons.trash(14)} {t(locale, 'sheets.delete')}</button>}
        <button className="btn tert" onClick={onClose}>{t(locale, 'sheets.cancel')}</button>
        <button className="btn primary" onClick={save}>{t(locale, 'sheets.save')}</button>
      </>
    )}>
      <div className="il-field">
        <label>{t(locale, 'settings.interruptCategoryName')}</label>
        <input className="il-input" value={name} onChange={(event) => { setName(event.target.value); setError(''); }} autoFocus />
      </div>
      {error && <div className="il-inline-error">{error}</div>}
    </SheetShell>
  );
}

export function ChipsSheet({ kind, chips, locale = 'ja-JP', onClose, onSave }) {
  const [items, setItems] = useState(chips);
  const [draft, setDraft] = useState('');
  const [reorderMode, setReorderMode] = useState(false);
  const label = kind === 'subject' ? t(locale, 'settings.subjectChips') : t(locale, 'settings.whoChips');
  const moveChip = useCallback((chip, targetIndex) => {
    setItems((current) => moveItemToIndex(current, chip, targetIndex));
  }, []);
  const chipReorder = useListReorderDrag({
    onMove: moveChip,
  });
  const placeholder = t(locale, kind === 'subject'
    ? 'settings.subjectChipPlaceholder'
    : 'settings.whoChipPlaceholder');

  // What is typed is added on save: one step, no separate "add" button.
  const save = () => onSave(uniqueChipTexts([...items, ...splitChipDraft(draft)]));

  const removeItem = (chip) => {
    setItems((current) => current.filter((item) => item !== chip));
  };

  return (
    <SheetShell title={label} onClose={onClose} locale={locale} footer={
      <>
        <button className="btn tert" onClick={onClose}>{t(locale, 'sheets.cancel')}</button>
        <button className="btn primary" onClick={save}>{t(locale, 'sheets.save')}</button>
      </>
    }>
      <div className="il-sheet-copy">
        {t(locale, 'settings.chipsCopy')}
      </div>
      <div className="il-field">
        <label>{t(locale, 'settings.chipCandidates')}</label>
        <textarea
          className="il-textarea"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          autoFocus
        />
      </div>
      <div className="il-field">
        <div className="il-sheet-listhead">
          <label>{tx(locale, 'settings.savedChipCount', items.length)}</label>
          {items.length > 1 && (
            <button
              type="button"
              className={'il-sheet-reorder-toggle' + (reorderMode ? ' active' : '')}
              onClick={() => setReorderMode((value) => !value)}
            >
              {reorderMode ? t(locale, 'settings.reorderDone') : t(locale, 'settings.reorder')}
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <div className="il-sheet-emptyhint">{t(locale, 'settings.noSavedChips')}</div>
        ) : (
          <div className={'il-sheet-chiplist reorder' + (reorderMode ? ' active' : '')}>
            {items.map((chip, index) => (
              <div
                key={chip}
                className={getChipItemClass(chipReorder, chip, index, items.length, reorderMode)}
                {...(reorderMode ? chipReorder.getRowProps(chip, index) : undefined)}
              >
                {reorderMode && (
                  <button className="il-reorder-handle" aria-label={t(locale, 'settings.reorder')} {...chipReorder.getHandleProps(chip, index)}>
                    {Icons.grip(14)}
                  </button>
                )}
                <span>{chip}</span>
                <button className="il-sheet-chipremove" onClick={() => removeItem(chip)} aria-label={tx(locale, 'settings.removeChip', chip)} disabled={reorderMode}>
                  {Icons.close(12)}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </SheetShell>
  );
}

export function ReportProfileSheet({ profile, locale = 'ja-JP', onClose, onSave }) {
  const [affiliation, setAffiliation] = useState(profile?.affiliation ?? '');
  const [name, setName] = useState(profile?.name ?? '');

  return (
    <SheetShell title={t(locale, 'settings.reportProfile')} onClose={onClose} locale={locale} footer={
      <>
        <button className="btn tert" onClick={onClose}>{t(locale, 'sheets.cancel')}</button>
        <button className="btn primary" onClick={() => onSave({ affiliation, name })}>{t(locale, 'sheets.save')}</button>
      </>
    }>
      <div className="il-sheet-copy">{t(locale, 'settings.reportProfileCopy')}</div>
      <div className="il-field">
        <label>{t(locale, 'settings.reportAffiliation')}</label>
        <input className="il-input" value={affiliation} onChange={(event) => setAffiliation(event.target.value)} placeholder={t(locale, 'settings.reportAffiliationPlaceholder')} aria-label={t(locale, 'settings.reportAffiliation')} autoFocus />
      </div>
      <div className="il-field">
        <label>{t(locale, 'settings.reportName')}</label>
        <input className="il-input" value={name} onChange={(event) => setName(event.target.value)} placeholder={t(locale, 'settings.reportNamePlaceholder')} aria-label={t(locale, 'settings.reportName')} />
      </div>
    </SheetShell>
  );
}

export function ImportSheet({ locale = 'ja-JP', onClose, onImport }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const importNow = () => {
    const result = onImport(text);
    if (!result.ok) setError(translateError(locale, result.errorCode));
  };

  // A backup is written out as a file, so it can be read back from one too.
  const readFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setText(await file.text());
    setError('');
  };

  return (
    <SheetShell title={t(locale, 'settings.importBackup')} onClose={onClose} locale={locale} footer={
      <>
        <button className="btn tert" onClick={onClose}>{t(locale, 'sheets.cancel')}</button>
        <button className="btn danger fill" onClick={importNow} disabled={!text.trim()}>{t(locale, 'settings.importAction')}</button>
      </>
    }>
      <div className="il-sheet-copy">
        {t(locale, 'settings.importCopy')}
      </div>
      <div className="il-field">
        <label htmlFor="il-import-file">{t(locale, 'settings.backupFile')}</label>
        <input id="il-import-file" className="il-input il-fileinput" type="file" accept="application/json,.json" onChange={readFile} />
      </div>
      <div className="il-field">
        <label htmlFor="il-import-text">{t(locale, 'settings.backupJson')}</label>
        <textarea id="il-import-text" className="il-textarea tall" value={text} onChange={(event) => { setText(event.target.value); setError(''); }} placeholder={t(locale, 'settings.pasteJson')} />
      </div>
      {error && <div className="il-inline-error">{error}</div>}
    </SheetShell>
  );
}

export function ConfirmResetSheet({ locale = 'ja-JP', onClose, onConfirm }) {
  return (
    <SheetShell title={t(locale, 'settings.resetAll')} onClose={onClose} locale={locale} footer={
      <>
        <button className="btn tert" onClick={onClose}>{t(locale, 'sheets.cancel')}</button>
        <button className="btn danger fill" onClick={onConfirm}>{t(locale, 'settings.deleteAction')}</button>
      </>
    }>
      <div className="il-settings-resetcopy">
        {t(locale, 'settings.resetCopy')}
      </div>
    </SheetShell>
  );
}

function getChipItemClass(chipReorder, chip, index, count, reorderMode) {
  const dropPosition = reorderMode ? chipReorder.getDropPosition(chip, index, count) : null;
  return [
    'il-sheet-chipitem',
    reorderMode ? 'is-reordering' : '',
    chipReorder.drag?.id === chip ? 'dragging' : '',
    dropPosition ? `drop-${dropPosition}` : '',
  ].filter(Boolean).join(' ');
}

function splitChipDraft(value) {
  return uniqueChipTexts(String(value ?? '').split(/[\n,、]/));
}

function uniqueChipTexts(values) {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))];
}

function moveItemToIndex(items, item, targetIndex) {
  const from = items.indexOf(item);
  if (from < 0 || items.length < 2) return items;
  const withoutItem = items.filter((_, index) => index !== from);
  const safeIndex = Math.max(0, Math.min(withoutItem.length, Number(targetIndex) || 0));
  const next = [
    ...withoutItem.slice(0, safeIndex),
    item,
    ...withoutItem.slice(safeIndex),
  ];
  return next.every((nextItem, index) => nextItem === items[index]) ? items : next;
}
