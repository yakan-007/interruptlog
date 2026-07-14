import { formatId } from '../domain/ids';

export function newId(prefix = 'ev', now = Date.now(), random = Math.random) {
  return formatId(prefix, now, random());
}
