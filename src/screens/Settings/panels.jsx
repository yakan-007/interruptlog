import { useState } from 'react';
import Icons from '../../icons';
import SheetShell from '../../components/sheets/SheetShell';
import { CATEGORY_COLORS } from './constants';
import { fromDateTimeLocalValue, getTaskDuePresets, toDateTimeLocalValue } from '../../helpers';

export function CategorySheet({ category, onClose, onSave, onDelete }) {
  const [name, setName] = useState(category?.name ?? '');
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0]);
  const [error, setError] = useState('');

  const save = () => {
    if (!name.trim()) {
      setError('カテゴリ名を入力してください');
      return;
    }
    onSave({ id: category?.id, name, color });
  };

  return (
    <SheetShell title={category ? 'カテゴリを編集' : 'カテゴリを追加'} onClose={onClose} footer={
      <>
        {category && <button className="btn danger" onClick={() => onDelete(category.id)}>{Icons.trash(14)} 削除</button>}
        <button className="btn tert" onClick={onClose}>キャンセル</button>
        <button className="btn primary" onClick={save}>保存</button>
      </>
    }>
      <div className="il-field">
        <label>カテゴリ名</label>
        <input className="il-input" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
      </div>
      <div className="il-field">
        <label>色</label>
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

const INTERRUPT_ICON_OPTIONS = [
  [null, 'なし'],
  ['phone', '電話'],
  ['chat', 'チャット'],
  ['q', '質問'],
  ['user', '人'],
  ['bolt', '急ぎ'],
  ['dots', 'その他'],
];

export function InterruptCategorySheet({ category, onClose, onSave, onDelete }) {
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? null);
  const [error, setError] = useState('');

  const save = () => {
    if (!name.trim()) {
      setError('カテゴリ名を入力してください');
      return;
    }
    onSave({ id: category?.id, name, icon });
  };

  return (
    <SheetShell title={category ? '割り込みカテゴリを編集' : '割り込みカテゴリを追加'} onClose={onClose} footer={
      <>
        {category && <button className="btn danger" onClick={() => onDelete(category.id)}>{Icons.trash(14)} 削除</button>}
        <button className="btn tert" onClick={onClose}>キャンセル</button>
        <button className="btn primary" onClick={save}>保存</button>
      </>
    }>
      <div className="il-field">
        <label>カテゴリ名</label>
        <input className="il-input" value={name} onChange={(event) => { setName(event.target.value); setError(''); }} autoFocus />
      </div>
      <div className="il-field">
        <label>アイコン</label>
        <div className="il-iconpick">
          {INTERRUPT_ICON_OPTIONS.map(([value, label]) => (
            <button
              key={value ?? 'none'}
              className={icon === value ? 'sel' : ''}
              onClick={() => { setIcon(value); setError(''); }}
              aria-label={`${label}アイコンを選択`}
            >
              {value ? (Icons[value]?.(16) ?? Icons.dots(16)) : <span className="il-iconpick-none" />}
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
      {error && <div className="il-inline-error">{error}</div>}
    </SheetShell>
  );
}

export function ChipsSheet({ kind, chips, onClose, onSave }) {
  const [items, setItems] = useState(chips);
  const [draft, setDraft] = useState('');
  const label = kind === 'subject' ? '件名チップ' : '発信者チップ';
  const placeholder = kind === 'subject'
    ? '例: 見積確認\n例: 定例会\n改行やカンマでまとめて追加できます'
    : '例: 田中\n例: 佐藤\n改行やカンマでまとめて追加できます';

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
        <button className="btn tert" onClick={onClose}>キャンセル</button>
        <button className="btn primary" onClick={() => onSave(items)}>保存</button>
      </>
    }>
      <div className="il-sheet-copy">
        追加したい候補を入力して登録します。登録済みのチップは下で確認でき、タップすると外せます。
      </div>
      <div className="il-field">
        <label>追加する候補</label>
        <textarea
          className="il-textarea"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          autoFocus
        />
        <div className="il-sheet-help">改行、`,`、`、` で区切ってまとめて追加できます。</div>
        <button className="btn secondary fill" onClick={addDraft} disabled={!draft.trim()}>{Icons.plus(14)} 候補を追加</button>
      </div>
      <div className="il-field">
        <label>登録済み {items.length}件</label>
        {items.length === 0 ? (
          <div className="il-sheet-emptyhint">まだ登録はありません。</div>
        ) : (
          <div className="il-sheet-chiplist">
            {items.map((chip) => (
              <button key={chip} className="il-sheet-chipbutton" onClick={() => removeItem(chip)}>
                <span>{chip}</span>
                <span className="x" aria-hidden="true">{Icons.close(12)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </SheetShell>
  );
}

export function ImportSheet({ onClose, onImport }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const importNow = () => {
    const result = onImport(text);
    if (!result.ok) setError(result.error);
  };

  return (
    <SheetShell title="個人バックアップを復元" onClose={onClose} footer={
      <>
        <button className="btn tert" onClick={onClose}>キャンセル</button>
        <button className="btn primary" onClick={importNow}>読み込む</button>
      </>
    }>
      <div className="il-sheet-copy">
        このブラウザに保存されている現在のデータを、貼り付けた個人バックアップで置き換えます。
        必要なら先に個人バックアップを書き出して控えてください。
      </div>
      <div className="il-field">
        <label>個人バックアップJSON</label>
        <textarea className="il-textarea tall" value={text} onChange={(event) => setText(event.target.value)} placeholder="JSONを貼り付け" autoFocus />
      </div>
      {error && <div className="il-inline-error">{error}</div>}
    </SheetShell>
  );
}

export function PayloadImportSheet({ title, copy, label = 'JSON', onClose, onImport }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const importNow = () => {
    const result = onImport(text);
    if (!result.ok) setError(result.error);
  };

  const readFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setText(await file.text());
    setError('');
  };

  return (
    <SheetShell title={title} onClose={onClose} footer={
      <>
        <button className="btn tert" onClick={onClose}>キャンセル</button>
        <button className="btn primary" onClick={importNow}>読み込む</button>
      </>
    }>
      <div className="il-sheet-copy">{copy}</div>
      <div className="il-field">
        <label>{label}</label>
        <input className="il-input" type="file" accept=".json,application/json" onChange={readFile} />
      </div>
      <div className="il-field">
        <label>貼り付け</label>
        <textarea className="il-textarea tall" value={text} onChange={(event) => setText(event.target.value)} placeholder="JSONを貼り付け" autoFocus />
      </div>
      {error && <div className="il-inline-error">{error}</div>}
    </SheetShell>
  );
}

export function TaskTemplateSheet({ template, categories, onClose, onSave, onDelete }) {
  const duePresets = getTaskDuePresets();
  const [name, setName] = useState(template?.name ?? '');
  const [categoryId, setCategoryId] = useState(template?.categoryId ?? categories[0]?.id ?? null);
  const [plannedDurationMinutes, setPlannedDurationMinutes] = useState(template?.planning?.plannedDurationMinutes ?? 30);
  const [dueAt, setDueAt] = useState(template?.planning?.dueAt ?? null);
  const [error, setError] = useState('');

  const submit = () => {
    if (!name.trim()) {
      setError('配布用タスク名を入力してください');
      return;
    }
    onSave({
      id: template?.id,
      name,
      categoryId,
      plannedDurationMinutes,
      dueAt,
      createdAt: template?.createdAt,
    });
  };

  return (
    <SheetShell title={template ? '配布用タスクを編集' : '配布用タスクを追加'} onClose={onClose} footer={
      <>
        {template && <button className="btn danger" onClick={() => onDelete(template.id)}>{Icons.trash(14)} 削除</button>}
        <button className="btn tert" onClick={onClose}>キャンセル</button>
        <button className="btn primary" onClick={submit}>保存</button>
      </>
    }>
      <div className="il-field">
        <label>タスク名</label>
        <input className="il-input" value={name} onChange={(event) => { setName(event.target.value); setError(''); }} autoFocus />
      </div>
      <div className="il-field">
        <label>カテゴリ</label>
        <div className="il-chiprow">
          {categories.map((category) => (
            <button
              key={category.id}
              className={'c task-cat' + (categoryId === category.id ? ' sel' : '')}
              onClick={() => { setCategoryId(category.id); setError(''); }}
              style={{ '--chip-cat': category.color, borderLeft: `3px solid ${category.color}` }}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
      <div className="il-field">
        <label>予定時間</label>
        <div className="il-sheet-planrow">
          <input
            className="il-input short"
            type="number"
            value={plannedDurationMinutes}
            onChange={(event) => setPlannedDurationMinutes(Number(event.target.value) || 0)}
          />
          <span className="suffix">分</span>
          <div className="spacer" />
          {[15, 30, 60, 120].map((minutes) => (
            <button key={minutes} className="btn sm secondary" onClick={() => setPlannedDurationMinutes(minutes)}>{minutes}</button>
          ))}
        </div>
      </div>
      <div className="il-field">
        <label>期限</label>
        <div className="il-sheet-presetrow">
          {duePresets.map((option) => (
            <button key={option.label} className={'btn sm ' + (dueAt === option.value ? 'primary' : 'secondary')} onClick={() => setDueAt(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
        <input
          className="il-input"
          type="datetime-local"
          value={toDateTimeLocalValue(dueAt)}
          onChange={(event) => setDueAt(fromDateTimeLocalValue(event.target.value))}
          aria-label="期限日時"
        />
      </div>
      {error && <div className="il-inline-error">{error}</div>}
    </SheetShell>
  );
}

export function ConfirmResetSheet({ onClose, onConfirm }) {
  return (
    <SheetShell title="全データを削除" onClose={onClose} footer={
      <>
        <button className="btn tert" onClick={onClose}>キャンセル</button>
        <button className="btn danger fill" onClick={onConfirm}>削除する</button>
      </>
    }>
      <div className="il-settings-resetcopy">
        このブラウザに保存されているタスク、履歴、カテゴリ、入力候補、外観設定を初期状態に戻します。
        <br />
        消したあとに戻せないので、必要なデータは先に JSON エクスポートしてください。
      </div>
    </SheetShell>
  );
}

function splitChipDraft(value) {
  return uniqueChipTexts(String(value ?? '').split(/[\n,、]/));
}

function uniqueChipTexts(values) {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))];
}
