'use client';

import { useState, useEffect } from 'react';
import { Download, Upload, AlertTriangle, Database, Trash2, Clock } from 'lucide-react';
import useEventsStore from '@/store/useEventsStore';
import { Event, MyTask } from '@/types';
import { dbGet, dbSet } from '@/lib/db';

type DataRetentionPolicy = 'none' | '1week' | '1month' | '3months' | '6months' | '1year';

interface DataManagementConfig {
  retentionPolicy: DataRetentionPolicy;
  autoCleanup: boolean;
  lastCleanup?: number;
}

const RETENTION_OPTIONS = [
  { value: 'none', label: '無制限（全データ保持）', days: null },
  { value: '1week', label: '1週間', days: 7 },
  { value: '1month', label: '1ヶ月', days: 30 },
  { value: '3months', label: '3ヶ月', days: 90 },
  { value: '6months', label: '6ヶ月', days: 180 },
  { value: '1year', label: '1年', days: 365 },
];

const STORAGE_KEY_DATA_MANAGEMENT = 'data-management-config';

export default function DataManagementSection() {
  const { events, myTasks, isHydrated, actions } = useEventsStore();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [config, setConfig] = useState<DataManagementConfig>({
    retentionPolicy: 'none',
    autoCleanup: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Load saved config
  useEffect(() => {
    const loadConfig = async () => {
      const savedConfig = await dbGet<DataManagementConfig>(STORAGE_KEY_DATA_MANAGEMENT);
      if (savedConfig) {
        setConfig(savedConfig);
      }
    };
    loadConfig();
  }, []);

  // Save config
  const saveConfig = async (newConfig: DataManagementConfig) => {
    await dbSet(STORAGE_KEY_DATA_MANAGEMENT, newConfig);
    setConfig(newConfig);
  };

  // Calculate what would be deleted with current policy
  const getEventsToDelete = (policy: DataRetentionPolicy) => {
    if (policy === 'none') return [];
    
    const retentionOption = RETENTION_OPTIONS.find(opt => opt.value === policy);
    if (!retentionOption?.days) return [];
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionOption.days);
    
    return events.filter(event => new Date(event.start) < cutoffDate);
  };

  // Manual cleanup
  const performCleanup = async () => {
    setIsLoading(true);
    try {
      const eventsToDelete = getEventsToDelete(config.retentionPolicy);
      
      if (eventsToDelete.length === 0) {
        setLastAction('クリーンアップ対象のデータがありません');
        return;
      }

      // Remove old events
      const remainingEvents = events.filter(event => 
        !eventsToDelete.some(deleteEvent => deleteEvent.id === event.id)
      );
      
      actions.setEvents(remainingEvents);
      
      // Update last cleanup time
      const newConfig = { ...config, lastCleanup: Date.now() };
      await saveConfig(newConfig);
      
      setLastAction(`${eventsToDelete.length}件の古いイベントを削除しました`);
    } catch (error) {
      setLastAction('クリーンアップ中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetentionPolicyChange = async (value: DataRetentionPolicy) => {
    const newConfig = { ...config, retentionPolicy: value };
    await saveConfig(newConfig);
  };

  const handleAutoCleanupToggle = async () => {
    const newConfig = { ...config, autoCleanup: !config.autoCleanup };
    await saveConfig(newConfig);
  };

  const eventsToDelete = getEventsToDelete(config.retentionPolicy);

  // Calculate data statistics
  const dataStats = {
    totalEvents: events.length,
    oldestEvent: events.length > 0 ? new Date(Math.min(...events.map(e => e.start))) : null,
    newestEvent: events.length > 0 ? new Date(Math.max(...events.map(e => e.start))) : null,
    dataSpanDays: events.length > 0 ? Math.ceil((Math.max(...events.map(e => e.start)) - Math.min(...events.map(e => e.start))) / (1000 * 60 * 60 * 24)) : 0,
  };

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

  const handleClearAllData = () => {
    actions.setEvents([]);
    actions.setMyTasks([]);
    actions.setCurrentEventId(null);
    setShowDeleteConfirmation(false);
    alert('すべてのデータが削除されました。');
  };

  return (
    <>
      <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-medium">データ管理</h2>
        
        {/* Data Retention Settings */}
        <div className="mb-6 space-y-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">データ保持設定</h3>
          
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">保持期間</label>
            <select
              value={config.retentionPolicy}
              onChange={(e) => handleRetentionPolicyChange(e.target.value as DataRetentionPolicy)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {RETENTION_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {config.retentionPolicy !== 'none' && eventsToDelete.length > 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                現在の設定では、{eventsToDelete.length}件のイベントが削除対象です
              </p>
            )}
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-600">
            <div>
              <div className="text-sm font-medium">自動クリーンアップ</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                設定した保持期間を超えたデータを自動的に削除
              </div>
            </div>
            <button
              onClick={handleAutoCleanupToggle}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                config.autoCleanup
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300'
              }`}
            >
              {config.autoCleanup ? "有効" : "無効"}
            </button>
          </div>

          {/* Data Statistics */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4" />
              <span className="text-sm font-medium">データ統計</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-gray-600 dark:text-gray-400">総イベント数</div>
                <div className="font-medium">{dataStats.totalEvents}件</div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">データ期間</div>
                <div className="font-medium">{dataStats.dataSpanDays}日間</div>
              </div>
            </div>
            {config.lastCleanup && (
              <div className="mt-2 pt-2 border-t dark:border-gray-600">
                <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                  <Clock className="w-3 h-3" />
                  最終クリーンアップ: {new Date(config.lastCleanup).toLocaleDateString('ja-JP')}
                </div>
              </div>
            )}
          </div>

          {/* Manual Cleanup */}
          {config.retentionPolicy !== 'none' && (
            <div className="space-y-2">
              {eventsToDelete.length === 0 ? (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  現在削除対象となる古いデータはありません
                </p>
              ) : (
                <>
                  <button
                    onClick={performCleanup}
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isLoading ? 'クリーンアップ中...' : `${eventsToDelete.length}件のデータを削除`}
                  </button>
                  {lastAction && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">{lastAction}</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Import/Export */}
        <div className="space-y-3 border-t pt-4 dark:border-gray-600">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">インポート・エクスポート</h3>
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
    </>
  );
}