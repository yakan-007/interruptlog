'use client';

import { useEffect, useState } from 'react';
import useEventsStore from '@/store/useEventsStore';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { PlusCircle, Trash2, Play, GripVertical } from 'lucide-react';
import TaskCardTimer from '@/components/TaskCardTimer';

export default function LogPage() {
  const { events, currentEventId, myTasks, isHydrated, actions } = useEventsStore();
  const [newEventLabel, setNewEventLabel] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const activeEvent = currentEventId ? events.find((e) => e.id === currentEventId) : undefined;

  // Helper function to format event time with date if not today
  const formatEventTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('ja-JP', { 
        month: 'numeric', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  useEffect(() => {
    if (isHydrated && activeEvent) {
      document.title = `InterruptLog Slim - ${activeEvent.label ?? 'Task'}`;
    } else {
      document.title = 'InterruptLog Slim';
    }
  }, [activeEvent, isHydrated]);

  const handleStartEvent = (label: string, taskId?: string) => {
    actions.startTask(label, taskId);
  };

  const handleAddNewTask = () => {
    if (newTaskName.trim() !== '') {
      actions.addMyTask(newTaskName.trim());
      setNewTaskName('');
    }
  };

  const handleDeleteTask = (taskId: string) => {
    actions.removeMyTask(taskId);
  };

  const handleToggleTaskCompletion = (taskId: string) => {
    actions.toggleMyTaskCompletion(taskId);
  };

  const sortedMyTasks = [...myTasks].sort((a, b) => a.order - b.order);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    setDraggingTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.preventDefault();
    if (taskId !== draggingTaskId) {
      setDragOverTaskId(taskId);
    }
  };

  const handleDragLeave = () => {
    setDragOverTaskId(null);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverTaskId(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetTaskId: string) => {
    const draggedTaskId = e.dataTransfer.getData('taskId');
    if (draggedTaskId && draggedTaskId !== targetTaskId) {
      const targetIndex = sortedMyTasks.findIndex((t) => t.id === targetTaskId);
      actions.reorderMyTasks(draggedTaskId, targetIndex);
    }
    setDraggingTaskId(null);
    setDragOverTaskId(null);
  };

  // Filter events for display: today's events + last 5 from yesterday
  const getFilteredEvents = () => {
    if (showAllHistory) {
      return events;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayEvents = events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= today;
    });
    
    const yesterdayEvents = events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= yesterday && eventDate < today;
    });
    
    // Get last 5 events from yesterday
    const last5YesterdayEvents = yesterdayEvents.slice(-5);
    
    // Combine and sort by start time
    return [...last5YesterdayEvents, ...todayEvents].sort((a, b) => a.start - b.start);
  };

  const filteredEvents = getFilteredEvents();

  return (
    <div className="container mx-auto p-4 pb-16">
      <h1 className="text-2xl font-bold mb-4">InterruptLog</h1>

      {/* My Tasks Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">My Tasks</h2>
        <div className="flex gap-2 mb-4">
          <Input
            type="text"
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddNewTask();
              }
            }}
            placeholder="New task name"
            className="flex-grow"
          />
          <Button onClick={handleAddNewTask} variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Task
          </Button>
        </div>
        <div className="space-y-2">
          {sortedMyTasks.map((task) => (
            <Card
              key={task.id}
              id={`task-card-${task.id}`}
              className={`flex items-center justify-between p-3 transition-all ${
                activeEvent && activeEvent.type === 'task' && activeEvent.meta?.myTaskId === task.id && !activeEvent.end ? 'bg-green-100 dark:bg-green-800 border-green-400 dark:border-green-600' : ''
              } ${
                draggingTaskId === task.id ? 'opacity-75 shadow-2xl scale-105 transform' : ''
              } ${
                dragOverTaskId === task.id && draggingTaskId !== task.id ? 'border-2 border-blue-500 dark:border-blue-300 ring-2 ring-blue-300' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, task.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, task.id)}
              onDragEnd={handleDragEnd}
            >
              <div className="flex items-center flex-grow mr-2">
                <div
                  className="cursor-grab p-1 mr-2"
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, task.id)}
                >
                  <GripVertical className="h-5 w-5 text-gray-400" />
                </div>
                <Checkbox
                  checked={task.isCompleted}
                  onChange={() => handleToggleTaskCompletion(task.id)}
                  className="mr-3"
                  id={`task-${task.id}`}
                />
                <label
                  htmlFor={`task-${task.id}`}
                  className={`${task.isCompleted ? 'line-through text-gray-500' : ''} flex-grow`}
                >
                  {task.name}
                </label>
              </div>
              <div className="flex items-center">
                {activeEvent && activeEvent.type === 'task' && activeEvent.meta?.myTaskId === task.id && !activeEvent.end && activeEvent.start > 0 && (
                  <TaskCardTimer startTime={activeEvent.start} myTaskId={task.id} />
                )}
                <div className="flex gap-2 ml-2">
                {!task.isCompleted && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStartEvent(task.name, task.id)}
                      disabled={(
                        activeEvent && 
                        !activeEvent.end && 
                        activeEvent.meta?.myTaskId === task.id
                      ) || (
                        activeEvent && 
                        !activeEvent.end && 
                        (activeEvent.type === 'interrupt' || activeEvent.type === 'break')
                      )}
                    title="Start this task"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteTask(task.id)}
                  title="Delete this task"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                </div>
              </div>
            </Card>
          ))}
          {myTasks.length === 0 && <p className="text-gray-500">No tasks yet. Add some!</p>}
        </div>
      </div>

      {/* Event History Section */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Event History</h2>
        {filteredEvents.length > 0 ? (
          <ul className="space-y-2">
            {filteredEvents
              .slice()
              .reverse()
              .map((event) => (
                <li key={event.id} className="p-3 border rounded-md text-sm">
                  <span className={`font-medium ${event.end ? '' : 'text-green-600 dark:text-green-400'}`}>
                    {event.label ?? 'Unnamed'}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300 ml-2">
                    ({formatEventTime(event.start)}
                    {event.end ? ` - ${formatEventTime(event.end)}` : ' - Active'})
                  </span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-gray-500">No events logged yet.</p>
        )}
        
        {/* Show more button */}
        {!showAllHistory && events.length > filteredEvents.length && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={() => setShowAllHistory(true)}
              className="text-sm"
            >
              Show all history ({events.length - filteredEvents.length} more events)
            </Button>
          </div>
        )}
        
        {showAllHistory && events.length > 0 && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={() => setShowAllHistory(false)}
              className="text-sm"
            >
              Show less
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 