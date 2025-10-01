'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import useEventsStore from '@/store/useEventsStore';

const DIRECTORY_LIMIT = 10;

interface DirectoryEditorProps {
  title: string;
  description: string;
  placeholder: string;
  value: string;
  items: string[];
  onValueChange: (next: string) => void;
  onAdd: (entry: string) => void;
  onRemove: (entry: string) => void;
}

const DirectoryEditor = ({
  title,
  description,
  placeholder,
  value,
  items,
  onValueChange,
  onAdd,
  onRemove,
}: DirectoryEditorProps) => {
  const normalized = value.trim();
  const alreadyExists = normalized.length > 0 && items.some(entry => entry.toLowerCase() === normalized.toLowerCase());
  const reachedLimit = items.length >= DIRECTORY_LIMIT && !alreadyExists;

  const handleSubmit = () => {
    if (!normalized || reachedLimit) {
      return;
    }
    onAdd(normalized);
    onValueChange('');
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="mb-3 space-y-1">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </header>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            value={value}
            onChange={event => onValueChange(event.target.value)}
            placeholder={placeholder}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                if (!reachedLimit) {
                  handleSubmit();
                }
              }
            }}
          />
          <Button type="button" onClick={handleSubmit} disabled={reachedLimit}>
            {alreadyExists ? '更新' : '追加'}
          </Button>
        </div>
        {reachedLimit && (
          <p className="text-xs text-rose-500">登録は最大 {DIRECTORY_LIMIT} 件までです。不要な項目を削除してから追加してください。</p>
        )}
        {items.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {items.map(entry => (
              <li key={entry}>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <button
                    type="button"
                    onClick={() => onValueChange(entry)}
                    className="truncate text-left"
                    title="クリックして編集"
                  >
                    {entry}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(entry)}
                    className="rounded-full p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    aria-label={`${entry} を削除`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            まだ登録がありません。よく登場する項目を追加すると、割り込み登録時にワンタップで選べます。
          </p>
        )}
      </div>
    </div>
  );
};

const InterruptDirectorySection = () => {
  const { interruptContacts, interruptSubjects, actions } = useEventsStore(state => ({
    interruptContacts: state.interruptContacts,
    interruptSubjects: state.interruptSubjects,
    actions: state.actions,
  }));

  const [contactDraft, setContactDraft] = useState('');
  const [subjectDraft, setSubjectDraft] = useState('');

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
        割り込みの定型入力
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        繰り返し登場する発信者や件名テンプレートを登録しておくと、モーダルや履歴登録で素早く入力できます（各 {DIRECTORY_LIMIT} 件まで）。
      </p>
      <DirectoryEditor
        title="よく割り込みを発生させる相手"
        description="名前やチーム名、通知元などを登録しておくとワンタップで選択できます。"
        placeholder="例: 佐藤マネージャー"
        value={contactDraft}
        items={interruptContacts}
        onValueChange={setContactDraft}
        onAdd={actions.addInterruptContact}
        onRemove={actions.removeInterruptContact}
      />
      <DirectoryEditor
        title="割り込みの件名テンプレート"
        description="よく使う件名を登録しておくと、モーダルでワンタップ入力できます。"
        placeholder="例: 障害一次対応"
        value={subjectDraft}
        items={interruptSubjects}
        onValueChange={setSubjectDraft}
        onAdd={actions.addInterruptSubject}
        onRemove={actions.removeInterruptSubject}
      />
    </div>
  );
};

export default InterruptDirectorySection;
