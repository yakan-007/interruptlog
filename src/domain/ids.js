export function formatId(prefix, now, randomValue) {
  return prefix + now.toString(36) + randomValue.toString(36).slice(2, 6);
}
