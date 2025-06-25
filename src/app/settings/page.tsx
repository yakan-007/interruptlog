'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useTheme } from 'next-themes';
import useEventsStore, { EventsState } from '@/store/useEventsStore';
import { Event, MyTask, Category } from '@/types';
import { Moon, Sun, Download, Upload, PlusCircle, Trash2, Edit3, AlertTriangle, Tag, Palette } from 'lucide-react';
import BusinessHoursSettings from '@/components/settings/BusinessHoursSettings';

const SettingsPage = () => {
  const { theme, setTheme } = useTheme();
  const { 
    events, 
    myTasks, 
    categories, 
    isCategoryEnabled, 
    actions, 
    isHydrated 
  } = useEventsStore((state: EventsState) => state);
  const [mounted, setMounted] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; color: string } | null>(null);

  useEffect(() => setMounted(true), []);

  const handleExport = () => {
    if (!isHydrated) {
      alert('Data is not yet loaded. Please try again shortly.');
      return;
    }
    const dataToExport = {
      events: events,
      myTasks: myTasks,
    };
    const json = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interruptlog_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isHydrated) {
      alert('Data is not yet loaded. Please try again shortly before importing.');
      return;
    }
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedText = e.target?.result as string;
          if (!importedText) throw new Error('File is empty or unreadable.');
          const importedData = JSON.parse(importedText) as { events: Event[]; myTasks: MyTask[] };
          
          if (Array.isArray(importedData.events) && importedData.events.every(isValidEvent)) {
            actions.setEvents(importedData.events);
          } else {
            alert('Imported events data is invalid or missing. Events were not imported.');
            actions.setEvents([]);
          }

          if (Array.isArray(importedData.myTasks) && importedData.myTasks.every(isValidMyTask)) {
            actions.setMyTasks(importedData.myTasks);
          } else {
            alert('Imported custom tasks data is invalid or missing. Custom tasks were not imported.');
            actions.setMyTasks([]);
          }

          actions.setCurrentEventId(null);
          alert('Data import processed. Check console for details if alerts appeared.');

        } catch (error) {
          alert(`Error importing file: ${(error as Error).message}. Ensure it is a valid JSON export with 'events' and 'myTasks' arrays.`);
        }
      };
      reader.onerror = () => {
        alert('Error reading file.');
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  const isValidEvent = (event: any): event is Event => {
    return (
      typeof event.id === 'string' &&
      (event.type === 'task' || event.type === 'interrupt' || event.type === 'break') &&
      typeof event.start === 'number' &&
      (typeof event.end === 'number' || typeof event.end === 'undefined' || event.end === null)
    );
  };

  const isValidMyTask = (task: any): task is MyTask => {
    return (
      typeof task.id === 'string' &&
      typeof task.name === 'string' && task.name.trim() !== ''
    );
  };

  const handleAddMyTask = (e: FormEvent) => {
    e.preventDefault();
    if (newTaskName.trim()) {
      actions.addMyTask(newTaskName.trim());
      setNewTaskName('');
    }
  };

  const handleClearAllData = () => {
    // Simply clear the state
    actions.setEvents([]);
    actions.setMyTasks([]);
    actions.setCurrentEventId(null);
    
    // Close dialog
    setShowDeleteConfirmation(false);
    
    // Done!
    alert('すべてのデータが削除されました。');
  };

  const handleAddCategory = (e: FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim()) {
      actions.addCategory(newCategoryName.trim(), newCategoryColor);
      setNewCategoryName('');
      setNewCategoryColor('#3B82F6');
    }
  };

  const handleUpdateCategory = (e: FormEvent) => {
    e.preventDefault();
    if (editingCategory && editingCategory.name.trim()) {
      actions.updateCategory(editingCategory.id, editingCategory.name.trim(), editingCategory.color);
      setEditingCategory(null);
    }
  };


  const predefinedColors = [
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#EC4899', // Pink
    '#6B7280', // Gray
  ];
  
  if (!mounted || !isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <h1 className="mb-6 text-center text-2xl font-semibold">設定</h1>

      <div className="mx-auto max-w-md space-y-6">
        <div className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <span className="text-lg font-medium">テーマ</span>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-6 w-6 text-yellow-400" />
            ) : (
              <Moon className="h-6 w-6 text-slate-500" />
            )}
          </button>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-3 text-lg font-medium">マイタスク</h2>
          <form onSubmit={handleAddMyTask} className="mb-4 flex gap-2">
            <input 
              type="text"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
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
              {myTasks.map((task) => (
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

        {/* カテゴリ管理セクション */}
        <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <Tag className="h-5 w-5" />
              タスクカテゴリ
            </h2>
            <button
              onClick={actions.toggleCategoryEnabled}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                isCategoryEnabled 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }`}
            >
              {isCategoryEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          
          {isCategoryEnabled && (
            <>
              <form onSubmit={handleAddCategory} className="mb-4">
                <div className="flex gap-2 mb-2">
                  <input 
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="新しいカテゴリ名"
                    className="flex-grow rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500"
                  />
                  <button 
                    type="submit"
                    className="inline-flex items-center justify-center rounded-md bg-blue-500 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  >
                    <PlusCircle className="mr-1 h-4 w-4" /> 追加
                  </button>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCategoryColor(color)}
                      className={`w-6 h-6 rounded-full border-2 ${
                        newCategoryColor === color ? 'border-gray-800 dark:border-gray-200' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
              </form>

              {categories.length > 0 ? (
                <ul className="space-y-2">
                  {categories.map((category) => (
                    <li key={category.id} className="flex items-center justify-between rounded-md bg-gray-50 p-2 dark:bg-gray-700/50">
                      {editingCategory?.id === category.id ? (
                        <form onSubmit={handleUpdateCategory} className="flex-grow flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full border border-gray-300"
                            style={{ backgroundColor: editingCategory.color }}
                          />
                          <input
                            type="text"
                            value={editingCategory.name}
                            onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                            className="flex-grow text-sm rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            {predefinedColors.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setEditingCategory({ ...editingCategory, color })}
                                className={`w-4 h-4 rounded-full border ${
                                  editingCategory.color === color ? 'border-gray-800 dark:border-gray-200' : 'border-gray-300 dark:border-gray-600'
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <button type="submit" className="text-green-600 hover:text-green-800 dark:text-green-400">
                            ✓
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setEditingCategory(null)}
                            className="text-gray-600 hover:text-gray-800 dark:text-gray-400"
                          >
                            ✕
                          </button>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="text-sm">{category.name}</span>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setEditingCategory({ id: category.id, name: category.name, color: category.color })}
                              className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              aria-label="Edit category"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => actions.removeCategory(category.id)}
                              className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              aria-label="Remove category"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">カテゴリがまだ追加されていません。</p>
              )}
            </>
          )}
          
          {!isCategoryEnabled && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              カテゴリ機能を有効にすると、タスクを分類して時間配分を分析できます。
            </p>
          )}
        </div>

        {/* Business Hours Mode */}
        <BusinessHoursSettings />

        <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-medium">データ管理</h2>
          <div className="space-y-3">
            <button
              onClick={handleExport}
              disabled={events.length === 0 && myTasks.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-500 px-4 py-2.5 text-base font-medium text-white shadow-sm transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-800"
            >
              <Download className="h-5 w-5" />
              データをエクスポート (JSON)
            </button>
            <div>
              <label
                htmlFor="import-file"
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-green-500 px-4 py-2.5 text-base font-medium text-white shadow-sm transition-colors hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                <Upload className="h-5 w-5" />
                データをインポート (JSON)
              </label>
              <input
                type="file"
                id="import-file"
                accept=".json,application/json"
                onChange={handleImport}
                className="sr-only"
              />
            </div>
            <div className="mt-6 border-t pt-6 dark:border-gray-600">
              <button
                onClick={() => setShowDeleteConfirmation(true)}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-red-500 px-4 py-2.5 text-base font-medium text-white shadow-sm transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                <AlertTriangle className="h-5 w-5" />
                すべてのデータを削除
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 削除確認ダイアログ */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <h3 className="text-xl font-semibold">データの削除確認</h3>
            </div>
            <p className="mb-6 text-gray-600 dark:text-gray-300">
              すべてのタスク、イベント履歴、設定がリセットされます。この操作は取り消せません。
            </p>
            <p className="mb-6 font-medium text-red-600 dark:text-red-400">
              本当にすべてのデータを削除しますか？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                キャンセル
              </button>
              <button
                onClick={handleClearAllData}
                className="flex-1 rounded-md bg-red-500 px-4 py-2 text-base font-medium text-white shadow-sm transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage; 