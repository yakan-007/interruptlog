'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Category, Event, TaskLifecycleRecord } from '@/types';
import { buildCsvContent, buildExportRows } from '@/app/report/utils/export';
import { createRange } from '@/app/report/utils/range';
import { createDateFromKey } from '@/lib/reportUtils';

interface ProExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStartKey: string;
  defaultEndKey: string;
  events: Event[];
  categories: Category[];
  taskLedger: Record<string, TaskLifecycleRecord>;
}

export default function ProExportDialog({
  open,
  onOpenChange,
  defaultStartKey,
  defaultEndKey,
  events,
  categories,
  taskLedger,
}: ProExportDialogProps) {
  const [startKey, setStartKey] = useState(defaultStartKey);
  const [endKey, setEndKey] = useState(defaultEndKey);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStartKey(defaultStartKey);
    setEndKey(defaultEndKey);
    setError(null);
  }, [open, defaultStartKey, defaultEndKey]);

  const range = useMemo(() => {
    try {
      const startDate = createDateFromKey(startKey);
      const endDate = createDateFromKey(endKey);
      return createRange(startDate, endDate);
    } catch {
      return null;
    }
  }, [startKey, endKey]);

  const canExport = Boolean(range && startKey && endKey && !error);

  const handleExport = () => {
    if (!range) {
      setError('開始日と終了日を正しく入力してください');
      return;
    }

    if (range.start.getTime() > range.end.getTime()) {
      setError('終了日は開始日より後である必要があります');
      return;
    }

    const rows = buildExportRows(events, range, categories, taskLedger);
    if (rows.length === 0) {
      setError('対象期間にエクスポートできるイベントがありません');
      return;
    }

    const csv = buildCsvContent(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `interruptlog-report-${range.startKey}_to_${range.endKey}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>詳細エクスポート（Pro）</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            任意期間のデータをCSVで出力します。対象期間は日単位で指定してください。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">開始日</label>
            <Input
              type="date"
              value={startKey}
              onChange={event => setStartKey(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">終了日</label>
            <Input
              type="date"
              value={endKey}
              onChange={event => setEndKey(event.target.value)}
            />
          </div>
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-200">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button type="button" onClick={handleExport} disabled={!canExport}>
            CSVを出力
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
