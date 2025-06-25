'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import useEventsStore from '@/store/useEventsStore';
import { BusinessHoursSettings as BusinessHoursSettingsType } from '@/types/businessHours';
import { 
  validateBusinessHoursSettings, 
  getBusinessHoursErrorMessage,
  ValidationResult 
} from '@/lib/businessHours/validation';

interface BusinessHoursSettingsProps {
  className?: string;
}

export default function BusinessHoursSettings({ className = '' }: BusinessHoursSettingsProps) {
  const { 
    businessHoursSettings, 
    businessHoursState, 
    actions 
  } = useEventsStore();

  // Local state for form inputs
  const [enabled, setEnabled] = useState(false);
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('18:00');
  const [defaultTaskName, setDefaultTaskName] = useState('その他の業務');
  const [autoStopOutsideHours, setAutoStopOutsideHours] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string>('');

  // Load settings from store
  useEffect(() => {
    if (businessHoursSettings) {
      setEnabled(businessHoursSettings.enabled);
      setWorkStart(businessHoursSettings.workStart);
      setWorkEnd(businessHoursSettings.workEnd);
      setDefaultTaskName(businessHoursSettings.defaultTaskName);
      setAutoStopOutsideHours(businessHoursSettings.autoStopOutsideHours);
    }
  }, [businessHoursSettings]);

  const validateAndUpdateSettings = (): boolean => {
    const settingsToValidate = {
      enabled,
      workStart,
      workEnd,
      defaultTaskName: defaultTaskName.trim(),
      autoStopOutsideHours,
    };

    const validation = validateBusinessHoursSettings(settingsToValidate);
    
    if (!validation.isValid) {
      setValidationErrors(getBusinessHoursErrorMessage(validation.errors));
      return false;
    }

    setValidationErrors('');
    
    if (validation.data) {
      actions.updateBusinessHoursSettings(validation.data);
    }
    
    return true;
  };

  const handleToggle = () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    
    // If enabling, validate first
    if (newEnabled) {
      const settingsToValidate = {
        enabled: newEnabled,
        workStart,
        workEnd,
        defaultTaskName: defaultTaskName.trim(),
        autoStopOutsideHours,
      };

      const validation = validateBusinessHoursSettings(settingsToValidate);
      
      if (!validation.isValid) {
        setValidationErrors(getBusinessHoursErrorMessage(validation.errors));
        setEnabled(false); // Revert toggle
        return;
      }
      
      setValidationErrors('');
      if (validation.data) {
        actions.updateBusinessHoursSettings(validation.data);
      }
    } else {
      // If disabling, just update
      const settings: BusinessHoursSettingsType = {
        enabled: newEnabled,
        workStart,
        workEnd,
        defaultTaskName: defaultTaskName.trim(),
        autoStopOutsideHours,
      };
      actions.updateBusinessHoursSettings(settings);
    }
  };

  const handleSettingChange = () => {
    if (enabled) {
      // Small delay to ensure state is updated
      setTimeout(validateAndUpdateSettings, 0);
    }
  };

  return (
    <div className={`rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <Clock className="h-5 w-5" />
          業務時間モード
        </h2>
        <button
          onClick={handleToggle}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            enabled 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          {enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Validation Error Display */}
      {validationErrors && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{validationErrors}</p>
        </div>
      )}

      {enabled && (
        <div className="space-y-4 border-t pt-4 dark:border-gray-600">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                業務開始時刻
              </label>
              <input
                type="time"
                value={workStart}
                onChange={(e) => setWorkStart(e.target.value)}
                onBlur={handleSettingChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                業務終了時刻
              </label>
              <input
                type="time"
                value={workEnd}
                onChange={(e) => setWorkEnd(e.target.value)}
                onBlur={handleSettingChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              デフォルトタスク名
            </label>
            <input
              type="text"
              value={defaultTaskName}
              onChange={(e) => setDefaultTaskName(e.target.value)}
              onBlur={handleSettingChange}
              placeholder="その他の業務"
              maxLength={50}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoStopOutsideHours"
              checked={autoStopOutsideHours}
              onChange={(e) => {
                setAutoStopOutsideHours(e.target.checked);
                setTimeout(handleSettingChange, 0);
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
            />
            <label htmlFor="autoStopOutsideHours" className="text-sm text-gray-700 dark:text-gray-300">
              業務時間外は自動停止
            </label>
          </div>

          <div className="rounded-md bg-blue-50 p-3 dark:bg-blue-900/20">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              業務時間中は自動的に「{defaultTaskName}」が実行されます。
              他のタスクや割り込みが発生すると一時停止し、終了後に自動再開されます。
            </p>
          </div>

          {businessHoursState.isWithinBusinessHours && (
            <div className="rounded-md bg-green-50 p-3 dark:bg-green-900/20">
              <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                現在業務時間中です
              </p>
            </div>
          )}
        </div>
      )}

      {!enabled && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          業務時間モードを有効にすると、設定した時間帯で自動的に「その他の業務」が実行されます。
          細かい作業の記録漏れを防ぎ、より正確な時間管理ができます。
        </p>
      )}
    </div>
  );
}