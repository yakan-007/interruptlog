import { newId } from './ids';
import { cleanText } from './utils';

// Builders for the records a pause (interrupt or break) leaves behind. Shared by
// every path that can end a pause, so a pause closed by starting a task keeps
// the same label, sender and memo as one closed from the pause sheet.

export function closeRunningPauseSegmentInState(state, now, data = {}, dependencies = {}) {
  const running = state.running;
  if (running?.type === 'interrupt') {
    const event = buildInterruptEvent({ ...running.draft, ...data }, running.start, now, null, dependencies);
    return appendInterruptEvent(state, event, data.saveWhoChip ?? running.draft?.saveWhoChip);
  }
  if (running?.type === 'break') {
    return {
      ...state,
      events: [...state.events, buildBreakEvent(running, data, now, '休憩', dependencies)],
    };
  }
  return state;
}

export function normalizeInterruptDraft(raw) {
  const data = raw ?? {};
  return {
    who: cleanText(data.who),
    saveWhoChip: Boolean(data.saveWhoChip),
    label: cleanText(data.label),
    categoryId: cleanText(data.categoryId) || null,
    memo: cleanText(data.memo),
  };
}

export function appendInterruptEvent(state, event, saveWhoChip) {
  return {
    ...state,
    events: [...state.events, event],
    whoChips: saveWhoChip && event.who && !state.whoChips.includes(event.who)
      ? [...state.whoChips, event.who]
      : state.whoChips,
  };
}

export function buildBreakEvent(running, data, now, fallbackLabel = '休憩', { createId = newId } = {}) {
  const runningLabel = cleanText(running.label);
  return {
    id: createId('ev', now),
    type: 'break',
    label: cleanText(data.label) || (running.categoryId && runningLabel ? runningLabel : fallbackLabel),
    categoryId: cleanText(data.categoryId) || running.categoryId || null,
    memo: cleanText(data.memo),
    start: running.start ?? now,
    end: now,
  };
}

export function buildInterruptEvent(data = {}, start, end, fallbackLabel = null, { createId = newId } = {}) {
  return {
    id: createId('ev', end),
    type: 'interrupt',
    label: cleanText(data.label) || (data.who ? `${data.who}から` : fallbackLabel || '割り込み作業'),
    who: cleanText(data.who),
    categoryId: data.categoryId || null,
    memo: data.memo || '',
    start,
    end,
  };
}

export function interruptLabel(data = {}, categoryName = null) {
  return cleanText(data.label) || (data.who ? `${data.who}から` : cleanText(categoryName) || '割り込み作業中');
}
