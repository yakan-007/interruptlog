import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import TaskCard from './TaskCard';

afterEach(() => cleanup());

function renderTaskCard(overrides = {}) {
  const props = {
    task: {
      id: 'task-1',
      name: '設計レビュー',
      categoryId: 'cat-dev',
      isCompleted: false,
      planning: { plannedDurationMinutes: 0, dueAt: null },
    },
    category: { id: 'cat-dev', name: '開発', color: '#3366cc' },
    now: 1000,
    onStart: vi.fn(),
    onStop: vi.fn(),
    onComplete: vi.fn(),
    onEdit: vi.fn(),
    onDragPointerDown: vi.fn(),
    onMoveToIndex: vi.fn(),
    taskIndex: 1,
    taskCount: 3,
    ...overrides,
  };
  render(<TaskCard {...props} />);
  return props;
}

describe('task card reordering', () => {
  it('starts a drag only from its dedicated handle', () => {
    const props = renderTaskCard();

    fireEvent.pointerDown(screen.getByText('設計レビュー'), { pointerId: 1, clientX: 80, clientY: 80 });
    expect(props.onDragPointerDown).not.toHaveBeenCalled();

    fireEvent.pointerDown(screen.getByRole('button', { name: 'タスクを並べ替え' }), { pointerId: 1, clientX: 280, clientY: 80 });
    expect(props.onDragPointerDown).toHaveBeenCalledOnce();
  });

  it('moves with keyboard shortcuts from the drag handle', () => {
    const props = renderTaskCard();
    const handle = screen.getByRole('button', { name: 'タスクを並べ替え' });

    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    fireEvent.keyDown(handle, { key: 'End' });

    expect(props.onMoveToIndex).toHaveBeenNthCalledWith(1, 0);
    expect(props.onMoveToIndex).toHaveBeenNthCalledWith(2, 2);
  });
});
