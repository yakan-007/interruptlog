import { useRef, useState } from 'react';
import Icons from '../../icons';
import { categoryLabel, t, translateError } from '../../i18n';

const DEFAULT_DURATION = 0;

export default function QuickAddCard({ state, actions }) {
  const inputRef = useRef(null);
  const [draft, setDraft] = useState(() => ({
    name: '',
    categoryId: state.categories[0]?.id ?? null,
    plannedDurationMinutes: DEFAULT_DURATION,
    dueAt: null,
    memo: '',
    error: '',
  }));

  const [focused, setFocused] = useState(false);

  const hasName = Boolean(draft.name.trim());
  const selectedCategoryId = state.categories.some((category) => category.id === draft.categoryId)
    ? draft.categoryId
    : state.categories[0]?.id ?? null;
  const selectedCategory = state.categories.find((category) => category.id === selectedCategoryId) ?? null;
  const taskAccent = selectedCategory?.color ?? 'var(--accent)';
  const hasDetails = draft.plannedDurationMinutes !== DEFAULT_DURATION || draft.dueAt != null || Boolean(draft.memo.trim());

  // At rest the card offers interruption/break; once you start writing a task
  // it becomes a task composer (full-width input, details, categories) instead.
  const expanded = focused || hasName || hasDetails;

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
      memo: '',
      error: '',
    }));
    inputRef.current?.focus();
  };

  // Bring the new task into view wherever the list order put it (top, bottom,
  // or its place by due date). Two frames: the list renders it first.
  const revealAddedTask = (taskId) => {
    if (!taskId) return;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const cards = inputRef.current?.closest('.il-screen')?.querySelectorAll('.il-taskcard[data-task-id]') ?? [];
      [...cards].find((card) => card.dataset.taskId === taskId)
        ?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    }));
  };

  const scrollCategoriesWithWheel = (event) => {
    const target = event.currentTarget;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!delta) return;

    const maxScroll = target.scrollWidth - target.clientWidth;
    if (maxScroll <= 0) return;

    const nextLeft = Math.min(Math.max(target.scrollLeft + delta, 0), maxScroll);
    if (nextLeft === target.scrollLeft) return;

    event.preventDefault();
    target.scrollLeft = nextLeft;
  };

  const openDetails = () => {
    actions.openSheet('addTask', {
      draft: {
        name: draft.name,
        categoryId: selectedCategoryId,
        plannedDurationMinutes: draft.plannedDurationMinutes,
        dueAt: draft.dueAt,
        memo: draft.memo,
      },
      onDraftChange: (nextDraft) => {
        setDraft((current) => ({ ...current, ...nextDraft, error: '' }));
      },
      onAfterSubmit: (nextDraft) => {
        resetDraft(nextDraft?.categoryId ?? selectedCategoryId);
        revealAddedTask(nextDraft?.taskId);
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
      memo: draft.memo,
    };
    const result = mode === 'start'
      ? actions.createTaskAndStart(payload)
      : actions.createTask(payload);
    if (!result.ok) {
      setDraft((current) => ({ ...current, error: translateError(state.preferences.locale, result.errorCode) }));
      return;
    }
    resetDraft(selectedCategoryId);
    if (mode === 'start') inputRef.current?.blur();
    revealAddedTask(result.taskId);
  };

  // Buttons must not take focus from the input: the dock resizes on focus change,
  // which would move the button out from under the pointer mid-click.
  const keepInputFocus = (event) => event.preventDefault();

  const handleInputKeyDown = (event) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit('create');
  };

  return (
    <div
      className={'il-quickdock' + (expanded ? ' expanded' : '')}
      style={{ '--task-cat': taskAccent }}
    >
      {draft.error && <div className="il-quickdock-error">{draft.error}</div>}

      <div className="il-quickdock-main">
        <div className="il-quickdock-field">
          <input
            ref={inputRef}
            className={'il-input il-quickdock-input' + (expanded ? ' with-detail' : '')}
            placeholder={t(state.preferences.locale, 'log.addPlaceholder')}
            value={draft.name}
            onChange={(event) => updateDraft({ name: event.target.value })}
            onKeyDown={handleInputKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            enterKeyHint="done"
            aria-label={t(state.preferences.locale, 'log.taskName')}
          />
          {expanded && (
            <button
              className={'il-quickdock-detail' + (hasDetails ? ' active' : '')}
              onMouseDown={keepInputFocus}
              onClick={openDetails}
              aria-label={t(state.preferences.locale, 'log.openDetails')}
            >
              {Icons.dots(15)}
            </button>
          )}
        </div>

        {hasName ? (
          <>
            <button
              className="il-quickdock-icon add"
              onMouseDown={keepInputFocus}
              onClick={() => submit('create')}
              aria-label={t(state.preferences.locale, 'log.addTask')}
            >
              {Icons.plus(16)}
            </button>
            <button
              className="il-quickdock-icon start"
              onMouseDown={keepInputFocus}
              onClick={() => submit('start')}
              aria-label={t(state.preferences.locale, 'log.addAndStart')}
            >
              {Icons.play(16)}
            </button>
          </>
        ) : !expanded && (
          <>
            {!state.running && (
              <button
                className="il-quickdock-pause"
                onMouseDown={keepInputFocus}
                onClick={() => actions.openSheet('newPause')}
                aria-label={t(state.preferences.locale, 'log.startPause')}
              >
                <span className="icon" aria-hidden="true">{Icons.bolt(15)}</span>
                <span>{t(state.preferences.locale, 'log.pauseShort')}</span>
              </button>
            )}
            {(!state.running || state.running.type === 'task') && (
              <button
                className="il-quickdock-break"
                onMouseDown={keepInputFocus}
                onClick={() => actions.openSheet('newPause', { kind: 'break' })}
                aria-label={t(state.preferences.locale, 'log.startBreak')}
              >
                <span className="icon" aria-hidden="true">{Icons.coffee(15)}</span>
                <span>{t(state.preferences.locale, 'log.breakShort')}</span>
              </button>
            )}
          </>
        )}
      </div>

      {expanded && (
      <div className="il-quickdock-cats" onWheel={scrollCategoriesWithWheel} onMouseDown={keepInputFocus}>
        {state.categories.map((category) => (
          <button
            key={category.id}
            className={'il-quickdock-cat' + (selectedCategoryId === category.id ? ' active' : '')}
            onClick={() => updateDraft({ categoryId: category.id })}
            style={{ '--chip-cat': category.color }}
            aria-label={categoryLabel(state.preferences.locale, category)}
          >
            <span className="dot" style={{ background: category.color }} />
            <span>{categoryLabel(state.preferences.locale, category)}</span>
          </button>
        ))}
      </div>
      )}
    </div>
  );
}
