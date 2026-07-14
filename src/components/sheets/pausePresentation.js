import { fmtDuration } from '../../lib/formatters';
import { t, tx } from '../../i18n';

export function resolveInitialCategoryId(state, initialDraft) {
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

export function resolveInitialKind(state, categoryId) {
  return state.interruptCats.find((category) => category.id === categoryId)?.kind === 'break'
    ? 'break'
    : 'interrupt';
}

export function getBreakTone(elapsed, planned) {
  const plannedMs = planned * 60000;
  if (plannedMs <= 0) return 'free';
  const overMs = elapsed - plannedMs;
  if (overMs >= 120000) return 'late';
  if (overMs >= 0) return 'warn';
  return 'target';
}

export function getBreakTimerMeta(elapsed, planned, locale) {
  const plannedMs = planned * 60000;
  if (plannedMs <= 0) return t(locale, 'sheets.noTarget');
  const overMs = elapsed - plannedMs;
  if (overMs < 0) return tx(locale, 'sheets.targetMinutes', planned);
  return overMs < 60000
    ? t(locale, 'sheets.overTarget')
    : `+${fmtDuration(overMs, { showSec: overMs < 60000, locale })}`;
}

export function pauseCategoryDetail(category, locale) {
  if (category?.kind !== 'break') return '';
  const minutes = Math.max(0, category.defaultDurationMinutes ?? 0);
  return minutes > 0 ? tx(locale, 'sheets.targetMinutes', minutes) : t(locale, 'sheets.noTarget');
}
