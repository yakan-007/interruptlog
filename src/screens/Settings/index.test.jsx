import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createEmptyState } from '../../state';
import SettingsScreen from './index';

afterEach(() => cleanup());

function createActions() {
  return Object.fromEntries([
    'setLocale', 'setDark', 'setAccent', 'setTopAdd', 'setSortDue', 'setWorkSchedule',
    'moveCategoryToIndex', 'moveInterruptCategoryToIndex', 'saveCategory', 'deleteCategory',
    'saveInterruptCategory', 'deleteInterruptCategory', 'saveChips', 'exportJson', 'importJson',
    'resetAll', 'openOverlapRepair',
  ].map((key) => [key, vi.fn(key === 'importJson' ? () => ({ ok: true }) : undefined)]));
}

describe('personal settings screen', () => {
  it('renders the personal settings groups and dispatches their commands', async () => {
    const user = userEvent.setup();
    const state = createEmptyState();
    state.preferences.onboardingDone = true;
    state.overlapRepair = { warning: null };
    state.whoChips = ['田中'];
    state.subjectChips = ['見積'];
    const actions = createActions();
    render(<SettingsScreen state={state} actions={actions} />);

    expect(screen.getByRole('heading', { name: '設定' })).toBeTruthy();
    await user.selectOptions(screen.getByRole('combobox', { name: '言語' }), 'en-US');
    await user.click(screen.getByRole('button', { name: 'ダークモード' }));
    await user.click(screen.getAllByRole('button', { name: 'アクセントカラー' })[1]);
    await user.click(screen.getByRole('button', { name: '基本の作業時間' }));
    await user.type(screen.getByLabelText('開始時刻'), '09:00');
    await user.type(screen.getByLabelText('終了時刻'), '17:00');
    await user.click(screen.getAllByRole('button', { name: '並べ替え' })[0]);
    expect(screen.getAllByRole('button', { name: '並べ替え' }).length).toBeGreaterThan(1);
    await user.click(screen.getByRole('button', { name: '完了' }));

    await user.click(screen.getByRole('button', { name: '開発' }));
    expect(screen.getByText('カテゴリを編集')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '保存' }));
    await user.click(screen.getByRole('button', { name: /よく使う発信者/ }));
    await user.click(screen.getByRole('button', { name: '保存' }));

    await user.click(screen.getByRole('button', { name: /個人バックアップを書き出す/ }));
    await user.click(screen.getByRole('button', { name: /全データを削除/ }));
    await user.click(screen.getByRole('button', { name: '削除する' }));

    expect(actions.setLocale).toHaveBeenCalledWith('en-US');
    expect(actions.setDark).toHaveBeenCalledWith(true);
    expect(actions.setWorkSchedule).toHaveBeenCalledWith({ start: '09:00', end: null });
    expect(actions.setWorkSchedule).toHaveBeenCalledWith({ start: null, end: '17:00' });
    expect(actions.saveCategory).toHaveBeenCalled();
    expect(actions.saveChips).toHaveBeenCalledWith('who', ['田中']);
    expect(actions.exportJson).toHaveBeenCalledTimes(1);
    expect(actions.resetAll).toHaveBeenCalledTimes(1);
  });
});
