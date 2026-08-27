import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PersistenceWarning from './PersistenceWarning';

describe('persistence warning', () => {
  it('offers JSON export and prevents duplicate retries while one is running', async () => {
    const user = userEvent.setup();
    let finishRetry;
    const onRetry = vi.fn(() => new Promise((resolve) => { finishRetry = resolve; }));
    const onExport = vi.fn();
    render(<PersistenceWarning locale="ja-JP" onRetry={onRetry} onExport={onExport} />);

    await user.click(screen.getByRole('button', { name: 'JSON退避' }));
    expect(onExport).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: '再試行' }));
    expect(screen.getByRole('button', { name: '再試行中…' }).disabled).toBe(true);
    expect(onRetry).toHaveBeenCalledOnce();

    await act(async () => finishRetry());
    expect(screen.getByRole('button', { name: '再試行' }).disabled).toBe(false);
  });
});
