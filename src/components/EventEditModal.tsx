'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Clock } from 'lucide-react';
import { Event } from '@/types';
import { formatEventTime } from '@/lib/timeUtils';

interface EventEditModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventId: string, newEndTime: number, gapActivityName?: string) => void;
  nextEvent?: Event;
}

export default function EventEditModal({
  event,
  isOpen,
  onClose,
  onSave,
  nextEvent
}: EventEditModalProps) {
  const [endTimeInput, setEndTimeInput] = useState('');
  const [validationError, setValidationError] = useState('');
  const [previewGap, setPreviewGap] = useState<{ start: number; end: number } | null>(null);
  const [gapActivityName, setGapActivityName] = useState('不明なアクティビティ');

  useEffect(() => {
    if (event && event.end) {
      const endDate = new Date(event.end);
      const hours = endDate.getHours().toString().padStart(2, '0');
      const minutes = endDate.getMinutes().toString().padStart(2, '0');
      setEndTimeInput(`${hours}:${minutes}`);
    }
  }, [event]);

  const handleTimeChange = (value: string) => {
    setEndTimeInput(value);
    setValidationError('');
    setPreviewGap(null);

    if (!event || !event.end) return;

    // Parse time input
    const timeParts = value.split(':');
    if (timeParts.length !== 2) {
      setValidationError('時刻は HH:MM 形式で入力してください');
      return;
    }

    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);

    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      setValidationError('有効な時刻を入力してください');
      return;
    }

    // Create new end time
    const newEndDate = new Date(event.end);
    newEndDate.setHours(hours, minutes, 0, 0);
    const newEndTime = newEndDate.getTime();

    // Validate
    if (newEndTime <= event.start) {
      setValidationError('終了時刻は開始時刻より後である必要があります');
      return;
    }

    if (newEndTime > Date.now()) {
      setValidationError('終了時刻は現在時刻より前である必要があります');
      return;
    }

    // Check for overlap with next event
    if (nextEvent && newEndTime > nextEvent.start) {
      setValidationError('次のイベントと重複します');
      return;
    }

    // Show gap preview if reducing end time
    if (newEndTime < event.end) {
      setPreviewGap({ start: newEndTime, end: event.end });
    }
  };

  const handleSave = () => {
    if (!event || !event.end || validationError) return;

    const timeParts = endTimeInput.split(':');
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);

    const newEndDate = new Date(event.end);
    newEndDate.setHours(hours, minutes, 0, 0);
    const newEndTime = newEndDate.getTime();

    // Pass gap activity name only if we're reducing time
    const gapName = newEndTime < event.end ? gapActivityName : undefined;
    onSave(event.id, newEndTime, gapName);
    onClose();
  };

  if (!event) return null;

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}時間${minutes}分`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>イベント時刻を編集</DialogTitle>
          <DialogDescription>
            終了時刻を修正できます。開始時刻は変更できません。
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>イベント</Label>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
              <p className="font-medium">{event.label || event.type}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                開始: {formatEventTime(event.start)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endTime">終了時刻</Label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <Input
                id="endTime"
                type="time"
                value={endTimeInput}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          {previewGap && (
            <div className="space-y-3">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">空き時間が作成されます</p>
                  <p className="text-sm">
                    {formatEventTime(previewGap.start)} - {formatEventTime(previewGap.end)}
                    （{formatDuration(previewGap.end - previewGap.start)}）
                  </p>
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="gapActivityName">空き時間のアクティビティ名</Label>
                <Input
                  id="gapActivityName"
                  type="text"
                  value={gapActivityName}
                  onChange={(e) => setGapActivityName(e.target.value)}
                  placeholder="例：他のタスク、会議、電話対応など"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!endTimeInput || !!validationError}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}