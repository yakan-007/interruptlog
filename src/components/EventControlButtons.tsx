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
    <div className="flex gap-2 w-full">
      {/* Stop Button */}
      <Button
        onClick={onStopEvent}
        disabled={disabled}
        variant="destructive"
        size="sm"
        className="flex-1 flex items-center justify-center gap-1"
      >
        <StopCircle className="w-4 h-4" />
        {isTaskActive && '停止'}
        {isInterruptActive && '割り込み終了'}
        {isBreakActive && '休憩終了'}
      </Button>

      {/* Interrupt Button - only show during tasks */}
      {isTaskActive && (
        <Button
          onClick={onStartInterrupt}
          disabled={disabled}
          variant="outline"
          size="sm"
          className="flex-shrink-0 flex items-center justify-center gap-1 border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-300 dark:hover:bg-orange-900/20"
        >
          <Zap className="w-4 h-4" />
          割り込み
        </Button>
      )}

      {/* Break Button - only show during tasks */}
      {isTaskActive && (
        <Button
          onClick={onStartBreak}
          disabled={disabled}
          variant="outline"
          size="sm"
          className="flex-shrink-0 flex items-center justify-center gap-1 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900/20"
        >
          <Coffee className="w-4 h-4" />
          休憩
        </Button>
      )}
    </div>
  );
}