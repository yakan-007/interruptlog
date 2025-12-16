'use client';

import { useMemo } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import useEventsStore from '@/store/useEventsStore';
import { DueAlertSettings } from '@/types';

const PRESETS: Array<{
  id: DueAlertSettings['preset'];
  name: string;
  description: string;
  warningMinutes: number;
  dangerMinutes: number;
}> = [
  {
    id: 'day-before',
    name: '前日に知りたい',
    description: '24時間前から警告し、4時間前で危険表示',
    warningMinutes: 24 * 60,
    dangerMinutes: 4 * 60,
  },
  {
    id: 'few-hours',
    name: '数時間前で十分',
    description: '6時間前から警告し、1時間前で危険表示',
    warningMinutes: 6 * 60,
    dangerMinutes: 60,
  },
  {
    id: 'tight',
    name: '直前で集中したい',
    description: '2時間前から警告し、30分前で危険表示',
    warningMinutes: 120,
    dangerMinutes: 30,
  },
];

export default function DueAlertSettingsSection() {
  const { dueAlertSettings, actions } = useEventsStore(state => ({
    dueAlertSettings: state.dueAlertSettings,
    actions: state.actions,
  }));

  const currentPreset = useMemo(() => {
    const found = PRESETS.find(preset => preset.id === dueAlertSettings.preset);
    return found ? found.id : 'few-hours';
  }, [dueAlertSettings.preset]);

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-3 text-lg font-medium">期限アラート</h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        期限に近づいたタスクをどのタイミングで目立たせるかを選べます。
      </p>

      <RadioGroup
        value={currentPreset}
        onValueChange={value => actions.setDueAlertPreset(value as DueAlertSettings['preset'])}
        className="space-y-2"
      >
        {PRESETS.map(preset => (
          <label
            key={preset.id}
            htmlFor={`due-alert-${preset.id}`}
            className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-100 p-3 transition-colors hover:border-blue-300 dark:border-gray-700 dark:hover:border-blue-500"
          >
            <RadioGroupItem id={`due-alert-${preset.id}`} value={preset.id} className="mt-1" />
            <div>
              <Label htmlFor={`due-alert-${preset.id}`} className="text-sm font-medium">
                {preset.name}
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">{preset.description}</p>
            </div>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}
