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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INTERRUPT_CATEGORY_COLORS } from '@/lib/constants';
import { Checkbox } from '@/components/ui/checkbox';
import { useCategories, useInterruptCategorySettings, useIsCategoryEnabled } from '@/hooks/useStoreSelectors';

interface EventEditModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    eventId: string,
    newEndTime: number,
    gapActivityName?: string,
    newEventType?: Event['type'],
    newLabel?: string,
    newCategoryId?: string,
    interruptType?: string,
    createGapEvent?: boolean
  ) => void;
  nextEvent?: Event;
}

export default function EventEditModal({
  event,
  isOpen,
  onClose,
  onSave,
  nextEvent
}: EventEditModalProps) {
  const categories = useCategories();
  const isCategoryEnabled = useIsCategoryEnabled();
  const interruptCategorySettings = useInterruptCategorySettings();
  const [endDateTimeInput, setEndDateTimeInput] = useState('');
  const [validationError, setValidationError] = useState('');
  const [previewGap, setPreviewGap] = useState<{ start: number; end: number } | null>(null);
  const [gapActivityName, setGapActivityName] = useState('不明なアクティビティ');
  const [eventType, setEventType] = useState<Event['type']>('task');
  const [eventLabel, setEventLabel] = useState('');
  const [eventCategoryId, setEventCategoryId] = useState<string>('none');
  const [interruptType, setInterruptType] = useState<string>('');
  const [showSmallGapNotice, setShowSmallGapNotice] = useState(false);
  const [shouldCreateGap, setShouldCreateGap] = useState(true);

  const toDateTimeLocalValue = (timestamp: number) => {
    const date = new Date(timestamp);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(timestamp - tzOffset).toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (event && event.end) {
      try {
        if (Number.isNaN(new Date(event.end).getTime())) {
          console.error('[EventEditModal] Invalid date:', event.end);
          return;
        }
        setEndDateTimeInput(toDateTimeLocalValue(event.end));
        setEventType(event.type || 'task');
        setEventLabel(event.label || '');
        setEventCategoryId(event.categoryId || 'none');
        setInterruptType(event.type === 'interrupt' && event.interruptType ? event.interruptType : '');
        setValidationError('');
        setPreviewGap(null);
        setShowSmallGapNotice(false);
        setShouldCreateGap(true);
      } catch (error) {
        console.error('[EventEditModal] Error in useEffect:', error);
      }
    } else {
      // Reset state when event is null
      setEndDateTimeInput('');
      setEventType('task');
      setEventLabel('');
      setEventCategoryId('none');
      setInterruptType('');
      setValidationError('');
      setPreviewGap(null);
      setShowSmallGapNotice(false);
      setShouldCreateGap(true);
    }
  }, [event]);

  const handleDateTimeChange = (value: string) => {
    try {
      setEndDateTimeInput(value);
      setValidationError('');
      setPreviewGap(null);
      setShowSmallGapNotice(false);

      if (!event || !event.end) {
        return;
      }

      if (!value) {
        setValidationError('終了日時を入力してください');
        return;
      }

      const parsedDate = new Date(value);
      const newEndTime = parsedDate.getTime();

      if (Number.isNaN(newEndTime)) {
        setValidationError('有効な日時を入力してください');
        return;
      }

      if (newEndTime <= event.start) {
        setValidationError('終了日時は開始時刻より後である必要があります');
        return;
      }

      if (newEndTime > Date.now()) {
        setValidationError('終了日時は現在より前である必要があります');
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
          setShouldCreateGap(true);
        } else {
          // Show notice for small gaps (less than 1 minute)
          setShowSmallGapNotice(true);
          setPreviewGap(null);
          setShouldCreateGap(true);
        }
      } else {
        setPreviewGap(null);
        setShouldCreateGap(true);
      }
    } catch (error) {
      console.error('[EventEditModal] Error in handleDateTimeChange:', error);
      setValidationError('日時の処理中にエラーが発生しました');
    }
  };

  const handleSave = () => {
    try {
      if (!event || !event.end || validationError) {
        return;
      }

      if (!endDateTimeInput) {
        setValidationError('終了日時を入力してください');
        return;
      }

      const parsedDateTime = new Date(endDateTimeInput);
      const newEndTime = parsedDateTime.getTime();

      if (Number.isNaN(newEndTime)) {
        setValidationError('有効な日時を入力してください');
        return;
      }

      if (newEndTime <= event.start) {
        setValidationError('終了日時は開始時刻より後である必要があります');
        return;
      }

      if (newEndTime > Date.now()) {
        setValidationError('終了日時は現在より前である必要があります');
        return;
      }

      if (nextEvent && newEndTime > nextEvent.start) {
        setValidationError('次のイベントと重複します');
        return;
      }

      const canCreateGap = newEndTime < event.end && (event.end - newEndTime) >= 60000;
      // Pass gap activity name only if we're reducing time by at least 1 minute
      const gapName = canCreateGap && shouldCreateGap ? gapActivityName : undefined;
      // Pass new event type if it has changed
      const newType = eventType !== event.type ? eventType : undefined;
      // Pass new label if it has changed
      const newLabel = eventLabel !== (event.label || '') ? eventLabel : undefined;
      // Pass new category if it has changed (handle 'none' properly)
      const originalCategoryId = event.categoryId || 'none';
      const selectedCategoryId = eventCategoryId === 'none' ? undefined : eventCategoryId;
      const newCategoryId = eventCategoryId !== originalCategoryId ? selectedCategoryId : undefined;
      // Pass interrupt type if event is interrupt type
      const newInterruptType = eventType === 'interrupt' ? interruptType : undefined;
      
      onSave(
        event.id,
        newEndTime,
        gapName,
        newType,
        newLabel,
        newCategoryId,
        newInterruptType,
        canCreateGap ? shouldCreateGap : undefined,
      );
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
            イベント名、終了日時、イベントタイプ{isCategoryEnabled ? '、カテゴリ' : ''}を修正できます。開始時刻は変更できません。
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

          {eventType === 'interrupt' && (
            <div className="space-y-2">
              <Label htmlFor="interruptCategory">割り込みカテゴリ</Label>
              <Select value={interruptType} onValueChange={setInterruptType}>
                <SelectTrigger id="interruptCategory">
                  <SelectValue placeholder="カテゴリを選択" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(interruptCategorySettings).map(([key, name]) => (
                    <SelectItem key={key} value={name}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: INTERRUPT_CATEGORY_COLORS[key as keyof typeof INTERRUPT_CATEGORY_COLORS] }}
                        />
                        {name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isCategoryEnabled && categories && Array.isArray(categories) && eventType === 'task' && (
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
            <Label htmlFor="endDateTime">終了日時</Label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <Input
                id="endDateTime"
                type="datetime-local"
                value={endDateTimeInput}
                max={toDateTimeLocalValue(Date.now())}
                onChange={(e) => handleDateTimeChange(e.target.value)}
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
              <div className="flex items-center gap-2">
                <Checkbox
                  id="createGapEvent"
                  checked={shouldCreateGap}
                  onChange={event => setShouldCreateGap(event.target.checked)}
                />
                <Label htmlFor="createGapEvent" className="text-sm font-medium">
                  空き時間イベントを作成する
                </Label>
              </div>
              {shouldCreateGap && (
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
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!endDateTimeInput || !!validationError}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
