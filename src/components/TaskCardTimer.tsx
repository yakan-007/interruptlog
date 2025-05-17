'use client';

import React, { useState, useEffect } from 'react';

interface TaskCardTimerProps {
  startTime: number;
}

const formatTaskTime = (startTime: number): string => {
  const now = Date.now();
  let totalSeconds = Math.floor((now - startTime) / 1000);
  if (totalSeconds < 0) totalSeconds = 0;

  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const TaskCardTimer: React.FC<TaskCardTimerProps> = ({ startTime }) => {
  const [elapsedTime, setElapsedTime] = useState(() => formatTaskTime(startTime));

  useEffect(() => {
    setElapsedTime(formatTaskTime(startTime)); // startTimeが変わった時に即時更新

    const timerId = setInterval(() => {
      setElapsedTime(formatTaskTime(startTime));
    }, 1000);

    return () => clearInterval(timerId);
  }, [startTime]);

  return <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">({elapsedTime})</span>;
};

export default TaskCardTimer; 