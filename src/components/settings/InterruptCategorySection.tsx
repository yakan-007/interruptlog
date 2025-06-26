'use client';

import { useState, FormEvent } from 'react';
import { AlertCircle, RotateCcw, Edit3 } from 'lucide-react';
import useEventsStore from '@/store/useEventsStore';
import { InterruptCategorySettings } from '@/types';
import { DEFAULT_INTERRUPT_CATEGORIES, INTERRUPT_CATEGORY_COLORS } from '@/lib/constants';

export default function InterruptCategorySection() {
  const { interruptCategorySettings, actions } = useEventsStore();
  const [editingInterruptCategory, setEditingInterruptCategory] = useState<keyof InterruptCategorySettings | null>(null);
  const [editingInterruptCategoryName, setEditingInterruptCategoryName] = useState('');

  const handleUpdateInterruptCategory = (e: FormEvent) => {
    e.preventDefault();
    if (editingInterruptCategory && editingInterruptCategoryName.trim()) {
      actions.updateInterruptCategoryName(editingInterruptCategory, editingInterruptCategoryName.trim());
      setEditingInterruptCategory(null);
      setEditingInterruptCategoryName('');
    }
  };

  const handleStartEditInterruptCategory = (categoryId: keyof InterruptCategorySettings) => {
    setEditingInterruptCategory(categoryId);
    setEditingInterruptCategoryName(interruptCategorySettings[categoryId]);
  };

  const handleCancelEditInterruptCategory = () => {
    setEditingInterruptCategory(null);
    setEditingInterruptCategoryName('');
  };

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          割り込みカテゴリ
        </h2>
        <button
          onClick={actions.resetAllInterruptCategoriesToDefault}
          className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <RotateCcw className="h-4 w-4" />
          全てリセット
        </button>
      </div>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        6つの固定カテゴリの名前を変更できます。
      </p>

      <ul className="space-y-2">
        {(['category1', 'category2', 'category3', 'category4', 'category5', 'category6'] as const).map((categoryId) => (
          <li key={categoryId} className="flex items-center justify-between rounded-md bg-gray-50 p-3 dark:bg-gray-700/50">
            {editingInterruptCategory === categoryId ? (
              <form onSubmit={handleUpdateInterruptCategory} className="flex-grow flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
                  style={{ backgroundColor: INTERRUPT_CATEGORY_COLORS[categoryId] }}
                />
                <input
                  type="text"
                  value={editingInterruptCategoryName}
                  onChange={(e) => setEditingInterruptCategoryName(e.target.value)}
                  className="flex-grow text-sm rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-2 py-1"
                  autoFocus
                  placeholder={DEFAULT_INTERRUPT_CATEGORIES[categoryId]}
                />
                <button type="submit" className="text-green-600 hover:text-green-800 dark:text-green-400 p-1">
                  ✓
                </button>
                <button 
                  type="button" 
                  onClick={handleCancelEditInterruptCategory}
                  className="text-gray-600 hover:text-gray-800 dark:text-gray-400 p-1"
                >
                  ✕
                </button>
              </form>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: INTERRUPT_CATEGORY_COLORS[categoryId] }}
                  />
                  <span className="text-sm font-medium">{interruptCategorySettings[categoryId]}</span>
                  {interruptCategorySettings[categoryId] !== DEFAULT_INTERRUPT_CATEGORIES[categoryId] && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      (デフォルト: {DEFAULT_INTERRUPT_CATEGORIES[categoryId]})
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleStartEditInterruptCategory(categoryId)}
                    className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    aria-label="Edit category name"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  {interruptCategorySettings[categoryId] !== DEFAULT_INTERRUPT_CATEGORIES[categoryId] && (
                    <button 
                      onClick={() => actions.resetInterruptCategoryToDefault(categoryId)}
                      className="p-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                      aria-label="Reset to default"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}