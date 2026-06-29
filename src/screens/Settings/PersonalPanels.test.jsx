import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  CategorySheet,
  ChipsSheet,
  ConfirmResetSheet,
  ImportSheet,
  InterruptCategorySheet,
  ReportProfileSheet,
} from './PersonalPanels';

afterEach(() => cleanup());

describe('personal settings panels', () => {
  it('validates and saves a category without losing its id', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<CategorySheet category={{ id: 'cat-custom', name: '', color: 'red' }} onClose={vi.fn()} onDelete={vi.fn()} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(screen.getByText('カテゴリ名を入力してください')).toBeTruthy();
    await user.type(screen.getByRole('textbox'), '企画');
    await user.click(screen.getAllByRole('button', { name: 'カテゴリ色を選択' })[1]);
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'cat-custom', name: '企画' }));
  });

  it('validates interruption categories and allows deletion', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const onSave = vi.fn();
    render(<InterruptCategorySheet category={{ id: 'int-custom', name: '' }} onClose={vi.fn()} onDelete={onDelete} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(screen.getByText('種類名を入力してください')).toBeTruthy();
    await user.type(screen.getByRole('textbox'), '相談');
    await user.click(screen.getByRole('button', { name: '保存' }));
    await user.click(screen.getByRole('button', { name: '削除' }));

    expect(onSave).toHaveBeenCalledWith({ id: 'int-custom', name: '相談', icon: null, kind: 'interrupt', defaultDurationMinutes: 0 });
    expect(onDelete).toHaveBeenCalledWith('int-custom');
  });

  it('edits, removes, and saves frequent-input chips', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ChipsSheet kind="who" chips={['田中']} onClose={vi.fn()} onSave={onSave} />);

    await user.type(screen.getByRole('textbox'), '佐藤, 鈴木');
    await user.click(screen.getByRole('button', { name: /候補を追加/ }));
    expect(screen.getByText('佐藤')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '田中を削除' }));
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(onSave).toHaveBeenCalledWith(['佐藤', '鈴木']);
  });

  it('saves the structured daily-report profile', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ReportProfileSheet profile={{ affiliation: '', name: '' }} onClose={vi.fn()} onSave={onSave} />);

    await user.type(screen.getByLabelText('所属'), '開発部 プラットフォームチーム');
    await user.type(screen.getByLabelText('名前'), '山田 太郎');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(onSave).toHaveBeenCalledWith({ affiliation: '開発部 プラットフォームチーム', name: '山田 太郎' });
  });

  it('surfaces an import error and confirms data reset', async () => {
    const user = userEvent.setup();
    const onImport = vi.fn(() => ({ ok: false, error: 'JSONを読み込めませんでした' }));
    const view = render(<ImportSheet onClose={vi.fn()} onImport={onImport} />);

    await user.type(screen.getByRole('textbox'), 'invalid-json');
    await user.click(screen.getByRole('button', { name: '読み込む' }));
    expect(screen.getByText('JSONを読み込めませんでした')).toBeTruthy();

    view.unmount();
    const onConfirm = vi.fn();
    render(<ConfirmResetSheet onClose={vi.fn()} onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button', { name: '削除する' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
