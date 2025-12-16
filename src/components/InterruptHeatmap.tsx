'use client';

import React, { useState } from 'react';
import { Event } from '@/types';

interface InterruptHeatmapProps {
  events: Event[];
}

interface HeatmapData {
  [key: string]: { [hour: string]: number }; // day -> hour -> count
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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

const InterruptHeatmap: React.FC<InterruptHeatmapProps> = ({ events }) => {
  const [selectedCell, setSelectedCell] = useState<{ day: string; hour: number; count: number } | null>(null);

  // Filter interrupt events and group by day and hour
  const interruptEvents = events.filter(event => event.type === 'interrupt' && event.end);
  
  const heatmapData: HeatmapData = {};
  let maxCount = 0;

  // Initialize data structure
  DAYS.forEach(day => {
    heatmapData[day] = {};
    ALL_HOURS.forEach(hour => {
      heatmapData[day][hour] = 0;
    });
  });

  // Populate data
  interruptEvents.forEach(event => {
    const date = new Date(event.start);
    const dayName = DAYS[date.getDay()];
    const hour = date.getHours();
    
    heatmapData[dayName][hour]++;
    maxCount = Math.max(maxCount, heatmapData[dayName][hour]);
  });

  // Get details for selected cell
  const getCellDetails = (day: string, hour: number) => {
    const dayIndex = DAYS.indexOf(day);
    return interruptEvents.filter(event => {
      const date = new Date(event.start);
      return date.getDay() === dayIndex && date.getHours() === hour;
    });
  };

  const formatHour = (hour: number): string => {
    return hour === 12 ? '12PM' : hour > 12 ? `${hour - 12}PM` : `${hour}AM`;
  };

  if (interruptEvents.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        <p className="text-lg">🧘 No interruptions yet!</p>
        <p className="text-sm">Your interrupt heatmap will appear here once you log some interruptions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Interrupt Heatmap 🔥</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Darker colors = more interruptions. Click on a cell for details.
        </p>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Hour headers */}
          <div className="flex gap-1 mb-2">
            <div className="text-xs text-center font-medium text-gray-500 w-16"></div>
            {ALL_HOURS.map(hour => (
              <div key={hour} className="text-xs text-center font-medium text-gray-500 w-6">
                {hour % 4 === 0 ? formatHour(hour) : ''}
              </div>
            ))}
          </div>

          {/* Heatmap rows */}
          {DAYS.map(day => (
            <div key={day} className="flex gap-1 mb-1">
              {/* Day label */}
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 w-16 py-1 flex items-center">
                {day.slice(0, 3)}
              </div>
              
              {/* Hour cells */}
              {ALL_HOURS.map(hour => {
                const count = heatmapData[day][hour];
                return (
                  <div
                    key={`${day}-${hour}`}
                    className={`w-6 h-6 rounded-sm cursor-pointer transition-all hover:scale-110 hover:shadow-md ${getIntensityClass(count, maxCount)}`}
                    onClick={() => setSelectedCell({ day, hour, count })}
                    title={`${day} ${formatHour(hour)}: ${count} interrupts`}
                  >
                    <div className="w-full h-full flex items-center justify-center text-xs">
                      {count > 0 ? count : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-2 text-xs">
        <span className="text-gray-600 dark:text-gray-400">Less</span>
        <div className="flex space-x-1">
          <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800"></div>
          <div className="w-3 h-3 rounded-sm bg-yellow-100"></div>
          <div className="w-3 h-3 rounded-sm bg-yellow-200"></div>
          <div className="w-3 h-3 rounded-sm bg-yellow-400"></div>
          <div className="w-3 h-3 rounded-sm bg-orange-400"></div>
          <div className="w-3 h-3 rounded-sm bg-red-500"></div>
        </div>
        <span className="text-gray-600 dark:text-gray-400">More</span>
      </div>

      {/* Selected cell details */}
      {selectedCell && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            {selectedCell.day} {formatHour(selectedCell.hour)} - {selectedCell.count} interrupts
          </h4>
          <div className="space-y-2">
            {getCellDetails(selectedCell.day, selectedCell.hour).map((event, index) => (
              <div key={event.id} className="text-sm bg-white dark:bg-gray-800 p-2 rounded border">
                <div className="font-medium">{event.label || 'Interrupt'}</div>
                <div className="text-gray-600 dark:text-gray-400 text-xs">
                  {event.who && `From: ${event.who} • `}
                  {event.interruptType && `Type: ${event.interruptType} • `}
                  {event.urgency && `Urgency: ${event.urgency}`}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setSelectedCell(null)}
            className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Close details
          </button>
        </div>
      )}

      {/* Quick insights */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">📊 Quick Insights</h4>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <div>Total interrupts: {interruptEvents.length}</div>
          <div>Peak time: {
            (() => {
              let maxHour = 0;
              let maxDayHourCount = 0;
              DAYS.forEach(day => {
                ALL_HOURS.forEach(hour => {
                  if (heatmapData[day][hour] > maxDayHourCount) {
                    maxDayHourCount = heatmapData[day][hour];
                    maxHour = hour;
                  }
                });
              });
              return maxDayHourCount > 0 ? `${formatHour(maxHour)} (${maxDayHourCount} interrupts)` : 'No clear peak';
            })()
          }</div>
        </div>
      </div>
    </div>
  );
};

export default InterruptHeatmap;