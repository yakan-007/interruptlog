import { useEffect, useState } from 'react';
import { useTicker } from '../../lib/ticker';
import { elapsedSince } from '../../lib/timer';
import { interruptCategoryLabel, t, tx } from '../../i18n';
import { getPauseStartFloor, getResumeTaskId } from '../../state';
import { ActivitySwitch, PauseCategoryPicker } from './PauseControls';
import { BreakFields, InterruptFields } from './PauseFields';
import { getBreakTimerMeta, getBreakTone, resolveInitialCategoryId, resolveInitialKind } from './pausePresentation';
import SheetShell from './SheetShell';
import TimerPanel from './TimerPanel';

export default function PauseSheet({ state, actions, onClose, onDraftChange, initialDraft }) {
  const now = useTicker(1000);
  const locale = state.preferences.locale;
  const initialCategoryId = resolveInitialCategoryId(state, initialDraft);
  const initialKind = resolveInitialKind(state, initialCategoryId);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [activeKind, setActiveKind] = useState(initialKind);
  const [who, setWho] = useState(initialDraft?.who ?? state.running?.draft?.who ?? '');
  const [saveWhoChip, setSaveWhoChip] = useState(initialDraft?.saveWhoChip ?? state.running?.draft?.saveWhoChip ?? false);
  const [label, setLabel] = useState(initialDraft?.label ?? state.running?.draft?.label ?? '');
  const [urgency, setUrgency] = useState(initialDraft?.urgency ?? state.running?.draft?.urgency ?? 'med');
  const [memo, setMemo] = useState(initialDraft?.memo ?? state.running?.draft?.memo ?? '');
  const [breakMemo, setBreakMemo] = useState('');

  const selectedCategory = state.interruptCats.find((category) => category.id === categoryId)
    ?? state.interruptCats[0]
    ?? null;
  const mode = selectedCategory?.kind === 'break' ? 'break' : 'interrupt';
  const visibleCategories = state.interruptCats.filter((category) => category.kind === activeKind);
  const selectedLabel = interruptCategoryLabel(locale, selectedCategory);
  const resumeTaskId = getResumeTaskId(state);
  const runTask = resumeTaskId ? state.tasks.find((task) => task.id === resumeTaskId) : null;
  const elapsed = elapsedSince(state.running?.start ?? now, now);
  const startFloor = getPauseStartFloor(state);
  const canStartEarlier = startFloor != null && state.running?.start != null && startFloor < state.running.start;
  const customWho = Boolean(who.trim()) && !state.whoChips.includes(who);
  const planned = mode === 'break'
    ? state.running?.type === 'break'
      ? Math.max(0, state.running.plannedBreakDurationMinutes ?? 0)
      : Math.max(0, selectedCategory?.defaultDurationMinutes ?? 0)
    : 0;
  const breakTone = getBreakTone(elapsed, planned);
  const timerMeta = getBreakTimerMeta(elapsed, planned, locale);

  useEffect(() => {
    if (mode !== 'interrupt') return;
    onDraftChange?.({ who, saveWhoChip, label, urgency, categoryId, memo });
  }, [categoryId, label, memo, mode, onDraftChange, saveWhoChip, urgency, who]);

  const selectCategory = (category) => {
    setCategoryId(category.id);
    actions.selectPauseCategory(category.id);
  };

  const switchKind = (nextKind) => {
    setActiveKind(nextKind);
    if (selectedCategory?.kind === nextKind) return;
    const nextCategory = state.interruptCats.find((category) => category.kind === nextKind);
    if (nextCategory) selectCategory(nextCategory);
  };

  const save = (resume) => {
    if (mode === 'break') {
      actions.saveBreak({
        breakDurationMinutes: planned,
        categoryId: selectedCategory?.id ?? null,
        label: selectedLabel || t(locale, 'common.break'),
        memo: breakMemo,
        resume,
      });
      return;
    }

    actions.saveInterrupt({
      who,
      saveWhoChip,
      label: label || (who ? tx(locale, 'common.fromSender', who) : selectedLabel || t(locale, 'common.interrupt')),
      urgency,
      categoryId,
      memo,
      resume,
    });
  };

  const createFollowup = () => {
    actions.openSheet('interruptFollowup', { who, saveWhoChip, label: label || selectedLabel, urgency, categoryId, memo });
  };

  const currentPauseData = () => mode === 'break'
    ? {
        breakDurationMinutes: planned,
        categoryId: selectedCategory?.id ?? null,
        label: selectedLabel || t(locale, 'common.break'),
        memo: breakMemo,
      }
    : {
        who,
        saveWhoChip,
        label: label || selectedLabel,
        urgency,
        categoryId,
        memo,
      };

  const startNextPause = (nextKind) => {
    const nextCategory = state.interruptCats.find((category) => category.kind === nextKind);
    if (!nextCategory) return;
    actions.beginNextPause(nextCategory.id, currentPauseData());
  };

  return (
    <SheetShell title={t(locale, 'sheets.pauseTitle')} onClose={onClose} locale={locale} footer={
      <>
        <button className="btn tert" onClick={() => actions.cancelInterrupt()}>{t(locale, 'sheets.discardPause')}</button>
        {runTask ? (
          <>
            <button className="btn secondary" onClick={() => save(false)}>{t(locale, 'sheets.saveAndEnd')}</button>
            <button className="btn primary" onClick={() => save(true)}>{t(locale, 'sheets.saveAndResume')}</button>
          </>
        ) : (
          <button className="btn primary" onClick={() => save(false)}>{t(locale, 'sheets.save')}</button>
        )}
      </>
    }>
      {runTask && (
        <div className="il-sheet-infobox">
          <div className="dot muted" />
          <div className="meta">
            <span className="strong">{t(locale, 'sheets.pausedTask')}</span> <span>{runTask.name}</span>
          </div>
          <div className="il-mono quiet">{t(locale, 'sheets.paused')}</div>
        </div>
      )}

      <TimerPanel
        className={mode === 'break'
          ? 'il-sheet-timer break' + (planned > 0 ? ' has-target' : '') + (breakTone === 'warn' ? ' warn' : '') + (breakTone === 'late' ? ' late' : '')
          : 'il-sheet-timer interrupt'}
        elapsed={elapsed}
        eyebrow={mode === 'break' ? t(locale, 'sheets.breakActive') : t(locale, 'sheets.pauseActive')}
        hint={mode === 'break' ? timerMeta : selectedLabel}
        locale={locale}
      >
        <div className="il-sheet-timer-shift" role="group" aria-label={t(locale, 'sheets.startEarlier')}>
          <span>{t(locale, 'sheets.startEarlier')}</span>
          {[1, 3, 5].map((minutes) => (
            <button key={minutes} type="button" disabled={!canStartEarlier} onClick={() => actions.shiftPauseStart(minutes)}>
              {tx(locale, 'sheets.minutesEarlier', minutes)}
            </button>
          ))}
        </div>
      </TimerPanel>

      <ActivitySwitch mode={mode} locale={locale} onStartNextPause={startNextPause} />

      <PauseCategoryPicker
        activeKind={activeKind}
        categories={visibleCategories}
        categoryId={categoryId}
        locale={locale}
        onSelect={selectCategory}
        onSwitchKind={switchKind}
      />

      {mode === 'interrupt' ? (
        <InterruptFields
          state={state}
          locale={locale}
          who={who}
          setWho={setWho}
          saveWhoChip={saveWhoChip}
          setSaveWhoChip={setSaveWhoChip}
          customWho={customWho}
          label={label}
          setLabel={setLabel}
          urgency={urgency}
          setUrgency={setUrgency}
          memo={memo}
          setMemo={setMemo}
          createFollowup={createFollowup}
        />
      ) : (
        <BreakFields
          actions={actions}
          locale={locale}
          planned={planned}
          memo={breakMemo}
          setMemo={setBreakMemo}
        />
      )}
    </SheetShell>
  );
}
