'use client';

import { useState } from 'react';
import { Event } from '@/types';

interface InterruptTimelineProps {
  events: Event[];
  targetDate?: string; // Optional date in YYYY-MM-DD format
}

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i); // 0-23 (24 hours)

const getIntensityClass = (count: number, maxCount: number): string => {
  if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
  const intensity = count / Math.max(maxCount, 1);
  if (intensity >= 0.8) return 'bg-red-500 text-white';
  if (intensity >= 0.6) return 'bg-orange-400 text-white';
  if (intensity >= 0.4) return 'bg-yellow-400 text-gray-900';
  if (intensity >= 0.2) return 'bg-yellow-200 text-gray-900';
  return 'bg-yellow-100 text-gray-700';
};

const formatHour = (hour: number): string => {
  return hour === 12 ? '12PM' : hour > 12 ? `${hour - 12}PM` : hour === 0 ? '12AM' : `${hour}AM`;
};

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
};

const InterruptTimeline: React.FC<InterruptTimelineProps> = ({ events, targetDate }) => {
  const [selectedHour, setSelectedHour] = useState<{ hour: number; count: number } | null>(null);

  // Determine target date (use provided date or default to today)
  const targetDateObj = targetDate ? new Date(targetDate) : new Date();
  targetDateObj.setHours(0, 0, 0, 0);
  const nextDay = new Date(targetDateObj);
  nextDay.setDate(targetDateObj.getDate() + 1);

  // Check if target date is today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = targetDateObj.getTime() === today.getTime();

  const targetInterrupts = events.filter(event => {
    const eventDate = new Date(event.start);
    return event.type === 'interrupt' && 
           event.end && 
           eventDate >= targetDateObj && 
           eventDate < nextDay;
  });

  // Count interrupts per hour
  const hourCounts: { [hour: number]: number } = {};
  let maxCount = 0;

  ALL_HOURS.forEach(hour => {
    hourCounts[hour] = 0;
  });

  targetInterrupts.forEach(event => {
    const hour = new Date(event.start).getHours();
    hourCounts[hour]++;
    maxCount = Math.max(maxCount, hourCounts[hour]);
  });

  // Get details for selected hour
  const getHourDetails = (hour: number) => {
    return targetInterrupts.filter(event => {
      return new Date(event.start).getHours() === hour;
    });
  };

  if (targetInterrupts.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        <p className="text-lg">{isToday ? '今日は' : 'この日は'}割り込みがありません。</p>
        <p className="text-sm">割り込みを記録すると、ここにタイムラインが表示されます。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">{isToday ? '本日' : formatDate(targetDateObj)}の割り込みタイムライン</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          24時間の割り込み状況。時間をクリックすると詳細が見られます。
        </p>
      </div>

      {/* Timeline */}
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Hour labels */}
          <div className="flex gap-1 mb-2">
            {ALL_HOURS.map(hour => (
              <div key={hour} className="text-xs text-center font-medium text-gray-500 w-8">
                {hour % 3 === 0 ? formatHour(hour) : ''}
              </div>
            ))}
          </div>

          {/* Hour bars */}
          <div className="flex gap-1">
            {ALL_HOURS.map(hour => {
              const count = hourCounts[hour];
              return (
                <div
                  key={hour}
                  className={`w-8 h-12 rounded cursor-pointer transition-all hover:scale-110 hover:shadow-md ${getIntensityClass(count, maxCount)}`}
                  onClick={() => setSelectedHour({ hour, count })}
                  title={`${formatHour(hour)}: ${count}件の割り込み`}
                >
                  <div className="w-full h-full flex items-center justify-center text-xs font-medium">
                    {count > 0 ? count : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-2 text-xs">
        <span className="text-gray-600 dark:text-gray-400">少</span>
        <div className="flex space-x-1">
          <div className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800"></div>
          <div className="w-3 h-3 rounded bg-yellow-100"></div>
          <div className="w-3 h-3 rounded bg-yellow-200"></div>
          <div className="w-3 h-3 rounded bg-yellow-400"></div>
          <div className="w-3 h-3 rounded bg-orange-400"></div>
          <div className="w-3 h-3 rounded bg-red-500"></div>
        </div>
        <span className="text-gray-600 dark:text-gray-400">多</span>
      </div>

      {/* Selected hour details */}
      {selectedHour && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            {formatHour(selectedHour.hour)} - {selectedHour.count}件の割り込み
          </h4>
          <div className="space-y-2">
            {getHourDetails(selectedHour.hour).map((event, index) => (
              <div key={event.id} className="text-sm bg-white dark:bg-gray-800 p-2 rounded border">
                <div className="font-medium">{event.label || '割り込み'}</div>
                <div className="text-gray-600 dark:text-gray-400 text-xs">
                  {event.who && `発信者: ${event.who} • `}
                  {event.interruptType && `種類: ${event.interruptType} • `}
                  {event.urgency && `緊急度: ${event.urgency}`}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setSelectedHour(null)}
            className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            詳細を閉じる
          </button>
        </div>
      )}

      {/* Quick insights */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{isToday ? '本日' : 'この日'}のサマリー</h4>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <div>総割り込み数: {targetInterrupts.length}件</div>
          <div>ピーク時間: {
            (() => {
              let peakHour = 0;
              let peakCount = 0;
              ALL_HOURS.forEach(hour => {
                if (hourCounts[hour] > peakCount) {
                  peakCount = hourCounts[hour];
                  peakHour = hour;
                }
              });
              return peakCount > 0 ? `${formatHour(peakHour)} (${peakCount}件)` : 'はっきりしたピークなし';
            })()
          }</div>
        </div>
      </div>
    </div>
  );
};

export default InterruptTimeline;
