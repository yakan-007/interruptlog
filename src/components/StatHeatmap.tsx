import React from 'react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, Cell, Bar } from 'recharts';

interface HeatmapEntry {
  hour: string; // "00", "01", ... "23"
  count: number;
}

interface StatHeatmapProps {
  data: HeatmapEntry[];
}

const colorScale = (count: number) => {
  if (count === 0) return '#f3f4f6'; // gray-100
  if (count === 1) return '#fde68a'; // yellow-200
  if (count === 2) return '#fbbf24'; // yellow-400
  if (count === 3) return '#f59e42'; // orange-400
  return '#ef4444'; // red-500
};

const StatHeatmap: React.FC<StatHeatmapProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={80}>
      <ComposedChart
        data={data}
        layout="horizontal"
        margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
      >
        <XAxis dataKey="hour" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis hide type="number" domain={[0, 'dataMax']} />
        <Tooltip formatter={(v) => `${v}件`} labelFormatter={h => `${h}時台`} />
        <Bar dataKey="count" barSize={16} radius={[4, 4, 4, 4]}>
          {data.map((entry, idx) => (
            <Cell key={entry.hour} fill={colorScale(entry.count)} />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default StatHeatmap; 