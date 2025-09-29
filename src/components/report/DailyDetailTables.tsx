'use client';

import type { ReactNode } from 'react';
import { formatDurationCompact } from '@/lib/reportUtils';
import type { DailyInterruptionDetailRow, DailyTaskDetailRow } from '@/app/report/utils/dayDetails';

interface DailyDetailTablesProps {
  taskDetails: DailyTaskDetailRow[];
  interruptionDetails: DailyInterruptionDetailRow[];
}

const EmptyHint = ({ message }: { message: string }) => (
  <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
    {message}
  </div>
);

const DetailTable = ({
  title,
  description,
  headers,
  rows,
  emptyMessage,
}: {
  title: string;
  description: string;
  headers: string[];
  rows: ReactNode;
  emptyMessage: string;
}) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="mb-4 space-y-1">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
    </div>
    {rows ? (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-left text-sm dark:divide-slate-800">
          <thead>
            <tr>
              {headers.map(header => (
                <th
                  key={header}
                  scope="col"
                  className="pb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{rows}</tbody>
        </table>
      </div>
    ) : (
      <EmptyHint message={emptyMessage} />
    )}
  </div>
);

const formatShare = (value: number, total: number): string => {
  if (total <= 0) return '—';
  return `${Math.round((value / total) * 100)}%`;
};

export default function DailyDetailTables({ taskDetails, interruptionDetails }: DailyDetailTablesProps) {
  const totalTaskDuration = taskDetails.reduce((acc, row) => acc + row.totalDurationMs, 0);
  const totalInterruptDuration = interruptionDetails.reduce((acc, row) => acc + row.totalDurationMs, 0);

  const taskRows =
    taskDetails.length > 0 ? (
      taskDetails.map(detail => (
        <tr key={detail.id} className="text-sm text-slate-700 dark:text-slate-200">
          <td className="py-2 pr-4 font-medium">
            <span className="inline-flex max-w-[240px] items-center truncate align-middle" title={detail.name}>
              {detail.name}
            </span>
          </td>
          <td className="py-2 pr-4 text-slate-500 dark:text-slate-400">{detail.eventCount}回</td>
          <td className="py-2 pr-4 text-slate-500 dark:text-slate-400">{formatShare(detail.totalDurationMs, totalTaskDuration)}</td>
          <td className="py-2 text-right font-semibold text-slate-900 dark:text-slate-100">
            {formatDurationCompact(detail.totalDurationMs)}
          </td>
        </tr>
      ))
    ) : (
      null
    );

  const interruptionRows =
    interruptionDetails.length > 0 ? (
      interruptionDetails.map(detail => (
        <tr key={detail.label} className="text-sm text-slate-700 dark:text-slate-200">
          <td className="py-2 pr-4 font-medium">
            <span className="inline-flex max-w-[240px] items-center truncate align-middle" title={detail.label}>
              {detail.label}
            </span>
          </td>
          <td className="py-2 pr-4 text-slate-500 dark:text-slate-400">{detail.count}件</td>
          <td className="py-2 pr-4 text-slate-500 dark:text-slate-400">{formatShare(detail.totalDurationMs, totalInterruptDuration)}</td>
          <td className="py-2 text-right font-semibold text-slate-900 dark:text-slate-100">
            {formatDurationCompact(detail.totalDurationMs)}
          </td>
        </tr>
      ))
    ) : (
      null
    );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <DetailTable
        title="タスク別フォーカス時間"
        description="当日の集中時間をタスク単位で集計します"
        headers={["タスク", "セッション数", "シェア", "合計時間"]}
        rows={taskRows}
        emptyMessage="タスクの記録がありません"
      />
      <DetailTable
        title="割り込みの発信者別内訳"
        description="だれからの割り込みが多かったかを把握できます"
        headers={["発信者", "件数", "シェア", "対応時間"]}
        rows={interruptionRows}
        emptyMessage="割り込みの記録がありません"
      />
    </div>
  );
}
