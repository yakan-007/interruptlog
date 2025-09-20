'use client';

import clsx from 'clsx';
import { Event } from '@/types';
import { useTimer } from '@/hooks/useTimer';
import { getEventTypeLabel } from '@/utils/eventUtils';
import useEventsStore from '@/store/useEventsStore';
import { COLORS } from '@/lib/constants';

const hexToRgb = (hexColor: string) => {
  const hex = hexColor.replace('#', '');
  if (!(hex.length === 3 || hex.length === 6)) {
    return null;
  }
  const normalized = hex.length === 3
    ? hex.split('').map(char => char + char).join('')
    : hex;
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
};

const hexToRgba = (hexColor: string, alpha: number) => {
  const rgb = hexToRgb(hexColor);
  if (!rgb) {
    return `rgba(255, 255, 255, ${alpha})`;
  }
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const getReadableTextColor = (hexColor: string) => {
  const rgb = hexToRgb(hexColor);
  if (!rgb) {
    return '#1f2937';
  }
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.6 ? '#1f2937' : '#ffffff';
};

interface ActiveEventDisplayProps {
  activeEvent: Event;
  className?: string;
}

export default function ActiveEventDisplay({ activeEvent, className }: ActiveEventDisplayProps) {
  const elapsedTime = useTimer(activeEvent.start, true);
  const eventTypeLabel = getEventTypeLabel(activeEvent.type);
  const { categories, isCategoryEnabled } = useEventsStore(state => ({
    categories: state.categories,
    isCategoryEnabled: state.isCategoryEnabled,
  }));

  const getEventColor = (eventType: Event['type']) => {
    switch (eventType) {
      case 'task':
        return COLORS.TASK;
      case 'interrupt':
        return COLORS.INTERRUPT;
      case 'break':
        return COLORS.BREAK;
      default:
        return COLORS.SECONDARY;
    }
  };

  const baseColor = getEventColor(activeEvent.type);
  const matchedCategory =
    activeEvent.type === 'task' && isCategoryEnabled && activeEvent.categoryId
      ? categories.find(category => category.id === activeEvent.categoryId)
      : undefined;
  const indicatorColor = matchedCategory?.color ?? '#ffffff';

  let pillBackground: string = hexToRgba(baseColor, 0.12);
  let pillBorder: string = baseColor;
  let pillTextColor: string = baseColor;

  if (activeEvent.type === 'task') {
    if (matchedCategory) {
      pillBackground = matchedCategory.color;
      pillBorder = matchedCategory.color;
      pillTextColor = getReadableTextColor(matchedCategory.color);
    } else {
      pillBackground = '#ffffff';
      pillBorder = baseColor;
      pillTextColor = baseColor;
    }
  } else {
    pillBackground = hexToRgba(baseColor, 0.16);
    pillBorder = hexToRgba(baseColor, 0.35);
    pillTextColor = baseColor;
  }

  const details: string[] = [];
  if (activeEvent.type === 'interrupt') {
    if (activeEvent.who) details.push(`発信者: ${activeEvent.who}`);
    if (activeEvent.interruptType) details.push(`種類: ${activeEvent.interruptType}`);
    if (activeEvent.urgency) details.push(`緊急度: ${activeEvent.urgency}`);
  }

  if (activeEvent.type === 'break' && activeEvent.breakDurationMinutes != null && activeEvent.breakDurationMinutes > 0) {
    details.push(`予定: ${activeEvent.breakDurationMinutes}分`);
  }

  const metadata = details.join(' / ');

  return (
    <div
      className={clsx(
        'flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-2 text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left">
        <span
          className="mx-auto inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm sm:mx-0"
          style={{
            borderColor: pillBorder,
            color: pillTextColor,
            backgroundColor: pillBackground,
          }}
          aria-label={matchedCategory ? `${eventTypeLabel}・カテゴリ: ${matchedCategory.name}` : `${eventTypeLabel}・カテゴリ未設定`}
          title={matchedCategory ? `${matchedCategory.name}` : 'カテゴリ未設定'}
        >
          {eventTypeLabel}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {activeEvent.label || `${eventTypeLabel}中`}
          </p>
          {metadata && (
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {metadata}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-3">
        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
          経過時間
        </span>
        <span className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">
          {elapsedTime}
        </span>
      </div>
    </div>
  );
}
