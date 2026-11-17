// Breaks have no category; an interruption starts from its draft, the running
// record, or the first category.
export function resolveInitialCategoryId(state, initialDraft) {
  const running = state.running;
  if (running?.type === 'break') return null;
  const interruptCategories = state.interruptCats;
  const known = (id) => (interruptCategories.some((category) => category.id === id) ? id : null);
  return known(initialDraft?.categoryId)
    ?? known(running?.draft?.categoryId)
    ?? known(running?.categoryId)
    ?? interruptCategories[0]?.id
    ?? null;
}
