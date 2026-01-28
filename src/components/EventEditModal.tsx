'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Clock } from 'lucide-react';
import { Event } from '@/types';
import { formatEventTime } from '@/lib/timeUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BREAK_OPTIONS } from '@/lib/constants';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useCategories,
  useIsCategoryEnabled,
  useMyTasks,
  useInterruptContacts,
  useInterruptSubjects,
} from '@/hooks/useStoreSelectors';
import { GAP_MIN_MS } from '@/store/eventHelpers';
import { getEventDisplayLabel } from '@/utils/eventUtils';
import useInterruptCategories from '@/hooks/useInterruptCategories';

interface EventEditModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    eventId: string,
    newStartTime: number,
    newEndTime: number,
    gapActivityName?: string,
    newEventType?: Event['type'],
    newLabel?: string,
    newCategoryId?: string | null,
    interruptType?: string,
    createGapEvent?: boolean,
    extra?: {
      who?: string;
      memo?: string;
      myTaskId?: string | null;
      breakType?: Event['breakType'];
      breakDurationMinutes?: Event['breakDurationMinutes'];
    }
  ) => void;
  prevEvent?: Event;
  nextEvent?: Event;
}

export default function EventEditModal({
  event,
  isOpen,
  onClose,
  onSave,
  prevEvent,
  nextEvent
}: EventEditModalProps) {
  const categories = useCategories();
  const isCategoryEnabled = useIsCategoryEnabled();
  const myTasks = useMyTasks();
  const interruptContacts = useInterruptContacts();
  const interruptSubjects = useInterruptSubjects();
  const { categories: interruptCategories, defaultCategoryName } = useInterruptCategories();
  const defaultInterruptCategory = defaultCategoryName;
  const [startDateTimeInput, setStartDateTimeInput] = useState('');
  const [endDateTimeInput, setEndDateTimeInput] = useState('');
  const [validationError, setValidationError] = useState('');
  const [previewGap, setPreviewGap] = useState<{ start: number; end: number } | null>(null);
  const [gapActivityName, setGapActivityName] = useState('不明なアクティビティ');
  const [eventType, setEventType] = useState<Event['type']>('task');
  const [eventLabel, setEventLabel] = useState('');
  const [eventCategoryId, setEventCategoryId] = useState<string>('none');
  const [interruptType, setInterruptType] = useState<string>('');
  const [eventWho, setEventWho] = useState('');
  const [eventMemo, setEventMemo] = useState('');
  const [eventMyTaskId, setEventMyTaskId] = useState<string>('none');
  const [breakType, setBreakType] = useState<NonNullable<Event['breakType']>>('short');
  const [breakDurationMinutes, setBreakDurationMinutes] = useState<string>('');
  const [showSmallGapNotice, setShowSmallGapNotice] = useState(false);
  const [shouldCreateGap, setShouldCreateGap] = useState(false);

  const toDateTimeLocalValue = (timestamp: number) => {
    const date = new Date(timestamp);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(timestamp - tzOffset).toISOString().slice(0, 16);
  };

  const parseDateTimeInput = (value: string) => {
    if (!value) return null;
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  };

  const buildOverlapMessage = (prefix: string, target: Event) =>
    `${prefix}: ${getEventDisplayLabel(target)} (${formatEventTime(target.start)} - ${
      target.end ? formatEventTime(target.end) : '実行中'
    })`;

  const resetFormState = useCallback(() => {
    setStartDateTimeInput('');
    setEndDateTimeInput('');
    setEventType('task');
    setEventLabel('');
    setEventCategoryId('none');
    setInterruptType('');
    setEventWho('');
    setEventMemo('');
    setEventMyTaskId('none');
    setBreakType('short');
    setBreakDurationMinutes('');
    setValidationError('');
    setPreviewGap(null);
    setShowSmallGapNotice(false);
    setShouldCreateGap(true);
  }, []);

  const syncFromEvent = useCallback((source: Event) => {
    setStartDateTimeInput(toDateTimeLocalValue(source.start));
    setEndDateTimeInput(toDateTimeLocalValue(source.end ?? source.start));
    setEventType(source.type || 'task');
    setEventLabel(source.label || '');
    setEventCategoryId(source.categoryId || 'none');
    setInterruptType(
      source.type === 'interrupt'
        ? (source.interruptType ? source.interruptType : defaultInterruptCategory)
        : ''
    );
    setEventWho(source.who ?? '');
    setEventMemo(source.memo ?? '');
    setEventMyTaskId(source.meta?.myTaskId ?? 'none');
    setBreakType((source.breakType ?? 'short') as NonNullable<Event['breakType']>);
    setBreakDurationMinutes(
      source.breakDurationMinutes !== null && source.breakDurationMinutes !== undefined
        ? String(source.breakDurationMinutes)
        : ''
    );
    setValidationError('');
    setPreviewGap(null);
    setShowSmallGapNotice(false);
    setGapActivityName(source.label ? `${source.label} の残り` : '未分類の時間');
    setShouldCreateGap(false);
  }, [defaultInterruptCategory]);

  useEffect(() => {
    if (event && event.end) {
      try {
        if (Number.isNaN(new Date(event.end).getTime())) {
          console.error('[EventEditModal] Invalid date:', event.end);
          return;
        }
        syncFromEvent(event);
      } catch (error) {
        console.error('[EventEditModal] Error in useEffect:', error);
      }
    } else {
      resetFormState();
    }
  }, [event, resetFormState, syncFromEvent]);

  const handleEventTypeChange = (nextType: Event['type']) => {
    setEventType(nextType);
    if (nextType === 'task') {
      setEventWho('');
      setInterruptType(defaultInterruptCategory);
      setBreakType('short');
      setBreakDurationMinutes('');
      return;
    }
    if (nextType === 'interrupt') {
      setEventCategoryId('none');
      setEventMyTaskId('none');
      setBreakType('short');
      setBreakDurationMinutes('');
      return;
    }
    setEventCategoryId('none');
    setEventMyTaskId('none');
    setEventWho('');
    setInterruptType(defaultInterruptCategory);
  };

  const handleMyTaskChange = (value: string) => {
    const nextTaskId = value === 'none' ? 'none' : value;
    const prevTask = eventMyTaskId !== 'none' ? myTasks.find(task => task.id === eventMyTaskId) : undefined;
    const nextTask = nextTaskId !== 'none' ? myTasks.find(task => task.id === nextTaskId) : undefined;
    const trimmedLabel = eventLabel.trim();
    const prevName = prevTask?.name?.trim() ?? '';
    const nextName = nextTask?.name?.trim() ?? '';
    const labelFollowsPrev = !trimmedLabel || (prevName && trimmedLabel === prevName);
    const prevCategoryId = prevTask?.categoryId ?? 'none';
    const shouldAutoCategory = eventCategoryId === 'none' || (prevCategoryId !== 'none' && eventCategoryId === prevCategoryId);

    if (nextTask) {
      if (labelFollowsPrev && nextName) {
        setEventLabel(nextTask.name);
      }
      if (shouldAutoCategory) {
        setEventCategoryId(nextTask.categoryId ?? 'none');
      }
    } else {
      if (labelFollowsPrev) {
        setEventLabel('');
      }
      if (shouldAutoCategory) {
        setEventCategoryId('none');
      }
    }

    setEventMyTaskId(nextTaskId);
  };

  const handleDateTimeChange = (value: string, field: 'start' | 'end') => {
    try {
      if (field === 'start') {
        setStartDateTimeInput(value);
      } else {
        setEndDateTimeInput(value);
      }
      setValidationError('');
      setPreviewGap(null);
      setShowSmallGapNotice(false);

      if (!event || !event.end) {
        return;
      }

      if (!value) {
        setValidationError(field === 'start' ? '開始日時を入力してください' : '終了日時を入力してください');
        return;
      }

      const newStartTime = parseDateTimeInput(field === 'start' ? value : startDateTimeInput);
      const newEndTime = parseDateTimeInput(field === 'end' ? value : endDateTimeInput);

      if (newStartTime === null || newEndTime === null) {
        setValidationError('有効な日時を入力してください');
        return;
      }

      if (newEndTime <= newStartTime) {
        setValidationError('終了日時は開始時刻より後である必要があります');
        return;
      }

      if (newEndTime > Date.now()) {
        setValidationError('終了日時は現在より前である必要があります');
        return;
      }

      if (prevEvent) {
        const prevEnd = prevEvent.end ?? prevEvent.start;
        if (newStartTime < prevEnd) {
          setValidationError(buildOverlapMessage('前のイベントと重なっています', prevEvent));
          return;
        }
      }

      // Check for overlap with next event
      if (nextEvent && newEndTime > nextEvent.start) {
        setValidationError(buildOverlapMessage('次のイベントと重複します', nextEvent));
        return;
      }

      // Show gap preview if reducing end time by at least 1 minute
      if (newEndTime < event.end) {
        if ((event.end - newEndTime) >= GAP_MIN_MS) {
          setPreviewGap({ start: newEndTime, end: event.end });
          setShouldCreateGap(false);
        } else {
          // Show notice for small gaps (less than threshold)
          setShowSmallGapNotice(true);
          setPreviewGap(null);
          setShouldCreateGap(false);
        }
      } else {
        setPreviewGap(null);
        setShouldCreateGap(false);
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

      if (!startDateTimeInput || !endDateTimeInput) {
        setValidationError('開始・終了日時を入力してください');
        return;
      }

      const newStartTime = parseDateTimeInput(startDateTimeInput);
      const newEndTime = parseDateTimeInput(endDateTimeInput);

      if (newStartTime === null || newEndTime === null) {
        setValidationError('有効な日時を入力してください');
        return;
      }

      if (newEndTime <= newStartTime) {
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

      const canCreateGap = newEndTime < event.end && (event.end - newEndTime) >= GAP_MIN_MS;
      // Pass gap activity name only if we're reducing time by at least 1 minute
      const gapName = canCreateGap && shouldCreateGap ? gapActivityName : undefined;
      const normalizedLabel = eventLabel.trim();
      const normalizedMemo = eventMemo.trim();
      const normalizedWho = eventWho.trim();
      const parsedBreakDuration = Number(breakDurationMinutes);
      const normalizedBreakDuration =
        breakDurationMinutes.trim() === '' || Number.isNaN(parsedBreakDuration)
          ? null
          : Math.max(parsedBreakDuration, 0);

      // Pass new event type if it has changed
      const newType = eventType !== event.type ? eventType : undefined;
      // Pass new label if it has changed
      const newLabel = normalizedLabel !== (event.label || '') ? normalizedLabel : undefined;
      // Pass new category if it has changed (handle 'none' properly)
      const originalCategoryId = event.categoryId || 'none';
      const selectedCategoryId = eventCategoryId === 'none' ? null : eventCategoryId;
      const newCategoryId = eventCategoryId !== originalCategoryId ? selectedCategoryId : undefined;
      // Pass interrupt type if event is interrupt type
      const originalInterruptType = event.interruptType ?? '';
      const newInterruptType =
        eventType === 'interrupt' && interruptType !== originalInterruptType ? interruptType : undefined;
      const originalWho = event.who ?? '';
      const newWho = eventType === 'interrupt' && normalizedWho !== originalWho ? normalizedWho : undefined;
      const originalMemo = event.memo ?? '';
      const newMemo = normalizedMemo !== originalMemo ? normalizedMemo : undefined;
      const originalMyTaskId = event.meta?.myTaskId ?? null;
      const selectedMyTaskId = eventMyTaskId === 'none' ? null : eventMyTaskId;
      const newMyTaskId = eventType === 'task' && selectedMyTaskId !== originalMyTaskId ? selectedMyTaskId : undefined;
      const originalBreakType = event.breakType ?? 'short';
      const newBreakType = eventType === 'break' && breakType !== originalBreakType ? breakType : undefined;
      const originalBreakDuration = event.breakDurationMinutes ?? null;
      const newBreakDuration =
        eventType === 'break' && normalizedBreakDuration !== originalBreakDuration
          ? normalizedBreakDuration
          : undefined;
      
      onSave(
        event.id,
        newStartTime,
        newEndTime,
        gapName,
        newType,
        newLabel,
        newCategoryId,
        newInterruptType,
        canCreateGap ? shouldCreateGap : undefined,
        {
          who: newWho,
          memo: newMemo,
          myTaskId: newMyTaskId,
          breakType: newBreakType,
          breakDurationMinutes: newBreakDuration,
        }
      );
      onClose();
    } catch (error) {
      console.error('[EventEditModal] Error in handleSave:', error);
      setValidationError('保存中にエラーが発生しました');
    }
  };

  if (!event) return null;

  const selectedTask = eventMyTaskId !== 'none' ? myTasks.find(task => task.id === eventMyTaskId) : undefined;
  const selectedTaskName = selectedTask?.name?.trim() ?? '';
  const labelTrimmed = eventLabel.trim();
  const isLabelFollowingTaskName =
    eventType === 'task' && Boolean(selectedTaskName) && (!labelTrimmed || labelTrimmed === selectedTaskName);
  const shouldShowEmptyLabelHint = eventType === 'task' && eventMyTaskId === 'none' && !labelTrimmed;

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}時間${minutes}分`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>イベントを編集</DialogTitle>
          <DialogDescription>
            イベント名、開始・終了日時、イベントタイプ{isCategoryEnabled ? '、カテゴリ' : ''}を修正できます。
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="eventType">イベントタイプ</Label>
            <Select value={eventType} onValueChange={value => handleEventTypeChange(value as Event['type'])}>
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

          <div className="space-y-2">
            <Label htmlFor="eventLabel">
              {eventType === 'interrupt' ? '件名' : '表示名 (任意)'}
            </Label>
            <Input
              id="eventLabel"
              type="text"
              value={eventLabel}
              onChange={(e) => setEventLabel(e.target.value)}
              placeholder={
                eventType === 'task'
                  ? 'タスク名(空欄なら紐付けタスク名を使用)'
                  : eventType === 'interrupt'
                    ? '割り込みの件名'
                    : '休憩名'
              }
            />
          {eventType === 'interrupt' && interruptSubjects.length > 0 && (
            <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
              {interruptSubjects.map(subject => (
                <button
                  key={subject}
                    type="button"
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:border-amber-300/60 dark:hover:bg-amber-500/20"
                    onClick={() => {
                      setEventLabel(subject);
                    }}
                  >
                    {subject}
                  </button>
                ))}
              </div>
            )}
            {eventType === 'task' && isLabelFollowingTaskName && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                紐付けタスク名を初期値にしています。必要に応じて書き換えてください。
              </p>
            )}
            {eventType === 'task' && shouldShowEmptyLabelHint && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                タスク名を入力するか、紐付けタスクを選択してください。
              </p>
            )}
          </div>

          {eventType === 'task' && (
            <>
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
                <Label>紐付けタスク</Label>
                <Select value={eventMyTaskId} onValueChange={handleMyTaskChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="タスクを選択" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="none">紐付け無し</SelectItem>
                    {myTasks.map(task => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {eventType === 'interrupt' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="interruptWho">発信者 (任意)</Label>
                <Input
                  id="interruptWho"
                  placeholder="だれからの割り込みか"
                  value={eventWho}
                  onChange={(e) => setEventWho(e.target.value)}
                />
                {interruptContacts.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {interruptContacts.map(contact => (
                      <Button
                        key={contact}
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 rounded-full border px-3 text-xs"
                        onClick={() => setEventWho(contact)}
                      >
                        {contact}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500 dark:text-slate-300">要件カテゴリ</Label>
                <div className="flex flex-wrap gap-2">
                  {interruptCategories.map(item => (
                    <Button
                      key={item.name}
                      type="button"
                      size="sm"
                      variant={interruptType === item.name ? 'default' : 'outline'}
                      className={interruptType === item.name ? 'text-white' : ''}
                      style={interruptType === item.name ? { backgroundColor: item.color, borderColor: item.color } : {}}
                      onClick={() => setInterruptType(item.name)}
                    >
                      {item.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {eventType === 'break' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>休憩タイプ</Label>
                <Select value={breakType} onValueChange={value => setBreakType(value as typeof breakType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="休憩タイプを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {BREAK_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>予定時間 (分)</Label>
                <Input
                  type="number"
                  min={0}
                  value={breakDurationMinutes}
                  onChange={(e) => setBreakDurationMinutes(e.target.value)}
                  placeholder="例: 15"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="memo" className="block">メモ (任意)</Label>
            <textarea
              id="memo"
              placeholder="補足があれば入力してください"
              value={eventMemo}
              onChange={event => setEventMemo(event.target.value)}
              className="min-h-[96px] max-h-[240px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDateTime">開始日時</Label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <Input
                id="startDateTime"
                type="datetime-local"
                value={startDateTimeInput}
                max={toDateTimeLocalValue(Date.now())}
                onChange={(e) => handleDateTimeChange(e.target.value, 'start')}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDateTime">終了日時</Label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <Input
                id="endDateTime"
                type="datetime-local"
                value={endDateTimeInput}
                max={toDateTimeLocalValue(Date.now())}
                onChange={(e) => handleDateTimeChange(e.target.value, 'end')}
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
                時間の変更が短いため（約{Math.round(GAP_MIN_MS / 1000)}秒未満）、空き時間は作成されません。
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
