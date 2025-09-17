'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import useEventsStore from '@/store/useEventsStore';
import { useFeatureFlags } from '@/hooks/useStoreSelectors';

export default function FeatureFlagsSection() {
  const featureFlags = useFeatureFlags();
  const { setFeatureFlag } = useEventsStore(state => ({
    setFeatureFlag: state.actions.setFeatureFlag,
  }));

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-3 text-lg font-medium">機能オプション</h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        必要最低限の情報だけをオンにして、記録の負担を調整できます。
      </p>
      <div className="flex items-start gap-3 rounded-md border border-gray-100 p-3 dark:border-gray-700">
        <Checkbox
          id="enableTaskPlanning"
          checked={featureFlags.enableTaskPlanning}
          onChange={event => setFeatureFlag('enableTaskPlanning', event.target.checked)}
        />
        <div>
          <Label htmlFor="enableTaskPlanning" className="flex items-center gap-2 text-sm font-medium">
            タスクに予定時間と期限を記録する
          </Label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            チェックすると、タスク作成時とカードから予定時間・期限を追加でき、レポートで計画との差分が表示されます。
          </p>
        </div>
      </div>
    </div>
  );
}
