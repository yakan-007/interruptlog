import { useRef, useState } from 'react';
import Icons from '../../icons';

const DEFAULT_DURATION = 0;

export default function QuickAddCard({ state, actions }) {
  const inputRef = useRef(null);
  const [draft, setDraft] = useState(() => ({
    name: '',
    categoryId: state.categories[0]?.id ?? null,
    plannedDurationMinutes: DEFAULT_DURATION,
    dueAt: null,
    error: '',
  }));

  const hasName = Boolean(draft.name.trim());
  const isPaused = state.running?.type === 'interrupt' || state.running?.type === 'break';
  const selectedCategoryId = state.categories.some((category) => category.id === draft.categoryId)
    ? draft.categoryId
    : state.categories[0]?.id ?? null;
  const selectedCategory = state.categories.find((category) => category.id === selectedCategoryId) ?? null;
  const taskAccent = selectedCategory?.color ?? 'var(--accent)';
  const hasDetails = draft.plannedDurationMinutes !== DEFAULT_DURATION || draft.dueAt != null;

  const updateDraft = (patch) => {
    setDraft((current) => ({ ...current, ...patch, error: '' }));
  };

  const resetDraft = (categoryId = selectedCategoryId) => {
    setDraft((current) => ({
      ...current,
      name: '',
      categoryId,
      plannedDurationMinutes: DEFAULT_DURATION,
      dueAt: null,
      error: '',
    }));
    inputRef.current?.focus();
  };

  const revealAddedTask = () => {
    if (!state.preferences.topAdd) return;
    window.requestAnimationFrame(() => {
      inputRef.current
        ?.closest('.il-screen')
        ?.querySelector('.il-body-log')
        ?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const openDetails = () => {
    actions.openSheet('addTask', {
      draft: {
        name: draft.name,
        categoryId: selectedCategoryId,
        plannedDurationMinutes: draft.plannedDurationMinutes,
        dueAt: draft.dueAt,
      },
      onDraftChange: (nextDraft) => {
        setDraft((current) => ({ ...current, ...nextDraft, error: '' }));
      },
      onAfterSubmit: (nextDraft) => {
        resetDraft(nextDraft?.categoryId ?? selectedCategoryId);
        revealAddedTask();
      },
    });
  };

  const submit = (mode) => {
    if (!draft.name.trim()) return;
    const payload = {
      name: draft.name,
      categoryId: selectedCategoryId,
      plannedDurationMinutes: draft.plannedDurationMinutes,
      dueAt: draft.dueAt,
    };
    const result = mode === 'start'
      ? actions.createTaskAndStart(payload)
      : actions.createTask(payload);
    if (!result.ok) {
      setDraft((current) => ({ ...current, error: result.error ?? '入力を確認してください' }));
      return;
    }
    resetDraft(selectedCategoryId);
    revealAddedTask();
  };

  return (
    <div className="il-quickdock" style={{ '--task-cat': taskAccent }}>
      {draft.error && <div className="il-quickdock-error">{draft.error}</div>}

      <div className="il-quickdock-main">
        <input
          ref={inputRef}
          className="il-input il-quickdock-input"
          placeholder="タスクを追加..."
          value={draft.name}
          onChange={(event) => updateDraft({ name: event.target.value })}
          aria-label="タスク名"
        />

        <button
          className={'il-quickdock-icon detail' + (hasDetails ? ' active' : '')}
          onClick={openDetails}
          aria-label="詳細を開く"
        >
          {Icons.dots(15)}
        </button>
        <button
          className="il-quickdock-icon add"
          onClick={() => submit('create')}
          disabled={!hasName}
          aria-label="タスクを追加"
        >
          {Icons.plus(16)}
        </button>
        <button
          className="il-quickdock-icon start"
          onClick={() => submit('start')}
          disabled={!hasName || isPaused}
          aria-label="追加して開始"
        >
          {Icons.play(16)}
        </button>
      </div>

      <div className="il-quickdock-cats">
        {state.categories.map((category) => (
          <button
            key={category.id}
            className={'il-quickdock-cat' + (selectedCategoryId === category.id ? ' active' : '')}
            onClick={() => updateDraft({ categoryId: category.id })}
            style={{ '--chip-cat': category.color }}
            aria-label={category.name}
          >
            <span className="dot" style={{ background: category.color }} />
            <span>{category.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
