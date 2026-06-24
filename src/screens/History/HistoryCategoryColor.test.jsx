import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createEmptyState } from '../../state';
import HistoryList from './HistoryList';
import HistoryTimeline from './HistoryTimeline';

afterEach(() => cleanup());

const start = new Date(2026, 5, 25, 9, 0).getTime();
const event = {
  id: 'event-1',
  type: 'task',
  taskId: 'task-1',
  label: '設計レビュー',
  categoryId: 'cat-dev',
  clippedStart: start,
  clippedEnd: start + 30 * 60 * 1000,
  clippedDurationMs: 30 * 60 * 1000,
  start,
  end: start + 30 * 60 * 1000,
  lane: 0,
  laneCount: 1,
  topPx: 0,
  heightPx: 40,
  variant: '',
};

describe('history category colors', () => {
  it('uses the current task-category color in both history views', () => {
    const state = createEmptyState();
    state.categories[0] = { ...state.categories[0], color: 'rebeccapurple' };
    const { container } = render(
      <>
        <HistoryList items={[event]} state={state} now={start} selectedDate={start} onEdit={() => {}} />
        <HistoryTimeline
          state={state}
          selectedDate={start}
          now={start}
          onEdit={() => {}}
          onGapClick={() => {}}
          timeline={{ axis: { totalHeight: 120, hourMarkers: [] }, gaps: [], items: [event], nowY: null }}
        />
      </>,
    );

    expect(screen.getAllByText('設計レビュー')).toHaveLength(2);
    expect(container.querySelector('.il-ev')?.style.getPropertyValue('--history-category-color')).toBe('rebeccapurple');
    expect(container.querySelector('.il-history-eventcard')?.style.getPropertyValue('--history-category-color')).toBe('rebeccapurple');
  });
});
