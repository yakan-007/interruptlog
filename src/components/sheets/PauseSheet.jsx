import { useEffect, useState } from 'react';
import { useTicker } from '../../lib/ticker';
import { elapsedSince } from '../../lib/timer';
import { interruptCategoryLabel, t, tx } from '../../i18n';
import { getResumeTaskId } from '../../state';
import { PauseCategoryPicker, PauseSwitchButton } from './PauseControls';
import { InterruptFields } from './PauseFields';
import { MemoField } from './RecordFields';
import { resolveInitialCategoryId } from './pausePresentation';
import ConfirmFooter from './ConfirmFooter';
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
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const mode = state.running?.type === 'break' ? 'break' : 'interrupt';
  const interruptCategories = state.interruptCats;
  const selectedCategory = mode === 'interrupt'
    ? interruptCategories.find((category) => category.id === categoryId) ?? interruptCategories[0] ?? null
    : null;
  const selectedLabel = selectedCategory ? interruptCategoryLabel(locale, selectedCategory) : '';
  const resumeTaskId = getResumeTaskId(state);
  const runTask = resumeTaskId ? state.tasks.find((task) => task.id === resumeTaskId) : null;
  const elapsed = elapsedSince(state.running?.start ?? now, now);

  useEffect(() => {
    if (mode !== 'interrupt') return;
    onDraftChange?.({ who, saveWhoChip, label, categoryId, memo });
  }, [categoryId, label, memo, mode, onDraftChange, saveWhoChip, who]);

  const selectCategory = (category) => {
    setCategoryId(category.id);
    if (mode === 'break') actions.setPauseKind('interrupt', category.id);
    else actions.selectPauseCategory(category.id);
  };

  const selectBreak = () => {
    if (mode !== 'break') actions.setPauseKind('break');
  };

  const startClock = state.running?.start != null
    ? `${String(new Date(state.running.start).getHours()).padStart(2, '0')}:${String(new Date(state.running.start).getMinutes()).padStart(2, '0')}`
    : null;

  const save = (resume) => {
    if (mode === 'break') {
      actions.saveBreak({
        label: t(locale, 'common.break'),
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
        label: t(locale, 'common.break'),
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
    actions.beginNextPause(nextKind, currentPauseData());
  };

  return (
    <SheetShell title={t(locale, 'sheets.pauseTitle')} onClose={onClose} locale={locale} footer={confirmingDiscard ? (
      <ConfirmFooter
        message={runTask
          ? tx(locale, 'sheets.discardToTask', { time: startClock, task: runTask.name })
          : tx(locale, 'sheets.discardNoTask', startClock)}
        backLabel={t(locale, 'sheets.back')}
        confirmLabel={t(locale, 'sheets.discardAction')}
        onBack={() => setConfirmingDiscard(false)}
        onConfirm={() => actions.cancelInterrupt()}
      />
    ) : (
      <>
        <button className="btn tert" onClick={() => setConfirmingDiscard(true)}>{t(locale, 'sheets.discardPause')}</button>
        {runTask ? (
          <>
            <button className="btn secondary" onClick={() => save(false)}>{t(locale, 'sheets.saveAndEnd')}</button>
            <button className="btn primary" onClick={() => save(true)}>{t(locale, 'sheets.saveAndResume')}</button>
          </>
        ) : (
          <button className="btn primary" onClick={() => save(false)}>{t(locale, 'sheets.save')}</button>
        )}
      </>
    )}>
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
        eyebrow={t(locale, mode === 'break' ? 'sheets.breakActive' : 'sheets.pauseActive')}
        hint={startClock ? tx(locale, 'sheets.since', startClock) : null}
      />

      <PauseSwitchButton mode={mode} locale={locale} onSwitch={startNextPause} />

      <PauseCategoryPicker
        mode={mode}
        categories={interruptCategories}
        categoryId={categoryId}
        locale={locale}
        onSelect={selectCategory}
        onSelectBreak={selectBreak}
      />

      {mode === 'interrupt' ? (
        <InterruptFields
          state={state}
          locale={locale}
          who={who}
          setWho={setWho}
          saveWhoChip={saveWhoChip}
          setSaveWhoChip={setSaveWhoChip}
          label={label}
          setLabel={setLabel}
          memo={memo}
          setMemo={setMemo}
        />
      ) : (
        <MemoField type="break" memo={breakMemo} onChange={setBreakMemo} locale={locale} />
      )}
    </SheetShell>
  );
}
