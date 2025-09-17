'use client';

import { PlanningAggregates, PlanningInsight } from '@/lib/planningInsights';
import { formatDuration } from '@/lib/reportUtils';

interface AdvancedPlanningSummaryProps {
  aggregates: PlanningAggregates;
}

const METRIC_CARD_CLASSES =
  'rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-900';

export default function AdvancedPlanningSummary({ aggregates }: AdvancedPlanningSummaryProps) {
  const metrics = [
    {
      label: '集中時間率',
      value: formatPercentage(aggregates.focusRate),
      helper: 'タスクに費やした時間 ÷ 総作業時間',
    },
    {
      label: '計画カバレッジ',
      value: formatPercentage(aggregates.planningCoverage),
      helper: '詳細を持つタスクの割合',
    },
    {
      label: '計画 vs 実績',
      value: formatPlanVsActual(aggregates.totalPlannedMinutes, aggregates.totalActualMinutes),
      helper: '分単位の合計比較',
    },
    {
      label: '平均乖離',
      value:
        aggregates.averageVarianceMinutes !== undefined
          ? `${formatMinuteValue(aggregates.averageVarianceMinutes)}差`
          : '—',
      helper: 'タスク単位の平均ズレ幅',
    },
  ];

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">アドバンスト分析</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          計画情報に基づき、どこにリスクがあるかを素早く把握できます。
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map(metric => (
          <div key={metric.label} className={METRIC_CARD_CLASSES}>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{metric.label}</p>
            <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-gray-50">{metric.value}</p>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{metric.helper}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <InsightList
          title="遅延リスク"
          insights={aggregates.behindSchedule}
          emptyLabel="遅延の兆候はありません"
          tone="negative"
          limit={4}
        />
        <InsightList
          title="期限切れ/期限間近"
          insights={[...aggregates.overdue, ...aggregates.upcoming]}
          emptyLabel="期限関連の課題はありません"
          tone="warning"
          limit={5}
        />
        <InsightList
          title="先行しているタスク"
          insights={aggregates.aheadOfSchedule}
          emptyLabel="先行中のタスクはありません"
          tone="positive"
          limit={4}
        />
      </div>
    </section>
  );
}

interface InsightListProps {
  title: string;
  insights: PlanningInsight[];
  emptyLabel: string;
  tone: 'negative' | 'warning' | 'positive';
  limit?: number;
}

function InsightList({ title, insights, emptyLabel, tone, limit = 3 }: InsightListProps) {
  const palette = tonePalette[tone];
  const items = insights.slice(0, limit);

  return (
    <div className={`${METRIC_CARD_CLASSES} flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
        {insights.length > limit && (
          <span className="text-xs text-gray-400">+{insights.length - limit}</span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="rounded-md bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
          {emptyLabel}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map(item => (
            <li key={`${item.taskName}-${item.dueAt ?? item.plannedMinutes ?? Math.random()}`}
              className={`rounded-md border ${palette.border} ${palette.bg} p-3 text-xs`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className={`font-semibold ${palette.text}`}>{item.taskName}</p>
                {item.varianceMinutes !== undefined && (
                  <span className={`rounded-full px-2 py-1 text-[11px] ${varianceTone(item.varianceMinutes)}`}>
                    {varianceLabel(item.varianceMinutes)}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
                {item.plannedMinutes !== undefined && (
                  <span>予定: {formatMinuteValue(item.plannedMinutes)}</span>
                )}
                <span>実績: {formatMinuteValue(item.actualMinutes)}</span>
                {item.dueAt && <span>期限: {formatDueDate(item.dueAt)}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const tonePalette = {
  negative: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800/60',
    text: 'text-red-700 dark:text-red-300',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800/60',
    text: 'text-amber-700 dark:text-amber-300',
  },
  positive: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
} as const;

function formatPercentage(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

function formatPlanVsActual(planned: number, actual: number): string {
  if (planned === 0 && actual === 0) return '—';
  const plannedLabel = planned > 0 ? formatMinuteValue(planned) : '—';
  const actualLabel = formatMinuteValue(actual);
  return `${actualLabel} / ${plannedLabel}`;
}

function formatMinuteValue(minutes: number): string {
  const ms = minutes * 60 * 1000;
  return formatDuration(ms);
}

function varianceLabel(varianceMinutes: number): string {
  if (Math.abs(varianceMinutes) < 5) return '±5分以内';
  const rounded = Math.round(Math.abs(varianceMinutes));
  return varianceMinutes > 0 ? `+${rounded}分` : `-${rounded}分`;
}

function varianceTone(varianceMinutes: number): string {
  if (Math.abs(varianceMinutes) < 5) {
    return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
  }
  return varianceMinutes > 0
    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
}

function formatDueDate(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}
