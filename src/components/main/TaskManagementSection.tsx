'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PlusCircle, Zap } from 'lucide-react';
import TaskCard from '@/components/TaskCard';
import { Event, MyTask } from '@/types';
import { useTaskManagement } from '@/hooks/useStoreSelectors';

interface TaskManagementSectionProps {
  activeEvent?: Event;
  editingTaskId: string | null;
  editingTaskName: string;
  draggingTaskId: string | null;
  dragOverTaskId: string | null;
  onStartEditTask: (taskId: string, currentName: string) => void;
  onSaveTaskName: (taskId: string) => void;
  onCancelEditTask: () => void;
  onSetEditingTaskName: (name: string) => void;
  onToggleCompletion: (taskId: string) => void;
  onStartEvent: (label: string, taskId?: string) => void;
  onDeleteTask: (taskId: string) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, targetTaskId: string) => void;
  onDragEnd: () => void;
}

export default function TaskManagementSection({
  activeEvent,
  editingTaskId,
  editingTaskName,
  draggingTaskId,
  dragOverTaskId,
  onStartEditTask,
  onSaveTaskName,
  onCancelEditTask,
  onSetEditingTaskName,
  onToggleCompletion,
  onStartEvent,
  onDeleteTask,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: TaskManagementSectionProps) {
  const { myTasks, categories, isCategoryEnabled, autoStartTask, actions } = useTaskManagement();
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskCategoryId, setNewTaskCategoryId] = useState<string>('');

  const handleAddNewTask = () => {
    if (newTaskName.trim() !== '') {
      const categoryId = newTaskCategoryId && newTaskCategoryId !== 'none' ? newTaskCategoryId : undefined;
      actions.addMyTask(newTaskName.trim(), categoryId);
      setNewTaskName('');
      setNewTaskCategoryId('');
    }
  };

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-2">マイタスク</h2>
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
          placeholder="新しいタスク名"
          className="flex-grow"
        />
        {isCategoryEnabled && (
          <Select value={newTaskCategoryId} onValueChange={setNewTaskCategoryId}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="カテゴリ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">カテゴリなし</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button 
          onClick={handleAddNewTask} 
          variant="outline"
          className={autoStartTask ? 'border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-300 dark:hover:bg-orange-900/20' : ''}
          title={autoStartTask ? 'タスク追加後、自動で開始されます' : 'タスクを追加します'}
        >
          {autoStartTask ? (
            <Zap className="mr-2 h-4 w-4" />
          ) : (
            <PlusCircle className="mr-2 h-4 w-4" />
          )}
          {autoStartTask ? '追加して開始' : 'タスクを追加'}
        </Button>
      </div>
      <div className="space-y-2">
        {myTasks.map((task: MyTask) => (
          <TaskCard
            key={task.id}
            task={task}
            activeEvent={activeEvent}
            editingTaskId={editingTaskId}
            editingTaskName={editingTaskName}
            draggingTaskId={draggingTaskId}
            dragOverTaskId={dragOverTaskId}
            onStartEditTask={onStartEditTask}
            onSaveTaskName={onSaveTaskName}
            onCancelEditTask={onCancelEditTask}
            onSetEditingTaskName={onSetEditingTaskName}
            onToggleCompletion={onToggleCompletion}
            onStartEvent={onStartEvent}
            onDeleteTask={onDeleteTask}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
          />
        ))}
        {myTasks.length === 0 && <p className="text-gray-500">タスクがまだありません。追加してください！</p>}
      </div>
    </div>
  );
}