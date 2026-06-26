import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shareOrDownloadText } from './controller';

describe('text export behavior', () => {
  let clickedLink;

  beforeEach(() => {
    clickedLink = null;
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:interruptlog-export'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: vi.fn(() => true),
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: vi.fn(() => Promise.resolve()),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() {
      clickedLink = { download: this.download, href: this.href };
    });
    vi.spyOn(window, 'setTimeout').mockImplementation((callback) => {
      callback();
      return 0;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads personal backups directly when downloadOnly is requested', async () => {
    await shareOrDownloadText('backup.json', '{"ok":true}', 'application/json', { downloadOnly: true });

    expect(navigator.share).not.toHaveBeenCalled();
    expect(clickedLink).toEqual({ download: 'backup.json', href: 'blob:interruptlog-export' });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:interruptlog-export');
  });

  it('falls back to a download when native file sharing fails', async () => {
    navigator.share.mockRejectedValueOnce(Object.assign(new Error('share failed'), { name: 'NotAllowedError' }));

    await shareOrDownloadText('backup.json', '{"ok":true}', 'application/json');

    expect(navigator.share).toHaveBeenCalledTimes(1);
    expect(clickedLink).toEqual({ download: 'backup.json', href: 'blob:interruptlog-export' });
  });

  it('keeps explicit share cancelation as a canceled export', async () => {
    navigator.share.mockRejectedValueOnce(Object.assign(new Error('canceled'), { name: 'AbortError' }));

    await expect(shareOrDownloadText('backup.json', '{"ok":true}', 'application/json')).rejects.toMatchObject({ name: 'AbortError' });
    expect(clickedLink).toBeNull();
  });
});
