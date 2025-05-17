'use client';

import { useEffect, useState } from 'react';
import useEventsStore from '@/store/useEventsStore';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { PlusCircle, Trash2, Play } from 'lucide-react';
import TaskCardTimer from '@/components/TaskCardTimer';

export default function LogPage() {
  const { events, currentEventId, myTasks, isHydrated, actions } = useEventsStore();
  const [newEventLabel, setNewEventLabel] = useState('');
  const [newTaskName, setNewTaskName] = useState('');

  const activeEvent = currentEventId ? events.find((e) => e.id === currentEventId) : undefined;

  useEffect(() => {
    if (isHydrated && activeEvent) {
      document.title = `InterruptLog Slim - ${activeEvent.label ?? 'Task'}`;
    } else {
      document.title = 'InterruptLog Slim';
    }
  }, [activeEvent, isHydrated]);

  // if (!isHydrated) { // This check is handled by ClientProviders
  //   return <p className="p-4">Loading store...</p>;
  // }

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
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetTaskId: string) => {
    const draggedTaskId = e.dataTransfer.getData('taskId');
    if (draggedTaskId && draggedTaskId !== targetTaskId) {
      const targetIndex = sortedMyTasks.findIndex((t) => t.id === targetTaskId);
      actions.reorderMyTasks(draggedTaskId, targetIndex);
    }
  };

  return (
    <div className="container mx-auto p-4 pb-16">
      <h1 className="text-2xl font-bold mb-4">Log</h1>

      {/* My Tasks Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">My Tasks</h2>
        <div className="flex gap-2 mb-4">
          <Input
            type="text"
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
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
              className="flex items-center justify-between p-3"
              draggable
              onDragStart={(e) => handleDragStart(e, task.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, task.id)}
            >
              <div className="flex items-center">
                <Checkbox
                  checked={task.isCompleted}
                  onChange={() => handleToggleTaskCompletion(task.id)}
                  className="mr-3"
                  id={`task-${task.id}`}
                />
                <label
                  htmlFor={`task-${task.id}`}
                  className={task.isCompleted ? 'line-through text-gray-500' : ''}
                >
                  {task.name}
                </label>
                {activeEvent && activeEvent.type === 'task' && activeEvent.meta?.myTaskId === task.id && !activeEvent.end && (
                  <TaskCardTimer startTime={activeEvent.start} />
                )}
              </div>
              <div className="flex gap-2">
                {!task.isCompleted && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStartEvent(task.name, task.id)}
                    disabled={!!activeEvent}
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
            </Card>
          ))}
          {myTasks.length === 0 && <p className="text-gray-500">No tasks yet. Add some!</p>}
        </div>
      </div>

      {/* Event History Section */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Event History</h2>
        {events.length > 0 ? (
          <ul className="space-y-2">
            {events
              .slice()
              .reverse()
              .map((event) => (
                <li key={event.id} className="p-3 border rounded-md text-sm">
                  <span className={`font-medium ${event.end ? '' : 'text-green-600 dark:text-green-400'}`}>
                    {event.label ?? 'Unnamed'}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300 ml-2">
                    ({new Date(event.start).toLocaleTimeString()}
                    {event.end ? ` - ${new Date(event.end).toLocaleTimeString()}` : ' - Active'})
                  </span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-gray-500">No events logged yet.</p>
        )}
      </div>
    </div>
  );
} 