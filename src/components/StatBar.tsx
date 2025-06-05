'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface StatBarEntry {
  name: string;
  value: number;
  fill: string;
}

interface StatBarProps {
  data: StatBarEntry[];
}

const formatMillisToHours = (millis: number): string => {
  if (millis === 0) return '0h';
  return (millis / (1000 * 60 * 60)).toFixed(1) + 'h';
};

const CustomTooltip: React.FC<TooltipProps<ValueType, NameType>> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const entry = payload[0].payload as StatBarEntry;
    const hours = (entry.value / (1000 * 60 * 60)).toFixed(2);
    return (
      <div className="rounded-md border bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <p className="label font-semibold">{`${label} : ${hours} hrs`}</p>
      </div>
    );
  }
  return null;
};

const StatBar: React.FC<StatBarProps> = ({ data }) => {
  if (!data || data.every(d => d.value === 0)) {
    return <p className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">No activity to display in chart.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <XAxis type="number" tickFormatter={formatMillisToHours} domain={[0, 'dataMax']} stroke="#9ca3af" axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={60} stroke="#9ca3af" axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(200,200,200,0.1)' }} wrapperStyle={{ zIndex: 1000 }}/>
        <Bar dataKey="value" barSize={20} radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default StatBar; 