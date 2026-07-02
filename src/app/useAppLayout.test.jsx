import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useAppLayout } from './useAppLayout';

const originalInnerHeight = window.innerHeight;
const originalVisualViewport = window.visualViewport;

function setInnerHeight(value) {
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value,
  });
}

function setVisualViewport({ height, offsetTop = 0 }) {
  const listeners = new Map();
  const viewport = {
    height,
    offsetTop,
    addEventListener: vi.fn((type, callback) => listeners.set(type, callback)),
    removeEventListener: vi.fn((type) => listeners.delete(type)),
  };

  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: viewport,
  });

  return {
    viewport,
    emit: (type) => listeners.get(type)?.(),
  };
}

function LayoutProbe() {
  const ref = useRef(null);
  useAppLayout(ref, { accent: 'oklch(0.5 0.08 180)', dark: true });

  return (
    <div ref={ref} data-testid="app-shell">
      <input aria-label="タスク名" />
    </div>
  );
}

describe('app layout viewport vars', () => {
  beforeEach(() => {
    setInnerHeight(800);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback();
      return 0;
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: originalInnerHeight,
    });
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: originalVisualViewport,
    });
  });

  it('keeps the app height stable while exposing keyboard overlap to fixed controls', () => {
    const visualViewport = setVisualViewport({ height: 800 });

    render(<LayoutProbe />);

    const shell = screen.getByTestId('app-shell');
    expect(shell.style.getPropertyValue('--app-height')).toBe('800px');
    expect(shell.style.getPropertyValue('--keyboard-inset')).toBe('0px');
    expect(shell.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    screen.getByRole('textbox', { name: 'タスク名' }).focus();
    setInnerHeight(500);
    visualViewport.viewport.height = 500;
    visualViewport.emit('resize');

    expect(shell.style.getPropertyValue('--app-height')).toBe('800px');
    expect(shell.style.getPropertyValue('--keyboard-inset')).toBe('300px');
    expect(shell.hasAttribute('data-keyboard-open')).toBe(true);

    screen.getByRole('textbox', { name: 'タスク名' }).blur();
    setInnerHeight(800);
    visualViewport.viewport.height = 800;
    visualViewport.emit('resize');

    expect(shell.style.getPropertyValue('--keyboard-inset')).toBe('0px');
    expect(shell.hasAttribute('data-keyboard-open')).toBe(false);
  });
});
