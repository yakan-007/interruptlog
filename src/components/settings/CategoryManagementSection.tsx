'use client';

import { useState, FormEvent } from 'react';
import { Tag, PlusCircle, Edit3, Trash2 } from 'lucide-react';
import useEventsStore from '@/store/useEventsStore';
import { Category } from '@/types';

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

export default function CategoryManagementSection() {
  const { categories, isCategoryEnabled, actions } = useEventsStore();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; color: string } | null>(null);

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

  return (
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
              {categories.map((category: Category) => (
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
  );
}