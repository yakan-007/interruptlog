
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
