import { describe, expect, it, vi } from 'vitest';
import { createIdGenerator } from './idGenerator';

describe('createIdGenerator', () => {
  it('uses the supplied entropy source without reading global randomness', () => {
    const random = vi.fn(() => 0.5);
    const generator = createIdGenerator(random);

    expect(generator.next('ev', 1000)).toBe('evrsi');
    expect(random).toHaveBeenCalledOnce();
  });
});
