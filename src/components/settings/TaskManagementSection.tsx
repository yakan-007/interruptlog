'use client';

import { PlusCircle, Trash2 } from 'lucide-react';
import useEventsStore from '@/store/useEventsStore';
import { MyTask } from '@/types';
import { useFormHandler } from '@/hooks/useFormHandler';

export default function TaskManagementSection() {
  const { myTasks, actions } = useEventsStore();
  
  const { values, handleSubmit, updateValue } = useFormHandler({
    initialValues: { taskName: '' },
    onSubmit: (values) => actions.addMyTask(values.taskName, undefined, { suppressAutoStart: true }),
    validate: (values) => values.taskName.trim() !== '',
  });

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-3 text-lg font-medium">マイタスク</h2>
      <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
        <input 
          type="text"
          value={values.taskName}
          onChange={(e) => updateValue('taskName', e.target.value)}
          placeholder="新しいタスク名"
          className="flex-grow rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500"
        />
        <button 
          type="submit"
          className="inline-flex items-center justify-center rounded-md bg-blue-500 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        >
          <PlusCircle className="mr-1 h-5 w-5" /> 追加
        </button>
      </form>
      {myTasks.length > 0 ? (
        <ul className="space-y-2">
          {myTasks.map((task: MyTask) => (
            <li key={task.id} className="flex items-center justify-between rounded-md bg-gray-50 p-2 dark:bg-gray-700/50">
              <span className="text-sm">{task.name}</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => actions.removeMyTask(task.id)}
                  className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  aria-label="Remove task"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">カスタムタスクがまだ追加されていません。</p>
      )}
    </div>
  );
}
