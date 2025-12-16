'use client';

import React, { useEffect, useState, useRef } from 'react';
import { TIMER_UPDATE_INTERVAL_MS } from '@/lib/constants';

interface TimerProps {
  startTime: number; // Epoch ms, 0 if no active event
  isActive: boolean;
}

const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const Timer: React.FC<TimerProps> = ({ startTime, isActive }: TimerProps) => {
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Use ReturnType<typeof setTimeout> for NodeJS.Timeout

  useEffect(() => {
    const calculateElapsed = () => Date.now() - startTime;

    if (isActive && startTime > 0) {
      setElapsedMs(calculateElapsed()); // Initial set
      intervalRef.current = setInterval(() => {
        setElapsedMs(calculateElapsed());
      }, TIMER_UPDATE_INTERVAL_MS);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // If inactive, but startTime is valid (e.g. a just ended event), show its final duration.
      // Otherwise (startTime is 0, meaning no event), show 0.
      setElapsedMs(startTime > 0 ? calculateElapsed() : 0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, startTime]);

  return (
    <div className="select-none text-6xl font-mono">
      {formatTime(elapsedMs)}
    </div>
  );
};

export default Timer; 
