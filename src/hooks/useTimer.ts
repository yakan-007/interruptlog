import { useState, useEffect } from 'react';
import { formatElapsedTime } from '@/lib/timeUtils';
import { TIMER_UPDATE_INTERVAL_MS } from '@/lib/constants';

/**
 * Timer hook for tracking elapsed time from a start timestamp
 * @param startTime - The start timestamp in milliseconds
 * @param isActive - Whether the timer should be running
 * @returns The formatted elapsed time string (HH:MM:SS)
 */
export function useTimer(startTime: number, isActive: boolean = true): string {
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  useEffect(() => {
    if (!isActive || startTime <= 0) {
      setElapsedTime('00:00:00');
      return;
    }

    const updateTimer = () => {
      setElapsedTime(formatElapsedTime(startTime));
    };

    // Update immediately
    updateTimer();
    
    // Set up interval for continuous updates
    const interval = setInterval(updateTimer, TIMER_UPDATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [startTime, isActive]);

  return elapsedTime;
}

/**
 * Hook for managing a countdown timer
 * @param durationMs - Duration in milliseconds
 * @param onComplete - Callback when timer reaches zero
 * @returns Object with remaining time and control functions
 */
export function useCountdownTimer(
  durationMs: number,
  onComplete?: () => void
) {
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (!isRunning || remainingMs <= 0) {
      return;
    }

    const interval = setInterval(() => {
      if (startTime) {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, durationMs - elapsed);
        
        setRemainingMs(remaining);
        
        if (remaining <= 0) {
          setIsRunning(false);
          setStartTime(null);
          onComplete?.();
        }
      }
    }, TIMER_UPDATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isRunning, startTime, durationMs, remainingMs, onComplete]);

  const start = () => {
    setStartTime(Date.now());
    setIsRunning(true);
  };

  const pause = () => {
    setIsRunning(false);
  };

  const reset = () => {
    setIsRunning(false);
    setStartTime(null);
    setRemainingMs(durationMs);
  };

  const remainingTime = formatElapsedTime(Date.now() - remainingMs);

  return {
    remainingMs,
    remainingTime,
    isRunning,
    start,
    pause,
    reset,
  };
}

/**
 * Hook for managing timer display states
 */
export function useTimerDisplay() {
  const [isBlinking, setIsBlinking] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);

  const blink = (duration = 2000) => {
    setIsBlinking(true);
    setTimeout(() => setIsBlinking(false), duration);
  };

  const highlight = (duration = 1000) => {
    setIsHighlighted(true);
    setTimeout(() => setIsHighlighted(false), duration);
  };

  return {
    isBlinking,
    isHighlighted,
    blink,
    highlight,
  };
}