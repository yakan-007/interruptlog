import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StorageRecoveryScreen from './StorageRecovery';

afterEach(() => cleanup());

describe('storage recovery screen', () => {
  it('downloads raw data and requires a second confirmation before reset', async () => {
    const user = userEvent.setup();
    const onDownload = vi.fn(async () => {});
    const onReset = vi.fn(async () => ({ ok: true }));
    render(<StorageRecoveryScreen locale="ja-JP" onDownload={onDownload} onReset={onReset} />);

    await user.click(screen.getByRole('button', { name: '元データをダウンロード' }));
    expect(onDownload).toHaveBeenCalledOnce();
    expect(screen.getByText('元データをダウンロードしました')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '初期状態で始める' }));
    expect(onReset).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '削除して初期化' }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('stays on the confirmation screen when clearing storage fails', async () => {
    const user = userEvent.setup();
    render(
      <StorageRecoveryScreen
        locale="ja-JP"
        onDownload={vi.fn(async () => {})}
        onReset={vi.fn(async () => ({ ok: false }))}
      />
    );

    await user.click(screen.getByRole('button', { name: '初期状態で始める' }));
    await user.click(screen.getByRole('button', { name: '削除して初期化' }));

    expect(await screen.findByText(/保存データを削除できませんでした/)).toBeTruthy();
    expect(screen.getByRole('button', { name: '削除して初期化' })).toBeTruthy();
  });
});
