'use client';

import { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import useEventsStore from '@/store/useEventsStore';
import type { Event } from '@/types';
import { createEventFromDraft, EventDraft } from '@/store/eventDraftUtils';
import { INTERRUPT_CATEGORY_COLORS } from '@/lib/constants';

interface AddPastEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRange: { start: number; end: number };
}

const EVENT_LABELS: Record<Event['type'], string> = {
  task: 'タスク',
  interrupt: '割り込み',
  break: '休憩',
};

const BREAK_OPTIONS: Array<{ value: NonNullable<Event['breakType']>; label: string }> = [
  { value: 'short', label: 'ショート' },
  { value: 'coffee', label: 'コーヒー' },
  { value: 'lunch', label: 'ランチ' },
  { value: 'custom', label: 'カスタム' },
  { value: 'indefinite', label: '未設定' },
];

const formatDateTimeLocal = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const clampTimestamp = (value: number): number => {
  const now = Date.now();
  return Math.min(value, now);
};

const toReadable = (timestamp: number) => formatDateTimeLocal(timestamp).replace('T', ' ');

export default function AddPastEventModal({ open, onOpenChange, defaultRange }: AddPastEventModalProps) {
  const { events, actions, categories, myTasks, isCategoryEnabled, interruptContacts, interruptSubjects, interruptCategorySettings } = useEventsStore(state => ({
    events: state.events,
    actions: state.actions,
    categories: state.categories,
    myTasks: state.myTasks,
    isCategoryEnabled: state.isCategoryEnabled,
    interruptContacts: state.interruptContacts,
    interruptSubjects: state.interruptSubjects,
    interruptCategorySettings: state.interruptCategorySettings,
  }));

  const interruptCategories = [
    { name: interruptCategorySettings.category1, color: INTERRUPT_CATEGORY_COLORS.category1 },
    { name: interruptCategorySettings.category2, color: INTERRUPT_CATEGORY_COLORS.category2 },
    { name: interruptCategorySettings.category3, color: INTERRUPT_CATEGORY_COLORS.category3 },
    { name: interruptCategorySettings.category4, color: INTERRUPT_CATEGORY_COLORS.category4 },
    { name: interruptCategorySettings.category5, color: INTERRUPT_CATEGORY_COLORS.category5 },
    { name: interruptCategorySettings.category6, color: INTERRUPT_CATEGORY_COLORS.category6 },
  ];
  const defaultInterruptCategory = interruptCategories[0]?.name ?? '';

  const [eventType, setEventType] = useState<Event['type']>('task');
  const [label, setLabel] = useState('');
  const [who, setWho] = useState('');
  const [interruptType, setInterruptType] = useState(defaultInterruptCategory);
  const [breakType, setBreakType] = useState<NonNullable<Event['breakType']>>('short');
  const [categoryId, setCategoryId] = useState<string>('none');
  const [urgency, setUrgency] = useState<NonNullable<Event['urgency']>>('Medium');
  const [myTaskId, setMyTaskId] = useState<string>('none');
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const sortedEvents = useMemo(() => events.slice().sort((a, b) => a.start - b.start), [events]);

  useEffect(() => {
    if (!open) return;

    const now = Date.now();
    const start = clampTimestamp(Math.min(defaultRange.start, defaultRange.end - 60_000));
    const tentativeEnd = clampTimestamp(defaultRange.end);
    const safeEnd = tentativeEnd > start ? tentativeEnd : Math.min(start + 30 * 60 * 1000, now);

    setEventType('task');
    setLabel('');
    setWho('');
    setInterruptType(defaultInterruptCategory);
    setBreakType('short');
    setCategoryId('none');
    setMyTaskId('none');
    setUrgency('Medium');
    setStartInput(formatDateTimeLocal(start));
    setEndInput(formatDateTimeLocal(safeEnd));
    setMemo('');
    setError(null);
    setSuccessMessage(null);
  }, [open, defaultRange, defaultInterruptCategory]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleChangeEventType = (nextType: Event['type']) => {
    setEventType(nextType);
    if (nextType === 'task') {
      setCategoryId('none');
      setWho('');
      setInterruptType(defaultInterruptCategory);
      setBreakType('short');
      setUrgency('Medium');
      setMyTaskId('none');
    } else if (nextType === 'interrupt') {
      setCategoryId('none');
      setBreakType('short');
      setUrgency('Medium');
      setInterruptType(defaultInterruptCategory);
      setMyTaskId('none');
    } else if (nextType === 'break') {
      setCategoryId('none');
      setWho('');
      setInterruptType(defaultInterruptCategory);
      setBreakType('short');
      setUrgency('Medium');
      setMyTaskId('none');
    }
  };

  useEffect(() => {
    if (eventType === 'interrupt' && !interruptType) {
      setInterruptType(defaultInterruptCategory);
    }
  }, [eventType, interruptType, defaultInterruptCategory]);

  const parseDateTime = (value: string): number | null => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed.getTime();
  };

  const validateRange = (start: number, end: number): string | null => {
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return '開始・終了時刻を正しく入力してください。';
    }
    if (start >= end) {
      return '終了時刻は開始時刻より後の時刻を指定してください。';
    }
    if (end > Date.now()) {
      return '未来の時刻は指定できません。';
    }
    const overlaps = sortedEvents.filter(existing => {
      const existingEnd = existing.end ?? Date.now();
      return existingEnd > start && existing.start < end;
    });

    if (overlaps.length > 0) {
      const conflict = overlaps[0];
      const startLabel = toReadable(conflict.start);
      const endLabel = toReadable(conflict.end ?? Date.now());
      const durationMs = (conflict.end ?? Date.now()) - conflict.start;
      const hours = Math.max(1, Math.round(durationMs / 3600000));
      const conflictLabel = conflict.label?.trim() || EVENT_LABELS[conflict.type];
      return `既存のイベントと重なっています: ${conflictLabel} (${startLabel} - ${endLabel} / 約${hours}時間)。履歴の時間を調整してください。`; 
    }

    return null;
  };

  const handleSubmit = () => {
    try {
      setError(null);
      setSuccessMessage(null);

      const start = parseDateTime(startInput);
      const end = parseDateTime(endInput);

      if (start == null || end == null) {
        setError('開始・終了時刻を正しく入力してください。');
        return;
      }

      const validation = validateRange(start, end);
      if (validation) {
        setError(validation);
        return;
      }

      const baseEvent: Event = {
        id: uuidv4(),
        type: eventType,
        start,
        end,
      };

      const draft: EventDraft = {
        type: eventType,
        label: label.trim(),
        memo: memo.trim(),
        categoryId: categoryId === 'none' ? null : categoryId,
        who: who.trim(),
        interruptType: interruptType.trim(),
        breakType,
        urgency,
        myTaskId: eventType === 'task' && myTaskId !== 'none' ? myTaskId : null,
      };

      const newEvent = createEventFromDraft(baseEvent, draft, myTasks);

      if (eventType === 'break') {
        const durationMinutes = Math.round((end - start) / 60000);
        newEvent.breakDurationMinutes = durationMinutes;
      }

      actions.addEvent(newEvent);

      if (eventType === 'interrupt') {
        if (draft.who) {
          actions.addInterruptContact(draft.who);
        }
      }

      setSuccessMessage('イベントを追加しました。');
      onOpenChange(false);
    } catch (err) {
      console.error('[AddPastEventModal] Failed to add event', err);
      setError('イベントの追加に失敗しました。もう一度お試しください。');
    }
  };

  const canSubmit = startInput.length > 0 && endInput.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>過去のイベントを追加</DialogTitle>
          <DialogDescription>
            押し忘れた時間帯を後から登録できます。時間が重複しないように注意してください。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>イベント種類</Label>
          <Select value={eventType} onValueChange={value => handleChangeEventType(value as Event['type'])}>
              <SelectTrigger>
                <SelectValue placeholder="種類を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="task">タスク</SelectItem>
                <SelectItem value="interrupt">割り込み</SelectItem>
                <SelectItem value="break">休憩</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="start">開始時刻</Label>
            <Input
              id="start"
              type="datetime-local"
              value={startInput}
              max={formatDateTimeLocal(Date.now())}
              onChange={event => setStartInput(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="end">終了時刻</Label>
            <Input
              id="end"
              type="datetime-local"
              value={endInput}
              max={formatDateTimeLocal(Date.now())}
              onChange={event => setEndInput(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="label">表示名 (任意)</Label>
            <Input
              id="label"
              placeholder={`${EVENT_LABELS[eventType]}の内容`}
              value={label}
              onChange={event => setLabel(event.target.value)}
            />
            {eventType === 'interrupt' && interruptSubjects.length > 0 && (
              <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
                {interruptSubjects.map(subject => (
                  <button
                    key={subject}
                    type="button"
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:border-amber-300/60 dark:hover:bg-amber-500/20"
                    onClick={() => {
                      setLabel(subject);
                    }}
                  >
                    {subject}
                  </button>
                ))}
              </div>
            )}
          </div>

          {eventType === 'task' && isCategoryEnabled && (
            <div className="grid gap-2">
              <Label>カテゴリ</Label>
              <Select
                value={categoryId}
                onValueChange={value => setCategoryId(value)}
                disabled={myTaskId !== 'none'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="カテゴリを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">指定なし</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {eventType === 'task' && (
            <div className="grid gap-2">
              <Label>紐付けタスク</Label>
              <Select value={myTaskId} onValueChange={value => setMyTaskId(value)}>
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
          )}

          {eventType === 'interrupt' && (
            <div className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="who">発信者 (任意)</Label>
                <Input
                  id="who"
                  placeholder="だれからの割り込みか"
                  value={who}
                  onChange={event => setWho(event.target.value)}
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
                        onClick={() => setWho(contact)}
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

              <div className="grid gap-2">
                <Label className="text-xs font-medium text-slate-500 dark:text-slate-300">緊急度</Label>
                <Select
                  value={urgency}
                  onValueChange={value => setUrgency(value as NonNullable<Event['urgency']>)}
                >
                  <SelectTrigger className="w-[160px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">低</SelectItem>
                    <SelectItem value="Medium">中</SelectItem>
                    <SelectItem value="High">高</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {eventType === 'break' && (
            <div className="grid gap-2">
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
          )}

          <div className="grid gap-2">
            <Label htmlFor="memo">メモ (任意)</Label>
            <textarea
              id="memo"
              placeholder="補足があれば入力してください"
              value={memo}
              onChange={event => setMemo(event.target.value)}
              className="min-h-[96px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            追加する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
