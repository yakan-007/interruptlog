export function newId(prefix = 'ev', now = Date.now()) {
  return prefix + now.toString(36) + Math.random().toString(36).slice(2, 6);
}
