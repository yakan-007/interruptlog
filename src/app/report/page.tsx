'use client';

import React from 'react';
import useEventsStore, { EventsState } from '@/store/useEventsStore';
import { Event } from '@/types';
import EventList from '@/components/EventList';
import StatBar from '@/components/StatBar';
import { useI18n } from '@/locales/client';
import StatHeatmap from '@/components/StatHeatmap';

const ReportPage = () => {
  const t = useI18n();
  const { events, isHydrated } = useEventsStore((state: EventsState) => ({ 
    events: state.events,
    isHydrated: state.isHydrated 
  }));

  if (!isHydrated) {
    return <div className="p-4 text-center">{t('Report.loading')}</div>;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const todaysEvents = events.filter(event => {
    const eventDate = new Date(event.start);
    return eventDate >= today && eventDate < tomorrow;
  });

  const calculateTotalTime = (type: 'task' | 'interrupt' | 'break') => {
    return todaysEvents
      .filter(event => event.type === type && event.end)
      .reduce((total, event) => total + (event.end! - event.start), 0);
  };

  const totalFocusTime = calculateTotalTime('task');
  const totalInterruptTime = calculateTotalTime('interrupt');
  const totalBreakTime = calculateTotalTime('break');

  const chartData = [
    { name: 'Task', value: totalFocusTime, fill: '#34D399' }, // Green
    { name: 'Interrupt', value: totalInterruptTime, fill: '#F87171' }, // Red
    { name: 'Break', value: totalBreakTime, fill: '#9CA3AF' }, // Gray
  ];

  const last10Events = [...todaysEvents]
    .sort((a, b) => b.start - a.start)
    .slice(0, 10);

  // --- 集計: 人別・組織別・理由別（interruptのみ） ---
  const interruptEvents = todaysEvents.filter(e => e.type === 'interrupt' && e.end);

  // 集計関数
  function aggregateBy(arr: Event[], key: (e: Event) => string | undefined) {
    const map = new Map<string, number>();
    arr.forEach(e => {
      const k = key(e) || '未設定';
      const duration = (e.end! - e.start);
      map.set(k, (map.get(k) || 0) + duration);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }

  const topPersons = aggregateBy(interruptEvents, e => e.who).slice(0, 3);
  const topOrgs = aggregateBy(interruptEvents, e => e.organization).slice(0, 3);
  const topReasons = aggregateBy(interruptEvents, e => e.interruptType).slice(0, 3);

  // ヒートマップ用: 0〜23時の1時間ごとにinterrupt件数を集計
  const hourBins = Array.from({ length: 24 }, (_, h) => h);
  const heatmapData = hourBins.map(hour => {
    const count = interruptEvents.filter(e => {
      const d = new Date(e.start);
      return d.getHours() === hour;
    }).length;
    return { hour: hour.toString().padStart(2, '0'), count };
  });

  return (
    <div className="p-4">
      <h1 className="mb-6 text-center text-2xl font-semibold">{t('Report.title')}</h1>

      <div className="mb-8 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('Report.focus')}</p>
          <p className="text-xl font-bold">{formatDuration(totalFocusTime)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('Report.interrupts')}</p>
          <p className="text-xl font-bold">{formatDuration(totalInterruptTime)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('Report.breaks')}</p>
          <p className="text-xl font-bold">{formatDuration(totalBreakTime)}</p>
        </div>
      </div>

      {todaysEvents.length > 0 ? (
         <div className="mb-8 h-60 w-full">
            <StatBar data={chartData} />
        </div>
      ) : (
        <p className="text-center text-gray-500 dark:text-gray-400">{t('Report.noChartData')}</p>
      )}

      <h2 className="mb-3 text-xl font-semibold">{t('Report.last10Events')}</h2>
      {last10Events.length > 0 ? (
        <EventList events={last10Events} />
      ) : (
        <p className="text-center text-gray-500 dark:text-gray-400">{t('Report.noEvents')}</p>
      )}

      <h2 className="mb-2 mt-8 text-lg font-bold">{t('Report.rankingTitle')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div>
          <h3 className="font-semibold mb-1">{t('Report.personRanking')}</h3>
          <ol className="list-decimal ml-5">
            {topPersons.length === 0 ? <li>{t('Report.noData')}</li> : topPersons.map(([who, ms], i) => (
              <li key={who} className="truncate">{who} <span className="text-xs text-gray-500">({formatDuration(ms)})</span></li>
            ))}
          </ol>
        </div>
        <div>
          <h3 className="font-semibold mb-1">{t('Report.orgRanking')}</h3>
          <ol className="list-decimal ml-5">
            {topOrgs.length === 0 ? <li>{t('Report.noData')}</li> : topOrgs.map(([org, ms], i) => (
              <li key={org} className="truncate">{org} <span className="text-xs text-gray-500">({formatDuration(ms)})</span></li>
            ))}
          </ol>
        </div>
        <div>
          <h3 className="font-semibold mb-1">{t('Report.reasonRanking')}</h3>
          <ol className="list-decimal ml-5">
            {topReasons.length === 0 ? <li>{t('Report.noData')}</li> : topReasons.map(([reason, ms], i) => (
              <li key={reason} className="truncate">{reason} <span className="text-xs text-gray-500">({formatDuration(ms)})</span></li>
            ))}
          </ol>
        </div>
      </div>

      <h2 className="mb-2 mt-8 text-lg font-bold">{t('Report.heatmapTitle')}</h2>
      <div className="mb-8">
        <StatHeatmap data={heatmapData} />
      </div>
    </div>
  );
};

// Helper function to format duration (ms to hh:mm:ss)
const formatDuration = (ms: number) => {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default ReportPage; 