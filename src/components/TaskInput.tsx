'use client';

import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle } from 'lucide-react';
import { useTypedI18n } from '@/hooks/useTypedI18n';
import { layout, iconSizes } from '@/styles/tailwind-classes';

interface TaskInputProps {
  newTaskName: string;
  setNewTaskName: (name: string) => void;
  onAddTask: () => void;
}

const TaskInput: React.FC<TaskInputProps> = React.memo(({
  newTaskName,
  setNewTaskName,
  onAddTask,
}) => {
  const t = useTypedI18n();

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onAddTask();
    }
  }, [onAddTask]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTaskName(e.target.value);
  }, [setNewTaskName]);

  return (
    <div className={`${layout.flexGap2} mb-4`}>
      <Input
        type="text"
        value={newTaskName}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        placeholder={t('tasks.newTaskPlaceholder')}
        className={layout.flexGrow}
      />
      <Button onClick={onAddTask} variant="outline">
        <PlusCircle className={`mr-2 ${iconSizes.sm}`} /> {t('tasks.addTask')}
      </Button>
    </div>
  );
});

TaskInput.displayName = 'TaskInput';

export default TaskInput; 