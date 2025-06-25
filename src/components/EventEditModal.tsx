'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Clock } from 'lucide-react';
import { Event, Category } from '@/types';
import { formatEventTime } from '@/lib/timeUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import useEventsStore from '@/store/useEventsStore';

interface EventEditModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventId: string, newEndTime: number, gapActivityName?: string, newEventType?: Event['type'], newLabel?: string, newCategoryId?: string) => void;
  nextEvent?: Event;
}

export default function EventEditModal({
  event,
  isOpen,
  onClose,
  onSave,
  nextEvent
}: EventEditModalProps) {
  const { categories, isCategoryEnabled } = useEventsStore();
  const [endTimeInput, setEndTimeInput] = useState('');
  const [validationError, setValidationError] = useState('');
  const [previewGap, setPreviewGap] = useState<{ start: number; end: number } | null>(null);
  const [gapActivityName, setGapActivityName] = useState('不明なアクティビティ');
  const [eventType, setEventType] = useState<Event['type']>('task');
  const [eventLabel, setEventLabel] = useState('');
  const [eventCategoryId, setEventCategoryId] = useState<string>('none');
  const [showSmallGapNotice, setShowSmallGapNotice] = useState(false);

  useEffect(() => {
    if (event && event.end) {
      try {
        const endDate = new Date(event.end);
        if (isNaN(endDate.getTime())) {
          console.error('[EventEditModal] Invalid date:', event.end);
          return;
        }
        const hours = endDate.getHours().toString().padStart(2, '0');
        const minutes = endDate.getMinutes().toString().padStart(2, '0');
        setEndTimeInput(`${hours}:${minutes}`);
        setEventType(event.type || 'task');
        setEventLabel(event.label || '');
        setEventCategoryId(event.categoryId || 'none');
        setValidationError('');
        setPreviewGap(null);
        setShowSmallGapNotice(false);
      } catch (error) {
        console.error('[EventEditModal] Error in useEffect:', error);
      }
    } else {
      // Reset state when event is null
      setEndTimeInput('');
      setEventType('task');
      setEventLabel('');
      setEventCategoryId('none');
      setValidationError('');
      setPreviewGap(null);
      setShowSmallGapNotice(false);
    }
  }, [event]);

  const handleTimeChange = (value: string) => {
    try {
      setEndTimeInput(value);
      setValidationError('');
      setPreviewGap(null);
      setShowSmallGapNotice(false);

      if (!event || !event.end) {
        return;
      }

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

    // Show gap preview if reducing end time by at least 1 minute
    if (newEndTime < event.end) {
      if ((event.end - newEndTime) >= 60000) {
        setPreviewGap({ start: newEndTime, end: event.end });
      } else {
        // Show notice for small gaps (less than 1 minute)
        setShowSmallGapNotice(true);
      }
    }
    } catch (error) {
      console.error('[EventEditModal] Error in handleTimeChange:', error);
      setValidationError('時刻の処理中にエラーが発生しました');
    }
  };

  const handleSave = () => {
    try {
      if (!event || !event.end || validationError) {
        return;
      }

      const timeParts = endTimeInput.split(':');
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);

      if (isNaN(hours) || isNaN(minutes)) {
        setValidationError('有効な時刻を入力してください');
        return;
      }

      const newEndDate = new Date(event.end);
      newEndDate.setHours(hours, minutes, 0, 0);
      const newEndTime = newEndDate.getTime();

      // Pass gap activity name only if we're reducing time by at least 1 minute
      const gapName = newEndTime < event.end && (event.end - newEndTime) >= 60000 ? gapActivityName : undefined;
      // Pass new event type if it has changed
      const newType = eventType !== event.type ? eventType : undefined;
      // Pass new label if it has changed
      const newLabel = eventLabel !== (event.label || '') ? eventLabel : undefined;
      // Pass new category if it has changed (handle 'none' properly)
      const originalCategoryId = event.categoryId || 'none';
      const selectedCategoryId = eventCategoryId === 'none' ? undefined : eventCategoryId;
      const newCategoryId = eventCategoryId !== originalCategoryId ? selectedCategoryId : undefined;
      
      onSave(event.id, newEndTime, gapName, newType, newLabel, newCategoryId);
      onClose();
    } catch (error) {
      console.error('[EventEditModal] Error in handleSave:', error);
      setValidationError('保存中にエラーが発生しました');
    }
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
          <DialogTitle>イベントを編集</DialogTitle>
          <DialogDescription>
            イベント名、終了時刻、イベントタイプ{isCategoryEnabled ? '、カテゴリ' : ''}を修正できます。開始時刻は変更できません。
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="eventLabel">イベント名</Label>
            <Input
              id="eventLabel"
              type="text"
              value={eventLabel}
              onChange={(e) => setEventLabel(e.target.value)}
              placeholder={event.type}
            />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              開始: {formatEventTime(event.start)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventType">イベントタイプ</Label>
            <Select value={eventType} onValueChange={(value: Event['type']) => setEventType(value)}>
              <SelectTrigger id="eventType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="task">タスク</SelectItem>
                <SelectItem value="interrupt">割り込み</SelectItem>
                <SelectItem value="break">休憩</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isCategoryEnabled && categories && Array.isArray(categories) && (
            <div className="space-y-2">
              <Label htmlFor="eventCategory">カテゴリ</Label>
              <Select value={eventCategoryId || 'none'} onValueChange={setEventCategoryId}>
                <SelectTrigger id="eventCategory">
                  <SelectValue placeholder="カテゴリなし" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">カテゴリなし</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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

          {showSmallGapNotice && (
            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                時間の変更が1分未満のため、空き時間は作成されません。
              </AlertDescription>
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