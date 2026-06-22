import { useCallback, useState } from 'react';
import Icons from '../../icons';
import SheetShell from '../../components/sheets/SheetShell';
import { CATEGORY_COLORS } from './constants';
import { t, translateMessage } from '../../i18n';
import { useListReorderDrag } from '../../lib/useListReorderDrag';

export function CategorySheet({ category, locale = 'ja-JP', onClose, onSave, onDelete }) {
  const [name, setName] = useState(category?.name ?? '');
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0]);
  const [error, setError] = useState('');

  const save = () => {
    if (!name.trim()) {
      setError(locale === 'ja-JP' ? 'カテゴリ名を入力してください' : 'Enter a category name');
      return;
    }
    onSave({ id: category?.id, name, color });
  };

  return (
    <SheetShell title={category ? (locale === 'ja-JP' ? 'カテゴリを編集' : 'Edit category') : t(locale, 'settings.addCategory')} onClose={onClose} footer={
      <>
        {category && <button className="btn danger" onClick={() => onDelete(category.id)}>{Icons.trash(14)} {t(locale, 'sheets.delete')}</button>}
        <button className="btn tert" onClick={onClose}>{t(locale, 'sheets.cancel')}</button>
        <button className="btn primary" onClick={save}>{t(locale, 'sheets.save')}</button>
      </>
    }>
      <div className="il-field">
        <label>{locale === 'ja-JP' ? 'カテゴリ名' : 'Category name'}</label>
        <input className="il-input" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
      </div>
      <div className="il-field">
        <label>{locale === 'ja-JP' ? '色' : 'Color'}</label>
        <div className="il-colorrow">
          {CATEGORY_COLORS.map((item) => (
            <button key={item} className={color === item ? 'sel' : ''} style={{ background: item }} onClick={() => setColor(item)} aria-label="カテゴリ色を選択" />
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

  const save = () => {
    if (!name.trim()) {
      setError(locale === 'ja-JP' ? '種類名を入力してください' : 'Enter a type name');
      return;
    }
    onSave({ id: category?.id, name, icon: null });
  };

  return (
    <SheetShell title={category ? (locale === 'ja-JP' ? '割り込みの種類を編集' : 'Edit interruption type') : t(locale, 'settings.addInterruptCategory')} onClose={onClose} footer={
      <>
        {category && <button className="btn danger" onClick={() => onDelete(category.id)}>{Icons.trash(14)} {t(locale, 'sheets.delete')}</button>}
        <button className="btn tert" onClick={onClose}>{t(locale, 'sheets.cancel')}</button>
        <button className="btn primary" onClick={save}>{t(locale, 'sheets.save')}</button>
      </>
    }>
      <div className="il-field">
        <label>{locale === 'ja-JP' ? '種類名' : 'Type name'}</label>
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
  const placeholder = kind === 'subject'
    ? (locale === 'ja-JP' ? '例: 見積確認\n例: 定例会\n改行やカンマでまとめて追加できます' : 'Example: Estimate review\nExample: Weekly sync\nAdd multiple items with line breaks or commas')
    : (locale === 'ja-JP' ? '例: 田中\n例: 佐藤\n改行やカンマでまとめて追加できます' : 'Example: Alex\nExample: Morgan\nAdd multiple items with line breaks or commas');

  const addDraft = () => {
    const next = uniqueChipTexts([...items, ...splitChipDraft(draft)]);
    setItems(next);
    setDraft('');
  };

  const removeItem = (chip) => {
    setItems((current) => current.filter((item) => item !== chip));
  };

  return (
    <SheetShell title={label} onClose={onClose} footer={
      <>
        <button className="btn tert" onClick={onClose}>{t(locale, 'sheets.cancel')}</button>
        <button className="btn primary" onClick={() => onSave(items)}>{t(locale, 'sheets.save')}</button>
      </>
    }>
      <div className="il-sheet-copy">
        {locale === 'ja-JP' ? '追加したい候補を入力して登録します。登録済みのチップは下で確認でき、タップすると外せます。' : 'Enter candidates to save. Saved chips appear below, and tapping one removes it.'}
      </div>
      <div className="il-field">
        <label>{locale === 'ja-JP' ? '追加する候補' : 'Candidates to add'}</label>
        <textarea
          className="il-textarea"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          autoFocus
        />
        <div className="il-sheet-help">{locale === 'ja-JP' ? '改行、`,`、`、` で区切ってまとめて追加できます。' : 'Separate multiple items with line breaks or commas.'}</div>
        <button className="btn secondary fill" onClick={addDraft} disabled={!draft.trim()}>{Icons.plus(14)} {locale === 'ja-JP' ? '候補を追加' : 'Add candidates'}</button>
      </div>
      <div className="il-field">
        <div className="il-sheet-listhead">
          <label>{locale === 'ja-JP' ? `登録済み ${items.length}件` : `Saved ${items.length}`}</label>
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
          <div className="il-sheet-emptyhint">{locale === 'ja-JP' ? 'まだ登録はありません。' : 'Nothing saved yet.'}</div>
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
                <button className="il-sheet-chipremove" onClick={() => removeItem(chip)} aria-label={locale === 'ja-JP' ? `${chip}を削除` : `Remove ${chip}`} disabled={reorderMode}>
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

export function ImportSheet({ locale = 'ja-JP', onClose, onImport }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const importNow = () => {
    const result = onImport(text);
    if (!result.ok) setError(translateMessage(locale, result.error));
  };

  return (
    <SheetShell title={t(locale, 'settings.importBackup')} onClose={onClose} footer={
      <>
        <button className="btn tert" onClick={onClose}>{t(locale, 'sheets.cancel')}</button>
        <button className="btn primary" onClick={importNow}>{locale === 'ja-JP' ? '読み込む' : 'Import'}</button>
      </>
    }>
      <div className="il-sheet-copy">
        {locale === 'ja-JP'
          ? 'このブラウザに保存されている現在のデータを、貼り付けた個人バックアップで置き換えます。必要なら先に個人バックアップを書き出して控えてください。'
          : 'This replaces the current data in this browser with the pasted personal backup. Export a backup first if needed.'}
      </div>
      <div className="il-field">
        <label>{locale === 'ja-JP' ? '個人バックアップJSON' : 'Personal backup JSON'}</label>
        <textarea className="il-textarea tall" value={text} onChange={(event) => setText(event.target.value)} placeholder={locale === 'ja-JP' ? 'JSONを貼り付け' : 'Paste JSON'} autoFocus />
      </div>
      {error && <div className="il-inline-error">{error}</div>}
    </SheetShell>
  );
}

export function ConfirmResetSheet({ locale = 'ja-JP', onClose, onConfirm }) {
  return (
    <SheetShell title={t(locale, 'settings.resetAll')} onClose={onClose} footer={
      <>
        <button className="btn tert" onClick={onClose}>{t(locale, 'sheets.cancel')}</button>
        <button className="btn danger fill" onClick={onConfirm}>{locale === 'ja-JP' ? '削除する' : 'Delete'}</button>
      </>
    }>
      <div className="il-settings-resetcopy">
        {locale === 'ja-JP'
          ? 'このブラウザに保存されているタスク、履歴、カテゴリ、入力候補、外観設定を初期状態に戻します。消したあとに戻せないので、必要なデータは先に JSON エクスポートしてください。'
          : 'This resets tasks, history, categories, input chips, and appearance settings saved in this browser. This cannot be undone, so export JSON first if needed.'}
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
