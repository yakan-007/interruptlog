import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import SheetShell from './SheetShell';

afterEach(() => cleanup());

describe('SheetShell', () => {
  it('exposes a localized modal dialog and closes with Escape', () => {
    const onClose = vi.fn();
    render(
      <SheetShell title="Edit task" locale="en-US" onClose={onClose}>
        <input aria-label="Task name" />
      </SheetShell>
    );

    const dialog = screen.getByRole('dialog', { name: 'Edit task' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('cycles keyboard focus within the dialog', () => {
    render(
      <SheetShell
        title="Dialog"
        locale="en-US"
        onClose={() => {}}
        footer={<button type="button">Last action</button>}
      >
        <button type="button">First action</button>
      </SheetShell>
    );
    const dialog = screen.getByRole('dialog', { name: 'Dialog' });
    const first = screen.getByRole('button', { name: 'Close' });
    const last = screen.getByRole('button', { name: 'Last action' });

    last.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('returns focus to the previously active control after unmount', () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const view = render(
      <SheetShell title="Dialog" onClose={() => {}}>
        <input aria-label="Autofocus target" autoFocus />
      </SheetShell>
    );

    expect(document.activeElement).not.toBe(trigger);
    view.unmount();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });
});
