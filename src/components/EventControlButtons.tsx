'use client';

import { Button } from '@/components/ui/button';
import { StopCircle, Zap, Coffee } from 'lucide-react';
import { Event } from '@/types';

interface EventControlButtonsProps {
  activeEvent: Event;
  onStopEvent: () => void;
  onStartInterrupt: () => void;
  onStartBreak: () => void;
  disabled?: boolean;
}

export default function EventControlButtons({
  activeEvent,
  onStopEvent,
  onStartInterrupt,
  onStartBreak,
  disabled = false,
}: EventControlButtonsProps) {
  const isTaskActive = activeEvent.type === 'task';
  const isInterruptActive = activeEvent.type === 'interrupt';
  const isBreakActive = activeEvent.type === 'break';

  return (
    <div className="flex w-full flex-row gap-2">
      <Button
        onClick={onStopEvent}
        disabled={disabled}
        variant="destructive"
        className="flex-1 min-w-[96px] items-center justify-center gap-2 rounded-lg text-sm font-semibold"
      >
        <StopCircle className="h-4 w-4" />
        {isTaskActive && '停止'}
        {isInterruptActive && '割り込み終了'}
        {isBreakActive && '休憩終了'}
      </Button>

      {isTaskActive && (
        <Button
          onClick={onStartInterrupt}
          disabled={disabled}
          variant="outline"
          className="flex-1 min-w-[96px] items-center justify-center gap-2 rounded-lg border-orange-200 bg-orange-50 text-sm font-semibold text-orange-700 hover:bg-orange-100 dark:border-orange-700/60 dark:bg-orange-900/20 dark:text-orange-200 dark:hover:bg-orange-900/40"
        >
          <Zap className="h-4 w-4" />
          割り込み
        </Button>
      )}

      {isTaskActive && (
        <Button
          onClick={onStartBreak}
          disabled={disabled}
          variant="outline"
          className="flex-1 min-w-[96px] items-center justify-center gap-2 rounded-lg border-blue-200 bg-blue-50 text-sm font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-700/60 dark:bg-blue-900/20 dark:text-blue-200 dark:hover:bg-blue-900/40"
        >
          <Coffee className="h-4 w-4" />
          休憩
        </Button>
      )}
    </div>
  );
}
