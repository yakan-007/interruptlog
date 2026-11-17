import { useEffect, useState } from 'react';
import { useTicker } from '../../lib/ticker';
import { elapsedSince } from '../../lib/timer';
import { interruptCategoryLabel, t, tx } from '../../i18n';
import { getResumeTaskId } from '../../state';
import { PauseCategoryPicker, PauseSwitchButton } from './PauseControls';
import { BreakFields, InterruptFields } from './PauseFields';
import { resolveInitialCategoryId } from './pausePresentation';
import SheetShell from './SheetShell';
import TimerPanel from './TimerPanel';

export default function PauseSheet({ state, actions, onClose, onDraftChange, initialDraft }) {
  const now = useTicker(1000);
  const locale = state.preferences.locale;
  const initialCategoryId = resolveInitialCategoryId(state, initialDraft);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [who, setWho] = useState(initialDraft?.who ?? state.running?.draft?.who ?? '');
  const [saveWhoChip, setSaveWhoChip] = useState(initialDraft?.saveWhoChip ?? state.running?.draft?.saveWhoChip ?? false);
  const [label, setLabel] = useState(initialDraft?.label ?? state.running?.draft?.label ?? '');
  const [memo, setMemo] = useState(initialDraft?.memo ?? state.running?.draft?.memo ?? '');
  const [breakMemo, setBreakMemo] = useState('');

  const selectedCategory = state.interruptCats.find((category) => category.id === categoryId)
    ?? state.interruptCats[0]
    ?? null;
  const mode = selectedCategory?.kind === 'break' ? 'break' : 'interrupt';
  const selectedLabel = interruptCategoryLabel(locale, selectedCategory);
  const resumeTaskId = getResumeTaskId(state);
  const runTask = resumeTaskId ? state.tasks.find((task) => task.id === resumeTaskId) : null;
  const elapsed = elapsedSince(state.running?.start ?? now, now);
  const customWho = Boolean(who.trim()) && !state.whoChips.includes(who);

  useEffect(() => {
    if (mode !== 'interrupt') return;
    onDraftChange?.({ who, saveWhoChip, label, categoryId, memo });
  }, [categoryId, label, memo, mode, onDraftChange, saveWhoChip, who]);

  const selectCategory = (category) => {
    setCategoryId(category.id);
    actions.selectPauseCategory(category.id);
  };

  const save = (resume) => {
    if (mode === 'break') {
      actions.saveBreak({
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
      categoryId,
      memo,
      resume,
    });
  };

  const currentPauseData = () => mode === 'break'
    ? {
        categoryId: selectedCategory?.id ?? null,
        label: selectedLabel || t(locale, 'common.break'),
        memo: breakMemo,
      }
    : {
        who,
        saveWhoChip,
        label: label || selectedLabel,
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
        className={'il-sheet-timer ' + mode}
        elapsed={elapsed}
        eyebrow={mode === 'break' ? t(locale, 'sheets.breakActive') : t(locale, 'sheets.pauseActive')}
        hint={selectedLabel}
        locale={locale}
      />

      <PauseSwitchButton mode={mode} locale={locale} onSwitch={startNextPause} />

      <PauseCategoryPicker
        categories={state.interruptCats}
        categoryId={categoryId}
        locale={locale}
        onSelect={selectCategory}
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
          memo={memo}
          setMemo={setMemo}
        />
      ) : (
        <BreakFields
          locale={locale}
          memo={breakMemo}
          setMemo={setBreakMemo}
        />
      )}
    </SheetShell>
  );
}
