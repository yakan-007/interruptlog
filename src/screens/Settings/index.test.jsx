import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createEmptyState } from '../../state';
import SettingsScreen from './index';

afterEach(() => cleanup());

function createActions() {
  return Object.fromEntries([
    'setLocale', 'setDark', 'setAccent', 'setTopAdd', 'setSortDue', 'setWorkSchedule',
    'setReportProfile',
    'moveCategoryToIndex', 'moveInterruptCategoryToIndex', 'saveCategory', 'deleteCategory',
    'saveInterruptCategory', 'deleteInterruptCategory', 'saveChips', 'exportJson', 'importJson',
    'resetAll', 'openOverlapRepair',
  ].map((key) => [key, vi.fn(key === 'importJson' ? () => ({ ok: true }) : undefined)]));
}

describe('personal settings screen', () => {
  it('renders the personal settings groups and dispatches their commands', () => {
    const state = createEmptyState();
    state.preferences.onboardingDone = true;
    state.overlapRepair = { warning: null };
    state.whoChips = ['田中'];
    state.subjectChips = ['見積'];
    const actions = createActions();
    render(<SettingsScreen state={state} actions={actions} />);

    expect(screen.getByRole('heading', { name: '設定' })).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: '言語' }), { target: { value: 'en-US' } });
    fireEvent.click(screen.getByRole('button', { name: 'ダークモード' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'アクセントカラー' })[1]);
    fireEvent.click(screen.getByRole('button', { name: '基本の作業時間' }));
    fireEvent.change(screen.getByLabelText('開始時刻'), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText('終了時刻'), { target: { value: '17:00' } });
    fireEvent.click(screen.getAllByRole('button', { name: '並べ替え' })[0]);
    expect(screen.getAllByRole('button', { name: '並べ替え' }).length).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole('button', { name: '完了' }));

    fireEvent.click(screen.getByRole('button', { name: '開発' }));
    expect(screen.getByText('カテゴリを編集')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    fireEvent.click(screen.getByRole('button', { name: /よく使う発信者/ }));
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    fireEvent.click(screen.getByRole('button', { name: /日報プロフィール/ }));
    fireEvent.change(screen.getByLabelText('所属'), { target: { value: '開発部' } });
    fireEvent.change(screen.getByLabelText('名前'), { target: { value: '山田' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    fireEvent.click(screen.getByRole('button', { name: /個人バックアップを書き出す/ }));
    fireEvent.click(screen.getByRole('button', { name: /全データを削除/ }));
    fireEvent.click(screen.getByRole('button', { name: '削除する' }));

    expect(actions.setLocale).toHaveBeenCalledWith('en-US');
    expect(actions.setDark).toHaveBeenCalledWith(true);
    expect(actions.setWorkSchedule).toHaveBeenCalledWith({ start: '09:00', end: null });
    expect(actions.setWorkSchedule).toHaveBeenCalledWith({ start: null, end: '17:00' });
    expect(actions.saveCategory).toHaveBeenCalled();
    expect(actions.saveChips).toHaveBeenCalledWith('who', ['田中']);
    expect(actions.setReportProfile).toHaveBeenCalledWith({ affiliation: '開発部', name: '山田' });
    expect(actions.exportJson).toHaveBeenCalledTimes(1);
    expect(actions.resetAll).toHaveBeenCalledTimes(1);
  }, 10000);
});
