import { formatId } from '../domain/ids';

export function createIdGenerator(random = Math.random) {
  return {
    next: (prefix, now) => formatId(prefix, now, random()),
  };
}

export const systemIdGenerator = createIdGenerator();
