import { useState } from 'react';
import Icons from '../../icons';
import SheetShell from '../../components/sheets/SheetShell';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../lib/datetime';
import { getTaskDuePresets } from '../../lib/formatters';
import { categoryLabel, t, translateMessage } from '../../i18n';

export function PayloadImportSheet({ title, copy, label = 'JSON', locale = 'ja-JP', onClose, onImport }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const importNow = () => {
    const result = onImport(text);
    if (!result.ok) setError(translateMessage(locale, result.error));
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
        <button className="btn tert" onClick={onClose}>{t(locale, 'sheets.cancel')}</button>
        <button className="btn primary" onClick={importNow}>{locale === 'ja-JP' ? '読み込む' : 'Import'}</button>
      </>
    }>
      <div className="il-sheet-copy">{copy}</div>
      <div className="il-field">
        <label>{label}</label>
        <input className="il-input" type="file" accept=".json,application/json" onChange={readFile} />
      </div>
      <div className="il-field">
        <label>{locale === 'ja-JP' ? '貼り付け' : 'Paste'}</label>
        <textarea className="il-textarea tall" value={text} onChange={(event) => setText(event.target.value)} placeholder={locale === 'ja-JP' ? 'JSONを貼り付け' : 'Paste JSON'} autoFocus />
      </div>
      {error && <div className="il-inline-error">{error}</div>}
    </SheetShell>
  );
}

export function TaskTemplateSheet({ template, categories, locale = 'ja-JP', onClose, onSave, onDelete }) {
  const duePresets = getTaskDuePresets(new Date(), locale);
  const [name, setName] = useState(template?.name ?? '');
  const [categoryId, setCategoryId] = useState(template?.categoryId ?? categories[0]?.id ?? null);
  const [plannedDurationMinutes, setPlannedDurationMinutes] = useState(template?.planning?.plannedDurationMinutes ?? 30);
  const [dueAt, setDueAt] = useState(template?.planning?.dueAt ?? null);
  const [error, setError] = useState('');

  const submit = () => {
    if (!name.trim()) {
      setError(locale === 'ja-JP' ? '配布用タスク名を入力してください' : 'Enter a distributed task name');
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
    <SheetShell title={template ? (locale === 'ja-JP' ? '配布用タスクを編集' : 'Edit distributed task') : (locale === 'ja-JP' ? '配布用タスクを追加' : 'Add distributed task')} onClose={onClose} footer={
      <>
        {template && <button className="btn danger" onClick={() => onDelete(template.id)}>{Icons.trash(14)} {t(locale, 'sheets.delete')}</button>}
        <button className="btn tert" onClick={onClose}>{t(locale, 'sheets.cancel')}</button>
        <button className="btn primary" onClick={submit}>{t(locale, 'sheets.save')}</button>
      </>
    }>
      <div className="il-field">
        <label>{t(locale, 'sheets.taskName')}</label>
        <input className="il-input" value={name} onChange={(event) => { setName(event.target.value); setError(''); }} autoFocus />
      </div>
      <div className="il-field">
        <label>{t(locale, 'sheets.category')}</label>
        <div className="il-chiprow">
          {categories.map((category) => (
            <button
              key={category.id}
              className={'c task-cat' + (categoryId === category.id ? ' sel' : '')}
              onClick={() => { setCategoryId(category.id); setError(''); }}
              style={{ '--chip-cat': category.color, borderLeft: `3px solid ${category.color}` }}
            >
              {categoryLabel(locale, category)}
            </button>
          ))}
        </div>
      </div>
      <div className="il-field">
        <label>{t(locale, 'sheets.plannedTime')}</label>
        <div className="il-sheet-planrow">
          <input
            className="il-input short"
            type="number"
            value={plannedDurationMinutes}
            onChange={(event) => setPlannedDurationMinutes(Number(event.target.value) || 0)}
          />
          <span className="suffix">{t(locale, 'sheets.minutes')}</span>
          <div className="spacer" />
          {[15, 30, 60, 120].map((minutes) => (
            <button key={minutes} className="btn sm secondary" onClick={() => setPlannedDurationMinutes(minutes)}>{minutes}</button>
          ))}
        </div>
      </div>
      <div className="il-field">
        <label>{t(locale, 'sheets.due')}</label>
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
          aria-label={t(locale, 'sheets.dueDateTime')}
        />
      </div>
      {error && <div className="il-inline-error">{error}</div>}
    </SheetShell>
  );
}
