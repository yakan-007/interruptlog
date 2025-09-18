'use client';

import useEventsStore from '@/store/useEventsStore';

export default function TimelineOptionsSection() {
  const { uiSettings, actions } = useEventsStore(state => ({
    uiSettings: state.uiSettings,
    actions: state.actions,
  }));

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-3 text-lg font-medium">レポート表示オプション</h2>
      <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
        <ToggleRow
          label="タイムラインを表示"
          description="1日の流れを視覚的に表示します"
          checked={uiSettings.highlightTimeline}
          onToggle={actions.toggleHighlightTimeline}
        />
        <ToggleRow
          label="進捗カウンターを表示"
          description="完了件数や集中時間を一目で確認できます"
          checked={uiSettings.showCounters}
          onToggle={actions.toggleShowCounters}
        />
        <ToggleRow
          label="積み上げサマリーを表示"
          description="自分の頑張りをまとめたレポートを追加表示します"
          checked={uiSettings.showPersonalProgress}
          onToggle={actions.toggleShowPersonalProgress}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start justify-between rounded-md border border-gray-100 p-3 transition-colors hover:border-blue-300 dark:border-gray-700 dark:hover:border-blue-500">
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={`mt-1 flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
        }`}
        aria-label={label}
      >
        <span
          className={`h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
