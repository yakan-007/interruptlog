'use client';

import React, { useState, useEffect } from 'react';
import useEventsStore from '@/store/useEventsStore';

interface TaskCardTimerProps {
  startTime: number;
  myTaskId: string;
}

const formatTaskTime = (startTime: number, accumulatedDuration: number): string => {
  const now = Date.now();
  const currentSegmentSeconds = Math.max(0, Math.floor((now - startTime) / 1000));
  const totalSeconds = currentSegmentSeconds + Math.floor(accumulatedDuration / 1000);

  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const TaskCardTimer: React.FC<TaskCardTimerProps> = ({ startTime, myTaskId }) => {
  const getTaskTotalDuration = useEventsStore((state) => state.actions.getTaskTotalDuration);
  const [accumulatedDuration, setAccumulatedDuration] = useState(0);
  const [elapsedTime, setElapsedTime] = useState('');

  useEffect(() => {
    const pastDuration = getTaskTotalDuration(myTaskId);
    setAccumulatedDuration(pastDuration);
    setElapsedTime(formatTaskTime(startTime, pastDuration));

    const timerId = setInterval(() => {
      setElapsedTime(formatTaskTime(startTime, pastDuration));
    }, 1000);

    return () => clearInterval(timerId);
  }, [startTime, myTaskId, getTaskTotalDuration]);

  if (!elapsedTime && startTime > 0) {
    const pastDuration = getTaskTotalDuration(myTaskId);
    return <span className="text-xs text-blue-600 dark:text-blue-400">{formatTaskTime(startTime, pastDuration)}</span>;
  }

  return <span className="text-xs text-blue-600 dark:text-blue-400">{elapsedTime}</span>;
};

export default TaskCardTimer; 
