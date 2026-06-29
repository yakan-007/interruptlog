import { useEffect, useState } from 'react';
import { fmtDuration } from '../../lib/formatters';
import { useTicker } from '../../lib/ticker';
import { elapsedSince } from '../../lib/timer';
import Icons from '../../icons';
import { interruptCategoryLabel, t, tx, urgencyLabel } from '../../i18n';
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
  const runTask = state.tasks.find((task) => task.id === state.running?.preTaskId);
  const elapsed = elapsedSince(state.running?.start ?? now, now);
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
      label: label || (who ? (locale === 'ja-JP' ? `${who}から` : `From ${who}`) : selectedLabel || t(locale, 'common.interrupt')),
      urgency,
      categoryId,
      memo,
      resume,
    });
  };

  const createFollowup = () => {
    actions.openSheet('interruptFollowup', { who, saveWhoChip, label: label || selectedLabel, urgency, categoryId, memo });
  };

  const scrollChipRow = (event) => {
    const row = event.currentTarget;
    if (row.scrollWidth <= row.clientWidth) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    row.scrollLeft += event.deltaY;
    event.preventDefault();
  };

  return (
    <SheetShell title={t(locale, 'sheets.pauseTitle')} onClose={onClose} footer={
      <>
        <button className="btn tert" onClick={() => actions.cancelInterrupt()}>{t(locale, 'sheets.cancel')}</button>
        <button className="btn secondary" onClick={() => save(false)}>{t(locale, 'sheets.saveAndEnd')}</button>
        <button className="btn primary" onClick={() => save(true)}>{t(locale, 'sheets.saveAndResume')}</button>
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
      />

      <div className="il-field">
        <label>{t(locale, 'sheets.pauseCategory')}</label>
        <div className="il-pause-kind-tabs il-segmented">
          <button type="button" className={activeKind === 'interrupt' ? 'active' : ''} onClick={() => switchKind('interrupt')}>
            {t(locale, 'sheets.pauseKindInterrupt')}
          </button>
          <button type="button" className={activeKind === 'break' ? 'active' : ''} onClick={() => switchKind('break')}>
            {t(locale, 'sheets.pauseKindBreak')}
          </button>
        </div>
        <div className="il-pause-category-grid">
          {visibleCategories.map((category) => {
            const detail = pauseCategoryDetail(category, locale);
            return (
            <button
              key={category.id}
              type="button"
              className={'il-pause-category ' + category.kind + (detail ? '' : ' compact') + (categoryId === category.id ? ' sel' : '')}
              onClick={() => selectCategory(category)}
            >
              <span className="icon">{pauseCategoryIcon(category, 14)}</span>
              <span className="main">{interruptCategoryLabel(locale, category)}</span>
              {detail && <span className="kind">{detail}</span>}
            </button>
            );
          })}
        </div>
      </div>

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
          scrollChipRow={scrollChipRow}
        />
      ) : (
        <BreakFields
          state={state}
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

function InterruptFields({
  state,
  locale,
  who,
  setWho,
  saveWhoChip,
  setSaveWhoChip,
  customWho,
  label,
  setLabel,
  urgency,
  setUrgency,
  memo,
  setMemo,
  createFollowup,
  scrollChipRow,
}) {
  return (
    <>
      <div className="il-field">
        <label>{t(locale, 'sheets.sender')}</label>
        <div className="il-chiprow" onWheel={scrollChipRow}>
          <input
            className="c il-chipinput"
            placeholder={t(locale, 'sheets.temporaryInput')}
            value={who && !state.whoChips.includes(who) ? who : ''}
            onChange={(event) => setWho(event.target.value)}
          />
          {state.whoChips.map((item) => (
            <button key={item} className={'c' + (who === item ? ' sel' : '')} onClick={() => setWho(item)}>
              {Icons.user(12)} {item}
            </button>
          ))}
        </div>
        {customWho && (
          <label className="il-inline-check">
            <input type="checkbox" checked={saveWhoChip} onChange={(event) => setSaveWhoChip(event.target.checked)} />
            <span>{t(locale, 'sheets.saveSender')}</span>
          </label>
        )}
      </div>

      <div className="il-field">
        <label>{t(locale, 'sheets.subject')}</label>
        <div className="il-chiprow" onWheel={scrollChipRow}>
          {state.subjectChips.map((item) => (
            <button key={item} className={'c' + (label === item ? ' sel' : '')} onClick={() => setLabel(item)}>{item}</button>
          ))}
        </div>
        <input
          className="il-input"
          placeholder={t(locale, 'sheets.subjectFree')}
          value={label && !state.subjectChips.includes(label) ? label : ''}
          onChange={(event) => setLabel(event.target.value)}
        />
      </div>

      <button className="il-followup-action" onClick={createFollowup}>
        {Icons.plus(14)} {t(locale, 'sheets.followupTask')}
      </button>

      <div className="il-field">
        <label>{t(locale, 'sheets.urgency')}</label>
        <div className="il-urg">
          <button className={urgency === 'low' ? 'sel low' : ''} onClick={() => setUrgency('low')}>{urgencyLabel(locale, 'low')}</button>
          <button className={urgency === 'med' ? 'sel med' : ''} onClick={() => setUrgency('med')}>{urgencyLabel(locale, 'med')}</button>
          <button className={urgency === 'high' ? 'sel high' : ''} onClick={() => setUrgency('high')}>{urgencyLabel(locale, 'high')}</button>
        </div>
      </div>

      <div className="il-field">
        <label>{t(locale, 'sheets.memo')}</label>
        <textarea className="il-textarea" placeholder={t(locale, 'sheets.memoPlaceholder')} value={memo} onChange={(event) => setMemo(event.target.value)} />
      </div>
    </>
  );
}

function BreakFields({ actions, locale, planned, memo, setMemo }) {
  const presets = [5, 10, 15, 30, 45];
  return (
    <>
      <div className="il-field">
        <label>{t(locale, 'sheets.breakTarget')}</label>
        <div className="il-sheet-copy">
          {t(locale, 'sheets.breakTargetCopy')}
        </div>
        <div className="il-breakpreset-row">
          {presets.map((minutes) => (
            <button
              key={minutes}
              className={'il-breakpreset' + (planned === minutes ? ' active' : '')}
              onClick={() => actions.setBreakTarget(minutes)}
            >
              {minutes}{t(locale, 'sheets.minutes')}
            </button>
          ))}
        </div>
      </div>

      <div className="il-field">
        <label>{t(locale, 'sheets.adjustMinutes')}</label>
        <div className="il-breakplan-row">
          <input className="il-input short" type="number" value={planned} onChange={(event) => actions.setBreakTarget(Number(event.target.value) || 0)} />
          <span className="suffix">{t(locale, 'sheets.minutes')}</span>
        </div>
      </div>

      <div className="il-field">
        <label>{t(locale, 'sheets.memo')}</label>
        <textarea className="il-textarea" placeholder={t(locale, 'sheets.memoPlaceholder')} value={memo} onChange={(event) => setMemo(event.target.value)} />
      </div>
    </>
  );
}

function resolveInitialCategoryId(state, initialDraft) {
  const running = state.running;
  if (running?.type === 'break') {
    return running.categoryId
      ?? state.interruptCats.find((category) => category.kind === 'break')?.id
      ?? state.interruptCats[0]?.id
      ?? null;
  }
  return initialDraft?.categoryId
    ?? running?.draft?.categoryId
    ?? running?.categoryId
    ?? state.interruptCats.find((category) => category.kind === 'interrupt')?.id
    ?? state.interruptCats[0]?.id
    ?? null;
}

function resolveInitialKind(state, categoryId) {
  return state.interruptCats.find((category) => category.id === categoryId)?.kind === 'break'
    ? 'break'
    : 'interrupt';
}

function getBreakTone(elapsed, planned) {
  const plannedMs = planned * 60000;
  if (plannedMs <= 0) return 'free';
  const overMs = elapsed - plannedMs;
  if (overMs >= 120000) return 'late';
  if (overMs >= 0) return 'warn';
  return 'target';
}

function getBreakTimerMeta(elapsed, planned, locale) {
  const plannedMs = planned * 60000;
  if (plannedMs <= 0) return t(locale, 'sheets.noTarget');
  const overMs = elapsed - plannedMs;
  if (overMs < 0) return tx(locale, 'sheets.targetMinutes', planned);
  return overMs < 60000
    ? t(locale, 'sheets.overTarget')
    : `+${fmtDuration(overMs, { showSec: overMs < 60000, locale })}`;
}

function pauseCategoryIcon(category, size) {
  if (category?.icon && Icons[category.icon]) return Icons[category.icon](size);
  return category?.kind === 'break' ? Icons.coffee(size) : Icons.bolt(size);
}

function pauseCategoryDetail(category, locale) {
  if (category?.kind !== 'break') return '';
  const minutes = Math.max(0, category.defaultDurationMinutes ?? 0);
  return minutes > 0 ? tx(locale, 'sheets.targetMinutes', minutes) : t(locale, 'sheets.noTarget');
}
