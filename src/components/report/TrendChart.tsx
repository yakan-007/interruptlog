'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendDatum, formatDurationCompact } from '@/lib/reportUtils';

interface TrendChartProps {
  data: TrendDatum[];
}

const COLORS = {
  focus: '#34D399',
  interrupt: '#F87171',
  break: '#9CA3AF',
};

const formatHours = (value: number) => {
  if (!value) return '0h';
  const hours = value / (1000 * 60 * 60);
  return `${hours.toFixed(1)}h`;
};

export default function TrendChart({ data }: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        データが不足しています。
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">最近のトレンド</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">フォーカス・割り込み・休憩の推移（直近7日）</p>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" stroke="#9ca3af" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatHours} stroke="#9ca3af" tick={{ fontSize: 12 }} width={50} />
            <Tooltip
              formatter={(value: number) => formatDurationCompact(value)}
              labelFormatter={label => `${label}`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="focusDuration"
              name="フォーカス"
              stackId="1"
              stroke={COLORS.focus}
              fill={`${COLORS.focus}66`}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="interruptDuration"
              name="割り込み"
              stackId="1"
              stroke={COLORS.interrupt}
              fill={`${COLORS.interrupt}55`}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="breakDuration"
              name="休憩"
              stackId="1"
              stroke={COLORS.break}
              fill={`${COLORS.break}55`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
