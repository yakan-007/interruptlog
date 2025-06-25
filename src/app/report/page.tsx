'use client';

import useEventsStore, { EventsState } from '@/store/useEventsStore';
import EventList from '@/components/EventList';
import StatBar from '@/components/StatBar';
import CompletedTasksList from '@/components/CompletedTasksList';
import InterruptTimeline from '@/components/InterruptTimeline';
import { RECENT_EVENTS_LIMIT } from '@/lib/constants';

const ReportPage = () => {
  const { events, myTasks, categories, isCategoryEnabled, isHydrated } = useEventsStore((state: EventsState) => ({ 
    events: state.events,
    myTasks: state.myTasks,
    categories: state.categories,
    isCategoryEnabled: state.isCategoryEnabled,
    isHydrated: state.isHydrated 
  }));

  if (!isHydrated) {
    return <div className="p-4 text-center">レポートデータを読み込み中...</div>;
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
    { name: 'タスク', value: totalFocusTime, fill: '#34D399' }, // Green
    { name: '割り込み', value: totalInterruptTime, fill: '#F87171' }, // Red
    { name: '休憩', value: totalBreakTime, fill: '#9CA3AF' }, // Gray
  ];

  const last10Events = [...todaysEvents]
    .sort((a, b) => b.start - a.start)
    .slice(0, RECENT_EVENTS_LIMIT);

  // Get completed tasks that had activity today
  const completedTasksWithTodayActivity = myTasks.filter(task => {
    if (!task.isCompleted) return false;
    
    // Check if this task had any events today
    return todaysEvents.some(event => 
      event.type === 'task' && event.meta?.myTaskId === task.id
    );
  });

  // Calculate category time data (using direct event categoryId)
  const categoryTimeData = isCategoryEnabled ? categories.map(category => {
    const categoryTime = todaysEvents
      .filter(event => 
        event.end && 
        event.categoryId === category.id
      )
      .reduce((total, event) => total + (event.end! - event.start), 0);
    
    return {
      id: category.id,
      name: category.name,
      color: category.color,
      time: categoryTime,
    };
  }).filter(item => item.time > 0) : [];

  // Add uncategorized events time (events without categoryId)
  const uncategorizedTime = isCategoryEnabled ? todaysEvents
    .filter(event => 
      event.end && !event.categoryId
    )
    .reduce((total, event) => total + (event.end! - event.start), 0) : 0;

  return (
    <div className="p-4">
      <h1 className="mb-6 text-center text-2xl font-semibold">本日のレポート</h1>

      <div className="mb-8 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">タスク時間</p>
          <p className="text-xl font-bold">{formatDuration(totalFocusTime)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">割り込み</p>
          <p className="text-xl font-bold">{formatDuration(totalInterruptTime)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">休憩</p>
          <p className="text-xl font-bold">{formatDuration(totalBreakTime)}</p>
        </div>
      </div>

      {todaysEvents.length > 0 ? (
         <div className="mb-8 h-60 w-full">
            <StatBar data={chartData} />
        </div>
      ) : (
        <p className="text-center text-gray-500 dark:text-gray-400">本日のデータがないため、グラフを表示できません。</p>
      )}

      {/* Category Time Analysis */}
      {isCategoryEnabled && (categoryTimeData.length > 0 || uncategorizedTime > 0) && (
        <div className="mb-8">
          <h2 className="mb-3 text-xl font-semibold">カテゴリ別時間配分</h2>
          <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4">
              <StatBar 
                data={[
                  ...categoryTimeData.map(item => ({
                    name: item.name,
                    value: item.time,
                    fill: item.color
                  })),
                  ...(uncategorizedTime > 0 ? [{
                    name: '未分類',
                    value: uncategorizedTime,
                    fill: '#9CA3AF'
                  }] : [])
                ]}
              />
            </div>
            <div className="space-y-2">
              {categoryTimeData.map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className="text-sm font-mono">{formatDuration(item.time)}</span>
                </div>
              ))}
              {uncategorizedTime > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gray-400" />
                    <span className="text-sm">未分類</span>
                  </div>
                  <span className="text-sm font-mono">{formatDuration(uncategorizedTime)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interrupt Timeline Section */}
      <div className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">割り込み分析</h2>
        <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <InterruptTimeline events={events} />
        </div>
      </div>

      {/* Completed Tasks Section */}
      <div className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">
          本日完了したタスク
          {completedTasksWithTodayActivity.length > 0 && (
            <span className="ml-2 text-sm font-normal text-green-600 dark:text-green-400">
              ({completedTasksWithTodayActivity.length})
            </span>
          )}
        </h2>
        <CompletedTasksList 
          completedTasks={completedTasksWithTodayActivity} 
          events={todaysEvents} 
        />
      </div>

      {/* Recent Events Section */}
      <div>
        <h2 className="mb-3 text-xl font-semibold">本日の最新10イベント</h2>
        {last10Events.length > 0 ? (
          <EventList events={last10Events} />
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400">本日のイベントが記録されていません。</p>
        )}
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